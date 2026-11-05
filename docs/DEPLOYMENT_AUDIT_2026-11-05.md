# Deployment audit — 2026-11-05

Дата проверки: 2026-11-05  
Репозиторий: `Dach1980/Personal_Expert_AI_Web`  
Проверенный Manus commit: `6b8ef05992fe09bcd98596454b11ed5197d06b79`  
Режим проверки: read-only. Изменения кода, настройки GitHub и публикация не выполнялись.

## Итог

<badge>BLOCKED — production deployment</badge>

Frontend пока нельзя считать опубликованным рабочим приложением. Unit tests проходят, но production build падает на TypeScript, а опубликованный GitHub Pages контент не соответствует ожидаемому Vite build artifact.

## Что уже сделано и подтверждено

- `npm test`: 5/5 тестов успешно на проверенном commit.
- Реализован React + TypeScript + Vite frontend и базовые экраны Workspace/Projects/Documents/Chat.
- Реализован OIDC Authorization Code + PKCE S256; в исходниках присутствуют RS256/JWKS проверки ID token.
- Реализован API client для Bionic PEA Adapter и SSE client.
- Реализован Document Workspace для документов, immutable versions, processing status, SourceFragments и artifacts.
- GitHub Pages workflow и проверки logo asset уже присутствуют в репозитории.
- Существующий GitHub Pages HTTPS endpoint отвечает, но опубликованный контент не является корректным Vite dist.

## Результаты последней проверки Manus

| Проверка | Результат |
|---|---|
| Commit | `6b8ef05992fe09bcd98596454b11ed5197d06b79` |
| Unit tests | PASS — 5/5 |
| TypeScript + Vite build | FAIL |
| Ошибка сборки | `src/services/api/oidc.ts:90`: `Property 'kid' does not exist on type 'JsonWebKey'` |
| Последний указанный push workflow | FAIL — [run 41956088626](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41956088626) |
| GitHub Pages | HTTPS отвечает, но главная содержит необработанный `%BASE_URL%`; `/logo.svg` возвращает 404 |
| GitHub Variables | Значения не проверены: read-only доступ получил HTTP 403 на чтение Actions Variables |
| Live API / Keycloak | Не подключены и не подтверждены |
| Manus hosting | Не запускался и не подтверждён |

Manus сообщил, что в failed workflow переменные `VITE_API_BASE_URL`, `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI` были пустыми. Фактические значения repository Variables не прочитаны; секреты и значения переменных не запрашивались.

## Блокеры и следующие работы

### P0 — восстановить воспроизводимую сборку и Pages deployment

1. Исправить TypeScript-типизацию JWK в `src/services/api/oidc.ts`, сохранив проверку `kid`, `alg` и RS256.
2. Зафиксировать `package-lock.json`; использовать `npm ci` без генерации lockfile во время CI.
3. Проверить workflow: build должен завершаться до deploy; deploy должен публиковать именно `dist/`.
4. Проверить GitHub Pages base path и подстановку `%BASE_URL%`; не допускать публикации необработанного шаблона.
5. Проверить наличие `index.html`, JS/CSS assets, `logo.svg` и favicon в artifact.
6. Добавить post-deploy smoke checks для главной страницы, logo/favicon и основных SPA routes.
7. После успешного workflow проверить фактический публичный сайт по HTTPS.

**Критерий закрытия P0:** зелёный Actions run на актуальном commit; artifact соответствует Vite dist; Pages отдаёт корректную страницу и ресурсы по repository subpath.

### P1 — конфигурация и OIDC

1. Проверить наличие четырёх публичных GitHub repository Variables: `VITE_API_BASE_URL`, `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`. Проверять только наличие/корректность, не публиковать чувствительные значения.
2. Сверить issuer, client `pea-web`, redirect URI и allowed origins с реальным Keycloak realm.
3. Провести login/logout, PKCE, silent SSO, refresh rotation и expiry E2E.
4. Проверить CORS allowlist и HTTPS Bionic Adapter endpoint.
5. Не считать наличие frontend OIDC-кода доказательством работающей авторизации.

### P2 — продолжение интеграции продукта

После восстановления deploy продолжить по межрепозиторному roadmap:
1. Завершить UX и навигацию всех разделов.
2. Реализовать tenant/project switching с серверной проверкой membership.
3. Завершить conversation/SSE event contract и citations.
4. Проверить document upload → immutable version → worker processing → SourceFragments/artifacts.
5. Реализовать PEA Retrieval Tool в Bionic Agent Runtime и grounded answers с provenance.
6. Провести E2E security tests: IDOR, cross-tenant/project, token leakage, XSS и CORS.
7. Выполнить runtime acceptance в окружении с Keycloak, Bionic, PEA, PostgreSQL, storage, worker и LM Studio.

## Что не следует считать готовым

- 5/5 unit tests не означают, что production build проходит.
- HTTPS-ответ GitHub Pages не означает, что опубликован корректный frontend.
- Наличие OIDC-кода не означает, что Keycloak login работает.
- Наличие API/SSE клиента не подтверждает доступность Bionic Adapter и PEA.
- UI документов не подтверждает реальную обработку worker-ом.
- Поддержка citation payload во frontend не означает, что backend уже выдаёт доказательные citations.

## Следующее согласованное действие

Подготовить отдельный change set для P0: исправление JWK typing, lockfile/CI и Pages workflow; затем выполнить tests/build и deploy. До отдельного согласования этот отчёт фиксирует аудит, но не разрешает изменение кода или конфигурации.

## Источники

- Manus read-only audit от 2026-11-05, commit `6b8ef05992fe09bcd98596454b11ed5197d06b79`.
- [GitHub Actions run 41956088626](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41956088626).
- [Repository](https://github.com/Dach1980/Personal_Expert_AI_Web).
- [GitHub Pages](https://dach1980.github.io/Personal_Expert_AI_Web/).
