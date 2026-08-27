# FieldPilot Roadmap

Roadmap описывает направление разработки FieldPilot, а не фиксированные сроки релизов.

Главная цель MVP:

> Открыть веб-форму → загрузить документ → получить проверяемые соответствия → заполнить выбранные поля.

Целевой pipeline:

```text
Document
  ↓ extracted characteristic
Profile property
  ↓ mapping
Current page field
```

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

## v0.2 — Profiles & Property Catalog ✅ (CURRENT)

Локальный слой **каталог свойств ↔ поля страницы**.

- [x] `FieldProfile`, `ProfileProperty`, `PropertyPageMapping`
- [x] `PageFieldSignature` (без DOM Element в storage)
- [x] `chrome.storage.local`, `schemaVersion: 1`
- [x] create / rename / delete / active profile
- [x] ручной CRUD свойств (name, unit, aliases, externalId)
- [x] импорт JSON, CSV, TSV, TXT / paste list
- [x] экспорт / импорт профиля JSON
- [x] `normalizePropertyLabel()` для exact matching
- [x] exact label / alias / saved mapping
- [x] resolve saved mapping по сигнатуре поля
- [x] UI: профиль, свойства, сопоставления, «Запомнить»
- [x] unit tests для import / matcher / normalize

**Результат:** пользователь ведёт каталог свойств и связывает их с полями формы на разных карточках.

**Не входит:** document matching, fill, fuzzy/AI.

---

## v0.3 — Local Extraction

Превратить текст документа в структурированные характеристики.

- [ ] поиск пар `характеристика → значение`
- [ ] извлечение единиц измерения
- [ ] обработка таблиц документа
- [ ] нормализация регистра, пробелов, разделителей
- [ ] десятичная запятая / точка
- [ ] нормализация единиц (ru/en)
- [ ] сохранение исходной подписи и источника значения

**Результат:** FieldPilot понимает, какие характеристики есть в документе.

---

## v0.4 — Matching Engine

```text
document characteristic → profile property → page field
```

- [ ] сопоставление характеристик документа со свойствами профиля
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
