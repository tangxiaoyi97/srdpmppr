import { z } from "zod";

/* QED · Question Schema v2 — single source of truth.
 * One Aufgabe = one Question, holding 1..n Parts (sub-tasks a/b/c).
 * status lifecycle:  linked → converted → reviewed
 *   linked    : metadata + official links + PDF assets; CONTENT not yet extracted (PDF is the source)
 *   converted : prompt/answer/figures/scoring filled (PDF→KaTeX done)
 *   reviewed  : a human approved it side-by-side against the source PDF
 */

export const InlineNode = z.discriminatedUnion("t", [
  z.object({ t: z.literal("text"), v: z.string() }),
  z.object({ t: z.literal("math"), v: z.string() }),     // KaTeX source
  z.object({ t: z.literal("fig"), src: z.string(), alt: z.string().default("") }),  // figure anchored inline in the text stream
]);
export const RichText = z.array(InlineNode);

export const Figure = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), src: z.string(), alt: z.string() }),   // migration default
  z.object({ kind: z.literal("plot"), fns: z.array(z.string()),
    window: z.object({ xmin: z.number(), xmax: z.number(), ymin: z.number(), ymax: z.number() }) }),
  z.object({ kind: z.literal("chart"), chart: z.enum(["boxplot","histogram","stemleaf","scatter","bar"]), data: z.unknown() }),
  z.object({ kind: z.literal("geometry"), construction: z.unknown() }),
  z.object({ kind: z.literal("svg"), markup: z.string() }),
]);

const NumericBlank = z.object({ id: z.string(), label: z.string().optional(), value: z.number(), tol: z.number().default(1e-9), unit: z.string().optional() });
export const Answer = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), options: z.array(RichText), correct: z.array(z.number().int()), selectCount: z.number().int() }),
  z.object({ kind: z.literal("matching"), left: z.array(RichText), right: z.array(RichText), pairs: z.array(z.tuple([z.number().int(), z.number().int()])) }),
  z.object({ kind: z.literal("numeric"), blanks: z.array(NumericBlank).min(1) }),
  z.object({ kind: z.literal("expression"), canonical: z.string(), vars: z.array(z.string()).default([]), checker: z.literal("cas") }),
  z.object({ kind: z.literal("interval"), lower: z.number(), upper: z.number(), lowerClosed: z.boolean(), upperClosed: z.boolean() }),
  z.object({ kind: z.literal("open"), rubric: RichText, grader: z.enum(["self","ai"]) }),
]);

export const Scoring = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("allOrNothing"), points: z.number() }),                                  // "x aus n", most Teil-1
  z.object({ mode: z.literal("perBlank"), pointsPerCorrect: z.number(), max: z.number() }),
  z.object({ mode: z.literal("tiered"), tiers: z.array(z.object({ minCorrect: z.number().int(), points: z.number() })) }),  // [0 / ½ / 1]
  z.object({ mode: z.literal("rubric"), criteria: z.array(z.object({ desc: z.string(), points: z.number() })) }),           // Teil-2 "Ein Punkt für …"
]);

const COMPETENCY_CODE = /^(AG|FA|AN|WS) \d\.\d+$/;          // "AN 4.3" (pool prints "AN4.3")
export const Competency = z.object({
  code: z.string().regex(COMPETENCY_CODE),
  description: z.string().optional(),
  source: z.enum(["aufgabenpool","printed","inferred"]),
  verifiedAt: z.string().optional(),
});

export const ExternalRef = z.object({
  system: z.enum(["aufgabenpool","maturaArchiv","other"]),
  id: z.string(), baseId: z.string().optional(),
  url: z.string().url().optional(), license: z.string().optional(), verifiedAt: z.string().optional(),
});

export const Part = z.object({
  id: z.string(),                                          // derived: `${question.id}-${label}`
  label: z.string(),
  format: z.string(),                                      // official Antwortformat, verbatim ("2 aus 5", "Halboffenes Antwortformat", …)
  competencies: z.array(Competency).default([]),
  externalRefs: z.array(ExternalRef).default([]),
  // —— filled at conversion ——
  prompt: RichText.optional(),
  figures: z.array(Figure).default([]),
  answer: Answer.optional(),
  scoring: Scoring.optional(),
  points: z.number().optional(),
  solution: z.array(z.object({ steps: RichText.optional(), result: RichText.optional(), note: z.string().optional(), figures: z.array(Figure).default([]) })).default([]),
});

export const Question = z.object({
  id: z.string(),                                          // sovereign PK, derived from source: "2023-ht-t1-09"
  schemaVersion: z.literal(2),
  status: z.enum(["linked","converted","reviewed"]),
  lang: z.string().default("de"),
  source: z.object({
    suite: z.string(), year: z.number().int(),
    term: z.enum(["haupttermin","nebentermin-1","nebentermin-2","herbsttermin","wintertermin"]),
    part: z.enum(["t1","t2"]), nr: z.number().int(), file: z.string(),
  }),
  title: z.string(),
  rights: z.object({ thirdPartyMaterial: z.boolean(), note: z.string().optional() }),  // the "*" marker
  assets: z.object({ questionPdf: z.string(), solutionPdf: z.string().optional() }),   // PDF stays the content source until conversion
  prompt: RichText.optional(),                             // shared stem (filled at conversion)
  figures: z.array(Figure).default([]),
  parts: z.array(Part).min(1),
  externalRefs: z.array(ExternalRef).default([]),          // question-level link (base Aufgabe)
}).superRefine((q, ctx) => {
  if (q.status !== "linked") {
    q.parts.forEach((p, i) => {
      if (!p.answer)        ctx.addIssue({ code: "custom", path: ["parts", i, "answer"],  message: "required once status≥converted" });
      if (!p.scoring)       ctx.addIssue({ code: "custom", path: ["parts", i, "scoring"], message: "required once status≥converted" });
      if (p.points == null) ctx.addIssue({ code: "custom", path: ["parts", i, "points"],  message: "required once status≥converted" });
    });
  }
});

export type Question = z.infer<typeof Question>;
export const totalPoints = (q: Question) => q.parts.reduce((s, p) => s + (p.points ?? 0), 0);
