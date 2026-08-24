import { z } from "zod";

/* QED · Question Schema v2/v3/v4 — single source of truth.
 * One Aufgabe = one Question, holding 1..n Parts (sub-tasks a/b/c).
 * status lifecycle: linked → converted → reviewed
 */

const strictObject = z.strictObject;
const nonNegativeInt = z.number().int().nonnegative();
const positivePoints = z.number().positive();
const stableLearningId = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, "must be a stable lowercase id");

export const InlineNode = z.discriminatedUnion("t", [
  strictObject({ t: z.literal("text"), v: z.string() }),
  strictObject({ t: z.literal("math"), v: z.string() }),
  strictObject({ t: z.literal("fig"), src: z.string().min(1), alt: z.string().default("") }),
]);
export const RichText = z.array(InlineNode);

function hasEffectiveRichText(value: z.infer<typeof RichText> | undefined): boolean {
  return value?.some((node) => node.t === "fig" || node.v.trim().length > 0) ?? false;
}

function hasGroundedTextOrMath(value: z.infer<typeof RichText> | undefined): boolean {
  return value?.some((node) => node.t !== "fig" && node.v.trim().length > 0) ?? false;
}

export const Figure = z.discriminatedUnion("kind", [
  strictObject({ kind: z.literal("image"), src: z.string().min(1), alt: z.string() }),
  strictObject({
    kind: z.literal("plot"),
    fns: z.array(z.string()),
    window: strictObject({ xmin: z.number(), xmax: z.number(), ymin: z.number(), ymax: z.number() }),
  }),
  strictObject({
    kind: z.literal("chart"),
    chart: z.enum(["boxplot", "histogram", "stemleaf", "scatter", "bar"]),
    data: z.unknown(),
  }),
  strictObject({ kind: z.literal("geometry"), construction: z.unknown() }),
  strictObject({ kind: z.literal("svg"), markup: z.string() }),
]);

const NumericBlank = strictObject({
  id: z.string().min(1),
  label: z.string().optional(),
  value: z.number(),
  tol: z.number().nonnegative().default(1e-9),
  unit: z.string().optional(),
});
const CandidateGroup = strictObject({
  leftIndices: z.array(nonNegativeInt).min(1),
  rightIndices: z.array(nonNegativeInt).min(1),
  label: RichText.optional(),
});

const ChoiceAnswer = strictObject({
  kind: z.literal("choice"),
  options: z.array(RichText).min(1),
  correct: z.array(nonNegativeInt).min(1),
  selectCount: z.number().int().positive(),
}).superRefine((answer, ctx) => {
  if (answer.selectCount !== answer.correct.length) {
    ctx.addIssue({ code: "custom", path: ["selectCount"], message: "must equal correct.length" });
  }
  if (new Set(answer.correct).size !== answer.correct.length) {
    ctx.addIssue({ code: "custom", path: ["correct"], message: "indices must be unique" });
  }
  answer.correct.forEach((index, i) => {
    if (index >= answer.options.length) {
      ctx.addIssue({ code: "custom", path: ["correct", i], message: "index is outside options" });
    }
  });
});

