# Personal Expert AI Web

Отдельный публичный frontend-клиент Personal Expert AI. Приложение построено на React + TypeScript + Vite и публикуется как статический сайт через GitHub Pages.

Текущая версия: **0.4.0**. Основная ветка разработки: `main`.

## Текущий статус

### Реализовано в коде

- [x] React + TypeScript + Vite; Sidebar, ProjectList, ChatPanel и DocumentWorkspace.
- [x] Адаптивное рабочее пространство и переключение разделов.
- [x] Типизированные модели пользователя, сессии, проектов, диалогов и документов.
- [x] OIDC Authorization Code + PKCE S256 через public Keycloak client `pea-web`.
- [x] API client для Bionic PEA Adapter: session, projects, conversations и message history.
- [x] SSE streaming client для ответов PEA conversation API.
- [x] Document workspace: список/создание документов, загрузка immutable versions, enqueue processing, статусы, SourceFragments и artifacts.
- [x] Просмотр artifact content и отображение Reviews / Findings / Evidence.
- [x] Bearer access token передаётся только в Authorization header; fetch credentials выключены.
- [x] Явный demo mode через `VITE_DEMO_MODE=true`.

### Требует live-проверки

- [ ] Применить `pea-web` client и `pea-api-context` scope к реальному Stack-managed Keycloak realm.
- [ ] Проверить browser login/logout, PKCE redirect, state/nonce, refresh и token expiry.
- [ ] Проверить реальный HTTPS Bionic Adapter, точный CORS allowlist и приватную связность Bionic → PEA.
- [ ] Проверить session/projects/conversations/SSE на развернутом PEA и локальной LM Studio модели.
- [ ] Проверить upload → version → processing run → SourceFragment/artifact preview на реальных данных.
- [ ] Провести E2E security tests: IDOR, cross-tenant/project, token leakage, XSS и CORS.
- [ ] Проверить опубликованный Pages deployment и прямую перезагрузку SPA routes.
- [ ] Подтвердить наличие logo.svg в опубликованном Pages artifact после исправления publicDir.

Наличие frontend-кода и mock/unit tests не означает, что интеграция с живым Keycloak/Bionic/PEA уже принята. До успешного E2E приложение не считается сквозным рабочим прототипом.

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
- Наличие document workspace не означает, что Agent Runtime уже выполняет retrieval по PEA SourceFragments. Для grounded chat нужен отдельный tenant/project-scoped retrieval tool и regression tests.
- Проверка пользователя и разрешений выполняется backend на каждом запросе. Не доверять tenant/project identifiers из браузера без серверной авторизации.

## Документация

- [API Adapter contract and current integration status](docs/API_ADAPTER.md)
- [Подробный roadmap до полноценного рабочего продукта](docs/PROJECT_ROADMAP.md)
- [Bionic GPT capability audit](docs/BIONIC_CAPABILITY_AUDIT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [PEA repository reconciliation — 2026-11-04](https://github.com/Dach1980/Personal_Expert_AI/blob/main/docs/development/REPOSITORY_RECONCILIATION_2026-11-04.md)
