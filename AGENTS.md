# AGENTS.md — контекст для AI-ассистентов

> **Читай этот файл в начале каждой сессии.** Здесь — текущий статус, архитектурные решения и журнал изменений FieldPilot.

Репозиторий: https://github.com/GarryDrezden/field-pilot

---

## Текущий статус

**Версия:** v0.2 (Profiles & Property Catalog)  
**Milestone:** v0.1 foundation + локальные профили и exact matching профиль ↔ поля страницы.

### Что уже работает

- Manifest V3, Chrome + Opera (Chromium)
- Панель по клику на иконку (Shadow DOM, 440px справа)
- Загрузка PDF / DOCX, локальный парсинг
- Form Scanner: input, textarea, select + label resolver
- Preview извлечённого текста
- **Профили:** каталог свойств, import/export JSON, CSV/TSV/TXT
- **Exact matching:** saved mapping, exact label, exact alias
- **PageFieldSignature** для восстановления связей на новой странице
- Unit-тесты: scanner, label, pageAccess, profile import/matcher

### Что НЕ реализовано (не начинать без запроса)

- Извлечение характеристик из документа (v0.3)
- Document → profile matching (v0.4)
- Заполнение полей (v0.5)
- Fuzzy / AI / OCR / ChatGPT Bridge
- Bitrix-specific / site-specific код

---

## Архитектура (кратко)

```text
src/
  background/       service worker → inject content.js
  content/          Shadow DOM host + React UI
  ui/               React-компоненты панели
  document/pdf|docx parsers → DocumentParseResult
  form/             formScanner, labelResolver
  profile/          storage, import, export, matcher, fieldSignature
  shared/           types, utils
```

**Сборка:** три vite-конфига → `dist/background.js`, `dist/content.js`, `dist/pdf.worker.min.mjs`

**Content script:** IIFE-бандл (не ES module injection!) — иначе `import.meta` из pdfjs ломает страницу.

**PDF.js:** worker копируется в dist, `GlobalWorkerOptions.workerSrc` задаётся в `setupPdfjs.ts`, worker в `web_accessible_resources`.

**Permissions:** только `activeTab`, `scripting`, `storage`. Без `<all_urls>` host permission.

---

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `src/background/index.ts` | Клик по иконке, inject, проверка restricted URL |
| `src/content/index.tsx` | Shadow DOM + React mount |
| `src/document/pdf/setupPdfjs.ts` | Конфиг PDF.js worker |
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
- `content.js` ~1.1 MB (pdfjs + mammoth + React + profiles)
- Document → profile matching не реализован
- Только exact matching (без fuzzy)
- externalId пока не участвует в auto-match (кроме хранения)

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

**Коммит:** _(will be set after commit)_

- `src/profile/*` — типы, storage (`schemaVersion: 1`), import/export, matcher
- `PageFieldSignature` — name, htmlId, normalizedLabel, elementType (не runtime fp-field id)
- UI: ProfileBar, свойства, импорт, сопоставления, «Запомнить»
- Exact matching: saved → exact label → exact alias
- Тесты: normalizePropertyLabel, profileImport, profileMatcher (+ fieldSignature)
- Bundle: `content.js` ~1112 KB (+30 KB к v0.1)

---

## Инструкция для следующей сессии AI

1. Прочитай этот файл и `ROADMAP.md`
2. Не добавляй backend, AI, auto-submit
3. После изменений: `npm run build`, `npm run test`
4. **Допиши новую секцию в «Журнал разработки»** и строку в `CHANGELOG.md`
5. Commit/push — только по явной просьбе пользователя
