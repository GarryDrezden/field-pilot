# FieldPilot

**FieldPilot** — браузерное расширение для извлечения данных из PDF и DOCX и последующего заполнения веб-форм.

FieldPilot разбирает технический документ **независимо от текущей страницы**: форма на сайте нужна только на этапе заполнения. Можно заранее загрузить PDF на любой вкладке, проверить извлечённые характеристики и перейти к карточке товара позже — документ сохранится в рамках browser session.

Проект не привязан к конкретной CMS, сайту или типу товара.

> **Для AI-ассистентов:** актуальный статус и журнал изменений — в [AGENTS.md](AGENTS.md). История релизов — в [CHANGELOG.md](CHANGELOG.md).

## Зачем нужен FieldPilot

Технические характеристики товаров часто приходят в виде PDF, коммерческих предложений, каталогов и DOCX-файлов. Затем эти данные приходится вручную переносить в административную панель сайта.

FieldPilot сокращает ручной перенос характеристик до pipeline:

**загрузить документ → проверить характеристики → (опционально) сопоставить с профилем → (опционально) заполнить форму на нужной странице.**

Анализ документа не требует открытой формы. Профиль — каталог целевых свойств. Веб-страница — только место назначения для уже разобранных значений.

## Profile (профиль)

**FieldPilot profile** — локальный каталог свойств, который выступает промежуточным слоем между терминологией документа и полями веб-страницы.

Профиль не привязан к URL, CMS или конкретному сайту. Пользователь сам выбирает активный профиль и связывает свойства каталога с полями HTML-формы. FieldPilot не добавляет найденные поля страницы в профиль автоматически.

## Что работает сейчас

### v0.1 — Foundation

- Manifest V3, drawer panel (Shadow DOM), PDF/DOCX parsing
- Form Scanner + label resolver
- Preview извлечённого текста

### v0.2 — Profiles & Property Catalog

- Локальные профили в `chrome.storage.local` (`schemaVersion: 1`)
- Каталог свойств профиля (`name`, `externalId`, `unit`, `aliases`, `sourceOrder`, `sourceIndex`)
- **Импорт XLSX** (основной формат рабочего каталога) с preview и reimport по `externalId`
- Импорт: JSON, CSV, TSV, TXT / вставка списка
- Экспорт профиля в JSON
- Exact matching: профиль ↔ поля страницы (saved mapping, exact label, exact alias)
- `PageFieldSignature` для устойчивых сохранённых связей
- UI: выбор профиля, свойства (1000+ с поиском), сопоставления, «Запомнить»

### Реальный XLSX-каталог

FieldPilot автоматически распознаёт колонки:

| Колонка в Excel | Поле профиля |
|-----------------|--------------|
| Название | `name` |
| Симв. код | `externalId` |
| Сортировка | `sourceOrder` |
| # | `sourceIndex` |

При повторном импорте того же каталога свойства сопоставляются по **`externalId`**, а не по названию — внутренние ID и mappings сохраняются. Одинаковые названия с разными `externalId` (например PARAM2226 и PARAM2248) остаются разными свойствами.

### v0.3.1 — Document Workspace / Session

- **Document session** в `chrome.storage.session` — characteristics между навигациями
- Анализ документа **на любой странице** (форма не обязательна)
- Characteristics — главный результат; исходный текст — debug
- Current Page — optional destination layer
- Placeholder для document → profile matching (v0.4)

### v0.3 — Local Extraction

- PDF line reconstruction по координатам PDF.js (visual lines вместо `join(' ')`)
- Локальное извлечение `ExtractedCharacteristic` из PDF/DOCX без профиля, без page scan и без AI
- Парсер значений: integer, decimal, ±, range, dimension
- Нормализация единиц RU/EN (longest-match-first: `m/min` ≠ `m`)
- UI: «Характеристики документа» — главный результат; исходный текст в свёрнутом debug-блоке
- **Document session:** characteristics сохраняются в `chrome.storage.session` между навигациями
- Placeholder для document → profile matching (v0.4)

## Pipeline

```text
Document
   ↓
ExtractedCharacteristic       ✅ v0.3
   ↓
ProfileProperty               ⏳ v0.4 (matching)
   ↓
PageField                     ✅ v0.2 (profile ↔ page)
   ↓
Fill                          ⏳ v0.5
```

**Сейчас работают:**

- document parsing (v0.1)
- **document → extracted characteristics, page-independent** (v0.3)
- profile property ↔ page field exact matching (v0.2)
- document session persistence в browser session (v0.3)

**Следующий шаг:** `matchDocumentToProfile(characteristics, profile.properties)` (v0.4).

## Что запланировано

