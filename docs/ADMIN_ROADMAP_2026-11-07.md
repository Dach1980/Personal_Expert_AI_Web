# Personal Expert AI — operational roadmap and local workstation status

**Updated:** 2026-11-08  
**Primary execution branch:** `main`  
**Backend:** [Personal_Expert_AI](https://github.com/Dach1980/Personal_Expert_AI)  
**Web/Admin:** [Personal_Expert_AI_Web](https://github.com/Dach1980/Personal_Expert_AI_Web)  
**Public Web preview:** https://dach1980.github.io/Personal_Expert_AI_Web/admin

This roadmap combines the current repository/source acceptance state with the newly prepared Windows 11 + WSL2 local workstation. A source implementation, green CI run, and live runtime acceptance are different evidence levels and must not be conflated.

## 1. Local workstation — completed today

| Component | Verified result |
|---|---|
| Windows / WSL | Windows 11 with Ubuntu 26.04.1 LTS under WSL2 |
| Repository | Backend cloned to `D:\Projects\Personal_Expert_AI`, branch `main`, clone HEAD `78f8cc1`, clean working tree |
| Docker | Docker Desktop 4.98.0, Engine 29.9.2, Compose 5.6.1; WSL integration working |
| PostgreSQL | PostgreSQL 16 container `personal-expert-postgres` is healthy and accepts connections |
| Persistent data | Named Docker volume created; keep it when stopping the environment |
| LM Studio | Windows API on port 1234; Ubuntu WSL reached `http://172.30.128.1:1234/v1/models` with HTTP 200; chat completion tested in Russian and English |
| Python tooling | System Python 3.14.4; uv 0.13.7 installed |
| Secrets | Local `.env` created, ignored by Git, permissions restricted; no secrets committed |

Detailed evidence: [Local setup acceptance record](https://github.com/Dach1980/Personal_Expert_AI/blob/main/docs/acceptance/LOCAL_SETUP_2026-11-07.md).

**Not yet done:** Python 3.12 project environment, dependency installation, database migrations, local PEA API startup, model connection from PEA, Keycloak/Bionic live integration and end-to-end user acceptance.

## 2. Next execution sequence

### Gate 1 — Prepare reproducible Python runtime

**Status:** Next

1. Use uv to install Python 3.12 without replacing Ubuntu system Python 3.14.
2. Create project-local `.venv` using Python 3.12.
3. Install PEA extras required for database, document processing, local LLM and development tests.
4. Verify interpreter, dependency imports, Ruff and pytest startup.
5. Keep `.venv`, `.env`, local data and document storage outside Git.

**Acceptance:** Python 3.12 is used by the project environment; dependencies install cleanly; no secret or local data appears in Git status.

### Gate 2 — Validate the local PostgreSQL schema

**Status:** PostgreSQL service ready; migrations not yet applied

1. Verify connection using the local `DATABASE_URL`.
2. Run `alembic upgrade head`.
3. Inspect Alembic current/head and PostgreSQL schema.
4. Run database/schema integrity and tenant/RLS tests.
5. Confirm the runtime role is restricted and does not own tables or bypass RLS before using it for API requests.

**Acceptance:** migrations apply cleanly; schema parity and PostgreSQL tests pass; tenant/project isolation remains enforced.

### Gate 3 — Start and smoke-test the PEA API

**Status:** Pending

1. Configure local development host/port and local storage root.
2. Start FastAPI locally from Ubuntu.
3. Check health/readiness, OpenAPI and database-backed endpoints.
4. Verify failure behavior when PostgreSQL is unavailable.
5. Confirm API binds only to the intended local interface during initial development.

**Acceptance:** API starts reproducibly, connects to local PostgreSQL and exposes only verified endpoints.

### Gate 4 — Connect PEA to LM Studio

**Status:** Network path WSL → Windows verified; PEA integration pending

1. Confirm the exact model ID from the live `/v1/models` response.
2. Set `LM_STUDIO_BASE_URL` and `LM_STUDIO_MODEL` in local `.env`.
3. Test PEA provider health and one Russian chat completion.
4. Test streaming, timeout, cancellation and unavailable-model errors.
5. Test embedding model separately; do not assume chat model supports embeddings.
6. Verify no cloud fallback and no outbound document/prompt transmission.

**Acceptance:** requests issued through PEA reach the intended local LM Studio model; failures are explicit; local-only policy is preserved. Container-to-host networking is a separate check if the API is later containerized.

### Gate 5 — Document ingestion and evidence

**Status:** Source implementation exists; local runtime E2E pending

1. Configure private local document storage.
2. Upload a harmless test PDF/DOCX/XLSX/PPTX.
3. Verify immutable document version, checksum and upload idempotency.
4. Run processing worker and inspect job state.
5. Verify SourceFragments, page/sheet locators, extraction artifacts and download authorization.
6. Test malformed, duplicate and oversized uploads.

**Acceptance:** upload → immutable version → processing → fragments/artifacts works locally and remains tenant/project scoped.

### Gate 6 — Identity, trusted gateway and Admin authorization

**Status:** Source/configuration exists; live acceptance pending

1. Inspect actual Stack-managed Keycloak version, realm, issuer and JWKS.
2. Verify Web public client `pea-web`, PKCE S256, redirect URI and allowed origins.
3. Verify Bionic independently validates caller JWT and forwards only verified identity.
4. Verify PEA independently validates JWT, external identity and active memberships.
5. Provision system-admin grants through the approved operator process; never grant admin from frontend state.
6. Test browser login/logout, refresh, expiry, forbidden access and audit event creation.

**Acceptance:** real Keycloak → Web → trusted Bionic Adapter → PEA path works; system admin endpoints enforce server-side permissions.

### Gate 7 — Tenant/project switching and isolation

**Status:** Source implementation exists; multi-tenant live E2E pending

1. Provision at least two test tenants, projects and users with distinct memberships.
2. Verify membership discovery and server-validated tenant selection.
3. Test switching tenant and resetting project/chat/document state.
4. Attempt IDOR and cross-tenant/project reads/writes using modified IDs and headers.
5. Verify PostgreSQL RLS and restricted runtime role under real API requests.

**Acceptance:** unauthorized tenant/project data cannot be accessed through UI, direct API calls, cached state or altered request parameters.

### Gate 8 — Interactive Bionic Agent Runtime retrieval

**Status:** Implementation gap — scheduled retrieval is not interactive chat retrieval

1. Design a conversation-scoped PEA delegation grant/context, separate from scheduled-task grants.
2. Implement model-facing `pea_search` tool registration and bounded execution loop in Bionic.
3. Propagate verified caller identity to PEA without exposing tokens to model prompts.
4. Derive tenant/project scope from trusted identity and recheck it in PEA.
5. Treat retrieved document content as untrusted data, not instructions.
6. Add ACL-before-prompt filtering, citation allowlist and immutable version provenance.
7. Add prompt-injection, cross-tenant and retrieval regression tests.

**Acceptance:** ordinary interactive chat can search only authorized PEA fragments and every citation resolves to an exact fragment/document version.

### Gate 9 — Integrated product acceptance

**Status:** Pending

Run complete browser E2E:

- Login → tenant → project → conversation.
- Upload → immutable version → worker → SourceFragments/artifacts.
- Question → interactive `pea_search` → local LM Studio → grounded answer → citation click-through.
- Admin audit and tenant inventory with server-side grants.
- Negative security tests for cross-tenant/project access, expired/revoked grants, prompt injection and model/API outages.
- Verify no cloud fallback, secret leakage or document content in logs.

**Definition of Done:** a user can securely access only permitted projects, process documents locally, and receive answers from the local model with citations to exact authorized source fragments.

## 3. Operating rules

- Work on `main` unless a separate branch is explicitly approved.
- Keep PEA as the sole owner of tenant/project/document data, authorization, retrieval and engineering logic.
- Bionic is a replaceable Agent Runtime / trusted adapter boundary; it must not access the PEA database directly.
- GitHub Pages is a static frontend only; it does not host FastAPI, Keycloak, PostgreSQL, workers, storage or LM Studio.
- Never treat demo data, source code, CI success or a mock response as live runtime acceptance.
- Never commit `.env`, passwords, tokens, private documents, local database files or model outputs containing private data.
- Preserve the PostgreSQL Docker volume when stopping the workstation. Do not run `docker compose down -v`.

## 4. Resume point

**Актуальная точка продолжения: 2026-11-08, локальный стенд Windows 11 + WSL2.** Более ранняя последовательность Gate 1 ниже по смыслу заменена текущим статусом.

### Что подтверждено на 2026-11-08

- k3d cluster `k3d-bionic` создан; server и agent nodes находятся в Ready.
- Traefik, CoreDNS и local-path provisioner работают.
- `stack init --install-keycloak` установил CNPG, Keycloak и Stack operators; все три deployment были проверены как 1/1 Ready.
- Keycloak PostgreSQL PVC `keycloak-db-cluster-1` имеет статус Bound, объём 10 GiB.
- CNPG cluster `keycloak-db-cluster` ещё находился в состоянии `Setting up primary`.
- Pod `keycloak-0` был Running, но Ready 0/1 и имел 3 перезапуска. Сам Keycloak пока не принят.
- Stack Operator был Ready 1/1.
- PEA PostgreSQL — отдельная система; его volume и БД не подключаются к Bionic Stack и не должны затрагиваться.

### Текущий следующий шаг — диагностика Keycloak

Не повторять `stack init` и пока не выполнять `stack deploy`. Сначала в Ubuntu/WSL проверить причину перезапусков и готовность CNPG:

```bash
echo "=== KEYCLOAK POD ==="
kubectl describe pod -n keycloak keycloak-0

echo
echo "=== KEYCLOAK CURRENT LOG ==="
kubectl logs -n keycloak keycloak-0 --tail=100

echo
echo "=== KEYCLOAK PREVIOUS LOG ==="
kubectl logs -n keycloak keycloak-0 --previous --tail=100

echo
echo "=== CNPG CLUSTER ==="
kubectl describe cluster.postgresql.cnpg.io -n keycloak keycloak-db-cluster

echo
echo "=== CNPG INIT LOG ==="
kubectl logs -n keycloak keycloak-db-cluster-1-initdb-pwsfl --all-containers --tail=100

echo
echo "=== RECENT EVENTS ==="
kubectl get events -n keycloak --sort-by=.lastTimestamp
```

Если имя init pod изменилось, сначала получить актуальное имя командой `kubectl get pods -n keycloak`. Логи и describe выводы проверить на наличие секретов до публикации; пароли, tokens и Secret data не копировать.

**Gate текущего этапа:** CNPG cluster показывает Ready, PostgreSQL pod Ready, Keycloak pod Ready, Stack Operator Ready. Только после этого проверить OIDC discovery/issuer и фактические service endpoints.

### Дальнейшая утверждённая последовательность

1. Развернуть Bionic Stack из `infra-as-code/stack.yaml` с профилем `dev`, предварительно проверив manifest, image references, секреты и внешние зависимости. Не запускать `dev-init.sh` и не удалять кластер.
2. Принять runtime цепочку Keycloak → Web → Bionic → PEA: реальный issuer из OIDC discovery, JWKS, audience, client scopes, существующая PEA identity и server-side tenant membership. Не передавать недоверенный `X-Forwarded-Access-Token`.
3. Проверить Bionic pod → PEA API и LM Studio; адреса WSL host gateway не считать автоматически доступными из k3d. Проверить загрузку/обработку документа и локальный inference.
4. Завершить интерактивный `pea_search`: conversation-scoped контекст создаётся сервером для аутентифицированного пользователя и проекта; модель не выбирает tenant/project authority; ACL проверяется до prompt; citations имеют allowlist и immutable provenance.
5. **Сразу после interactive pea_search начать PEA-owned Hermes-inspired Memory Engine MVP.** MVP включает эпизодическую, долговременную и проектную память, provenance, извлечение/сохранение полезных воспоминаний и повторное использование в новом диалоге.
6. После MVP реализовать Skills и управление памятью: версии, области действия, retention/deletion/forgetting, подтверждение важных фактов, audit trail, защита от prompt injection и изоляция user/tenant/project.
7. Выполнить сквозную browser E2E и security acceptance: login → tenant → project → upload → processing → interactive retrieval → local Qwen → grounded citations; затем негативные проверки изоляции.

### Архитектурные решения по памяти

- Memory Engine принадлежит **PEA**, не Bionic. Bionic остаётся заменяемым Agent Runtime/UI.
- Существующая таблица `memory_entries` и документ `MEMORY_ENGINE.md` — исходная база для аудита, но сами по себе не доказывают наличие работающего memory retrieval.
- Разделять conversation context, episodic memory, long-term/user memory и project memory; не смешивать их с исходным документным retrieval.
- Для каждой записи хранить scope, provenance/source, ownership и lifecycle metadata.
- Извлечение памяти должно учитывать ACL до добавления воспоминаний в prompt; запрещено межпользовательское и межпроектное смешивание.
- Skills — версионируемые процедуры/инструменты с разрешениями; skill не может расширять права пользователя или обходить PEA ACL.

**Правило приёмки:** наличие схемы, таблицы, UI или документации не считается работающей памятью. MVP принимается только после теста: сохранить воспоминание в одном диалоге → открыть новый диалог → автоматически извлечь его → применить в ответе; параллельно доказать отсутствие доступа из другого tenant/project/user.


---

## 5. Runtime status and next work — 2026-11-08 (supersedes the earlier resume point)

This section records the verified state at the end of 2026-11-08. Earlier observations in section 4 are historical and must not be treated as the current state.

### 5.1 Verified as completed

| Area | Verified state |
|---|---|
| k3d | Cluster `k3d-bionic` exists; server and agent nodes are Ready. |
| Ingress | Traefik is reachable on host port `30000`; the separate `pea-keycloak-ingress` serves Keycloak. |
| Stack operators | CNPG, Keycloak and Stack operators are Running/Ready. |
| Keycloak database | CNPG cluster `keycloak-db-cluster` is healthy; PostgreSQL pod is Running; 10 GiB PVC is Bound. |
| Keycloak | Pod is Ready; realm `stack-app` is active. The old expected realm `bionic-gpt` does not exist. |
| OIDC discovery/JWKS | Discovery document and JWKS endpoints under `http://localhost:30000/realms/stack-app` return HTTP 200. |
| PEA clients/scopes | `pea-api` audience, `pea-api-context` scope, confidential `pea-bionic-worker`, public `pea-web`; context scope attached to Bionic OIDC client `stack-app` and worker. |
| PEA reachability | PEA API `/health` returns HTTP 200 locally and from the k3d server container via `host.docker.internal:8000`. |
| Worker token | Keycloak issues a client-credentials token for `pea-bionic-worker`; RS256 signature, issuer, audience `pea-api`, expiration and scope were successfully verified against JWKS. Token and secret were not printed or committed. |
| Port-forward cleanup | Temporary Keycloak port-forward on host port `18080` was stopped; PID 5448 is no longer running. |

### 5.2 Not yet accepted / remaining gaps

- PEA workload authorization has **not** yet been verified end-to-end: prove that the PEA API accepts the Worker token on the intended workload/delegation endpoint and enforces instance, scope and grant restrictions.
- The Worker client secret has not yet been installed as a Kubernetes Secret for Bionic. Do not print it, place it in Git, or put it in command-line arguments/history.
- `infra-as-code/stack.yaml` still contains stale `bionic-gpt` realm paths in the dev profile. Align issuer, JWKS, token and logout URLs with the verified `stack-app` realm before deployment.
- Bionic Stack has **not** been deployed. Do not report the Bionic application as running.
- Bionic pod-to-PEA and pod-to-LM Studio networking still require runtime verification.
- Browser login/logout, trusted gateway token forwarding, PEA membership authorization and tenant/project isolation are not yet accepted.
- Document upload/worker processing, local inference from Bionic and grounded document answers are not yet accepted.
- Normal interactive chat still lacks a proven conversation-scoped PEA retrieval flow. Scheduled retrieval does not satisfy this requirement.
- Hermes-inspired Memory Engine is not implemented as a working write/retrieve/reuse pipeline; schema and design documents alone are not acceptance evidence.

### 5.3 Plan for 2026-11-09

Execute in this order, keeping all repository changes on `main` and preserving the separate PEA PostgreSQL database/volume.

1. **Verify PEA workload authorization.** Inspect the actual auth/delegation implementation and tests, then call the intended endpoint with a freshly issued Worker token. Confirm both positive access and rejection of wrong issuer/audience/client/scope/instance or missing grant. Do not infer authorization from successful JWT signature verification alone.
2. **Prepare the Worker credential safely.** Retrieve/rotate the Keycloak client secret only through a non-printing flow and create/update the Kubernetes Secret expected by the deployment. Never expose secret values in terminal output, Git, screenshots or logs.
3. **Correct and validate the Stack dev manifest.** Replace stale `bionic-gpt` references with the verified `stack-app` issuer and endpoints; check every required secret, image reference, service URL and profile setting. Use the validation command supported by the installed Stack CLI/version; do not run deployment until validation and prerequisites pass.
4. **Recheck network paths.** Confirm Keycloak service discovery, PEA API access from the cluster, and determine a working, explicit route from Bionic pods to LM Studio. Do not assume the WSL gateway address is reachable from pods.
5. **Deploy Bionic only after gates 1–4 pass.** Run the dev deployment without deleting/recreating the cluster or touching the PEA PostgreSQL volume. If a gate fails, stop and fix that specific blocker rather than bypassing it.
6. **Runtime smoke and identity acceptance.** Verify Bionic pods/services, browser login/logout, issuer/JWKS/audience validation, trusted gateway stripping of client-supplied `X-Forwarded-Access-Token`, and PEA membership enforcement.
7. **First integrated document/inference scenario.** Upload a harmless test document, confirm immutable version and processing/SourceFragments, then verify a local LM Studio inference request with no cloud fallback. Record what is genuinely accepted and what remains blocked.
8. **Prepare the next functional milestone.** After the base Bionic↔PEA path is accepted, implement conversation-scoped interactive `pea_search`: context and project scope must be server-derived, ACL filtering must happen before prompt construction, and citations must resolve to immutable source fragments.
9. **Keep Memory Engine after interactive retrieval.** Start the PEA-owned Hermes-inspired Memory Engine MVP after interactive `pea_search`; do not conflate it with document retrieval.

### 5.4 Safety and acceptance constraints

- Do not run `.agents/skills/k3d-environment/dev-init.sh`, do not delete the `k3d-bionic` cluster, and do not run destructive Docker volume commands.
- Do not rerun `stack init` or execute `stack deploy` before manifest, secrets, identity and network prerequisites are verified.
- Do not run `bootstrap_initial_workspace.py`; the PEA database is already populated.
- Do not expose PEA PostgreSQL to Bionic and do not modify its Docker volume.
- Do not trust tenant/project IDs or `X-Forwarded-Access-Token` supplied by the browser/model. Bionic must strip client-supplied forwarded identity and inject only verified identity.
- Keep secrets, tokens, private documents and local database content out of Git and logs.
- Distinguish source implementation, cryptographic token verification, API authorization, and complete browser/runtime acceptance as separate evidence levels.


---

## 6. PEA launch checklist and local Runner — 2026-11-14

This section supersedes older "next step" notes where they conflict with the verified state below. It separates source/CI acceptance from local database acceptance and actual application startup.

### 6.1 Local verification infrastructure — completed

| Item | Status | Evidence |
|---|---|---|
| Separate private control repository created | DONE | [Personal_Expert_AI_Local_Control](https://github.com/Dach1980/Personal_Expert_AI_Local_Control) |
| Manual-only local verification workflow added | DONE | `.github/workflows/local-pea-verification.yml` in the control repository; `workflow_dispatch` only |
| WSL self-hosted Runner installed and connected | DONE | Runner `AIStation`, version 2.338.2; connected and listening for jobs |
| Runner label configured for workflow routing | DONE | Workflow run was successfully assigned to `self-hosted, linux, x64, pea-local-control` |
| First local Runner workflow | DONE | [Run #1 — 43512765531](https://github.com/Dach1980/Personal_Expert_AI_Local_Control/actions/runs/43512765531), manually started on `main`, completed successfully |
| Isolated source checkout | DONE | Workflow cloned public PEA `main` into a temporary directory under `RUNNER_TEMP`; existing local working copy was not used |
| Python source compilation | DONE | `compileall` passed; runner reported Python 3.12.16 |
| Ruff | DONE | Ruff 0.17.4; `ruff check app migrations tests` — All checks passed |

**Control repository:** [Dach1980/Personal_Expert_AI_Local_Control](https://github.com/Dach1980/Personal_Expert_AI_Local_Control). It is intentionally separate and private. Keep it private and keep the Runner registered at repository scope only. The workflow is manual-only; do not add push, pull-request, schedule or other untrusted triggers. The current source-smoke workflow does not access PostgreSQL, Keycloak, local `.env`, private documents or the existing local working tree.

### 6.2 Backend and database verification — completed in CI, local acceptance pending

| Item | Status | Evidence / next action |
|---|---|---|
| PostgreSQL 16 migration upgrade to head | DONE in GitHub CI | `database-ci.yml` |
| Alembic schema consistency check | DONE in GitHub CI | `alembic check` passed |
| Migration downgrade to base and re-upgrade | DONE in GitHub CI | Full migration cycle passed |
| Restricted runtime DB role for RLS tests | DONE in GitHub CI | CI provisions `app_runtime` with NOSUPERUSER/NOBYPASSRLS and restores grants |
| Tenant discovery HTTP tests | DONE in GitHub CI | Real FastAPI TestClient GET `/api/v1/tenants` under restricted runtime role |
| Two-user/two-tenant API + RLS isolation | DONE in GitHub CI | Cross-user tenant discovery isolation test passed |
| Membership revocation on subsequent request | DONE in GitHub CI | Existing JWT is denied after membership is revoked |
| Full backend test suite | DONE in GitHub CI | 23 integration tests; 142 total tests; Ruff passed in run #475 |
| Local PostgreSQL 16 container | PREVIOUSLY VERIFIED; recheck before use | Container `personal-expert-postgres` was healthy on 127.0.0.1:5432 during local setup. Confirm it is running now before local DB acceptance |
| Local migrations and schema parity against AIStation PostgreSQL | TODO | Run using the local project environment and local database only |
| Local restricted application role and RLS acceptance | TODO | Verify ownership, grants, FORCE RLS and NOSUPERUSER/NOBYPASSRLS; do not run application requests as table owner/superuser |

**Important distinction:** green GitHub CI proves the migration and test suite against CI's disposable PostgreSQL service. It does not prove that migrations have been applied to the PostgreSQL instance on AIStation.

### 6.3 Authentication — cryptographic smoke passed; live API/browser acceptance pending

| Item | Status |
|---|---|
| Keycloak Authorization Code + PKCE S256 smoke | DONE |
| ID token signature, issuer, audience and nonce verification | DONE |
| Access token signature, issuer and `pea-api` audience verification | DONE |
| Subject consistency between ID and access tokens | DONE |
| Tokens kept in memory and not written to disk by smoke test | DONE |
| Real HTTP request from browser through Web/Bionic to PEA | TODO |
| PEA API authorization with real Keycloak token and active membership | TODO |
| Login/logout/refresh/expiry/revocation in the Web UI | TODO |
| System-admin authorization and audit event acceptance | TODO |

Evidence: local OIDC PKCE smoke script and its seven tests passed on 2026-11-13. This verifies token issuance and cryptographic validation; it does not by itself prove the full browser-to-PEA runtime path.

### 6.4 Checklist before the first local PEA API launch

- [ ] Confirm WSL Runner is available when needed; keep it stopped when not running a trusted manual workflow.
- [ ] Confirm Python 3.12 project interpreter and `.venv` are the ones used for PEA (the Runner's Python 3.12.16 source-smoke check is not proof that the project's virtual environment is configured).
- [ ] Install/synchronize project dependencies in the PEA virtual environment.
- [ ] Confirm local PostgreSQL 16 is healthy and the intended database is selected.
- [ ] Review local `.env` without displaying or copying secrets; confirm it is ignored by Git.
- [ ] Apply Alembic migrations to the local PEA database and verify current revision equals head.
- [ ] Verify local schema parity and run PostgreSQL integration tests, including tenant isolation and membership revocation.
- [ ] Verify the API runtime role is restricted and RLS is enforced; do not use the schema owner or a superuser for normal API requests.
- [ ] Confirm local storage paths exist and are not inside tracked source directories.
- [ ] Start FastAPI bound to the intended local development interface.
- [ ] Verify `/health`, OpenAPI and a database-backed endpoint.
- [ ] Stop the API and verify it reports a clear failure when PostgreSQL is unavailable.

**First API launch acceptance:** FastAPI starts reproducibly, connects to the local PostgreSQL database using the restricted runtime role, returns a healthy status, and cannot bypass tenant isolation.

### 6.5 Checklist after the first API launch — before integrated product acceptance

- [ ] Configure PEA's LM Studio provider using the verified WSL-to-Windows endpoint; test a Russian completion through PEA, not only directly against LM Studio.
- [ ] Verify streaming, timeout, cancellation, unavailable model and embedding behavior; prove there is no cloud fallback.
- [ ] Upload a harmless test document and verify immutable version, checksum, processing job, SourceFragments, locators and artifacts.
- [ ] Verify download authorization and malformed/duplicate/oversized upload handling.
- [ ] Complete Keycloak → Web → trusted Bionic Adapter → PEA live authentication and membership authorization.
- [ ] Test tenant/project switching and IDOR/cross-tenant access through real HTTP requests.
- [ ] Complete conversation-scoped interactive `pea_search`; derive scope from verified identity, enforce ACL before prompt construction, and preserve exact fragment/version citations.
- [ ] Implement and accept the PEA-owned Hermes-inspired Memory Engine only after interactive retrieval; test write → new conversation → retrieval/reuse and cross-user/project isolation.
- [ ] Complete browser E2E and negative security tests; inspect logs for secret/document leakage.

### 6.6 Launch gates and definition of done

1. **Gate A — API boot:** Python environment, dependencies, local DB migrations, restricted DB role, health and database-backed endpoint pass.
2. **Gate B — local AI and documents:** PEA-to-LM Studio inference and document ingestion/processing pass without cloud fallback.
3. **Gate C — identity and isolation:** real Keycloak login, PEA membership checks, tenant/project switching and PostgreSQL RLS pass.
4. **Gate D — integrated product:** Bionic interactive retrieval, grounded citations, audit and memory acceptance pass.

A successful source-smoke Runner job is not an application launch. A successful API health check is not integrated product acceptance. The product is ready only when all four gates pass.

### 6.7 Safe next execution step

Do not expand the self-hosted Runner workflow to execute arbitrary project code or use local secrets. First perform a read-only preflight of the existing local PostgreSQL service and Python environment. Then prepare a narrowly scoped, manual-only database verification job with explicit database target checks and a restricted test role. Keep the workflow in the private control repository, do not add pull-request triggers, and never expose local `.env`, Keycloak credentials, tokens or private document data in logs.


### 6.8 Local read-only preflight workflow prepared — 2026-11-14

- [x] Added a separate manual-only workflow in the private control repository: [local-pea-preflight.yml](https://github.com/Dach1980/Personal_Expert_AI_Local_Control/blob/main/.github/workflows/local-pea-preflight.yml).
- [x] It checks the expected local PEA directory, reports whether the project virtualenv exists and its Python version, and checks .env presence/ignore status without reading its contents.
- [x] It checks Docker daemon reachability, the existing personal-expert-postgres container state/health and PostgreSQL readiness using pg_isready.
- [x] It does not run migrations, execute SQL writes, restart containers, modify project files, or print secrets.
- [ ] Not yet executed: the workflow must be manually started from GitHub Actions while the WSL Runner is online. No local PostgreSQL status is claimed until its log is reviewed.
- [ ] After reviewing the preflight result, decide whether to run local migrations and PostgreSQL integration/RLS tests. These are a separate, potentially state-changing stage and require an explicit database target and backup/volume check.

Security note: the runner account has Docker access to inspect and execute a readiness command inside the existing PostgreSQL container. Docker-group access is effectively root-equivalent on the WSL host. Keep this private repository owner-only, retain manual-only triggers, and stop the runner when not in use.


### 6.9 Local read-only preflight executed successfully — 2026-11-14

- [x] Manually dispatched [Local PEA preflight run #2](https://github.com/Dach1980/Personal_Expert_AI_Local_Control/actions/runs/43514392679) on `main`; completed successfully on self-hosted Runner `AIStation` in 15 seconds.
- [x] Local PEA path exists: `/mnt/d/Projects/Personal_Expert_AI`.
- [x] Project virtual environment exists and reports Python 3.12.16.
- [x] Local `.env` exists and Git confirms it is ignored; its contents were not read or printed.
- [x] Docker daemon is reachable by the Runner.
- [x] Existing `personal-expert-postgres` container reports `running` and `healthy`.
- [x] `pg_isready` reports `127.0.0.1:5432 - accepting connections`.
- [x] Job log confirms no migrations, SQL writes, container restarts or project file changes were performed.

**Result:** local runtime prerequisites and PostgreSQL service readiness are confirmed. This does not yet establish which database/schema the application will target, current Alembic revision, backup recoverability, restricted runtime-role configuration, or API readiness.

**Next gate — read-only database target and migration safety inspection:** identify the effective database host/name/user without exposing credentials; inspect PostgreSQL database/volume identity, current Alembic revision and migration head; verify backup/restore strategy and runtime-role constraints. Only after these checks should a separate migration step be considered. Do not apply migrations to an unidentified or production-like database.


### 6.10 Read-only database safety inspection prepared — 2026-11-14

- [x] Added [local-pea-db-inspection.yml](https://github.com/Dach1980/Personal_Expert_AI_Local_Control/blob/main/.github/workflows/local-pea-db-inspection.yml) to the private control repository.
- [x] Manual-only dispatch on the owner-controlled self-hosted Runner; no push, pull-request or schedule trigger.
- [x] Reports effective DB target host, port, database and username, plus whether a password is configured; full URL and credentials are never printed. Resolution follows runtime `DATABASE_URL`, local `.env`, then the documented `alembic.ini` fallback.
- [x] Reads the applied `alembic_version` revision(s), compares them with migration heads from the local source tree and lists pending revisions when the history is linear.
- [x] Reports the existing PostgreSQL container state and persistent mount metadata, without inspecting container environment variables.
- [x] Reads PostgreSQL role flags for the connected role and `app_runtime`, plus aggregate table ownership/RLS-enabled/RLS-forced counts.
- [x] Read-only only: no migrations, SQL writes, role/grant changes, backup operations, container restarts or local project-file changes.
- [ ] **Not yet executed.** Manually start **Actions → Local PEA database safety inspection → Run workflow** in the private control repository while Runner `AIStation` is online, then review the complete job log. Do not start migrations based on the workflow merely being present.

**Source configuration note:** the checked-in `migrations/env.py` reads `DATABASE_URL`; if absent, Alembic retains the `sqlalchemy.url` from `alembic.ini`. The checked-in fallback points to `localhost:5432/personal_expert` as user `personal_expert`. The workflow reports the effective local value without exposing its password. This is a configuration default, not evidence that this is the database currently in use.

**Next gate:** inspect the run result and verify the target is the intended local PEA database, confirm volume identity and a recoverable backup, then assess Alembic drift and whether the application role is genuinely restricted. No migration is authorized or performed by this inspection.


### 6.11 Local database safety inspection executed — 2026-11-14

- <badge color="success">PASS</badge> [Local PEA database safety inspection — run #3](https://github.com/Dach1980/Personal_Expert_AI_Local_Control/actions/runs/43515834939), self-hosted Runner `AIStation`.
- Effective target resolved from runner environment (credentials withheld): PostgreSQL `localhost:5432`, database `personal_expert`, connection role `personal_expert`. Server reported `172.18.0.2:5432`, not in recovery.
- Container `personal-expert-postgres`: running and healthy. Persistent Docker volume: `personal_expert_ai_postgres_data`, mounted at `/var/lib/postgresql/data`.
- Alembic applied revision: `0015_bionic_retrieval_delegation`; source head: `0015_bionic_retrieval_delegation`; pending migrations: **0**.
- Role `app_runtime` exists and is reported as non-superuser, no BYPASSRLS, no CREATEDB/CREATEROLE, LOGIN enabled.
- Connection role `personal_expert` is **superuser with BYPASSRLS, CREATEDB and CREATEROLE**. It owns all 29 application tables. Catalog summary: 29 tables, 26 with RLS enabled and forced. This means the inspection connection bypasses RLS; the result does **not** prove that the application actually connects as `app_runtime` or that its effective grants/policies are least-privilege.
- Backup/restore readiness was **not inspected** by this workflow. No backup existence, recency or restore test is confirmed.
- The job performed catalog reads only: no migrations, SQL writes, role changes, backups, restarts or local project-file modifications.

**Decision / safety gate:** do not run migrations using the currently resolved `personal_expert` superuser connection. There are no pending migrations at the inspected source head, so migration execution is unnecessary at present. Before enabling runtime operation, verify the actual application connection path uses `app_runtime`, test RLS as that role (including tenant isolation), inspect grants/policies and ownership, and establish a recoverable backup/restore procedure. No state-changing action is authorized by this read-only result.
