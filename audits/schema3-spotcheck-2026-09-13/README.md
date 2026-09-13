# Schema 3 image, reference and identity audit — 13 September 2026

This audit rechecks the completed 400-task conversion and a large part of the older bank. It found
and repaired substantive pre-existing image and answer errors. The final local bank has **1,044
schema 3 questions, 1,672 parts and 808 referenced PNG assets**. Changes are not committed or pushed.

## What was checked

| Check | Actual coverage |
| --- | --- |
| PNG content, labels, crop boundaries and question/solution placement | **601 current PNGs in 341 questions**; 331/331 conversion PNGs and 270 older-bank PNGs |
| Older questions with a PNG and a choice or matching answer | **105/105 questions**, including every current PNG in those questions and their original answer keys |
| Independent second review of high-impact repairs | 10 questions, against original question and solution PDFs |
| Source question/solution file bindings | **2,088/2,088**, including original printed task number and title checks |
| Current official PDF links | **978/978 unique URLs**, successful GET, PDF signature and saved content hash; 3,453 reference occurrences |
| Direct Aufgabenpool associations | **915 questions**, live catalogue IDs, printed PDF IDs/titles and original exam date or term/year |
| Schema and resources | All 1,044 JSON records and 808 assets; no missing or unreferenced resources |
| Formula syntax | 9,401 rich-math nodes, no parsing errors |
| Repository tests | 19 passed, 0 failed |

The initial sample contained 80 older PNGs across 23 suites. Confirmed defects triggered an expansion
to all 105 older graph-choice/matching questions, same-question assets, and a separate Tennis check.
The visual count is a union of explicitly documented asset paths, not a sum that double-counts reviews.
Machine download, title, date and hash checks are distinct from visual content review.

## Repairs

- Replaced or re-cropped **107 existing PNGs**, added **43 faithful original crops**, and retired
  **7 unreferenced combined images** replaced by separate choices. All new and changed crops were
  inspected against their source PDFs. No diagrams were invented or generated.
- Corrected **7 choice/matching answer keys** against original solution marks and actual packaged
  option order. Exact old/new indices appear in [coverage-and-changes.json](coverage-and-changes.json).
- Repaired missing diagrams, incorrect option descriptions, figure placement, shared conditions
  needed by independent subparts, and confirmed formula/scoring defects. **45 older question JSONs**
  have substantive changes, excluding schema-version and external-reference changes; other questions
  can also have an image-only repair without a JSON change.
- Removed the erroneous trailing `a` from **519 Typ-1 external part IDs**. Internal question and part
  IDs are unchanged. Typ-1 tasks have a displayed whole-task ID such as `1_1340`, not `1_1340a`.
- Added original German examination references to **45 questions that had no external references**.
  Added **12 verified matching pool associations** and one explicitly labeled adapted association.
  Fixed the title `2021-nt2-t1-06` from the diagram label “Mauer” to the original title “Leiter”.
- Restored the missing `2022-ht-t2-02-c1` reference using real whole-task ID `2_114`, linked to PDF
  page 2. The PDF contains part c, but the catalogue has no displayed `2_114c` entry; none was invented.

Representative substantive findings:

| Question | Confirmed defect and repair |
| --- | --- |
| `2020-ht-t1-22` | Prompt PNG was the answer-option table. Restored the original probability table. |
| `2020-nt2-t1-16` | Alternative F was absent and the answer mapping was wrong. Restored A–F, original placement and D/C/F/A mapping. |
| `2019-nt2-t2-03` | b2 showed the wrong wealth-threshold diagram. Restored its Lorenz curve, original solution drawing, accepted answer forms and necessary c2 context. |
| `2023-het-t1-06` | Triangle was replaced by an answer table. Restored the original labeled triangle. |
| `2023-wt-t2-02` | Question and solution figures showed unrelated tables. Restored the blank plotting grid and the original boxplot solution separately. |
| `2025-het-t1-20` | Stem-and-leaf plot was missing; its PNG showed the options instead. Restored the stem-and-leaf plot and six full options. |
| `2020-nt2-t2-02` | Tennis court PNG showed a probability table. Restored the court and labels, shared premises and original method-credit rules. |
| `2026-ht-t2-04` | Pistazien solution lost parentheses around the factor-of-two expression; independent subparts lacked necessary givens. Restored the original formula and conditions. |
| `2025-wt-t2-01` | A matching candidate integral incorrectly used limits 0 and 3. Restored original limits 4 and 7. |

