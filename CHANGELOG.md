# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.6.0] — 2026-08-27

### Added

- Persistent explicit document→profile learning (`LearnedDocumentMapping` per profile)
- «Запомнить соответствие» action in matching UI (separate from session confirm)
- Learned mapping management UI («Словарь соответствий»)
- Learned-match priority in `matchDocumentToProfile()` (above alias/name/semantic)
- Profile export/import v2 with `learnedMappings`
- Profile storage schema v2 migration (non-destructive)

### Safety

- No implicit learning from automatic HIGH, review confirm, fill, or page mappings
- Unit-conflict protection for learned rules
- Learning is page-independent (document label → ProfileProperty only)
- Fill remains explicit and destination-only

## [0.5.0] — 2026-08-27

### Added

- Fill planning layer (`buildFillPlan`) from `getFillReadyMatches()` + profile/page mappings
- Fill preview UI with per-row selection and source preview
- Safe DOM fill for `input[type=text|number]`, `textarea`, `select`
- Existing-value protection + explicit overwrite checkbox
- `already-equal` skip, readonly/disabled detection, destination re-resolve before write
- Select exact option matching (value / text / normalized value)
- Fill result summary + runtime undo for last fill batch
- `PageContext` for shared page scan state

### Changed

- Current Page section becomes actionable destination for approved document/profile matches

### Security / Safety

- No auto-submit / auto-save
- No automatic overwrite of non-empty fields
- Blocked input types: password, hidden, file, submit, button, reset, checkbox, radio, date/time, color, range

## [0.4.0] — 2026-08-27

### Added

- Local document → profile matcher (`matchDocumentToProfile`)
- RU/EN technical lexicon + canonical label overlap scoring
- Unit-aware matching via `inferPropertyUnit()` + `normalizeUnit()`
- Confidence levels 🟢 / 🟡 / 🔴, alternatives, explainable reasons
- Manual review: confirm / pick property / ignore
- Session-persisted review decisions (DocumentSession schema v2)
- Target collision detection
- `getFillReadyMatches()` preparatory API for v0.5

### Changed

- When profile is selected, matched characteristics become the primary UI result
- Raw characteristics list hidden when profile matching is active

## [0.3.1] — 2026-08-27

### Added

- Document session persistence via `chrome.storage.session` (`src/session/`)
- `DocumentContext` with automatic restore after browser navigation
- Page-independent document workspace: characteristics as primary result
- Profile matching placeholder section (v0.4)
- Stub `matchDocumentToProfile()` and `DocumentPropertyMatch` types
- Unit tests for document session serialize/restore/clear/replace/corrupt handling

### Changed

- Panel layout: Document → Characteristics → Profile matching → Current page → debug text
- Raw document text collapsed by default under «Исходный текст документа»
- Profile ↔ page mappings moved to «Связи профиля с этой страницей» subsection
- README/ROADMAP/AGENTS: three-layer architecture (Document / Profile / Current Page)

### Fixed / Architecture

- Document analysis no longer conceptually depends on current page scan
- Corrupt or unsupported session payloads are cleared without affecting profile data

## [0.3.0] — 2026-08-27

### Added

- PDF visual line reconstruction via PDF.js text item coordinates
- Local characteristic extraction module (`src/extraction/`)
- Value parser: integer, decimal comma/dot, ±, ranges, dimensions
- Unit normalization RU/EN with longest-match-first
- Extraction from DOCX tables, PDF structured lines, delimited text
- Source metadata (page, line, table, row) + UI source preview
- «Найденные характеристики» panel with search and numeric/text filter
- 27 new unit tests + HARSLE PDF acceptance test

### Changed

- PDF `fullText` and page text now preserve line breaks
- Production content bundle ~1.47 MB (+~14 KB vs v0.2.0)

## [0.2.0] — 2026-08-27

### Added

- XLSX import (SheetJS) с preview, автоопределением колонок и reimport по `externalId`
- `sourceOrder`, `sourceIndex` в `ProfileProperty`
- Catalog merge: added / updated / unchanged / conflicts / missing from export
- Duplicate names allowed when `externalId` differs
- Compact property catalog UI (1000+ items, search, linked/unlinked filter)
- Mapping stats: exact / manual / ambiguous / not on page
- Tests: xlsx fixture, reimport identity, export roundtrip, ambiguous signature

### Changed

- Property identity on import: primary key is `externalId`, not normalized name
- Production content bundle includes xlsx (~1.46 MB minified)

## [0.1.0] — 2026-08-27

### Added

- FieldPilot v0.1 foundation: Manifest V3, drawer panel (Shadow DOM), React UI
- Локальный парсинг PDF (pdfjs-dist) и DOCX (mammoth)
- Form Scanner и label resolver (табличная вёрстка, aria, label[for])
- Preview извлечённого текста документа
- ESLint, TypeScript strict, vitest (labelResolver, formScanner, pageAccess)
- README.md, ROADMAP.md

### Fixed

- Content script: IIFE-сборка вместо ES module injection (`import.meta` crash)
- Content script: отказ от bootstrap + dynamic import (Failed to fetch module)
- PDF.js: настройка `GlobalWorkerOptions.workerSrc` + worker в dist
- Background: пропуск inject на restricted pages (`chrome://`, Web Store)

### Technical

- Сборка: `vite.background.config.ts`, `vite.content.config.ts`
- `scripts/verify-build.mjs` — проверка injectable content bundle
- Permissions: `activeTab`, `scripting`, `storage` only

[Unreleased]: https://github.com/GarryDrezden/field-pilot/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/GarryDrezden/field-pilot/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/GarryDrezden/field-pilot/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/GarryDrezden/field-pilot/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/GarryDrezden/field-pilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GarryDrezden/field-pilot/commit/17decdd
