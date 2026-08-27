# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Added

- v0.2 Profiles: `FieldProfile`, property catalog, `chrome.storage.local`
- Import: JSON, CSV, TSV, TXT / paste; export profile JSON
- Exact profile ↔ page matching + `PageFieldSignature`
- UI: profile selector, properties CRUD, mappings screen
- Tests: normalizePropertyLabel, profileImport, profileMatcher

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

[Unreleased]: https://github.com/GarryDrezden/field-pilot/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/GarryDrezden/field-pilot/commit/17decdd
