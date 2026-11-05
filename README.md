# Personal Expert AI Web

Отдельный публичный frontend-клиент Personal Expert AI. Приложение построено на React + TypeScript + Vite и публикуется как статический сайт через GitHub Pages.

Текущая версия: **0.4.0**. Основная ветка разработки: `main`.

## Текущий статус

### Реализовано в коде
- [x] React + TypeScript + Vite; Sidebar, ProjectList, ChatPanel и DocumentWorkspace.
- [x] Адаптивное рабочее пространство и базовое переключение разделов.
- [x] Переключатель светлой/тёмной темы с системным начальным выбором и сохранением предпочтения.
- [x] SPA-навигация по URL и синхронизация с browser back/forward; production refresh проверяется CI.
- [x] Типизированные модели пользователя, сессии, проектов, диалогов и документов.
- [x] OIDC Authorization Code + PKCE S256 через public Keycloak client `pea-web`.
- [x] Проверка ID token: RS256/JWKS, issuer, audience, expiry и nonce.
- [x] Refresh token single-flight и восстановление браузерной сессии через Keycloak `prompt=none` после reload; токены остаются в памяти.
- [x] API client для Bionic PEA Adapter: identity session, tenant memberships, tenant-scoped projects, conversations и message history.
- [x] Tenant selector backed by PEA active memberships; tenant switch clears dependent project/chat state and reloads the selected scope.
- [x] Protected Audit & Roadmap UI backed by PEA system-admin permissions, audit events and tenant inventory endpoints through Bionic.
- [x] SSE streaming client для ответов PEA conversation API.
- [x] Document workspace: список/создание документов, загрузка immutable versions, enqueue processing, статусы, SourceFragments и artifacts.
- [x] Просмотр artifact content и отображение Reviews / Findings / Evidence.
- [x] Bearer access token передаётся только в Authorization header; fetch credentials выключены.
- [x] Публичный GitHub Pages по умолчанию собирается в безопасном demo mode (`VITE_DEMO_MODE=true`); режим production можно включить явной repository variable `VITE_DEMO_MODE=false` после настройки реального HTTPS Adapter и Keycloak.
- [x] Demo mode содержит демонстрационные проекты, чат с честным предупреждением об отсутствии inference, библиотеку демонстрационных документов и отдельный demo-only экран Audit & Roadmap. Демоданные не являются реальными документами, пользователями, правами или событиями аудита.
- [x] GitHub Pages workflow читает публичные конфигурационные параметры из GitHub repository Variables.
- [x] Workflow проверяет logo.svg в build artifact и опубликованном Pages URL.

### Требует CI/runtime подтверждения
- [ ] Успешный Pages run после последних изменений и проверка опубликованного logo/favicon.
- [ ] Добавить package-lock.json, перейти на `npm ci`, добавить полноценные unit/component tests и lint.
- [ ] Применить `pea-web` client и `pea-api-context` scope к реальному Stack-managed Keycloak realm.
- [ ] Проверить browser login/logout, PKCE redirect, silent SSO, refresh rotation и token expiry на реальном Keycloak.
- [ ] Проверить реальный HTTPS Bionic Adapter, точный CORS allowlist и приватную связность Bionic → PEA.
- [x] Реализован Web tenant selector: список берётся из PEA membership API, выбор tenant используется для scoped API requests; CI/browser E2E и live membership acceptance ожидают проверки.
- [ ] Завершить SSE citations/completion/error contract и проверку на реальном API.
- [ ] Проверить upload → version → processing run → SourceFragment/artifact preview на реальных данных.
- [ ] Провести E2E security tests: IDOR, cross-tenant/project, token leakage, XSS и CORS.
- [ ] Подтвердить прямую перезагрузку SPA routes на production после публикации SPA fallback.
- [ ] Реализовать PEA Retrieval Tool в Bionic Agent Runtime; grounded chat с citations ещё не готов.

Наличие frontend-кода и успешной сборки не означает, что интеграция с живым Keycloak/Bionic/PEA уже принята. До успешного E2E приложение не считается сквозным рабочим прототипом.

## Локальный запуск

Требуется Node.js 22 и npm:

```bash
npm install
npm run dev
npm run build
npm run preview
```

Для реальной интеграции задаются публичные frontend configuration values:
- `VITE_API_BASE_URL` — HTTPS origin Bionic PEA Adapter;
- `VITE_OIDC_ISSUER` — точный issuer общего Keycloak realm;
- `VITE_OIDC_CLIENT_ID=pea-web`;
- `VITE_OIDC_REDIRECT_URI` — точный callback, зарегистрированный в Keycloak.

Это публичные параметры, не секреты. Не помещать во frontend API keys, client secrets, PEA credentials, DB credentials или model-provider keys.

## Архитектура

```text
React + TypeScript (GitHub Pages)
              |
              | HTTPS + OIDC access token (PKCE)
              v
Bionic PEA Adapter / trusted deployment boundary
              |
              | private server-to-server request
              v
Personal Expert AI API
              |
              v
PostgreSQL + local document storage + LM Studio
```

PEA остаётся владельцем доменных данных, tenant/project authorization, документов, версий, processing runs и SourceFragments. Bionic Adapter — сменная серверная граница интеграции. Frontend не обращается напрямую к PEA private API, PostgreSQL, storage или LM Studio.

## Ограничения

- GitHub Pages размещает только статические файлы; backend, Keycloak, PostgreSQL, worker, storage и LM Studio работают отдельно.
- PEA chat API использует локальный model provider без cloud fallback. Реальный inference требует доступной LM Studio и заданного `PEA_LLM_MODEL`.
- Проверка пользователя и разрешений выполняется backend на каждом запросе. Не доверять tenant/project identifiers из браузера без серверной авторизации.

## Документация

- [API Adapter contract and current integration status](docs/API_ADAPTER.md)
- [Cross-repository API contract and integrated E2E acceptance plan — 2026-11-05](docs/CROSS_REPOSITORY_CONTRACT_2026-11-05.md)
- [Подробный roadmap до полноценного рабочего продукта](docs/PROJECT_ROADMAP.md)
- [Bionic GPT capability audit](docs/BIONIC_CAPABILITY_AUDIT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Инструкция для Manus AI: подключение репозитория и deployment](docs/MANUS_HANDOFF.md)
- [Статус реализации на 2026-11-05](docs/IMPLEMENTATION_STATUS_2026-11-05.md)
- [Deployment audit по результатам Manus — 2026-11-05](docs/DEPLOYMENT_AUDIT_2026-11-05.md)
- [PEA repository reconciliation — 2026-11-04](https://github.com/Dach1980/Personal_Expert_AI/blob/main/docs/development/REPOSITORY_RECONCILIATION_2026-11-04.md)