- Document → profile matching + confidence score (v0.4)
- Document → profile → page matching engine + confidence score (v0.4)
- Безопасное заполнение выбранных полей без auto-submit (v0.5)
- Расширенное обучение на исправлениях пользователя (v0.6)
- ChatGPT Bridge без собственного API (v0.7)
- OCR и сложные документы (v0.8)

Подробный план — в [ROADMAP.md](ROADMAP.md).

## Confidence Score (запланировано)

FieldPilot не должен делать вид, что уверен там, где соответствие неоднозначно.

Для каждого сопоставления планируется уровень уверенности:

- 🟢 **высокая уверенность** — совпадение можно предложить для заполнения
- 🟡 **требует проверки** — соответствие вероятно, но неоднозначно
- 🔴 **низкая уверенность** — FieldPilot не должен автоматически использовать значение

Главный принцип проекта: **лучше оставить поле пустым, чем уверенно записать неправильную характеристику.**

## Локальный режим

Основной режим FieldPilot работает непосредственно в браузере.

Документы:

- не требуют собственного backend
- не отправляются на сервер FieldPilot
- не требуют API-ключей
- не требуют большой локальной AI-модели

**В локальном режиме документы обрабатываются внутри браузера и никуда не отправляются.**

Результат разбора документа (метаданные файла + `ExtractedCharacteristic[]`) сохраняется в **`chrome.storage.session`** до закрытия browser session. Бинарный файл, полный текст документа и поля страницы в storage не попадают. Профили и mappings — в `chrome.storage.local`.

## Поддерживаемые браузеры

- Google Chrome
- Opera
- другие Chromium-браузеры — по возможности

FieldPilot разрабатывается как расширение **Manifest V3**.

## Поддерживаемые документы

Сейчас:

- PDF (только документы с текстовым слоём)
- DOCX

Планируется:

- отсканированные PDF через OCR-модуль
- улучшенное извлечение таблиц

Формат `.doc` пока не является целью MVP.

## Архитектура

Упрощённый pipeline:

```text
PDF / DOCX
    ↓
Document Parser
    ↓
Characteristic Extraction   ← v0.3
    ↓
Profile Matching            ← v0.4
    ↓
PageField (optional scan)   ← v0.2
    ↓
Review & Fill               ← v0.5
```

Структура проекта:

```text
src/
  background/     service worker, запуск панели
  content/        injected panel host (Shadow DOM)
  ui/             React-интерфейс панели
  document/       PDF/DOCX parsers
  extraction/     characteristic extraction
  session/        document session storage
  matching/       document ↔ profile (v0.4 stub)
  profile/        profiles, import, page matching
  form/           FormScanner, label resolver
  shared/         types, utils
```

## Безопасность заполнения

FieldPilot может изменять значения полей только после действия пользователя (запланировано в v0.4).

Расширение не должно автоматически:

- отправлять форму
- нажимать «Сохранить»
- нажимать «Применить»
- публиковать изменения

## Установка для разработки

```bash
npm install
npm run dev
```

`npm run dev` собирает расширение в `dist/` в watch-режиме.

## Сборка

```bash
npm run build
```

Дополнительно:

```bash
npm run lint
npm run typecheck
npm run test
```

## Загрузка unpacked extension

После сборки выберите папку **`dist/`** в режиме загрузки распакованного расширения.

### Chrome

1. Откройте `chrome://extensions`
2. Включите **Developer mode**
3. Нажмите **Load unpacked**
4. Выберите директорию `dist/`

### Opera

1. Откройте страницу управления расширениями Opera
2. Включите режим разработчика
3. Выберите загрузку распакованного расширения
4. Укажите директорию `dist/`

## Ручная проверка

### Без формы на странице

1. Откройте любую страницу без формы (например google.com)
2. Откройте FieldPilot, выберите профиль
3. Загрузите PDF — должны появиться «Характеристики документа»
4. Не нажимайте «Сканировать страницу» — всё должно работать

### Navigation + session

1. Загрузите PDF, запомните число характеристик
2. Перейдите на другой URL, снова откройте FieldPilot
3. Документ и характеристики восстановлены; PageFields пусты до scan

### Profile ↔ page (v0.2)

1. Откройте страницу с HTML-формой
2. «Сканировать страницу» → «Связи профиля с этой страницей»

## Ограничения текущей версии

- Нет сопоставления характеристик с полями
- Нет заполнения полей
- PDF без текстового слоя не поддерживаются (OCR позже)
- Checkbox/radio исключены из сканирования
- Динамические SPA-формы могут потребовать повторного сканирования
- PDF парсится в main thread (`disableWorker: true`) — на больших файлах UI может кратковременно подвисать

## Roadmap

[ROADMAP.md](ROADMAP.md)

---

**FieldPilot**

*Documents in. Fields filled.*
