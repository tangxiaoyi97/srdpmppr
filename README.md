# SRDP – Mathematics Past Papers, Refactored (`sdrpmppr`)

A machine-readable, structured refactoring of the Austrian **Standardisierte Reife- und Diplomprüfung (SRDP)** mathematics past exam tasks. The official task PDFs have been restructured into one JSON file per question — with the prompt as Markdown + KaTeX, typed answers, scoring, worked solutions, official Grundkompetenz tags, and figure references — all conforming to a single schema.

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

Each question record holds: the prompt (Markdown + KaTeX), its parts, a typed answer (`choice` / `numeric` / `matching` / `expression` / `interval` / `open`), the scoring rule, the worked solution, figure references, and official metadata (Grundkompetenz codes, Aufgabenpool IDs, Antwortformat).

Suites are named `<termin>-<year>`, e.g. `haupttermin-2026`, `wintertermin-2022`, `herbsttermin-2024`, `nebentermin1-2019`, `nebentermin2-2020`.

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

- **2019–2026** — 628 questions converted to full structured content.
- **2014–2018** — 395 questions present as schema records linked to their official metadata, **not yet converted**.

This is an evolving dataset; conversion of the earlier years is ongoing.

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
