# Roadmap реализации Personal Expert AI Web

Дата актуализации: 2026-11-08  
Основная ветка: `main`  
Публичный frontend: https://dach1980.github.io/Personal_Expert_AI_Web/

Этот документ описывает путь от текущего статического frontend-клиента к рабочему приложению Personal Expert AI. Статус «реализовано в коде» не равен статусу «проверено в реальном окружении».

## 1. Целевая архитектура

```text
Browser
  |
  | HTTPS + Keycloak OIDC Authorization Code / PKCE
  v
Personal_Expert_AI_Web (React + TypeScript, GitHub Pages)
  |
  | HTTPS + short-lived user access token
  v
Bionic fork (UI/Agent Runtime + server-side PEA Adapter)
  |
  | private server-to-server request; independently verified JWT
  v
Personal_Expert_AI (FastAPI, domain, authorization, data, processing)
  |                 |                    |
  v                 v                    v
PostgreSQL       Document storage      Local model provider
                                           |
                                           v
                                      LM Studio / Qwen
```

Владение компонентами:

- **Web** — пользовательский интерфейс, навигация, формы, история и визуализация источников. Не содержит бизнес-правил доступа и не обращается напрямую к PostgreSQL, хранилищу или LM Studio.
- **PEA** — единственный владелец tenant/project/document/conversation доменных данных, версий, processing runs, SourceFragments, reviews, findings, evidence, ACL и экспертной логики.
- **Bionic fork** — серверная граница интеграции и Agent Runtime. Не становится владельцем доменной модели PEA.
- **Keycloak** — единый Identity Provider.
- **LM Studio** — локальный inference runtime. Cloud fallback не предусматривается.

## 2. Текущее состояние

### Реализовано в исходниках

- React + TypeScript + Vite, responsive dark workspace.
- Базовая навигация: Workspace, Projects, Documents/Knowledge, Settings.
- Keycloak Authorization Code + PKCE S256 flow.
- API client для session, projects, conversations, message history и SSE.
- DocumentWorkspace: создание документа, загрузка immutable version, enqueue processing, SourceFragments, artifacts, reviews/findings/evidence.
- Явно включаемый demo mode.
- GitHub Pages deployment workflow.

### Исправление брендинга

Исходный SVG расположен в корневом каталоге `assets/logo.svg`. Vite по умолчанию не копирует произвольный корневой каталог в dist. Исправлено в commit `0637831d87df7ceaccffb85d365c8a545770fab4`: `assets/` назначен `publicDir`, а Sidebar, Footer и favicon используют `${BASE_URL}logo.svg`. Workflow дополнен проверкой файла в dist в commit `52e13a9ec700bf5c6e0094b1bd8b5f0fe71fbadb`.

Статус исправления: код и CI-проверка добавлены; опубликованный результат должен быть подтверждён успешным новым Pages run и проверкой URL.

### Не подтверждено реальным окружением

- Browser login/logout и обновление сессии через реальный Keycloak realm.
- Bionic Adapter и PEA доступны друг другу по настроенной сети.
- Tenant/project authorization на реальных пользователях.
- Реальный SSE inference через выбранную модель LM Studio.
- Фактическая загрузка и обработка документов worker-процессом.
- Retrieval по PEA SourceFragments и grounded answers с цитатами.
- Полный E2E security test.

## 3. Подробный план работ

### Этап 0. Стабилизация frontend и публикации

**Репозиторий:** `Personal_Expert_AI_Web`

Работы:
1. Подтвердить публикацию логотипа в Sidebar, Footer и favicon.
2. Добавить проверки обязательных файлов dist (logo, favicon, JS/CSS assets).
3. Зафиксировать `package-lock.json` и перейти с `npm install` на воспроизводимый `npm ci`.
4. Добавить frontend test runner и базовые unit/component tests.
5. Добавить lint/typecheck как отдельные CI gates.
6. Проверить GitHub Pages base path, прямую загрузку и обновление URL, обработку 404 и отсутствие root-relative путей.
7. Добавить автоматический smoke test опубликованного сайта после deploy.

Критерий приёмки: каждый push в main проходит воспроизводимую сборку; artifact содержит все ресурсы; опубликованная страница доступна по repository subpath.

### Этап 1. Завершение UX и информационной архитектуры

**Репозиторий:** `Personal_Expert_AI_Web`

