# AGENTS.md — контекст для AI-ассистентов

> **Читай этот файл в начале каждой сессии.** Здесь — текущий статус, архитектурные решения и журнал изменений FieldPilot.

Репозиторий: https://github.com/GarryDrezden/field-pilot

---

## Текущий статус

**Версия:** v0.6.0 (Persistent Learning)  
**Milestone:** явное сохранение document terminology → ProfileProperty per profile.

### Что уже работает

- Manifest V3, Chrome + Opera (Chromium)
- Панель по клику на иконку (Shadow DOM, 440px справа)
- Загрузка PDF / DOCX, локальный парсинг **на любой странице** (форма не обязательна)
- **Document → ExtractedCharacteristic** без зависимости от `scanPage()`
- **Document session:** `chrome.storage.session` — characteristics сохраняются между навигациями
- Form Scanner: input, textarea, select + label resolver (опциональный слой)
- **Профили:** каталог свойств, import/export JSON, **XLSX**, CSV/TSV/TXT
- **Reimport по externalId** — mappings сохраняются при обновлении каталога
- **Exact matching profile ↔ page:** saved mapping, exact label, exact alias
- **PageFieldSignature** для восстановления связей на новой странице
- UI: документ → **сопоставление с профилем** (🟢🟡🔴) → текущая страница → **fill preview**
- **Document → Profile matching:** RU/EN lexicon, unit-aware scoring, manual review
- **Fill engine:** FillPlan, preview, safe write, select, existing-value protection, undo
- **Persistent learning:** `LearnedDocumentMapping`, «Запомнить соответствие», словарь правил
- Unit-тесты: extraction, session, matching, fill, learning, scanner, profile import/matcher

### Что НЕ реализовано (не начинать без запроса)

- Fuzzy / AI / OCR / ChatGPT Bridge (v0.7+)
- Bitrix-specific / site-specific код

---

## Архитектура (кратко)

**Три независимых слоя:**

1. **DOCUMENT** — источник фактических значений (`ExtractedCharacteristic[]`)
2. **PROFILE** — каталог допустимых свойств пользователя (`ProfileProperty[]`)
3. **CURRENT PAGE** — опциональное место назначения (`PageField[]` → fill)

> **Current Page is an optional destination layer, not a prerequisite for document analysis.**

Pipeline:

```text
PDF/DOCX → ExtractedCharacteristic[] → ProfileProperty[] → (optional) PageField[] → Fill
```

**Разделение storage:**

| Слой | Где хранится |
|------|----------------|
| Profiles, mappings, **learnedMappings**, settings | `chrome.storage.local` |
| Review decisions (session) | `chrome.storage.session` |
| Текущий document session (meta + characteristics) | `chrome.storage.session` |
| PageFields, FillPlan, Undo | runtime memory only |

```text
src/
  background/       service worker → inject content.js
  content/          Shadow DOM host + React UI
  ui/               React-компоненты панели + DocumentContext
  document/         PDF/DOCX parsers → DocumentParseResult
  extraction/       characteristic extraction from documents
  session/          document session (chrome.storage.session)
  matching/         matchDocumentToProfile, review, collisions
  learning/         LearnedDocumentMapping CRUD + matcher integration
  fill/             buildFillPlan, executeFill, undo, DOM adapter
  form/             formScanner, labelResolver
  profile/          storage, import, export, matcher, fieldSignature
  shared/           types, utils
```

**Сборка:** три vite-конфига → `dist/background.js`, `dist/content.js`, `dist/pdf.worker.min.mjs`

**Content script:** IIFE-бандл (не ES module injection!) — иначе `import.meta` из pdfjs ломает страницу.

**PDF.js:** worker копируется в dist, `GlobalWorkerOptions.workerSrc` задаётся в `setupPdfjs.ts`, worker в `web_accessible_resources`.

**Permissions:** только `activeTab`, `scripting`, `storage`. Без `<all_urls>` host permission.

**Hard rules (v0.6+):**

1. Document workspace is **page-independent** — matching/learning без FormScanner
2. Learned mapping = document label → ProfileProperty; **never** document → DOM
3. Learning only on explicit «Запомнить соответствие» — no hidden learning from fill/review/HIGH
4. No navigation auto-scan; no FillPlan/DOM writes without explicit user actions
5. Fill never auto-submits; existing field values never overwritten by default

