import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BankValidationError, validateBank, writeAssetManifest } from '../scripts/validate-bank.mjs';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+6j9xAAAAAElFTkSuQmCC',
  'base64',
);

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qed2-bank-validator-'));
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const question = {
    id: '2024-ht-t1-01', schemaVersion: 2, status: 'converted', lang: 'de',
    source: { suite: 'haupttermin-2024', year: 2024, term: 'haupttermin', part: 't1', nr: 1, file: '[2024h1]t1-1-ag.pdf' },
    title: 'Fixture', rights: { thirdPartyMaterial: false },
    assets: { questionPdf: 'assets/pdf/haupttermin-2024/[2024h1]t1-1-ag.pdf' },
    figures: [], prompt: [{ t: 'fig', src: 'assets/pdf/haupttermin-2024/fig/q.png', alt: '' }],
    parts: [{
      id: '2024-ht-t1-01-a', label: 'a', format: 'Offen', competencies: [], externalRefs: [], figures: [], solution: [],
      answer: { kind: 'open', rubric: [], grader: 'self' }, scoring: { mode: 'rubric', criteria: [{ desc: 'valid', points: 1 }] }, points: 1,
    }], externalRefs: [],
  };
  const questionDir = path.join(root, 'content/haupttermin-2024');
  const assetDir = path.join(root, 'assets/pdf/haupttermin-2024/fig');
  fs.mkdirSync(questionDir, { recursive: true });
  fs.mkdirSync(assetDir, { recursive: true });
  fs.mkdirSync(path.join(root, 'schema'));
  const schemaSource = fs.readFileSync(path.join(sourceRoot, 'schema/question.ts'), 'utf8')
    .replace('from "zod"', `from ${JSON.stringify(import.meta.resolve('zod'))}`);
  fs.writeFileSync(path.join(root, 'schema/question.ts'), schemaSource);
  fs.writeFileSync(path.join(questionDir, '2024-ht-t1-01.json'), `${JSON.stringify(question)}\n`);
  fs.writeFileSync(path.join(assetDir, 'q.png'), PNG);
  return root;
}

test('validator verifies content and deterministic asset manifest', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const generated = await writeAssetManifest(root);
  const checked = await validateBank(root);
  assert.equal(checked.questionCount, 1);
  assert.equal(checked.assetCount, 1);
  assert.deepEqual(checked.manifest, generated.manifest);
});

test('validator fails closed on asset tampering', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await writeAssetManifest(root);
  fs.appendFileSync(path.join(root, 'assets/pdf/haupttermin-2024/fig/q.png'), 'tampered');
  await assert.rejects(() => validateBank(root), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('does not match packaged asset bytes'));
  });
});

test('validator rejects an asset whose bytes do not match its MIME type', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'assets/pdf/haupttermin-2024/fig/q.png'), 'not a PNG');
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('bytes do not match image/png'));
  });
});

test('validator enforces globally unique part ids', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'content/haupttermin-2024/2024-ht-t1-01.json');
  const duplicateDirectory = path.join(root, 'content/duplicate');
  fs.mkdirSync(duplicateDirectory);
  fs.copyFileSync(source, path.join(duplicateDirectory, '2024-ht-t1-01.json'));
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('duplicate global part id'));
  });
});

test('validator rejects missing resources and source/file drift', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const questionFile = path.join(root, 'content/haupttermin-2024/2024-ht-t1-01.json');
  const value = JSON.parse(fs.readFileSync(questionFile, 'utf8'));
  value.source.file = '[2024h1]t1-2-ag.pdf';
  fs.writeFileSync(questionFile, JSON.stringify(value));
  fs.rmSync(path.join(root, 'assets/pdf/haupttermin-2024/fig/q.png'));
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    assert.ok(error.issues.some((issue) => issue.includes('source.file does not agree')));
    return error.issues.some((issue) => issue.includes('referenced packaged asset is missing'));
  });
});

test('validator rejects a schema symlink before executing it', async (t) => {
  const root = fixture();
  const external = `${root}-external-schema.ts`;
  const marker = `${root}-schema-executed`;
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(external, { force: true });
    fs.rmSync(marker, { force: true });
  });
  fs.writeFileSync(
    external,
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'executed'); export const Question = {};\n`,
  );
  fs.rmSync(path.join(root, 'schema/question.ts'));
  fs.symlinkSync(external, path.join(root, 'schema/question.ts'));
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('symbolic links are not allowed'));
  });
  assert.equal(fs.existsSync(marker), false);
});

test('2019 legacy papers retain their original numbers without colliding with regular papers', async (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const original = JSON.parse(fs.readFileSync(path.join(root, 'content/haupttermin-2024/2024-ht-t1-01.json'), 'utf8'));
  for (const [term, idTerm, suite, code, nr] of [
    ['haupttermin', 'ht', 'haupttermin', 'h1', 2],
    ['haupttermin', 'ht', 'haupttermin', 'h1', 3],
    ['haupttermin', 'ht', 'haupttermin', 'h1', 4],
    ['nebentermin-1', 'nt1', 'nebentermin1', 'n1', 2],
    ['nebentermin-1', 'nt1', 'nebentermin1', 'n1', 3],
  ]) {
    const q = structuredClone(original);
    q.id = `2019-${idTerm}-alt-t2-0${nr}`;
    q.source = { suite: `${suite}-2019-erstantritt-vor-mai-2018`, year: 2019, term, part: 't2', nr, file: `[2019${code}-alt]t2-${nr}.pdf` };
    q.assets.questionPdf = `assets/pdf/${q.source.suite}/${q.source.file}`;
    q.parts[0].id = `${q.id}-a`;
    const directory = path.join(root, 'content', q.source.suite);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, `${q.id}.json`), JSON.stringify(q));
  }
  assert.equal((await validateBank(root, { checkManifest: false })).questionCount, 6);
  const legacyFile = path.join(root, 'content/haupttermin-2019-erstantritt-vor-mai-2018/2019-ht-alt-t2-02.json');
  const wrongEdition = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
  wrongEdition.source.file = '[2019h1]t2-2.pdf';
  fs.writeFileSync(legacyFile, JSON.stringify(wrongEdition));
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) =>
    error instanceof BankValidationError && error.issues.some((issue) => issue.includes('source.file does not agree')));
});

test('validator rejects symbolic content roots and traversal entries', async (t) => {
  const root = fixture();
  const externalRoot = `${root}-external-content`;
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(externalRoot, { recursive: true, force: true });
  });
  fs.renameSync(path.join(root, 'content'), externalRoot);
  fs.symlinkSync(externalRoot, path.join(root, 'content'), 'dir');
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('regular directory'));
  });

  fs.rmSync(path.join(root, 'content'));
  fs.renameSync(externalRoot, path.join(root, 'content'));
  const externalFile = `${root}-outside.json`;
  fs.writeFileSync(externalFile, '{}');
  t.after(() => fs.rmSync(externalFile, { force: true }));
  fs.symlinkSync(externalFile, path.join(root, 'content/outside.json'));
  await assert.rejects(() => validateBank(root, { checkManifest: false }), (error) => {
    assert.ok(error instanceof BankValidationError);
    return error.issues.some((issue) => issue.includes('symbolic links are not allowed'));
  });
});
