# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.9.0] — 2026-08-27

### Fixed

- **HARSLE 29→28 regression:** multi-column PDF split broke numbered configuration rows (`Linear Guide`, `Ball Screw`, `Reducer`); restored via `shouldPreventColumnSplit()` in `reconstructPdfLines.ts`
- False positives `● HIWIN` / `● ROUIST` removed; `Bending T ooling` artifact replaced by correct `Bending Tooling`

### Improved

- FormScanner: deterministic label priority (`label-for` → wrap → `aria-labelledby` → `aria-label` → container/table → placeholder → name/id)
- `labelSource` metadata on `PageField` for diagnostics
- Service-field filtering (search, CSRF-like names, hidden controls) without CMS-specific selectors
- Visibility checks (`display:none`, `hidden`, zero-layout); custom select/combobox marked unsupported
- Duplicate normalized labels → `ambiguousLabel` + ambiguous page mapping
- SPA/page stale detection (URL change + live field resolve ratio); explicit rescan UX, no auto-rescan
- `scanGeneration` counter; FillPlan identity guards before execute (document/profile/scan/URL)
- Fill result breakdown (filled / already equal / skipped / failed); copy-value fallback for unsupported destinations
- React `PanelErrorBoundary`; compact diagnostics section with privacy-safe copy export
- HARSLE regression tests (`harsleRegressionCompare`, tightened `harsleAcceptance`)

### Safety

- Scan and Fill remain explicit user actions; no auto-submit, no auto-scan on navigation
- Document workspace stays page-independent

## [0.8.0] — 2026-08-27

### Added

- Page-level PDF text quality analysis (`good` / `weak` / `empty`)
- Scanned / hybrid PDF detection with explicit local OCR (Tesseract.js)
- Lazy-loaded OCR bundle (`dist/ocr/`) — eng + rus language packs, offline
- OCR progress UI, cancel, language preset (rus+eng / eng / rus)
- Hybrid native/OCR page source selection per page
- OCR provenance in `CharacteristicSource.origin`
- PDF layout: geometry-aware spacing, conservative multi-column split
- DOCX table improvements (colspan, repeated headers, empty cells)

### Changed

- Document parser selects native vs OCR text source per page
- DocumentSession schema v4 stores PDF diagnostics summary

### Safety / Privacy

- No cloud OCR, no CDN, no external OCR requests
- OCR never touches Current Page / FormScanner / Fill
- OCR runs only on explicit user action (no auto-OCR on good PDFs)

## [0.7.0] — 2026-08-27

### Added

- Manual ChatGPT Bridge for document→profile matching (clipboard-only workflow)
- Compact prompt builder with full profile catalog serialization
- Strict JSON response validation + preview before apply
- Bridge request/suggestions persistence in `chrome.storage.session` (DocumentSession v3)
- Scope selector: review-only (default) or all characteristics

### Safety

- No OpenAI API, no host permissions, no ChatGPT automation
- AI suggestions never auto-override local HIGH matches
- Explicit user action required to apply each suggestion
- Bridge is page-independent (no PageField/URL/DOM in prompt)

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