---

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `src/background/index.ts` | Клик по иконке, inject, проверка restricted URL |
| `src/content/index.tsx` | Shadow DOM + React mount |
| `src/document/pdf/reconstructPdfLines.ts` | PDF visual line reconstruction |
| `src/extraction/extractCharacteristics.ts` | Document → ExtractedCharacteristic |
| `src/session/documentSessionStorage.ts` | Document session в chrome.storage.session |
| `src/ui/context/DocumentContext.tsx` | React state документа + session restore |
| `src/matching/matchDocumentToProfile.ts` | Document ↔ Profile matcher |
| `src/matching/canonicalizeLabel.ts` | RU/EN technical lexicon |
| `src/matching/applyReviewDecisions.ts` | Session review + fill-ready selector |
| `src/learning/learnedMappings.ts` | Learned mapping domain + upsert/replace |
| `src/learning/applyLearnedMatch.ts` | Learned priority in matcher |
| `src/ui/components/LearnedDictionaryPanel.tsx` | Management UI словаря |
| `src/fill/executeFill.ts` | DOM write + verify + undo batch |
| `src/fill/setFieldValue.ts` | native setter + input/change events |
| `src/ui/components/FillSection.tsx` | Fill preview / execute / undo UI |
| `src/profile/profileXlsxImport.ts` | XLSX parse (SheetJS) |
| `src/profile/profileImport.ts` | Column mapping, catalog merge by externalId |
| `src/profile/profileStorage.ts` | chrome.storage.local, CRUD профилей |
| `src/profile/profileMatcher.ts` | Exact matching profile ↔ page |
| `src/profile/fieldSignature.ts` | PageFieldSignature build/resolve |
| `src/ui/context/ProfileContext.tsx` | React state для профилей |
| `vite.content.config.ts` | IIFE-сборка content + strip import.meta |
| `scripts/generate-icons.mjs` | PNG-иконки 16/48/128 |
| `scripts/verify-build.mjs` | Проверка: нет import.meta, есть worker |
| `ROADMAP.md` | План версий |
| `CHANGELOG.md` | История релизов |

---

## Сборка и проверка

```bash
npm install
npm run build      # → dist/
npm run test
npm run lint
```

Load unpacked: папка **`dist/`**  
После изменений: **Reload** расширения + **F5** на целевой странице.

---

## Известные ограничения

- Не работает на `chrome://`, Web Store (by design)
- PDF без text layer → предупреждение, OCR позже
- checkbox/radio не сканируются
- `content.js` ~1.47 MB (pdfjs + mammoth + React + xlsx + extraction)
- Fill полей работает только для fill-ready matches; **никакого auto-submit**
- Learning только explicit («Запомнить соответствие»); confirm/fill не создают правила
- Без `storage.session` document session не переживает navigation (graceful fallback)
- fullText документа не сохраняется в session — только source.text у каждой characteristic
- Только exact matching (без fuzzy)
- externalId используется для identity каталога, не для auto-match с DOM

---

## Журнал разработки

> **Правило для AI:** после каждой значимой итерации дописывай сюда новую запись (дата, что сделано, ключевые файлы, коммиты).

### 2026-08-27 — v0.1 Foundation (initial)

**Коммит:** `17decdd`

- Создан проект: Vite + React + TS + Manifest V3
- Drawer-панель (Shadow DOM), document upload, PDF/DOCX parsers
- FormScanner + labelResolver, README, ROADMAP
- ESLint, strict TS, vitest

### 2026-08-27 — Fix import.meta в content script

**Коммиты:** `077e030`, `a13792a`

**Проблема:** `Uncaught SyntaxError: Cannot use 'import.meta' outside a module` на Bitrix admin.

**Решение:**
- Отказ от dynamic `import()` bootstrap (Failed to fetch module)
- `content.js` собирается как **IIFE** (`vite.content.config.ts`)
- Плагин `stripImportMeta` убирает остатки `import.meta` из pdfjs
- `scripts/verify-build.mjs` проверяет сборку
- `pageAccess.ts` — не инжектить на `chrome://` (без error spam)

### 2026-08-27 — Fix PDF.js worker

**Коммит:** `7189d6f`

**Проблема:** `No "GlobalWorkerOptions.workerSrc" specified` при загрузке PDF.

**Решение:**
- `src/document/pdf/setupPdfjs.ts` — `workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs')`
- `copy-assets.mjs` копирует worker из `pdfjs-dist` в `dist/`
- `web_accessible_resources` для `pdf.worker.min.mjs` (нужно для Web Worker в content script)

**Проверено:** PDF 6.4 MB парсится, Form Scanner находит 148 полей на Bitrix catalog edit.

### 2026-08-27 — Иконки расширения

**Коммит:** `0cc160f`

- Переработан `scripts/generate-icons.mjs`: pixel-art иконка «документ → стрелка → поле формы»
- Синий градиент, белые элементы, размеры 16/48/128

### 2026-08-27 — v0.2 Profiles & Property Catalog

**Коммит:** `85fb1e2`