const MatchingAnswer = strictObject({
  kind: z.literal("matching"),
  left: z.array(RichText).min(1),
  right: z.array(RichText).min(1),
  pairs: z.array(z.tuple([nonNegativeInt, nonNegativeInt])).min(1),
  candidateGroups: z.array(CandidateGroup).min(1).optional(),
}).superRefine((answer, ctx) => {
  const left = answer.pairs.map((pair) => pair[0]);
  const right = answer.pairs.map((pair) => pair[1]);
  if (new Set(left).size !== left.length) {
    ctx.addIssue({ code: "custom", path: ["pairs"], message: "left indices must be unique" });
  }
  if (new Set(right).size !== right.length) {
    ctx.addIssue({ code: "custom", path: ["pairs"], message: "right indices must be unique" });
  }
  if (answer.pairs.length !== answer.left.length) {
    ctx.addIssue({ code: "custom", path: ["pairs"], message: "must match every left entry exactly once" });
  }
  answer.pairs.forEach(([leftIndex, rightIndex], i) => {
    if (leftIndex >= answer.left.length) {
      ctx.addIssue({ code: "custom", path: ["pairs", i, 0], message: "index is outside left" });
    }
    if (rightIndex >= answer.right.length) {
      ctx.addIssue({ code: "custom", path: ["pairs", i, 1], message: "index is outside right" });
    }
  });
  if (!answer.candidateGroups) return;
  const checkCoverage = (side: "leftIndices" | "rightIndices", size: number) => {
    const indices = answer.candidateGroups!.flatMap((group) => group[side]);
    if (indices.length !== size || new Set(indices).size !== size || indices.some((index) => index >= size)) {
      ctx.addIssue({
        code: "custom",
        path: ["candidateGroups"],
        message: `${side} must be disjoint and exactly cover 0..${size - 1}`,
      });
    }
  };
  checkCoverage("leftIndices", answer.left.length);
  checkCoverage("rightIndices", answer.right.length);
  answer.pairs.forEach(([leftIndex, rightIndex], i) => {
    const leftGroup = answer.candidateGroups!.findIndex((group) => group.leftIndices.includes(leftIndex));
    const rightGroup = answer.candidateGroups!.findIndex((group) => group.rightIndices.includes(rightIndex));
    if (leftGroup !== rightGroup) {
      ctx.addIssue({ code: "custom", path: ["pairs", i], message: "pair crosses candidateGroups" });
    }
  });
});

const NumericAnswer = strictObject({
  kind: z.literal("numeric"),
  blanks: z.array(NumericBlank).min(1),
}).superRefine((answer, ctx) => {
  const ids = answer.blanks.map((blank) => blank.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", path: ["blanks"], message: "blank ids must be unique" });
  }
});

const IntervalAnswer = strictObject({
  kind: z.literal("interval"),
  lower: z.number(),
  upper: z.number(),
  lowerClosed: z.boolean(),
  upperClosed: z.boolean(),
}).superRefine((answer, ctx) => {
  if (answer.lower > answer.upper) {
    ctx.addIssue({ code: "custom", path: ["upper"], message: "must be >= lower" });
  } else if (answer.lower === answer.upper && (!answer.lowerClosed || !answer.upperClosed)) {
    ctx.addIssue({ code: "custom", path: ["upper"], message: "equal bounds must both be closed" });
  }
});

export const Answer = z.discriminatedUnion("kind", [
  ChoiceAnswer,
  MatchingAnswer,
  NumericAnswer,
  strictObject({
    kind: z.literal("expression"),
    canonical: z.string().min(1),
    vars: z.array(z.string().min(1)).default([]),
    checker: z.literal("cas"),
  }),
  IntervalAnswer,
  strictObject({ kind: z.literal("open"), rubric: RichText, grader: z.enum(["self", "ai"]) }),
]);

export const Scoring = z.discriminatedUnion("mode", [
  strictObject({ mode: z.literal("allOrNothing"), points: positivePoints }),
  strictObject({ mode: z.literal("perBlank"), pointsPerCorrect: positivePoints, max: positivePoints }),
  strictObject({
    mode: z.literal("tiered"),
    tiers: z.array(strictObject({ minCorrect: z.number().int().positive(), points: positivePoints })).min(1),
  }),
  strictObject({
    mode: z.literal("rubric"),
    criteria: z.array(strictObject({ desc: z.string().min(1), points: positivePoints })).min(1),
  }),
]);

const COMPETENCY_CODE = /^(AG|FA|AN|WS) \d\.\d+$/;
export const Competency = strictObject({
  code: z.string().regex(COMPETENCY_CODE),
  description: z.string().optional(),
  source: z.enum(["aufgabenpool", "printed", "inferred"]),
  verifiedAt: z.string().optional(),
});

export const ExternalRef = strictObject({
  system: z.enum(["aufgabenpool", "maturaArchiv", "other"]),
  id: z.string().min(1),
  baseId: z.string().optional(),
  url: z.string().url().optional(),
  license: z.string().optional(),
  verifiedAt: z.string().optional(),
});

const LearningHint = strictObject({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  content: RichText.refine(hasEffectiveRichText, "must contain effective hint content"),
});

/**
 * Optional, authored learning metadata introduced with question schema v4.
 * IDs are language-independent stable keys. Hints stay in RichText; short
 * misconception labels are bounded plain text for compact filtering UI.
 * A hints array is deliberately all-or-nothing so clients never mistake one
 * long hint for a complete progressive-hint ladder.
 */