Целевая навигация:
- Рабочее пространство / Dashboard.
- Проекты.
- Документы.
- Диалоги.
- Проверки / Reviews.
- База знаний.
- Skills.
- Настройки.

Работы:
1. Разделить текущие объединённые экраны Projects, Documents и Knowledge.
2. Реализовать список проектов с поиском, сортировкой, состояниями загрузки/ошибки/пустого списка.
3. Реализовать карточку проекта: реквизиты, статус, состав документов, последние диалоги и проверки.
4. Реализовать полноценный список диалогов: создание, переименование, поиск, архивирование (после появления API), история.
5. Создать раздел Reviews с фильтрами по статусу, severity и документу.
6. Создать Knowledge Base с поиском по разрешённым источникам и переходом к исходному фрагменту.
7. Создать Skills UI: список, описание, версия, доступность и разрешения. Не показывать несуществующие backend-функции как рабочие.
8. Создать Settings: профиль, активный tenant, настройки отображения, состояние интеграций и диагностическая информация без секретов.
9. Унифицировать визуальные компоненты: таблицы, карточки, badges статусов, dialogs, notifications, empty/loading/error states.
10. Обеспечить desktop/tablet/mobile layouts и keyboard accessibility.

Критерий приёмки: каждый пункт навигации открывает законченный экран, состояния и действия которого соответствуют реально реализованному API.

### Этап 2. Надёжная авторизация и жизненный цикл сессии

**Репозитории:** Web, Bionic, PEA; Keycloak deployment configuration.

Работы:
1. Сверить Keycloak realm, issuer, public client `pea-web`, redirect URI, allowed origins и scope `pea-api-context`.
2. Проверить Authorization Code + PKCE S256, state, nonce, issuer, audience, expiry и обработку ошибок.
3. Провести аудит собственной OIDC реализации Web; рассмотреть переход на проверенную OIDC-библиотеку вместо самостоятельной реализации протокола.
4. Проверить безопасное хранение access/refresh tokens, refresh rotation, истечение и отзыв сессии. Сейчас токены хранятся в памяти; поведение после полного обновления страницы нужно явно спроектировать и проверить.
5. Проверить logout с завершением Keycloak SSO session.
6. Убедиться, что Bionic проверяет подпись RS256 по JWKS, issuer, audience и временные claims.
7. Убедиться, что PEA повторно проверяет токен и membership; браузерные user/tenant/project headers не являются источником доверия.
8. Реализовать единые состояния UNAUTHENTICATED, FORBIDDEN, SESSION_EXPIRED и безопасное повторное направление на login.
9. Проверить отсутствие токенов в URL, localStorage, sessionStorage после завершения redirect round-trip, логах и telemetry.

Критерий приёмки: автоматизированные тесты протокольных сценариев и негативные тесты; реальный login/logout принимается только после runtime E2E с Keycloak.

### Этап 3. Пользователи, tenants и проекты

**Репозитории:** PEA, Bionic, Web.

Работы:
1. Завершить API получения доступных пользователю tenants и memberships.
2. Определить серверный API переключения активного tenant; tenant context нельзя менять только локальным React state.
3. Проверять активное membership при каждом запросе и при смене tenant.
4. Получать проекты только в контексте активного tenant.
5. Добавить UI выбора tenant и проекта; сбрасывать выбранные conversation/document/review state при смене контекста.
6. Добавить роли и permission-aware UI: скрытие/блокировка действий без прав не заменяет серверную проверку.
7. Проверить IDOR, подмену tenant/project/document/conversation IDs, cross-tenant и cross-project доступ.
8. Проверить RLS и composite FK в PostgreSQL; тесты должны запускаться в CI.

Критерий приёмки: пользователь не может прочитать или изменить данные чужого tenant/project даже при ручном вызове API.

### Этап 4. Рабочий чат и история диалогов

**Репозитории:** PEA, Bionic, Web.

Работы:
1. Зафиксировать единый контракт conversation/message/SSE.
2. Добавить создание, переименование, архивирование и список диалогов.
3. Поддержать историю сообщений, роли, timestamps, статусы генерации и ошибки.
4. Реализовать корректный SSE parser: event framing, multiline data, последнюю порцию буфера, завершение, error, heartbeat и reconnect policy.
5. Обрабатывать text_delta, citation/source, message_start, message_end, usage и error events.
6. Добавить stop/cancel generation, retry и защиту от повторной отправки.
7. Сохранять частичный ответ и показывать понятное состояние при сетевом обрыве.
8. Добавить рендеринг markdown/code/tables и безопасную обработку недоверенного содержимого.
9. Добавить контекст диалога: активный проект, выбранные документы и разрешённые источники.
10. Реализовать понятные статусы: отправка, генерация, завершено, остановлено, ошибка.

