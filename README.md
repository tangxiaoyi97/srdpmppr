# SRDP – Mathematics Past Papers, Refactored (`sdrpmppr`)

A machine-readable, structured refactoring of the Austrian **Standardisierte Reife- und Diplomprüfung (SRDP)** mathematics past exam tasks. The official task PDFs have been restructured into one JSON file per question — with typed rich text and KaTeX mathematics, typed answers, scoring, worked solutions, official Grundkompetenz tags, and figure references — all conforming to a single schema.

Past Papers collection in **original pdf**: visit [github srdpmppr-src](https://github.com/tangxiaoyi97/srdpmppr-src)

## Branches

- **`master`** — this README, terms, and meta-files.
- **`pastpapers`** — the full dataset collection.

## Layout (on the `pastpapers` branch)


```

schema/question.ts             The single schema every question conforms to.
content/<suite>/<id>.json      One file per question.
assets/pdf/<suite>/fig/*.png   Cropped figures referenced by the JSON.
manifest/assets.v1.json        Deterministic size/MIME/SHA-256 inventory of packaged figures.

```

Each question record holds: the prompt (rich text + KaTeX), its parts, a typed answer (`choice` / `numeric` / `matching` / `expression` / `interval` / `open`), the scoring rule, the worked solution, figure references, and official metadata (Grundkompetenz codes, Aufgabenpool IDs, Antwortformat).

Suites are named `<termin>-<year>`, e.g. `haupttermin-2026`, `wintertermin-2022`, `herbsttermin-2024`, `nebentermin1-2019`, `nebentermin2-2020`.

The five additional 2019 tasks for **Erstantritt vor Mai 2018** use the suite suffix
`-erstantritt-vor-mai-2018` and IDs such as `2019-ht-alt-t2-02`. Their original task numbers
and `[2019h1-alt]t2-2.pdf` source filenames are preserved separately from the regular edition.

## Validate locally

Requires Node.js 22 and pnpm 11:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm validate
```

The schema rejects unknown fields and checks answer indices, scoring totals and matching groups. The repository
validator additionally enforces global question/part IDs, file/source identity, safe resource paths, PNG
signatures and the committed asset manifest. After intentionally adding or replacing a figure, run
`pnpm assets:manifest`, inspect the diff, then run `pnpm validate` again.

`assets.questionPdf` and `assets.solutionPdf` are provenance references to the official source documents;
they are not packaged files. Figure `src` values are packaged and must exist in `assets/` with a matching hash.

## Status

- **2014–2018** — 395 questions converted to structured prompts, answers, scoring and solutions.
- **2019–2026, regular editions** — 644 questions with structured content.
- **2019, Erstantritt vor Mai 2018** — 5 additional tasks, including the distinct version of “Vornamen in Österreich”.
- **Total: 1,044 questions, all schema version 3; no linked-only records.**

The September 2026 conversion follows the original examination papers. Original figures and solution
figures are separate cropped assets, placed inline at the relevant question or solution position.
Official archive references identify the original paper and physical PDF page. A later adapted
Aufgabenpool version must not replace the historical examination content.

Records retain their review lifecycle (`converted` or `reviewed`); schema version 3 does not imply
that every record has been independently reviewed. The initial conversion preserved the 644 previously
structured regular-edition records while raising schema version 2 to 3. A subsequent image and
identity audit repaired confirmed errors in older content and source references.

The [conversion audit](audits/schema3-2026-09-13/README.md) records all 400 newly converted tasks,
source-document hashes, original examination links, review findings and validation results.
Among these tasks, 305 have verified matching Aufgabenpool references. For 17 others, only an
officially adapted version was established: these references use `system: "other"` with an explicit
adapted-version label. The remaining 78 use verified original examination references without an
unproven pool number. Every newly converted task keeps its original examination reference first.

Where a later subtask needs conditions or figures introduced earlier, its prompt repeats those
original givens so that it can be practiced independently. Necessary earlier instructions are
explicitly labeled as context; earlier answers are never included in the question prompt.

The historical [subsequent image and identity audit](audits/schema3-spotcheck-2026-09-13/README.md) records
601 visually reviewed current PNGs, all 105 older graph-choice/matching questions, corrected answer
keys, and verification of all 978 official PDF links at that stage. Its final manifest contained 808 assets.
The report distinguishes reviewed content from machine checks and lists the remaining review limits.

The later [full-bank official-source review](audits/schema3-full-review-2026-09-13/README.md) covers
all 1,044 questions and 1,672 parts with fresh semantic review, plus visual evidence for all
825 current PNGs (404 newly viewed and 421 verified by exact prior-view hashes).
It repairs 385 records in this round and verifies current official IDs, links, source pages and
packaged assets. Official errata, adapted versions and remaining source-archive PDF clipping
are distinguished from corrected structured content.

## Source & Attribution

The original exam tasks and metadata are properties of the Austrian **Bundesministerium für Bildung, Wissenschaft und Forschung (BMBWF)** / **Institut des Bundes für Qualitätssicherung des österreichischen Schulwesens (IQS)**. The original authoritative documents are publicly available at the official portal [aufgabenpool.srdp.at](https://aufgabenpool.srdp.at) / [aufgabenpool.at](https://www.aufgabenpool.at).

This repository is a community-driven, non-profit derivative work that restructures those public PDFs into machine-readable JSON for educational research, study, and open-source tooling development.

## Terms of Use (Non-Commercial Only)

This dataset is provided **strictly for personal study, academic research, and non-commercial educational purposes**.

By using the data in this repository, you agree that:
- **No Commercial Use:** You may not use this dataset, or any part of it, for commercial purposes, including but not limited to paid tutoring services, commercial software/apps, or published exam-preparation books, without explicit authorization from the original copyright holders (BMBWF).
- **Attribution:** If you use this refactored dataset in free educational tools or open research, you must provide appropriate credit to the original source (BMBWF / IQS) and link back to this repository for the structured format.

## Disclaimer

- This is an **unofficial, community refactoring**. It is **not affiliated with, endorsed by, or verified by** the BMBWF or IQS.
- It may contain conversion, OCR, or transcription errors. The **official Aufgabenpool PDFs remain the sole authoritative source**; use this dataset at your own discretion, and always verify against the originals where exact correctness matters.
- Some original tasks involve **third-party material** (e.g., specific diagrams or texts adapted by the ministry); for those, the original rights of the respective third-party owners apply.