export const LearningMetadataV1 = strictObject({
  schemaVersion: z.literal(1),
  concepts: z.array(stableLearningId).min(1).max(32).optional(),
  prerequisites: z.array(stableLearningId).min(1).max(32).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  estimatedMinutes: z.number().int().min(1).max(180).optional(),
  misconceptions: z.array(strictObject({
    id: stableLearningId,
    label: z.string().trim().min(1).max(240),
  })).min(1).max(24).optional(),
  hints: z.array(LearningHint).length(3).optional(),
}).superRefine((learning, ctx) => {
  const unique = (values: string[] | undefined, path: string) => {
    if (values && new Set(values).size !== values.length) {
      ctx.addIssue({ code: "custom", path: [path], message: "ids must be unique" });
    }
  };
  unique(learning.concepts, "concepts");
  unique(learning.prerequisites, "prerequisites");
  unique(learning.misconceptions?.map((item) => item.id), "misconceptions");
  if (learning.hints && learning.hints.some((hint, index) => hint.level !== index + 1)) {
    ctx.addIssue({ code: "custom", path: ["hints"], message: "levels must be exactly 1, 2, 3 in order" });
  }
});

const Solution = strictObject({
  id: stableLearningId.optional(),
  steps: RichText.optional(),
  result: RichText.optional(),
  alternatives: z.array(RichText.refine(hasEffectiveRichText, "must contain effective alternative content")).min(1).max(10).optional(),
  note: z.string().optional(),
  figures: z.array(Figure).default([]),
});

export const Part = strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  // Linked legacy records may not yet have the official answer-format label.
  format: z.string(),
  competencies: z.array(Competency).default([]),
  externalRefs: z.array(ExternalRef).default([]),
  prompt: RichText.optional(),
  figures: z.array(Figure).default([]),
  answer: Answer.optional(),
  scoring: Scoring.optional(),
  points: positivePoints.optional(),
  solution: z.array(Solution).default([]),
  learning: LearningMetadataV1.optional(),
});