Критерий приёмки: API/component tests для последовательности событий и ошибок; live inference тестируется отдельно при доступности локальной модели.

### Этап 5. Документы и ingestion pipeline

**Репозитории:** PEA, Bionic, Web.

Работы:
1. Завершить document list/detail, фильтры, поиск и сортировку.
2. Реализовать immutable document versions и отображение истории версий.
3. Показывать checksum SHA-256, размер, тип, автора и время загрузки.
4. Добавить проверку MIME/type, размера, расширения, безопасных имён и повторных запросов.
5. Реализовать processing status timeline: queued, running, succeeded, failed, cancelled.
6. Добавить повтор обработки и диагностику ошибок без раскрытия внутренних путей/секретов.
7. Поддержать PDF/DOCX/XLSX/PPTX и другие согласованные форматы через отдельные parser adapters.
8. Показывать страницы, таблицы, изображения, OCR/text extraction и координаты источника.
9. Добавить просмотр оригинала и производных artifacts с проверкой авторизации на скачивание.
10. Проверять повторную загрузку, идемпотентность, большие файлы, повреждённые файлы и гонки версий.

Критерий приёмки: integration tests с реальным PostgreSQL и тестовым storage/worker; live document E2E требует развернутого окружения.

### Этап 6. PEA Retrieval и доказательные ответы в Agent Runtime

**Репозитории:** PEA, Bionic, Web.

Это обязательный этап, без которого чат ещё не является экспертным помощником по проектной документации.

Работы:
1. Реализовать PEA search/retrieval API для SourceFragments и document versions.
2. Принимать tenant/project/document scope только после серверной проверки прав.
3. Фильтровать ACL до формирования prompt/context.
4. Реализовать Bionic Agent Runtime tool, который обращается к PEA Adapter, а не к БД напрямую.
5. Возвращать фрагменты с provenance: document, immutable version, page/sheet, locator, fragment ID, checksum.
6. Добавить reranking и гибридный поиск по согласованной архитектуре; embedding provider остаётся заменяемым.
7. Встроить citations в ответ модели; каждая ссылка должна вести к конкретному источнику/фрагменту.
8. Запретить модели выдавать неподтверждённые ссылки и отделять найденные доказательства от предположений.
9. Добавить regression dataset: точные ответы, отсутствие ответа, конфликт документов, неверная версия, запрещённый документ.
10. Добавить cross-tenant retrieval tests и prompt-injection tests на содержимом документов.

Критерий приёмки: ответы сопровождаются проверяемыми ссылками на разрешённые фрагменты; unauthorized fragments никогда не попадают в prompt.

### Этап 7. Экспертные проверки и Reviews

**Репозитории:** PEA, Web, Bionic при необходимости.

Работы:
1. Экран списка проверок и их статусов.
2. Создание проверки по проекту/набору документов/версии.
3. Отображение findings по severity и разделам.
4. Evidence panel: нормативное требование, исходный фрагмент, страница/координаты, связанный документ.
5. Разделение violation, evidence gap, conflict и informational note.
6. Переход из замечания к конкретному месту в документе.
7. История изменений, подтверждение/отклонение и audit trail.
8. Экспорт отчёта только после согласования формата и проверки происхождения данных.

Критерий приёмки: каждое замечание имеет воспроизводимую связь с источником и версией документа.

### Этап 8. Hermes-inspired PEA Memory Engine и Skills

**Репозитории:** PEA (владелец памяти и бизнес-правил), Bionic (заменяемый Agent Runtime), Web (интерфейс управления).

**Порядок:** начать реализацию Memory Engine MVP сразу после завершения интерактивного `pea_search` и базовой сквозной связки Bionic + PEA. Не откладывать память до финального релиза.

#### 8.1. Memory Engine MVP

