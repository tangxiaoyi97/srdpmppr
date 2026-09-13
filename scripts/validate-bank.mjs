#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MANIFEST_FORMAT = 1;
const MANIFEST_FILE = 'manifest/assets.v1.json';
const MAX_QUESTION_BYTES = 2 * 1024 * 1024;
const MAX_SCHEMA_BYTES = 2 * 1024 * 1024;
const MAX_ASSET_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 16_384;
const MAX_IMAGE_PIXELS = 64 * 1024 * 1024;
const TERM_FILE_CODE = {
  haupttermin: 'h1',
  herbsttermin: 'h2',
  wintertermin: 'w1',
  'nebentermin-1': 'n1',
  'nebentermin-2': 'n2',
};
const TERM_ID = {
  haupttermin: ['haupttermin', 'ht'],
  herbsttermin: ['herbsttermin', 'het'],
  wintertermin: ['wintertermin', 'wt'],
  'nebentermin-1': ['nebentermin1', 'nt1'],
  'nebentermin-2': ['nebentermin2', 'nt2'],
};

export class BankValidationError extends Error {
  constructor(issues) {
    super(`question bank validation failed (${issues.length} issue${issues.length === 1 ? '' : 's'})`);
    this.name = 'BankValidationError';
    this.issues = issues;
  }
}

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function validateBank(bankRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(bankRoot));
  const issues = [];
  const schemaRoot = path.join(root, 'schema');
  const schemaFile = path.join(schemaRoot, 'question.ts');
  const contentRoot = path.join(root, 'content');
  const assetsRoot = path.join(root, 'assets');
  const schemaFiles = walkRegularFiles(schemaRoot, issues, root);
  const questionFiles = walkRegularFiles(contentRoot, issues, root).filter((file) => file.endsWith('.json'));
  if (!schemaFiles.includes(schemaFile)) issues.push('schema/question.ts: regular schema file is missing');
  const schemaStat = fs.lstatSync(schemaFile, { throwIfNoEntry: false });
  if (schemaStat && (schemaStat.size <= 0 || schemaStat.size > MAX_SCHEMA_BYTES)) {
    issues.push(`schema/question.ts: schema file must be 1..${MAX_SCHEMA_BYTES} bytes`);
  }
  // The schema is executable TypeScript. Reject every structural escape before
  // importing it so a committed symlink cannot run code outside the bank.
  if (issues.length > 0) throw new BankValidationError(issues);
  const Question = await loadQuestionSchema(schemaFile, issues);
  const questionIds = new Map();
  const partIds = new Map();
  const referencedAssets = new Set();
  const questions = [];

  for (const file of questionFiles) {
    const rel = posixRelative(root, file);
    const stat = fs.statSync(file);
    if (stat.size <= 0 || stat.size > MAX_QUESTION_BYTES) {
      issues.push(`${rel}: question file must be 1..${MAX_QUESTION_BYTES} bytes`);
      continue;
    }
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      issues.push(`${rel}: invalid JSON: ${error.message}`);
      continue;
    }
    const parsed = Question.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 20)) {
        issues.push(`${rel}:${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      continue;
    }
    const question = parsed.data;
    validateQuestionLocation(question, rel, issues);
    addUnique(questionIds, question.id, rel, 'question id', issues);
    for (const part of question.parts) addUnique(partIds, part.id, rel, 'part id', issues);
    for (const sourceRef of [question.assets.questionPdf, question.assets.solutionPdf].filter(Boolean)) {
      if (!isSafeRepositoryPath(sourceRef) || !sourceRef.endsWith('.pdf')) {
        issues.push(`${rel}: source PDF reference is not a safe .pdf path: ${sourceRef}`);
      } else if (path.posix.basename(sourceRef) !== question.source.file) {
        issues.push(`${rel}: source PDF basename must equal source.file ${question.source.file}`);
      }
    }
    for (const asset of collectAssetPaths(question)) referencedAssets.add(asset);
    questions.push(question);
  }

  const actualAssets = new Map();
  if (fs.existsSync(assetsRoot)) {
    for (const file of walkRegularFiles(assetsRoot, issues, root)) {
      const rel = posixRelative(root, file);
      if (rel.split('/').some((segment) => segment.startsWith('.'))) continue;
      if (path.extname(file).toLowerCase() !== '.png') {
        issues.push(`${rel}: unsupported packaged asset type`);
        continue;
      }
      const bytes = fs.readFileSync(file);
      if (bytes.length <= 0 || bytes.length > MAX_ASSET_BYTES) {
        issues.push(`${rel}: packaged asset must be 1..${MAX_ASSET_BYTES} bytes`);
        continue;
      }
      validatePng(bytes, rel, issues);
      actualAssets.set(rel, {
        bytes: bytes.length,
        mimeType: 'image/png',
        sha256: sha256(bytes),
      });
    }
  }

  for (const asset of referencedAssets) {
    if (!actualAssets.has(asset)) issues.push(`${asset}: referenced packaged asset is missing`);
  }
  for (const asset of actualAssets.keys()) {
    if (!referencedAssets.has(asset)) issues.push(`${asset}: packaged asset is not referenced by any question`);
  }

  const sortedAssets = Object.fromEntries([...actualAssets.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const manifest = {
    formatVersion: MANIFEST_FORMAT,
    assets: sortedAssets,
    rootSha256: sha256(Buffer.from(canonicalJson(sortedAssets), 'utf8')),
  };
  if (options.checkManifest !== false) {
    const manifestPath = path.join(root, MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) {
      issues.push(`${MANIFEST_FILE}: missing; run pnpm assets:manifest`);
    } else {
      let committed;
      try {
        committed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        issues.push(`${MANIFEST_FILE}: invalid JSON: ${error.message}`);
      }
      if (committed !== undefined && canonicalJson(committed) !== canonicalJson(manifest)) {
        issues.push(`${MANIFEST_FILE}: does not match packaged asset bytes; run pnpm assets:manifest`);
      }
    }
  }
  if (issues.length > 0) throw new BankValidationError(issues);
  return {
    questionCount: questions.length,
    partCount: partIds.size,
    assetCount: actualAssets.size,
    manifest,
  };
}

export async function writeAssetManifest(bankRoot) {
  const root = fs.realpathSync(path.resolve(bankRoot));
  const result = await validateBank(root, { checkManifest: false });
  const destination = path.join(root, MANIFEST_FILE);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
  const temporary = `${destination}.tmp-${process.pid}`;
  const fd = fs.openSync(temporary, 'wx', 0o644);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporary, destination);
  return result;
}

function validateQuestionLocation(question, rel, issues) {
  const [suitePrefix, idTerm] = TERM_ID[question.source.term];
  // The 2019 legacy-curriculum papers reuse the regular papers' question numbers.
  const legacySuffix = '-erstantritt-vor-mai-2018';
  const legacy = question.source.suite.endsWith(legacySuffix);
  const legacyTasks = new Set(['2019-ht-t2-2', '2019-ht-t2-3', '2019-ht-t2-4', '2019-nt1-t2-2', '2019-nt1-t2-3']);
  if (legacy && !legacyTasks.has(`${question.source.year}-${idTerm}-${question.source.part}-${question.source.nr}`)) {
    issues.push(`${rel}: unsupported legacy-curriculum task`);
  }
  const expectedSuite = `${suitePrefix}-${question.source.year}${legacy ? legacySuffix : ''}`;
  const expectedId = `${question.source.year}-${idTerm}${legacy ? '-alt' : ''}-${question.source.part}-${String(question.source.nr).padStart(2, '0')}`;
  if (question.source.suite !== expectedSuite) issues.push(`${rel}: source.suite must equal ${expectedSuite}`);
  if (question.id !== expectedId) issues.push(`${rel}: question id must equal ${expectedId}`);
  const parsed = path.posix.parse(rel);
  if (parsed.name !== question.id) issues.push(`${rel}: filename must equal question id ${question.id}`);
  if (path.posix.basename(parsed.dir) !== question.source.suite) {
    issues.push(`${rel}: parent directory must equal source.suite ${question.source.suite}`);
  }
  const termCode = TERM_FILE_CODE[question.source.term];
  const sourcePattern = new RegExp(
    `^\\[${question.source.year}${termCode}${legacy ? '-alt' : ''}\\]${question.source.part}-${question.source.nr}(?:-[a-z0-9.-]+)?\\.pdf$`,
  );
  if (!sourcePattern.test(question.source.file)) {
    issues.push(`${rel}: source.file does not agree with source year/term/part/nr`);
  }
}

function collectAssetPaths(value) {
  const assets = new Set();
  const visit = (item) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item === null || typeof item !== 'object') return;
    if (typeof item.src === 'string' && (item.t === 'fig' || item.kind === 'image')) {
      const normalized = item.src.replace(/^\/+/, '');
      if (!isSafeRepositoryPath(normalized) || !normalized.startsWith('assets/')) {
        throw new BankValidationError([`unsafe packaged asset path: ${item.src}`]);
      }
      assets.add(normalized);
    }
    Object.values(item).forEach(visit);
  };
  visit(value);
  return assets;
}

function addUnique(seen, id, file, label, issues) {
  const previous = seen.get(id);
  if (previous) issues.push(`${file}: duplicate global ${label} ${id} (already in ${previous})`);
  else seen.set(id, file);
}

function walkRegularFiles(directory, issues, root) {
  const rootStat = fs.lstatSync(directory, { throwIfNoEntry: false });
  if (!rootStat) {
    issues.push(`${posixRelative(root, directory)}: directory is missing`);
    return [];
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    issues.push(`${posixRelative(root, directory)}: must be a regular directory, not a symbolic link`);
    return [];
  }
  const realDirectory = fs.realpathSync(directory);
  if (!isWithin(root, realDirectory)) {
    issues.push(`${posixRelative(root, directory)}: resolves outside the bank root`);
    return [];
  }
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        issues.push(`${posixRelative(root, full)}: symbolic links are not allowed`);
      } else if (stat.isDirectory()) {
        const real = fs.realpathSync(full);
        if (!isWithin(root, real)) {
          issues.push(`${posixRelative(root, full)}: resolves outside the bank root`);
          continue;
        }
        walk(full);
      } else if (stat.isFile()) {
        const real = fs.realpathSync(full);
        if (!isWithin(root, real)) {
          issues.push(`${posixRelative(root, full)}: resolves outside the bank root`);
          continue;
        }
        files.push(full);
      } else {
        issues.push(`${posixRelative(root, full)}: must be a regular file`);
      }
    }
  };
  walk(directory);
  return files;
}

async function loadQuestionSchema(schemaFile, issues) {
  try {
    const bytes = fs.readFileSync(schemaFile);
    // Content-address the module URL so repeated validator calls after a local
    // edit cannot reuse Node's stale ESM cache.
    const module = await import(`${pathToFileURL(schemaFile).href}?sha256=${sha256(bytes)}`);
    if (typeof module.Question?.safeParse !== 'function') {
      issues.push('schema/question.ts: does not export the Question Zod schema');
    }
    if (issues.length > 0) throw new BankValidationError(issues);
    return module.Question;
  } catch (error) {
    if (error instanceof BankValidationError) throw error;
    throw new BankValidationError([`schema/question.ts: could not be loaded: ${error.message}`]);
  }
}

function validatePng(bytes, label, issues) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)
      || bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    issues.push(`${label}: bytes do not match image/png`);
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION
      || width * height > MAX_IMAGE_PIXELS) {
    issues.push(`${label}: PNG dimensions exceed the safe decoded-image budget`);
  }
}

function isSafeRepositoryPath(candidate) {
  return typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 1024
    && !candidate.includes('\\') && !candidate.includes('\0') && !candidate.startsWith('/')
    && candidate.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

function posixRelative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function isWithin(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function runCli() {
  const script = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(script), '..');
  try {
    const result = await (process.argv.includes('--write-manifest')
      ? writeAssetManifest(root)
      : validateBank(root));
    console.log(
      `[bank:validate] ${result.questionCount} questions, ${result.partCount} parts, `
      + `${result.assetCount} packaged assets; sha256 root ${result.manifest.rootSha256}`,
    );
  } catch (error) {
    if (error instanceof BankValidationError) {
      console.error(error.message);
      for (const issue of error.issues.slice(0, 100)) console.error(`  - ${issue}`);
      if (error.issues.length > 100) console.error(`  ... and ${error.issues.length - 100} more`);
    } else {
      console.error(error instanceof Error ? error.stack : String(error));
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await runCli();
