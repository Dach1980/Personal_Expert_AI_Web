# Personal Expert AI — operational roadmap and local workstation status

**Updated:** 2026-11-07  
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
