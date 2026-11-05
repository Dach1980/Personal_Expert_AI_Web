# Cross-repository integration contract — 2026-11-05

## Repository baseline

| Component | Repository | Main commit reviewed | Responsibility |
|---|---|---|---|
| Web | `Dach1980/Personal_Expert_AI_Web` | `29069934faaffc7a75595666a2282c90fee95622` | Public React SPA / GitHub Pages |
| Bionic | `Dach1980/bionic-personal-expert-ai` | `635f8e1abc1d0ac3c107224fe616bc9d8acbb0bd` | Verified identity, server-side PEA adapter, agent runtime |
| PEA | `Dach1980/Personal_Expert_AI` | `d670c85d1de3131497206198b43eedd175b6f2ef` | Domain API, tenant/project ACL, PostgreSQL, documents, retrieval API |

This is a source-level contract review. It does not claim that the services are deployed or reachable.

## Trust boundary

```text
Browser (Web / GitHub Pages)
  | HTTPS + Keycloak access token (Authorization: Bearer)
  v
Bionic Web Server / PEA Adapter
  | verifies Keycloak JWT, derives fixed tenant scope, forwards verified token
  | private server-to-server HTTPS/network request
  v
PEA API
  | independently verifies JWT and external identity
  | checks active tenant membership and project authorization
  v
PostgreSQL / private document storage / local model provider
```

The browser must never call PEA private routes, PostgreSQL, storage, or LM Studio directly. Bionic must not accept arbitrary upstream URLs or trust user/email headers. PEA remains the authority for tenant and project authorization.

## Implemented browser-to-Bionic routes

The Web client in `src/services/api/client.ts` calls these Bionic routes:

| Method | Browser route | Purpose |
|---|---|---|
| GET | `/api/pea/session` | Resolve verified identity before tenant selection |
| GET | `/api/pea/tenants` | Discover active memberships |
| GET | `/api/pea/admin/me` | Effective system-admin permissions |
| GET | `/api/pea/admin/audit-events` | Audit events; PEA permission required |
| GET | `/api/pea/admin/tenants` | Tenant inventory; PEA permission required |
| GET | `/api/pea/tenants/{tenant_id}/projects` | Projects in selected tenant |
| GET/POST | `/api/pea/tenants/{tenant_id}/projects/{project_id}/conversations` | List/create conversations |
| GET | `.../conversations/{conversation_id}/messages` | Conversation history |
| POST | `.../conversations/{conversation_id}/messages` | Local-model SSE response |
| GET/POST | `.../documents` | List/create documents |
| GET/POST | `.../documents/{document_id}/versions` | List/upload immutable versions |
| GET/POST | `.../versions/{version_id}/processing-runs` | Read/enqueue processing |
| GET | `.../versions/{version_id}/source-fragments` | Read extracted fragments |
| GET | `.../versions/{version_id}/artifacts` | Read artifact metadata |
| GET | `.../artifacts/{artifact_id}/content` | Fetch authorized artifact bytes |
| GET | `.../reviews` | Project reviews |
| GET | `.../reviews/{review_id}/findings` | Review findings |
| GET | `.../findings/{finding_id}/evidence` | Finding evidence |

The Bionic adapter contract is documented in `bionic-personal-expert-ai/docs/integration/PEA_API_ADAPTER.md`. PEA validates the caller independently and derives tenant context from the explicit tenant selection header supplied by the trusted adapter.

## Retrieval boundary

PEA now exposes:

`POST /api/v1/tenants/{tenant_id}/projects/{project_id}/search`

The request supports a query, top_k, document type filters and version_state. The current implementation is lexical search over SourceFragment content, with current-version filtering and tenant/project authorization. Bionic proxies the same fixed path under `/api/pea/tenants/{tenant_id}/projects/{project_id}/search`.

Important: this route is an API/proxy capability only. The Bionic Agent Runtime does not yet invoke it as a model-facing `pea_search` tool. ACL-before-prompt context assembly, verified citation allowlisting and document-grounded answer tests remain unfinished. Therefore neither the demo chat nor production chat must be described as document-grounded yet.

## Authentication contract

- Web uses Keycloak Authorization Code + PKCE S256 as a public client (`pea-web`).
- Web sends the access token to Bionic using the Authorization header.
- Bionic verifies RS256/JWKS, issuer, audience and time claims.
- Bionic forwards the verified caller token to PEA server-to-server; it does not send credentials to the model.
- PEA verifies the token independently and resolves the external identity by issuer and subject.
- The token does not need a `tenant_id` claim. Active membership is discovered separately and checked for every tenant-scoped operation.
- CORS must allow only the exact public Web origin. No wildcard origin, browser client secret, or PEA direct browser access.

## CI and runtime acceptance

CI and live runtime acceptance are different gates.

| Gate | Evidence available | Remaining |
|---|---|---|
| Web build/tests/Pages | GitHub Actions run for current demo-mode change set | Wait for current run completion and inspect deployed app behavior |
| PEA DB/API tests | Latest recorded PEA CI run 41973610260 passed | Re-run/confirm latest source SHA if PEA changes |
| Bionic Rust/API tests | Latest recorded Bionic CI run 41973141611 passed | Re-run/confirm latest source SHA if Bionic changes |
| OIDC login | Source implementation | Real Stack-managed Keycloak browser acceptance |
| Tenant isolation | PEA integration tests and Bionic route guard source | Live cross-tenant negative E2E |
| Document upload/processing | API/UI source | Live worker/storage end-to-end |
| Retrieval | PEA lexical API and Bionic proxy | Agent Runtime tool, ACL-before-prompt, citation allowlist |
| Local inference | Provider abstraction | Actual LM Studio model on primary workstation |
| Integrated acceptance | Not yet run | Keycloak → Web → Bionic → PEA → PostgreSQL/storage → LM Studio |

## Required E2E scenarios for the primary workstation

1. Anonymous browser opens Web; production mode shows login rather than a blank or endless loading screen.
2. User signs in through Keycloak PKCE and receives a valid access token.
3. User with two active memberships can select either tenant; project and conversation state is cleared on switching.
4. User without membership cannot select or query another tenant (negative test).
5. Project A cannot read project B documents, conversations, fragments, artifacts, findings or citations.
6. User uploads a document; immutable version, idempotency key, processing run and artifacts are visible.
7. Worker emits fragments with stable page/sheet locators and provenance.
8. Agent Runtime invokes PEA search only with the verified caller identity and authorized tenant/project scope.
9. Unauthorized fragments are excluded before prompt construction; model output citations must be members of the retrieval allowlist.
10. Model inference is performed only by the configured local LM Studio provider; no cloud fallback.
11. Keycloak, PEA, storage, worker or model-provider failure produces a bounded, user-readable error and does not leak credentials or internal paths.
12. Browser reload, direct SPA route, Back/Forward, logout, token expiry and refresh rotation work as expected.

## Demo mode safety

GitHub Pages defaults to `VITE_DEMO_MODE=true`. Demo projects, documents, audit events and administrative permissions are synthetic UI fixtures. They are not PEA records and must never be mixed with production API responses. The demo chat explicitly states that it does not call a model. The workflow intentionally hardcodes `VITE_DEMO_MODE=true` until real Adapter and Keycloak settings are configured and live acceptance is complete. Production mode requires a deliberate workflow change, not an accidental repository variable.