1. Провести аудит существующей таблицы `memory_entries`, `MEMORY_ENGINE.md`, моделей, миграций и фактических сервисов записи/извлечения.
2. Разделить типы памяти: conversation context, episodic memory (события и завершённые задачи), long-term/user memory (устойчивые факты и предпочтения), project memory (решения, ограничения и знания конкретного проекта).
3. Реализовать pipeline извлечения полезных воспоминаний из диалога с локальным Qwen; не сохранять автоматически каждую реплику.
4. Хранить source/provenance, owner, tenant/project scope, timestamps, confidence/status и lifecycle metadata.
5. Реализовать поиск/ранжирование и контролируемое добавление релевантной памяти в новый диалог.
6. Сохранять разделение памяти и документного retrieval: память не подменяет первоисточник и не становится доказательством содержимого документа.
7. Все операции чтения и записи проходят серверную авторизацию и tenant/project ACL до формирования prompt context.

**Критерий MVP:** сохранить полезное воспоминание в одном диалоге → начать новый диалог → автоматически извлечь воспоминание → применить его в ответе; тесты подтверждают provenance и отсутствие утечки в другой tenant/project/user.

#### 8.2. Memory governance и Skills

1. Реализовать просмотр и подтверждение важных фактов пользователем; различать предложенное, подтверждённое, устаревшее и отклонённое воспоминание.
2. Определить retention, архивирование, forgetting/deletion и конфликтующие/обновлённые факты.
3. Добавить audit trail и происхождение каждой записи памяти.
4. Поддержать Skills как версионируемые инструкции/процедуры/инструменты с явными разрешениями и областью действия.
5. Skill не может повышать полномочия пользователя, менять tenant/project scope или обходить PEA ACL.
6. Добавить UI для просмотра/управления памятью и Skills.
7. Проверить prompt injection, утечки контекста, cross-user, cross-tenant и cross-project isolation.

**Критерий приёмки:** память и Skills воспроизводимы, имеют provenance и lifecycle, версионируются и не обходят изоляцию.

### Этап 9. Сборка и доставка Bionic

**Репозиторий:** `bionic-personal-expert-ai`.

Принято решение: вариант C.

- Сейчас: локальная сборка fork-specific Docker image и импорт в k3d.
- Архитектура: registry-neutral image reference и immutable tag/digest.
- Позже: private GHCR с публикацией проверенного образа.

Работы:
1. Найти и зафиксировать штатный upstream Docker packaging/build pipeline.
2. Подтвердить, какие бинарные компоненты входят в web image, а какие остаются upstream.
3. Собрать fork image из commit SHA.
4. Заменить upstream web image в Stack manifest на fork image.
5. Согласовать Compose manifest с тем же image contract.
6. Добавить CI build и проверки Docker image/manifest.
7. Проверять наличие PEA Adapter routes внутри собранного образа.
8. Проверять image digest и commit provenance.
9. Подготовить GHCR authentication/publish workflow, но не делать registry обязательным для локальной разработки.

Критерий приёмки: развернутый Bionic Web pod работает из fork image, а его digest соответствует проверенному commit. До локального доступа пользователя это остаётся repository/CI подготовкой, а не runtime acceptance.

### Этап 10. Сквозная приёмка и эксплуатация

**Все три репозитория.**

Работы:
1. Подготовить staging topology и конфигурационные шаблоны без секретов.
2. Автоматизировать contract tests между Web, Bionic и PEA.
3. Автоматизировать E2E браузерные сценарии на тестовом окружении.
4. Проверить login → tenant → project → conversation → retrieval → citations.
5. Проверить upload → version → processing → fragments → artifact preview.
6. Проверить отказоустойчивость: недоступность Keycloak, PEA, storage, worker и model provider.
7. Добавить health/readiness endpoints и диагностические статусы.
8. Настроить structured logs и correlation IDs без токенов и содержимого документов.
9. Проверить backup/restore PostgreSQL и document storage.
10. Провести security review и зафиксировать release checklist.

Критерий приёмки: все критические сценарии проходят автоматизированные E2E/security tests; модель отвечает только через локальный provider; cloud fallback отсутствует.

## 4. Правила разработки при отсутствии локального доступа

Пока локальные Docker, k3d, Keycloak и LM Studio недоступны:

