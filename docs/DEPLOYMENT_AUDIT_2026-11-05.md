# Deployment audit — 2026-11-05

Дата актуализации: 2026-11-05  
Репозиторий: `Dach1980/Personal_Expert_AI_Web`  
Проверенный исходный HEAD: `ec01cdd9bac1f425a0587450ab7f51379707e19f`  
Локальный Manus commit, не интегрированный в GitHub: `b522b761dace46a3a81e183457b98a60cad990bf`

## Итог

Предыдущий read-only отчёт относился к старому commit `6b8ef05992fe09bcd98596454b11ed5197d06b79` и больше не описывает состояние удалённого `main`. На актуальном HEAD исправлена TypeScript JWK metadata, добавлен lockfile, CI использует `npm ci`, Pages workflow собирает Vite build и проверяет опубликованные JS/CSS/logo assets.

Успешные Actions runs на baseline:
- [41957689405](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957689405) — build/deploy baseline.
- [41957819479](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957819479) — workflow/smoke-test validation.
- [41957819515](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957819515) — Pages build and deployment.

**P0 до текущего change set: частично выполнен, SPA deep links оставались блокером.** Manus commit `b522b761dace46a3a81e183457b98a60cad990bf` не находится в удалённой истории. Manus сообщил о локальных `npm ci`, `npm test` (6/6), `npm run build` и `dist/404.html`; push завершился HTTP 403. Эти локальные результаты не являются доказательством опубликованной версии.

## Подтверждённые изменения в удалённом репозитории

- JWK metadata исправлены без ослабления RS256/JWKS проверки.
- `package-lock.json` зафиксирован; CI использует `npm ci`.
- Build, Pages deploy и post-deploy smoke checks проходят на baseline.
- Logo asset проверяется в artifact и опубликованном endpoint.
- Vite base path: `/Personal_Expert_AI_Web/`.

## Результат P0 после change set

- [x] CI на commit `ec01cdd9bac1f425a0587450ab7f51379707e19f`: `npm ci`, frontend protocol tests, TypeScript/Vite build — PASS.
- [x] Artifact включает SPA fallback `dist/404.html` (создаётся копированием `dist/index.html`), logo и Vite bundles.
- [x] Pages workflow: homepage, logo, JS/CSS и маршруты `/projects`, `/knowledge`, `/settings` — smoke tests PASS.
- [x] Pages deploy — SUCCESS: [Actions run 41960861523](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41960861523).
- [x] URL-aware navigation and browser `popstate` handling added; theme toggle added.
- [ ] Дополнительно выполнить ручную проверку в браузере: открыть каждый URL напрямую, обновить страницу, проверить Back/Forward и переключение темы на desktop/mobile.

**Статус P0: CI/CD и route smoke checks закрыты; ручная browser acceptance остаётся.**

## Ограничения

- Локальный Manus commit `b522b76` не был интегрирован как Git commit; изменения должны быть воспроизведены и проверены в удалённом `main`.
- Успешный workflow не заменяет ручной browser E2E.
- Реальные Keycloak login/logout, Bionic Adapter, PEA API, SSE с живой моделью и document worker не подтверждены.
- GitHub repository Variables не раскрывались и их значения здесь не проверялись.
- GitHub Pages обслуживает только статический frontend.

## Следующие этапы

1. Завершить ручную browser acceptance и мелкие UX-правки темы/маршрутов.
2. Продолжить UI/UX остальных экранов.
3. Провести live OIDC/Keycloak acceptance.
4. Реализовать tenant/project switching с server-side authorization.
5. Завершить conversation/SSE/citations, document ingestion и PEA Retrieval Tool в Bionic.
6. Провести сквозные security/E2E проверки.

## Источники

- [Repository](https://github.com/Dach1980/Personal_Expert_AI_Web)
- [Baseline Pages run](https://github.com/Dach1980/Personal_Expert_AI_Web/actions/runs/41957819515)
- [GitHub Pages](https://dach1980.github.io/Personal_Expert_AI_Web/)
