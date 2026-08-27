# FieldPilot Roadmap

Roadmap описывает направление разработки FieldPilot, а не фиксированные сроки релизов.

Главная цель MVP:

> Загрузить документ → получить характеристики → сопоставить с профилем → (опционально) заполнить форму на нужной странице.

Целевой pipeline:

```text
Document → ExtractedCharacteristic → ProfileProperty → (optional) PageField → Fill
```

**Current Page — опциональный слой назначения, не prerequisite для анализа документа.**

---

## v0.1 — Foundation ✅

- [x] Vite + React + TypeScript, Manifest V3
- [x] Drawer panel (Shadow DOM), Chrome + Opera
- [x] PDF / DOCX parsing, `DocumentParseResult`
- [x] Form Scanner + label resolver
- [x] Preview извлечённого текста
- [x] ESLint, TypeScript strict, production build

**Результат:** FieldPilot открывается на произвольной странице, видит её поля и локально читает PDF/DOCX.

---

## v0.2 — Profiles & Property Catalog ✅

Локальный слой **каталог свойств ↔ поля страницы**.

- [x] `FieldProfile`, `ProfileProperty`, `PropertyPageMapping`
- [x] `PageFieldSignature` (без DOM Element в storage)
- [x] `chrome.storage.local`, `schemaVersion: 1`
- [x] create / rename / delete / active profile
- [x] ручной CRUD свойств (name, unit, aliases, externalId, sourceOrder)
- [x] **импорт XLSX** с preview, column mapping, reimport по externalId
- [x] импорт JSON, CSV, TSV, TXT / paste list
- [x] экспорт / импорт профиля JSON
- [x] `normalizePropertyLabel()` для exact matching
- [x] exact label / alias / saved mapping
- [x] resolve saved mapping по сигнатуре поля (ambiguous detection)
- [x] UI: профиль, свойства (1000+), сопоставления, «Запомнить»
- [x] unit tests: import, xlsx, matcher, export, normalize

**Результат:** пользователь импортирует реальный каталог (~1182 свойств), ведёт его локально и связывает с полями формы.

**Не входит:** document matching, fill, fuzzy/AI.

---

## v0.3 — Local Extraction ✅

Превратить текст документа в структурированные характеристики **независимо от текущей страницы**.

- [x] PDF line reconstruction (PDF.js coordinates)
- [x] `ExtractedCharacteristic` + `ExtractionResult`
- [x] table-row / structured-line / delimited-line extraction
- [x] `parseCharacteristicValue()` — integer, decimal, ±, range, dimension
- [x] `normalizeUnit()` RU/EN, longest-match-first
- [x] source metadata (page, line, table, row)
- [x] conservative prose rejection
- [x] exact deduplication
- [x] UI: «Характеристики документа» как главный результат; debug text collapsed
- [x] **Document session** в `chrome.storage.session` (characteristics между навигациями)
- [x] `DocumentContext` — extraction не зависит от PageFields
- [x] placeholder UI для document → profile matching (v0.4)
- [x] tests + HARSLE PDF acceptance

**Результат:** FieldPilot локально находит structured label/value/unit на любой вкладке; session переживает navigation в рамках browser session.

---

## v0.3.1 — Document Workspace / Session ✅

Уточнение архитектуры и UX после реального использования.

- [x] Document / Profile / Current Page как независимые слои
- [x] `chrome.storage.session` для metadata + `ExtractedCharacteristic[]`
- [x] `DocumentContext` — restore после navigation, clear/replace
- [x] Characteristics — главный UI; raw text в debug (collapsed)
- [x] Profile ↔ page mappings — subsection «Связи профиля с этой страницей»
- [x] Placeholder document → profile matching (v0.4)
- [x] Graceful fallback при недоступном/corrupt session storage
- [x] PageFields только в runtime memory

**Результат:** разобрать документ на любой странице, перейти к карточке товара, продолжить без повторной загрузки PDF.

---

## v0.4 — Matching Engine (CURRENT)

```text
ExtractedCharacteristic → ProfileProperty
(then existing ProfileProperty → PageField mapping for fill)
```

- [ ] `matchDocumentToProfile(characteristics, profile.properties)` — без PageField в решении
- [ ] словарь синонимов, token matching (без LLM)
- [ ] confidence score (🟢 / 🟡 / 🔴)
- [ ] объяснение причины совпадения
- [ ] защита от ложных совпадений

**Результат:** end-to-end связка документ → профиль → поле (без fill).

---

## v0.5 — Review & Fill

- [ ] экран проверки соответствий
- [ ] заполнение input / textarea / select
- [ ] корректные input/change events
- [ ] undo последнего fill
- [ ] **никогда** auto-submit формы

---

## v0.6 — Learning

- [ ] приоритет пользовательских mappings
- [ ] управление / экспорт словаря соответствий
- [ ] улучшение повторяющихся сценариев

---

## v0.7 — ChatGPT Bridge

- [ ] prompt + clipboard + import JSON ответа
- [ ] без API key, без автоматизации chatgpt.com

---

## v0.8 — Difficult Documents

- [ ] OCR для scanned PDF
- [ ] улучшенные таблицы, сложная вёрстка документов

---

## v0.9 — Compatibility / UX

- [ ] SPA, dynamic forms, iframe investigation
- [ ] diagnostics, performance, keyboard navigation

---

## v1.0 — Stable Release

- [ ] regression tests, fixtures, privacy review
- [ ] packaging, documentation, UX polish

---

# После v1.0

- host/domain binding для профилей (опционально)
- XLS/XLSX import
- shared mapping files
- batch processing

Все идеи — только после надёжного сценария: **документ → профиль → поле → проверка → fill.**
