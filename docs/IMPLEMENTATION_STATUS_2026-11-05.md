# Personal Expert AI Web — implementation status

Дата обновления: 2026-11-05  
Текущий исходный HEAD до документационного commit: `9b94ad4799a7c2e9f5c95d2f2d52cf9a1351bff9`  
Публичный frontend: https://dach1980.github.io/Personal_Expert_AI_Web/

## Подтверждённая реализация в Web

### Frontend baseline / GitHub Pages
- React 18 + TypeScript + Vite.
- Зафиксированный `package-lock.json`, CI использует `npm ci`.
- GitHub Pages workflow выполняет frontend tests, TypeScript/Vite build, подготовку `dist/404.html`, проверку logo/JS/CSS и post-deploy smoke tests.
- SPA routes: `/`, `/projects`, `/knowledge`, `/settings`; `popstate` синхронизирует Back/Forward.
- Светлая/тёмная тема: системная тема при первом запуске, ручной выбор, сохранение в localStorage.
- Подтверждённый успешный deployment до последних UX-изменений: [run 41960961373](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41960961373), commit `704ee545e7b3c6a6a08097a0d2b4b11c136772a5`.
- Последний UX change set: `6e5dbce`, `16e065c`, `9b94ad4`. Его workflows завершились SUCCESS: [41961641314](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41961641314) (npm ci, frontend tests, TypeScript/Vite build, SPA fallback, asset checks и post-deploy smoke tests) и [41961641688](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41961641688) (Pages build/deploy).

### Identity / OIDC frontend
- Authorization Code + PKCE S256.
- RS256/JWKS ID token validation; issuer, audience, expiry, nonce.
- Single-flight refresh; access/refresh tokens остаются в памяти.
- После reload выполняется Keycloak SSO `prompt=none`, без сохранения bearer tokens в localStorage/sessionStorage.
- Реальный Keycloak realm, redirect URI/origin, token rotation, logout/revocation, gateway header stripping и browser E2E не проверены.

### Workspace, projects, conversations
- Загрузка проверенной сессии и доступных проектов через Bionic PEA Adapter.
- Проект выбирается из серверного списка; проектные данные запрашиваются в tenant scope с backend ACL.
- История диалогов загружается из API; добавлены список диалогов, переключение и создание нового диалога.
- Переименование/архивирование диалогов пока не добавлены: соответствующие операции должны сначала существовать в API Adapter и PEA.
- Чат использует SSE parser и отображает citations, если backend их присылает.
- PEA сейчас эмитит текстовые delta/done/error; citations от retrieval ещё не формируются. UI прямо сообщает, что автоматического документного контекста пока нет.

### Documents / evidence
- DocumentWorkspace содержит создание документа, multipart upload immutable versions, idempotency key, список версий, processing runs, SourceFragments, artifacts preview, Reviews/Findings/Evidence.
- Это UI/API integration code; полноценный runtime E2E с реальным worker, storage и документами ещё не принят.
- Knowledge route пока фактически открывает документный workspace; отдельный semantic Knowledge Base/Skills UX не завершён.

### Settings
- Добавлен рабочий экран локальных предпочтений темы.
- Показывает read-only состояние сессии, пользователя, tenant context и наличие build-time API/OIDC config.
- Backend provider/model/storage settings намеренно не редактируются из публичного браузера.
- Tenant selection/switch source code added: Web discovers active memberships via Bionic `/api/pea/tenants`, remembers only the preferred tenant UUID locally, and loads projects through the selected tenant-scoped route. PEA revalidates membership on every request. CI/browser and live Keycloak acceptance are pending.

## UX audit — найденные незакрытые области

1. Sidebar пока содержит только Workspace, Projects, Documents и Settings. Отдельные Dialogues, Reviews, Knowledge Base, Skills и Audit/Roadmap разделы отсутствуют.
2. Projects list не имеет полного поиска/сортировки, project details и управления участниками.
3. Chat имеет history selection/new conversation, но нет rename/archive/search, retry/cancel и явного состояния reconnect.
4. Settings — только read-only overview и theme preference; нет профильных, notification, model/provider и infrastructure controls.
5. Tenant switcher added to Web. The selector is backed by `GET /api/pea/tenants`; changing tenant clears project, conversation and message state before loading data for the newly selected scope. PEA membership validation remains authoritative.
6. Admin Audit & Roadmap UI is implemented and calls Bionic proxy routes for PEA `/admin/me`, `/admin/audit-events` and `/admin/tenants`. Sidebar visibility is based on the PEA permission response; every data endpoint still enforces its own server-side permission. Initial system-admin grant provisioning and CI/runtime acceptance remain.
7. Document UI требует более явных upload/progress/retry/empty/error states и preview navigation по страницам/листам.
8. Responsive layout и клавиатурная доступность требуют ручной browser acceptance на desktop/tablet/mobile.

## Межрепозиторные интеграционные статусы

