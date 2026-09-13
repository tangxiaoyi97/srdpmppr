# Schema 3 conversion audit — 13 September 2026

> Historical snapshot: the later [image and identity audit](../schema3-spotcheck-2026-09-13/README.md)
> repaired older content and references, and supersedes this snapshot’s asset hashes and
> statements about preserving older records. The original conversion evidence remains below.

400 previously unstructured or absent tasks were transcribed from the archived original examination
papers: 58 from 2014, 84 from 2015, 85 from 2016, 84 from 2017, 84 from 2018, and five distinct
2019 tasks for candidates whose first attempt was before May 2018. The complete bank contains
1,044 schema 3 questions. The 644 previously structured questions retain their content; 582 of
those records only change their version number from 2 to 3. No schema 4 content was introduced.

## Records

- [Summary](summary.json): final counts and asset-manifest hash.
- [Source crosswalk](source-crosswalk.json): all 400 task IDs, JSON paths and hashes, source question
  and solution PDF links pinned to a source-repository commit, official original-paper references,
  and figure paths.
- [Evidence](evidence/): author inspections, independent cross-checks, source mapping decisions,
  context repairs and formula/grading corrections. These files retain the history of each check;
  an earlier author report may say that a later independent check was still pending.
- [Schema and formula validation](evidence/schema3-validation.json): final whole-bank schema and
  KaTeX results. Any empty `format` values listed there belong to previously structured records
  whose content was deliberately preserved.
- [Final validation](evidence/validation-final-checks.json): 1,044 questions, 1,672 parts,
  772 packaged assets and 9,373 mathematical nodes checked without schema or parsing errors.
  Three existing euro-font metric warnings are recorded separately.
- [Repository tests](evidence/validation-tests.json): 19 passed, zero failed.

## Fidelity and identity

Original German wording, mathematical data, option order, official answers and scoring criteria
were retained. Original question figures and solution figures are separate cropped PNG assets,
referenced in their respective positions. Every author inspected source PDFs visually; independent
checks and their precise scope are recorded by question in the evidence files. Newly converted
records remain `converted`; the 16 existing `reviewed` records retain their status.

All 400 tasks reference the official original examination booklet, printed task number and physical
PDF page. 305 also have verified matching Aufgabenpool references. A further 17 have a verified
association to a later official adaptation; these are explicitly labeled and stored as `other`
references, so they cannot be mistaken for identical historical question sources. For 78 tasks,
no equivalent pool ID was established, and no number was invented.

The five legacy 2019 tasks use separate `-erstantritt-vor-mai-2018` suites and `-alt-` IDs.
Their source filenames preserve the position within Part 2, while official references retain the
printed continuous task numbers 26–28. The validator checks the identity of these five editions.

For independent practice, a later part repeats necessary original conditions and figures. If those
conditions only occur inside an earlier instruction, the copied instruction is labeled
`Kontext aus Teilaufgabe …`, followed by `Aktuelle Aufgabenstellung`. No previous answers are copied.
Where the official scoring permits equivalent fractions, percentages, units or partial reasoning
that a strict decimal input cannot represent, the answer uses an open rubric with the original
solution and grading criteria.

## Source inconsistencies retained

These are documented source issues, not silently corrected historical questions. See the relevant
conversion and cross-review evidence for the full list and exact source locations. Examples:

- `2019-ht-alt-t2-02`: the official c1 solution prints `A_3` although the question asks for `A_2`.
  The printed solution is retained, and the grading rubric identifies the requested `A_2`.
- `2019-nt1-alt-t2-02` (Pasterze): the prose and solution say 1947, while the diagram says 1974.
  Both source forms are retained.
- `2017-nt1-t1-02`: the original completion task permits several alternatives in one gap.
  Its full original choices and acceptance rules are preserved in an open rubric.
- Some original crops lost content at their boundary. Where verified against the official full
  booklet, missing material was restored; the 2014 binomial-chart bar and 2016 football task
  sentence are recorded in their author audits.

The original official papers remain the authority when interpreting these inconsistencies.