export const Question = strictObject({
  id: z.string().min(1),
  schemaVersion: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  status: z.enum(["linked", "converted", "reviewed"]),
  lang: z.string().default("de"),
  source: strictObject({
    suite: z.string().min(1),
    year: z.number().int(),
    term: z.enum(["haupttermin", "nebentermin-1", "nebentermin-2", "herbsttermin", "wintertermin"]),
    part: z.enum(["t1", "t2"]),
    nr: z.number().int().positive(),
    file: z.string().min(1),
  }),
  title: z.string().min(1),
  rights: strictObject({ thirdPartyMaterial: z.boolean(), note: z.string().optional() }),
  // These are source references. Only figure src values are packaged resources.
  assets: strictObject({ questionPdf: z.string().min(1), solutionPdf: z.string().min(1).optional() }),
  prompt: RichText.optional(),
  figures: z.array(Figure).default([]),
  parts: z.array(Part).min(1),
  externalRefs: z.array(ExternalRef).default([]),
}).superRefine((question, ctx) => {
  const partIds = new Set<string>();
  const labels = new Set<string>();
  question.parts.forEach((part, i) => {
    const expectedPartId = `${question.id}-${part.label}`;
    if (part.id !== expectedPartId) {
      ctx.addIssue({ code: "custom", path: ["parts", i, "id"], message: `must equal ${expectedPartId}` });
    }
    if (partIds.has(part.id)) ctx.addIssue({ code: "custom", path: ["parts", i, "id"], message: "must be unique" });
    if (labels.has(part.label)) ctx.addIssue({ code: "custom", path: ["parts", i, "label"], message: "must be unique" });
    partIds.add(part.id);
    labels.add(part.label);

    // v2/v3 are immutable published contracts. Learning metadata and stable
    // solution identifiers are additive v4 fields, never retroactively
    // interpreted on an older version.
    if (question.schemaVersion < 4) {
      if (part.learning !== undefined) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "learning"], message: "requires schemaVersion 4" });
      }
      part.solution.forEach((entry, solutionIndex) => {
        if (entry.id !== undefined) {
          ctx.addIssue({ code: "custom", path: ["parts", i, "solution", solutionIndex, "id"], message: "requires schemaVersion 4" });
        }
        if (entry.alternatives !== undefined) {
          ctx.addIssue({ code: "custom", path: ["parts", i, "solution", solutionIndex, "alternatives"], message: "requires schemaVersion 4" });
        }
      });
    }
    const solutionIds = part.solution.flatMap((entry) => entry.id ? [entry.id] : []);
    if (new Set(solutionIds).size !== solutionIds.length) {
      ctx.addIssue({ code: "custom", path: ["parts", i, "solution"], message: "solution ids must be unique" });
    }

    if (question.status !== "linked") {
      if (!part.answer) ctx.addIssue({ code: "custom", path: ["parts", i, "answer"], message: "required once status≥converted" });
      if (!part.scoring) ctx.addIssue({ code: "custom", path: ["parts", i, "scoring"], message: "required once status≥converted" });
      if (part.points == null) ctx.addIssue({ code: "custom", path: ["parts", i, "points"], message: "required once status≥converted" });
    }

    if (part.answer?.kind === "open" && part.answer.grader === "ai") {
      if (!hasGroundedTextOrMath(part.answer.rubric)) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "answer", "rubric"], message: "grader ai requires an effective rubric" });
      }
      const hasGroundedSolution = part.solution.some(
        (entry) => hasGroundedTextOrMath(entry.steps) || hasGroundedTextOrMath(entry.result),
      );
      if (!hasGroundedSolution) {
        ctx.addIssue({
          code: "custom",
          path: ["parts", i, "answer", "grader"],
          message: "grader ai requires effective solution steps or result; notes and figures alone are advisory",
        });
      }
      if (!part.scoring || part.points == null || part.scoring.mode === "perBlank") {
        ctx.addIssue({
          code: "custom",
          path: ["parts", i, "answer", "grader"],
          message: "grader ai requires a scoreable open-answer scoring mode",
        });
      }
    }
    if (!part.answer || !part.scoring || part.points == null) return;

    let scoringMaximum = 0;
    if (part.scoring.mode === "allOrNothing") scoringMaximum = part.scoring.points;
    if (part.scoring.mode === "perBlank") {
      scoringMaximum = part.scoring.max;
      if (part.answer.kind !== "numeric") {
        ctx.addIssue({ code: "custom", path: ["parts", i, "scoring"], message: "perBlank requires a numeric answer" });
      } else if (Math.abs(part.scoring.pointsPerCorrect * part.answer.blanks.length - part.scoring.max) > 1e-9) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "scoring", "max"], message: "must equal pointsPerCorrect × blanks.length" });
      }
    }
    if (part.scoring.mode === "tiered") {
      const tiers = part.scoring.tiers;
      scoringMaximum = Math.max(...tiers.map((tier) => tier.points));
      const thresholds = tiers.map((tier) => tier.minCorrect);
      if (new Set(thresholds).size !== thresholds.length || thresholds.some((value, index) => index > 0 && value <= thresholds[index - 1]!)) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "scoring", "tiers"], message: "minCorrect thresholds must be unique and ascending" });
      }
      if (tiers.some((tier, index) => index > 0 && tier.points <= tiers[index - 1]!.points)) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "scoring", "tiers"], message: "tier points must be ascending" });
      }
      const possible = part.answer.kind === "choice" ? part.answer.correct.length
        : part.answer.kind === "matching" ? part.answer.pairs.length
        : part.answer.kind === "numeric" ? part.answer.blanks.length
        : undefined;
      if (possible !== undefined && thresholds.some((threshold) => threshold > possible)) {
        ctx.addIssue({ code: "custom", path: ["parts", i, "scoring", "tiers"], message: "minCorrect exceeds the answer item count" });
      }
    }
    if (part.scoring.mode === "rubric") {
      scoringMaximum = part.scoring.criteria.reduce((sum, criterion) => sum + criterion.points, 0);
    }
    if (Math.abs(scoringMaximum - part.points) > 1e-9) {
      ctx.addIssue({ code: "custom", path: ["parts", i, "points"], message: `must equal scoring maximum ${scoringMaximum}` });
    }
  });
});

export type Question = z.infer<typeof Question>;
export const totalPoints = (question: Question) => question.parts.reduce((sum, part) => sum + (part.points ?? 0), 0);