| Gate | Статус | Что остаётся |
|---|---|---|
| Frontend CI / Pages | PASS for UX change set | Runs 41961641314 and 41961641688 SUCCESS; later docs-only commits have queued workflows |
| UX/navigation | PARTIAL | Полные разделы, responsive acceptance, rename/archive, полноценные Settings |
| OIDC | SOURCE IMPLEMENTED / RUNTIME BLOCKED | Реальный Keycloak, gateway trust boundary, token lifecycle E2E |
| Tenant/project | PARTIAL | Tenant list/switch API, UI, membership and RLS negative tests |
| Chat/SSE | PARTIAL | Cancel/retry/reconnect, citations emitted by retrieval, runtime tests |
| Documents | SOURCE IMPLEMENTED / RUNTIME BLOCKED | Worker/storage/artifacts E2E, malformed/oversized/duplicate tests |
| PEA Retrieval Tool | NOT IMPLEMENTED IN AGENT RUNTIME | Tool invocation, token propagation, ACL-before-prompt, citation allowlist |
| Bionic fork image | NOT ACCEPTED | Fork-specific image build, manifest/digest and deployment test |
| Integrated acceptance | BLOCKED | Shared Keycloak + PEA + Bionic + PostgreSQL/storage + LM Studio |

## Источники фактического статуса

- [Web latest source commits](https://github.com/Dach1980/Personal_Expert_AI_Web/commits/main/)
- [Latest Web Pages workflows](https://github.com/Dach1980/Personal_Expert_AI_Web/actions)
- [PEA implementation status](https://github.com/Dach1980/Personal_Expert_AI/blob/main/docs/development/IMPLEMENTATION_STATUS_2026-11-05.md)
- [Bionic PEA Adapter contract](https://github.com/Dach1980/bionic-personal-expert-ai/blob/main/docs/integration/PEA_API_ADAPTER.md)

## Правило приёмки

Source implementation, CI success and live runtime acceptance are separate statuses. Do not mark Keycloak, tenant switching, document processing, local inference or retrieval as runtime-ready without reproducible end-to-end evidence. No mock inference is accepted as LM Studio verification.


## Tenant switching and Audit & Roadmap implementation update — 2026-11-05

- Web session is now identity-only until a tenant is selected. Active tenant memberships are loaded from `GET /api/pea/tenants`.
- The preferred tenant UUID is stored as a UI preference only. It is not an authorization credential. Each tenant-scoped request is routed through Bionic and revalidated by PEA using `X-Tenant-ID` plus active membership.
- Switching tenant clears selected project, conversation history and messages before requesting projects in the new scope.
- The protected Audit & Roadmap screen calls real PEA administrative read APIs through Bionic: `/admin/me`, `/admin/audit-events`, `/admin/tenants`. PEA permissions control the data; the frontend only hides navigation for non-admin users as a UX measure.
- Bionic now accepts Keycloak identity tokens without a `tenant_id` claim, exposes membership/admin proxy routes, and derives the upstream tenant header from its fixed tenant-scoped route.
- The PEA session endpoint now returns identity without requiring a selected tenant; tenant selection remains a separate membership-validated step.
- Source changes are committed to `main`. No current-commit CI success or live E2E is claimed until the corresponding workflows and runtime checks are verified.


## Public GitHub Pages demo mode — 2026-11-05

- [x] GitHub Pages workflow now forces `VITE_DEMO_MODE=true`; it does not depend on API/OIDC repository variables and cannot accidentally switch to live mode because of a stale variable.
- [x] Demo mode bypasses OIDC and backend initialization.
- [x] Demo workspace includes three clearly labelled sample projects and a demo chat that explicitly states that no model inference or document analysis is performed.
- [x] Knowledge/Documents includes a synthetic document library, sample versions, processing states and sample source fragments. No real files are uploaded or processed.
- [x] Audit & Roadmap navigation is visible in demo mode and opens a separate synthetic screen. Demo permission labels and audit events are not real PEA grants or audit records.
- [x] Workspace summary counters reflect the demo fixtures.
- [x] Pages smoke test includes direct SPA route `/admin`.
- [x] Tests cover stable demo project fixtures and explicit disclosure that inference is not performed.
- [x] Cross-repository API contract and integrated E2E acceptance plan added at `docs/CROSS_REPOSITORY_CONTRACT_2026-11-05.md`.

### Demo limitations

Demo mode is a UI demonstration only. It does not authenticate users, verify permissions, access a live tenant, upload documents, run OCR/ingestion, query PEA, call Bionic, or generate model answers. The synthetic admin screen is never an authorization boundary and must not be used to infer real system-admin status.

### Production mode gate

Do not switch the public Pages workflow to `VITE_DEMO_MODE=false` until a real HTTPS Bionic Adapter and Stack-managed Keycloak realm are configured and browser login, tenant isolation and API connectivity have passed live acceptance. The local LM Studio and document processing path still requires the primary workstation.