- `src/profile/*` — типы, storage (`schemaVersion: 1`), import/export, matcher
- `PageFieldSignature` — name, htmlId, normalizedLabel, elementType (не runtime fp-field id)
- UI: ProfileBar, свойства, импорт, сопоставления, «Запомнить»
- Exact matching: saved → exact label → exact alias
- Тесты: normalizePropertyLabel, profileImport, profileMatcher (+ fieldSignature)
- Bundle: `content.js` ~1112 KB (+30 KB к v0.1)

### 2026-08-27 — v0.2.0 XLSX catalog import

**Локально (не закоммичено по умолчанию)**

- XLSX import через `xlsx` (SheetJS), preview перед импортом
- Identity по `externalId`: reimport сохраняет internal id и mappings
- Duplicate names (PARAM2226 / PARAM2248) — два свойства
- Real file verified: 1182 properties, 1182 unique externalIds
- `sourceOrder`, `sourceIndex` из колонок «Сортировка» и «#»
- Bundle: `content.js` ~1459 KB (+~347 KB vs v0.2 без xlsx)

### 2026-08-27 — v0.3.0 Local Extraction

**Коммит:** `df1e460`

- PDF line reconstruction (`reconstructPdfLines.ts`) по координатам PDF.js
- `src/extraction/*` — types, parseValue, normalizeUnit, tables/lines/dedupe
- `extractCharacteristics()` — pure function, без профиля
- UI: `ExtractedCharacteristicsPanel` в DocumentSection
- Conservative prose rejection; structured lines с `Max.` abbreviations
- HARSLE PB-2000 PDF acceptance: 29 candidates, key technical params found
- Tests: 55 total (+27); bundle ~1473 KB (+~14 KB vs v0.2.0)

### 2026-08-27 — v0.6.0 Persistent Learning

- `LearnedDocumentMapping` in `FieldProfile.learnedMappings` (`chrome.storage.local`, schema v2)
- `src/learning/*` — upsert/replace/delete, matcher priority, unit-conflict guard
- UI: «Запомнить соответствие», conflict replace dialog, «Словарь соответствий»
- Export/import profile v2 includes learned mappings; XLSX reimport preserves rules
- Tests: 136 total (+16 learning)

### 2026-08-27 — v0.5.0 Review & Fill

- `src/fill/*` — FillPlan, buildFillValue, executeFill, undo, select resolver
- UI: FillSection preview/execute, existing-value protection, «Настроить поле»
- PageContext — shared scan state для Current Page + Fill
- Tests: fill value, plan, select, DOM setter, undo (+23)
- Bundle: `content.js` ~1527 KB (+~21 KB vs v0.4.0)

### 2026-08-27 — v0.4.0 Document → Profile Matching

**Коммит:** `083ab78`

- `src/matching/*` — deterministic bilingual matcher, unit-aware scoring, conflicts
- UI: сопоставление с профилем, manual review, property picker
- DocumentSession v2: review decisions в `chrome.storage.session`
- Tests: canonicalization, matcher safety, review decisions, HARSLE matching (+27)
- Bundle: `content.js` ~1506 KB (+~27 KB vs v0.3.1)

### 2026-08-27 — v0.3.1 Document Workspace / Session

**Коммит:** `12648f7`

- Версия 0.3.1: corrupt session cleanup, restore UX, session persist errors
- Дополнительные unit tests для session roundtrip и legacy `file` alias
- CHANGELOG/ROADMAP/README синхронизированы с v0.3.1

### 2026-08-27 — New extension icon

**Коммит:** `4a74fb2`

- Новая иконка: документ с выделенной характеристикой + badge «извлечено»
- Teal-градиент вместо синего; без схемы «стрелка → форма»
- `scripts/generate-icons.mjs`, `public/icons/icon{16,48,128}.png`

### 2026-08-27 — v0.3 refinement: page-independent document flow

**Коммит:** `248dbb1`

- Архитектура: Document / Profile / Current Page как независимые слои
- `src/session/*` — DocumentSession в `chrome.storage.session`
- `DocumentContext` — restore после navigation, clear/replace document
- UI: характеристики документа — главный результат; исходный текст свёрнут в debug
- Profile ↔ Page mappings — subsection «Связи профиля с этой страницей»
- Placeholder «Сопоставление с профилем» (v0.4), stub `matchDocumentToProfile()`
- README/ROADMAP: обновлён pipeline и концепция

---

## Инструкция для следующей сессии AI

1. Прочитай этот файл и `ROADMAP.md`
2. Не добавляй backend, AI, auto-submit
3. После изменений: `npm run build`, `npm run test`
4. **Допиши новую секцию в «Журнал разработки»** и строку в `CHANGELOG.md`
5. Commit/push — только по явной просьбе пользователя
