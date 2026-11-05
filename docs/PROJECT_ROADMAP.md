# Roadmap реализации Personal Expert AI Web

Дата актуализации: 2026-11-04  
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

### Этап 8. Knowledge Base, Memory и Skills

**Репозитории:** PEA, Bionic, Web.

Работы:
1. Разделить документный поиск, проектную память и пользовательские предпочтения.
2. Определить ownership, scope, retention и deletion rules для каждого типа памяти.
3. Хранить provenance для каждой записи памяти.
4. Поддержать skills как версионируемые инструкции/инструменты с разрешениями.
5. Не разрешать skill обходить tenant/project ACL.
6. UI для просмотра источника памяти, версии skill, области действия и статуса.
7. Проверить prompt injection, утечки контекста и межпроектное смешивание.

Критерий приёмки: память и skills воспроизводимы, версионируются, имеют права доступа и не обходят изоляцию.

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


## Дополнение по аудиту deployment от 2026-11-05

Последняя read-only проверка Manus выполнена на commit `6b8ef05992fe09bcd98596454b11ed5197d06b79`. Результат зафиксирован отдельно: [Deployment audit 2026-11-05](DEPLOYMENT_AUDIT_2026-11-05.md).

**Текущий статус этапа 0: BLOCKED.** На проверенном commit `npm test` прошёл (5/5), но `npm run build` завершился ошибкой TypeScript в `src/services/api/oidc.ts:90` (`JsonWebKey.kid`). GitHub Pages отдаёт некорректный опубликованный контент: необработанный `%BASE_URL%`, а `/logo.svg` возвращает 404. Последний известный push workflow — failed run [41956088626](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41956088626).

**Ближайший приоритет:** исправить тип JWK; проверить lockfile и `npm ci`; проверить, что workflow собирает и публикует именно `dist/`; проверить Pages base path и post-deploy smoke tests. До успешного Actions run и проверки опубликованного URL этап 0 не закрывать.

GitHub repository Variables фактически не проверены из-за HTTP 403 на read-only доступ; их значения не раскрывались. Live Keycloak, Bionic Adapter и PEA API не подключены/не подтверждены. Runtime acceptance остаётся отдельным блокером.
