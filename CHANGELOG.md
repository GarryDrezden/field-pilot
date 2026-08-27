# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/GarryDrezden/field-pilot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/GarryDrezden/field-pilot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GarryDrezden/field-pilot/commit/17decdd