- все изменения выполняются непосредственно в GitHub-репозиториях, в `main`;
- перед каждым изменением проверяются текущие файлы и SHA;
- каждое изменение сопровождается commit и обновлением документации;
- GitHub Actions запускает сборки, unit/integration tests, schema checks и security checks;
- для межсервисных контрактов используются contract tests и mock services;
- CI не должен выдавать mock inference за проверку настоящей LM Studio;
- runtime acceptance помечается отдельно и не объявляется пройденным на основании успешной компиляции;
- секреты и локальные документы не помещаются в публичный frontend или GitHub artifacts.

## 5. Ближайший порядок реализации

1. Дождаться и проверить Pages workflow после исправления logo asset.
2. Завершить frontend baseline: lockfile, lint, tests, asset smoke tests.
3. Подготовить подробный UX backlog и завершить информационную архитектуру экранов.
4. Провести аудит OIDC/session lifecycle и закрыть протокольные пробелы.
5. Завершить backend tenant selection/switch contract и UI.
6. Завершить conversation/SSE contract и устойчивый чат.
7. Довести document ingestion UI/API до полного contract coverage.
8. Реализовать PEA retrieval tool в Bionic Agent Runtime.
9. Развернуть и подтвердить fork-specific Bionic image, когда появится доступ к k3d; до этого подготовить Docker build/CI/manifest изменения в репозитории.
10. После появления runtime среды выполнить live E2E и принять релиз.

## 6. Что не следует считать готовым

- Успешный Vite build не подтверждает работу Keycloak.
- Успешные Rust tests не подтверждают, что в k3d запущен fork image.
- Наличие API client не подтверждает доступность PEA по сети.
- Наличие DocumentWorkspace не подтверждает успешную обработку файлов worker-ом.
- Наличие SSE parser не подтверждает совместимость с фактическим streaming envelope.
- Наличие локального provider abstraction не подтверждает inference через LM Studio.
- Наличие SourceFragments не означает, что Agent Runtime уже выполняет retrieval и цитирует доказательства.

**Главный критерий готовности Personal Expert AI:** пользователь входит через Keycloak, выбирает разрешённый tenant и проект, загружает документы, получает проверяемые результаты обработки, задаёт вопросы в чате и получает ответы с точными доказательствами из доступных ему версий документов.


## Актуализация статуса — 2026-11-05

Удалённый `main` перед этим change set: `0caf1a6a568c6ad96a9a5b7f5a74b80e9b98a75c`.

### P0 — frontend baseline и GitHub Pages

- [x] JWK TypeScript metadata исправлены без ослабления RS256/JWKS проверки.
- [x] `package-lock.json` зафиксирован; CI использует `npm ci`.
- [x] GitHub Pages build/deploy workflow проходит на baseline.
- [x] Post-deploy smoke test проверяет homepage, logo и JS/CSS.
- [x] SPA fallback `dist/404.html` добавлен; Pages route smoke tests `/projects`, `/knowledge`, `/settings` прошли.
- [x] GitHub Pages build/deploy на commit `ec01cdd9bac1f425a0587450ab7f51379707e19f` — SUCCESS ([run 41960861523](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41960861523)).
- [x] URL-aware navigation и `popstate` обработчик реализованы.
- [ ] Ручной browser refresh и проверка Back/Forward на production.

Baseline runs: [41957689405](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957689405), [41957819479](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957819479), [41957819515](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957819515). Локальные тесты Manus для `b522b76` не считаются удалённой интеграцией.

### UI/UX

- [x] Базовые экраны Workspace, Projects, Knowledge/Documents, Settings.
- [x] Адаптивная оболочка, Sidebar, project list, chat panel, document workspace.
- [x] Светлая/тёмная темы: переключатель, системный выбор по умолчанию, сохранение предпочтения в localStorage.
- [ ] Завершить UX всех экранов, состояния загрузки/ошибки/пустого списка, доступность и мобильную навигацию.
- [ ] Полноценный Settings и защищённый Audit & Roadmap admin view (серверный RBAC), Reviews и пользовательские сценарии.

### Межсервисная интеграция и runtime

- [ ] OIDC/Keycloak: реальные login/logout, PKCE redirect, silent SSO, refresh/expiry, CORS.
- [ ] Tenant/project switching с server-side membership validation и cross-tenant isolation.
- [ ] Conversation API/SSE: полный event contract, reconnect/cancel/retry, citations и provenance.
- [ ] Documents: upload, immutable versions, processing worker, SourceFragments, artifact preview/download.
- [ ] PEA Retrieval Tool в Bionic Agent Runtime; grounded answers с проверяемыми citations.
- [ ] Экспертные Reviews/findings/evidence и audit trail.
- [ ] Knowledge, project memory и Skills с provenance, ownership и ACL.
- [ ] Bionic fork image build/CI, manifest и проверка runtime в k3d.
- [ ] Сквозные E2E/security/backup/restore и release acceptance.

