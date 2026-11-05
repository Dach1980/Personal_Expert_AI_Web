# Implementation status — 2026-11-05

Обновление межрепозиторной реализации Personal Expert AI. Все изменения Web ниже внесены в `main`; текущий проверенный по истории Git commit на момент подготовки отчёта: `927770675edcf4c08efbaef56b15fd7afc6c0a2f`.

## Что изменено в этом проходе

### Frontend baseline / Pages
- Исправление logo asset остаётся в силе: `assets/` используется как Vite `publicDir`; Sidebar, footer и favicon используют `BASE_URL` + `logo.svg`.
- Pages workflow проверяет logo в `dist` и после deploy запрашивает опубликованный `logo.svg` по HTTPS.
- Build читает публичные GitHub repository Variables `VITE_API_BASE_URL`, `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`.
- Workflow генерирует `package-lock.json`, если его ещё нет, устанавливает зависимости через `npm ci` и сохраняет созданный lockfile в `main` после успешной сборки.
- Добавлен `npm test` и запуск тестов SSE в Pages CI.
- Важно: GitHub connector не предоставил подтверждение результата нового Actions run. Поэтому build/deploy после этих изменений пока `NOT VERIFIED`; опубликованный logo smoke test тоже `NOT VERIFIED`.

### OIDC lifecycle
- ID token теперь проверяется криптографически по RS256/JWKS.
- Проверяются issuer, audience, expiry и nonce.
- Параллельные refresh-запросы объединяются в один in-flight refresh.
- Access/refresh tokens остаются в памяти. После reload используется top-level `prompt=none` round-trip к Keycloak SSO вместо сохранения refresh token в browser storage.
- Runtime E2E с реальным Keycloak, refresh-token rotation, logout/revocation, CSP и браузерными сценариями ещё не выполнен.

### Chat / SSE / citations
- Добавлен отдельный SSE parser: CRLF, включая CRLF на границе сетевых chunks, multiline data, comments, id, final frame без завершающего пустого разделителя.
- Добавлена нормализация payload `citation`/`citations` и типизация source metadata.
- Chat UI показывает citation title, документ, страницу/лист и excerpt; внешние ссылки открываются только для HTTP(S) URL с `noopener noreferrer`.
- Добавлены unit tests для framing и citation payload normalization; они подключены к CI.
- Важное ограничение: PEA сейчас реально эмитит `text_delta`, `done`, `error`; backend citations ещё не эмитятся. Frontend умеет принимать `citation`/`citations`, но полноценные grounded citations появятся только после Bionic Agent Runtime tool и PEA provenance pipeline. Реальный поток и history persistence ещё не проверены E2E.

## Межрепозиторный статус

| Gate | Состояние | Комментарий |
|---|---|---|
| 0. Frontend baseline | PARTIAL / CI NOT VERIFIED | Logo, env wiring, npm ci bootstrap и SSE tests добавлены; успешный Actions run не подтверждён |
| 1. UX / navigation | NOT DONE | Целевая навигация Workspace, Projects, Documents, Dialogues, Reviews, Knowledge Base, Skills, Settings ещё не реализована полностью |
| 2. OIDC / trusted gateway | PARTIAL | Browser OIDC усилен; реальный Keycloak и серверная независимая JWT validation остаются runtime gates |
| 3. Tenant/project switching | NOT DONE | Нет завершённого tenant list/switch workflow; первый доступный проект выбирается автоматически |
| 4. Conversation/SSE | PARTIAL | Parser и frontend citations готовы в исходниках; серверный event contract и runtime streaming не приняты |
| 5. Document lifecycle | PARTIAL | UI и adapter routes существуют; реальная загрузка, worker, artifacts и ACL требуют E2E |
| 6. PEA Retrieval Tool | NOT DONE | Не подтверждён PEA scoped search tool в Bionic Agent Runtime; ACL-before-prompt и grounded citations отсутствуют |
| 7. Fork-specific Bionic image | NOT DONE | Deployment manifests всё ещё требуют fork-specific image build и проверку packaging; upstream image не является приемлемым |
| 8. Runtime acceptance | BLOCKED | Нужна доступная среда с Docker/k3d, Keycloak, PostgreSQL, storage, PEA/Bionic и LM Studio |

## GitHub changes

- OIDC lifecycle: `56625b399199cf27b929276f7047b4de1cac10b9`.
- Pages config variables: `71d3dd8441d7d0e17e88fdcc51c6420a885f7a00`.
- Remove fake `.invalid` values from `.env.example`: `487df37a7e0fec32497e849deec1726131db0666`.
- Deployment configuration docs: `1d5678ccfdd29be3ebdd155ed2f26b4d6982d518`.
- Manus handoff instructions: `62d6917367028dc83907878603337b92ef0a82dd`.
- README status and docs links: `83b2c87bb92072049f159f57a7cb8ae8ee3d94ad`.
- SSE parser, citations UI, tests and CI: latest Web commit `927770675edcf4c08efbaef56b15fd7afc6c0a2f`.

## Manus handoff

Use [MANUS_HANDOFF.md](MANUS_HANDOFF.md). Start with the read-only repository audit task. Do not ask Manus to generate a replacement app or move the canonical source away from this repository.

## Acceptance rule

CI green means source/build/test gates passed. It does not prove real OIDC, Bionic-to-PEA connectivity, tenant isolation in deployment, document processing, local model inference, or runtime retrieval. Mark each runtime gate `DONE` only with a reproducible test result and commit/deployment provenance.