## Official-source exceptions

The current catalogue response contains 1,326 rows and 1,056 distinct base IDs. Three official pool
PDFs have an incorrect **footer** number; the live catalogue, distinct item directory, filename and
actual question content establish their correct IDs. These IDs are retained, with the German
original examination placed first in the affected records:

| Question | Correct catalogue ID | Incorrect printed footer |
| --- | --- | --- |
| `2025-ht-t2-03`, Mount-Everest-Marathon | `2_151` | `2_150` |
| `2025-ht-t2-04`, Schokolade | `2_152` | `2_150` |
| `2025-het-t2-04`, Spielwürfel | `2_156` | `2_155` |

`2025-het-t2-02` linked to Slovenian Wasserflöhe even though its official dropdown labeled that
link “Deutsch”; it now uses the inspected German PDF. The official catalogue currently provides an
English PDF for `2021-nt2-t2-01` Tee. Its German original examination is now primary, and the English
pool link is explicitly labeled as a translation under `system: other`.

Two scanned pool PDFs (`1_602`, `1_694`) lack extractable text; their printed IDs, titles, data and exam
dates were inspected visually. A leading-zero date was handled as a parser variation. All 77 differences
between catalogue dates and original examination dates were resolved against printed PDF dates or
terms; the bank's correct examination dates were retained. The 2020 source-clipping date issue and
Tennis wording/point-label differences are also recorded in the corresponding reviewer reports.

The final bank has 915 questions with a matching pool association, 19 with explicitly identified
adapted/translated variants, and 110 with verified original-examination references only. Every question
and every part now has an external source reference. A missing or different pool edition is never
filled with a guessed ID.

## Evidence and limits

- [Summary](summary.json), [coverage and exact repairs](coverage-and-changes.json),
  [final JSON hashes](final-content-snapshot.json).
- [Current link/ID verification](final-reference-verification.json),
  [all direct pool exam dates](all-pool-exam-date-crosscheck.json),
  [all source file bindings](source-bindings.json), [title review](source-title-crosscheck.json).
- [Metadata corrections](metadata-repairs.json), [new pool associations](missing-pool-reference-additions.json),
  [candidate content comparisons](missing-pool-content-review.json),
  [Biathlon part reference](biathlon-part-reference-repair.json).
- New conversion images: [2014–2015](images-2014-2015.json), [2016–2017](images-2016-2017.json),
  [2018 and 2019 legacy](images-2018-legacy.json).
- Older samples: [1–24](images-older-samples-01-24.json), [25–80 and expansion](images-older-samples-25-80.json).
- Expanded graph questions: [2019–2022](old-graph-items-2019-2022.json),
  [2023–2025](old-graph-items-2023-2026.json), [2026](old-graph-items-2026.json).
- [Independent repair recheck](independent-repair-recheck.json), [Tennis](tennis-pool-version-check.json),
  [accepted positive/negative answer](accepted-sign-repair.json), [retired assets](retired-assets.json).
- [Validation](validation.json), [schema/formula report](schema3-validation.json).

**207 current PNGs have not received content-level visual review in this audit**; their existence,
format, references and hashes were checked. This is not a claim of word-by-word review of every older
question. The initial converter rechecked some of their own 2015 questions; the report distinguishes
those from independent review. The other specified cross-reviews and the ten repair rechecks were
performed by a different reviewer.

The published schema 3 contract is unchanged. It still permits empty legacy answer-format labels;
96 existing parts have an empty `format` metadata field, listed in the formula/schema report.
Three pre-existing KaTeX euro-font metric warnings remain; there are no parsing errors.
No schema 4 content, client behavior or grading-engine code was introduced.

Per-review reports retain hashes and references from their actual inspection stage. Final metadata
normalization and retirement of replaced images happened later. Use the final snapshot, coverage and
reference reports for current bytes; earlier reports document how the current result was established.
The preceding [conversion audit](../schema3-2026-09-13/README.md) is an earlier historical snapshot,
whose statement that older content was preserved no longer describes these subsequent repairs.

Final asset-manifest root: `9bb2f32c9e478eef4c4f058b11c79e0900f1a7ec23372be5d2dcc05b468ce607`.
