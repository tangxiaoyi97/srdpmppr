# Full schema 3 review — 13 September 2026

Started 13 September; final validation completed 14 September 2026 (Europe/Zurich).

All **1,044 current questions / 1,672 parts** received a fresh semantic comparison against the original official examination questions and marking instructions. Coverage includes 2014–2026 and the five 2019 legacy-entry tasks. All remain schema version 3.

This round changed **385 question JSON files** relative to [the audit baseline](baseline.json). This includes transcription, scoring, shared conditions, figure descriptions, answer formats and metadata; it is not a count of wholly incorrect questions. Earlier conversion and spotcheck changes are separate historical work.

## Results

| Check | Final result |
| --- | --- |
| Fresh semantic reviews | 1,044 / 1,044 questions |
| Current PNGs with matching visual evidence | 825 / 825 |
| PNGs newly viewed in this round | 404 |
| PNGs supported by actual prior viewing of identical SHA-256 bytes | 421 |
| Replaced / added / retired PNGs | 44 / 18 / 1 |
| Original clipped AU/LO files bound to full official documents | 2,088 files / 2,333 page records |
| Freshly downloaded original marking booklets | 54 |
| Unique current official PDF URLs verified | 980 |
| Reference occurrences checked | 3515 |
| Matching pool / explicitly adapted / original-only questions | 913 / 21 / 110 |
| Pending reviews, stale hashes, orphan PNGs, empty formats | 0 |

[Coverage and changes](coverage-and-changes.json) joins every final question and PNG to its review and exact hash. [Final snapshot](final-content-snapshot.json) binds the bank to the packaged-asset manifest. Root and three agents divided the primary review; the additional independent samples do not imply two reviewers examined every question.

Reviewers checked original wording/data, mathematical symbols and grouping, options/keys, accepted answers and partial credit, original formats, shared conditions, official identity and figure placement. New visual work examined actual source/official renders and PNGs. Prior visual evidence was reused only for identical PNG hashes. Text extraction and page matching were diagnostics, not substitutes for visually checking figures and ambiguous formulas.

Original booklets take precedence over later adapted pool tasks. Original solution alternatives, explicit tolerance ranges and marking notes are retained. Unsupported numeric windows were removed; fractions, percentages and equivalent responses use suitable schema 3 types or the original rubric.

## Representative repairs

| Question | Official-source finding and repair |
| --- | --- |
| 2019-nt2-t2-04 | Two table PNGs contained prose instead of data tables; both original tables restored. |
| 2020-nt2-t1-19 | Wage-table image duplicated the histogram; actual table restored. |
| 2021-ht-t2-03 | Shared three-curve velocity graph had been replaced by blank acceleration axes; correct figures restored in their respective positions. |
| 2022-wt-t2-03 | Inverted fractions and a wrong constant changed the fuel model; original formula restored and independently recomputed to approximately 34,934 L. |
| 2024-ht-t2-02 | Misplaced parentheses changed the bungee exponential/cosine model; original grouping and dependent conditions restored. |
| 2024-het-t1-05 | Direction vector corrected from (−3,2) to (2,−3), positive multiples accepted; figure description and original vector blanks corrected. |
| 2024-het-t1-18 | Missing first official shaded-area solution added; clipped lower region/axis in the second restored; both alternatives accepted. |
| 2025-het-t2-04 | Dice probability corrected to 5/9; percentage answer and half-credit aligned with original marking. |

Complete findings are in the per-year review ledgers and [post-review repair chain](post-review-repairs.json). Additional independent checks: [five high-impact questions](independent-high-impact-recheck.json), [three root repairs](independent-root-repair-review.json), [two shared-context questions](independent-root-context-review.json).

## IDs, versions and source cropping

[Reference verification](final-reference-verification.json) records official catalogue/PDF identity checks and downloaded hashes. [Exam-date checks](all-pool-exam-date-crosscheck.json) independently confirm each same-question pool edition. No unresolved ID/link mismatches remain in these checks.

Three official footer errors remain documented exceptions: catalogue IDs 2_151 and 2_152 print 2_150; 2_156 prints 2_155. Correct canonical IDs are supported by the official catalogue/item and original exam. Other official discrepancies remain explicit: the 2019 train marking interval differs from its corrected pool version; pool 2_057 corrects a bacteria-rate unit; pool 2_104 includes marking from the adjacent task. See the question notes and [official-version findings](official-version-findings-2020-2021.json). Adapted versions are labelled and do not replace historical exams.

[Source crosscheck](official-original-source-crosscheck.json) has 2,088 AU/LO bindings and zero unresolved flags, including 11 trailing blank pages resolved by raster viewing. [All 23 crop candidates](source-crop-final-classifications.json) are resolved: 21 questions have real visible clipping in old source PDFs; two are false positives. Affected instructions, answer lines and marking text are complete in the final structured bank. **Source-archive PDF crops themselves were not replaced in this audit**; full official URLs/pages are recorded.

## Validation and boundaries

Bank validation and deterministic asset-manifest verification passed. All 19 repository tests passed. All 1,044 records passed schema validation and all 10094 mathematical rich-text nodes passed strict KaTeX rendering. [12 bounded checks using the existing client graders](grading-repair-checks.json) passed, covering official interval endpoints, equivalent fractions, exact-value rejection and the repaired fuel model.

This complete review has explicit evidence; it is not a proof that no transcription error can remain, nor a certification of every client/AI grading outcome. Schema 3 requires selectCount, so original questions that conceal the correct-option count cannot fully preserve that interaction. Schema/client behavior and schema 4 were not changed.

Existing unverified third-party-material flags remain unverified. Twenty-eight unsupported assertions equating a title asterisk with third-party copyright were corrected in [rights-note evidence](rights-note-correction.json); no per-question rights determination was made.

Temporary render/cache paths identify session evidence. Official URLs, source hashes, crop coordinates where used, final hashes and report hashes provide durable provenance; temporary caches are not distributed with the bank.
