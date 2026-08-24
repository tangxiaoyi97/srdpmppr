import assert from 'node:assert/strict';
import test from 'node:test';
import { Question } from '../schema/question.ts';

function question() {
  return {
    id: '2024-ht-t1-01',
    schemaVersion: 3,
    status: 'converted',
    lang: 'de',
    source: {
      suite: 'haupttermin-2024', year: 2024, term: 'haupttermin', part: 't1', nr: 1,
      file: '[2024h1]t1-1-ag.pdf',
    },
    title: 'Fixture',
    rights: { thirdPartyMaterial: false },
    assets: { questionPdf: 'assets/pdf/haupttermin-2024/[2024h1]t1-1-ag.pdf' },
    figures: [],
    parts: [{
      id: '2024-ht-t1-01-a', label: 'a', format: 'Zuordnungsformat', competencies: [], externalRefs: [],
      figures: [], solution: [], points: 1,
      answer: {
        kind: 'matching', left: [[{ t: 'text', v: 'L' }]], right: [[{ t: 'text', v: 'R' }]], pairs: [[0, 0]],
        candidateGroups: [{ leftIndices: [0], rightIndices: [0] }],
      },
      scoring: { mode: 'allOrNothing', points: 1 },
    }],
    externalRefs: [],
  };
}

test('schema rejects unknown keys at every contract object', () => {
  const value = question();
  value.parts[0].answer.candidateGroups[0].typo = true;
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /typo/);
});

test('schema rejects invalid matching indices and candidateGroups', () => {
  const value = question();
  value.parts[0].answer.pairs = [[0, 1]];
  value.parts[0].answer.candidateGroups[0].rightIndices = [1];
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /outside right|exactly cover/);
});

test('schema requires every matching left entry exactly once', () => {
  const value = question();
  value.parts[0].answer.left.push([{ t: 'text', v: 'L2' }]);
  value.parts[0].answer.right.push([{ t: 'text', v: 'R2' }]);
  value.parts[0].answer.candidateGroups[0].leftIndices.push(1);
  value.parts[0].answer.candidateGroups[0].rightIndices.push(1);
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /every left entry/);
});

test('schema rejects scoring totals that disagree with part points', () => {
  const value = question();
  value.parts[0].points = 2;
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /scoring maximum/);
});

test('schema rejects duplicate and out-of-range choice indices', () => {
  const value = question();
  value.parts[0].answer = {
    kind: 'choice', options: [[{ t: 'text', v: 'A' }]], correct: [1, 1], selectCount: 2,
  };
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /unique/);
  assert.match(JSON.stringify(result.error.issues), /outside options/);
});

test('schema rejects an empty interval encoded with equal open bounds', () => {
  const value = question();
  value.parts[0].answer = {
    kind: 'interval', lower: 1, upper: 1, lowerClosed: false, upperClosed: true,
  };
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /both be closed/);
});

test('schema accepts a strict valid v3 question', () => {
  assert.equal(Question.safeParse(question()).success, true);
});

test('schema v4 accepts strict, versioned learning metadata and grounded solution alternatives', () => {
  const value = question();
  value.schemaVersion = 4;
  value.parts[0].learning = {
    schemaVersion: 1,
    concepts: ['algebra.linear-equations'],
    prerequisites: ['algebra.operations'],
    difficulty: 2,
    estimatedMinutes: 7,
    misconceptions: [{ id: 'sign-change', label: 'Vorzeichen beim Umformen' }],
    hints: [
      { level: 1, content: [{ t: 'text', v: 'Markiere die unbekannte Größe.' }] },
      { level: 2, content: [{ t: 'text', v: 'Bringe alle x-Terme auf eine Seite.' }] },
      { level: 3, content: [{ t: 'math', v: '2x=6' }] },
    ],
  };
  value.parts[0].solution = [{
    id: 'standard',
    steps: [{ t: 'text', v: 'Umformen' }],
    result: [{ t: 'math', v: 'x=3' }],
    alternatives: [[{ t: 'text', v: 'Auch durch Einsetzen lösbar.' }]],
    figures: [],
  }];
  assert.equal(Question.safeParse(value).success, true);
});

test('schema keeps v4 learning fields out of immutable v2/v3 records', () => {
  const value = question();
  value.parts[0].learning = { schemaVersion: 1, concepts: ['algebra.linear-equations'] };
  value.parts[0].solution = [{ id: 'standard', result: [{ t: 'math', v: 'x=3' }], figures: [] }];
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /requires schemaVersion 4/);
});

test('schema requires a complete ordered three-level hint ladder with stable unique ids', () => {
  const value = question();
  value.schemaVersion = 4;
  value.parts[0].learning = {
    schemaVersion: 1,
    concepts: ['algebra.linear-equations', 'algebra.linear-equations'],
    hints: [
      { level: 1, content: [{ t: 'text', v: 'Erster Hinweis' }] },
      { level: 3, content: [{ t: 'text', v: 'Zu früh' }] },
      { level: 2, content: [{ t: 'text', v: 'Zu spät' }] },
    ],
  };
  const result = Question.safeParse(value);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error.issues), /ids must be unique/);
  assert.match(JSON.stringify(result.error.issues), /exactly 1, 2, 3/);
});

test('grader ai requires grounded solution text but keeps valid all-or-nothing scoring', () => {
  const value = question();
  value.parts[0].answer = {
    kind: 'open', rubric: [{ t: 'text', v: 'Begründung und Ergebnis stimmen.' }], grader: 'ai',
  };
  value.parts[0].solution = [{ note: 'Nur ein interner Hinweis', figures: [] }];
  const rejected = Question.safeParse(value);
  assert.equal(rejected.success, false);
  assert.match(JSON.stringify(rejected.error.issues), /effective solution steps or result/);

  value.parts[0].solution = [{ steps: [{ t: 'fig', src: 'solution.svg' }], figures: [] }];
  const figureOnly = Question.safeParse(value);
  assert.equal(figureOnly.success, false);
  assert.match(JSON.stringify(figureOnly.error.issues), /effective solution steps or result/);

  value.parts[0].solution = [{ result: [{ t: 'math', v: 'x=3' }], figures: [] }];
  value.parts[0].answer.rubric = [{ t: 'fig', src: 'rubric.svg' }];
  const figureOnlyRubric = Question.safeParse(value);
  assert.equal(figureOnlyRubric.success, false);
  assert.match(JSON.stringify(figureOnlyRubric.error.issues), /effective rubric/);

  value.parts[0].answer.rubric = [{ t: 'text', v: 'Begründung und Ergebnis stimmen.' }];
  assert.equal(Question.safeParse(value).success, true);
});
