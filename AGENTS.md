# AGENTS.md — контекст для AI-ассистентов

> **Читай этот файл в начале каждой сессии.** Здесь — текущий статус, архитектурные решения и журнал изменений FieldPilot.

Репозиторий: https://github.com/GarryDrezden/field-pilot

---

## Текущий статус

**Версия:** v0.1 (Foundation)  
**Milestone:** базовая архитектура работает на реальных страницах (проверено на Bitrix admin).

### Что уже работает

- Manifest V3, Chrome + Opera (Chromium)
- Панель по клику на иконку (Shadow DOM, 440px справа)
- Загрузка PDF / DOCX, локальный парсинг
- Form Scanner: input, textarea, select + label resolver
- Preview извлечённого текста
- Unit-тесты: labelResolver, formScanner, pageAccess

### Что НЕ реализовано (не начинать без запроса)

- Сопоставление характеристик с полями (v0.3)
- Заполнение полей (v0.4)
- AI / OCR / ChatGPT Bridge
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
| `src/form/labelResolver.ts` | Подписи полей (label, table cell, aria…) |
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

## Известные ограничения v0.1

- Не работает на `chrome://`, Web Store и других restricted pages (by design)
- PDF без text layer → предупреждение, OCR позже
- checkbox/radio не сканируются
- `content.js` ~1 MB (pdfjs + mammoth + React)
- Большие PDF могут кратковременно подвешивать UI

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

**Коммит:** _(этот push)_

- Переработан `scripts/generate-icons.mjs`: pixel-art иконка «документ → стрелка → поле формы»
- Синий градиент, белые элементы, размеры 16/48/128

---

## Инструкция для следующей сессии AI

1. Прочитай этот файл и `ROADMAP.md`
2. Не добавляй backend, AI, auto-submit
3. После изменений: `npm run build`, `npm run test`
4. **Допиши новую секцию в «Журнал разработки»** и строку в `CHANGELOG.md`
5. Commit/push — только по явной просьбе пользователя