### Критерий готовности

Наличие UI или API client означает только реализацию frontend-кода. Интеграция принимается после проверки с реальными Keycloak, Bionic, PEA, PostgreSQL, storage/worker и локальным LM Studio. GitHub Pages обслуживает только статический frontend; backend и inference остаются отдельными сервисами.


## UX и интеграция: актуализация 2026-11-05

Текущий Web status: [IMPLEMENTATION_STATUS_2026-11-05.md](IMPLEMENTATION_STATUS_2026-11-05.md).

### Выполнено в последнем UX change set
- [x] Добавлен выбор существующего диалога из серверной истории.
- [x] Добавлено создание нового диалога через существующий PEA Adapter endpoint.
- [x] Настройки заменены на реальный read-only обзор сессии, пользователя, tenant context и build-time API/OIDC configuration.
- [x] Светлая/тёмная тема с системным выбором и сохранением.
- [x] Responsive layout для новых элементов настроек и диалогов.

### Не завершено и не должно считаться готовым
- [ ] Browser acceptance на desktop/tablet/mobile, включая direct URL, refresh, Back/Forward и обе темы.
- [ ] Rename/archive/search conversations — сначала требуется backend/adapter contract.
- [ ] Отдельные разделы Dialogues, Reviews, Knowledge Base и Skills.
- [ ] Полноценный project details и управление участниками.
- [ ] Tenant list/switch API и безопасный selector; tenant scope подтверждает только backend.
- [ ] Защищённый Audit & Roadmap: PEA RBAC endpoint, persistent audit events, GitHub CI integration и admin-only UI. Не реализовывать как frontend-only скрытие.
- [ ] Chat cancel/retry/reconnect и live SSE acceptance.
- [ ] PEA Retrieval Tool в Bionic Agent Runtime с проверкой ACL до prompt context и citation allowlist.
- [ ] Fork-specific Bionic image и интеграционная приёмка.

### Текущий ближайший порядок
1. Подтвердить CI для conversation navigation/settings change set.
2. Завершить ручной UX/browser acceptance.
3. Спроектировать и реализовать серверную admin RBAC/audit основу в PEA до появления admin UI.
4. Добавить tenant membership list/switch contract и интегрировать его в Web.
5. Довести conversation lifecycle и document UX.
6. Выполнить Keycloak gateway runtime acceptance.
7. Реализовать PEA Agent Runtime tool и grounded citations.
8. Собрать fork-specific Bionic image и пройти сквозные E2E/security tests.


---

## Runtime checkpoint — 2026-11-08

The operational evidence and next-day execution plan are maintained in [ADMIN_ROADMAP_2026-11-07.md](ADMIN_ROADMAP_2026-11-07.md), section 5. This checkpoint supersedes earlier statements that Keycloak was not ready.

**Verified:** k3d cluster and operators are healthy; CNPG Keycloak database is healthy; Keycloak realm `stack-app`, OIDC discovery and JWKS are working; PEA API is reachable from the k3d server container; Keycloak issues a `pea-bionic-worker` client-credentials token whose RS256 signature, issuer, audience and scope have been verified.

**Not yet accepted:** PEA workload authorization for that token; Kubernetes Worker Secret; corrected dev Stack manifest (stale `bionic-gpt` URLs remain); Bionic deployment; Bionic pod network access to PEA/LM Studio; browser login and tenant membership enforcement; document processing and local inference; interactive conversation-scoped `pea_search`; working Memory Engine.

**Next execution date: 2026-11-09.** Verify PEA workload authorization, provision the Worker Secret without exposing it, correct and validate the Stack dev manifest, verify pod network paths, then deploy Bionic only if all gates pass. Follow with browser/OIDC smoke tests and the first local document-processing/inference scenario. Interactive `pea_search` remains the next functional milestone; Hermes-inspired Memory Engine MVP follows it.

The PEA PostgreSQL database/volume must remain separate and untouched. Never delete the k3d cluster, run the destructive local dev-init script, expose secrets, or deploy around failed validation/security gates.
