# Manus handoff — Personal Expert AI Web

Дата: 2026-11-05

Документ предназначен для передачи Manus AI. Цель — использовать Manus как deployment/infra помощника, не создавать второй продукт и не переносить бизнес-логику из PEA в frontend.

## Репозитории

- Frontend: https://github.com/Dach1980/Personal_Expert_AI_Web
- Backend/domain: https://github.com/Dach1980/Personal_Expert_AI
- Bionic fork / Agent Runtime: https://github.com/Dach1980/bionic-personal-expert-ai

## Архитектурные ограничения

1. Существующий `Personal_Expert_AI_Web` — основной frontend. Не создавать новый frontend с нуля, не генерировать альтернативный проект и не переносить исходники в новый репозиторий.
2. PEA — единственный владелец доменных сущностей, tenant/project ACL, документов, версий, processing, SourceFragments, conversations, reviews, findings и evidence.
3. Bionic fork — интеграционная граница, Agent Runtime и server-side PEA Adapter. Bionic не заменяет PEA domain layer.
4. Keycloak — единственный Identity Provider.
5. LM Studio/Qwen — локальная модель. Cloud LLM fallback запрещён.
6. Frontend не должен напрямую обращаться к PostgreSQL, private object storage, PEA private API или LM Studio.
7. Не публиковать порты PostgreSQL, LM Studio, приватное хранилище или внутренние API в интернет.
8. Не помещать secrets, client secrets, API keys, private keys, database passwords или tokens в Git, frontend bundle или `VITE_*` переменные.
9. Все изменения сначала предложить в виде плана. Не менять архитектуру, не удалять существующие файлы и не выполнять destructive инфраструктурные операции без отдельного согласования.
10. Существующие GitHub Actions и GitHub Pages — исходный deployment pipeline. Не отключать их, пока новый deployment не принят.

## Команда 1 — подключение и аудит (первое сообщение Manus)

Подключи через GitHub connector только репозиторий `Dach1980/Personal_Expert_AI_Web` в режиме чтения. Если для чтения требуется более широкое разрешение, сначала объясни, какие права запрашиваются и зачем. На этом этапе ничего не редактируй и не публикуй.

Проведи аудит существующего React + TypeScript + Vite проекта и текущего GitHub Pages deployment. Изучи README, `docs/PROJECT_ROADMAP.md`, `docs/DEPLOYMENT.md`, `.github/workflows/deploy-pages.yml`, `vite.config.ts`, `package.json`, OIDC client и API client.

Проверь:
- что `assets/logo.svg` действительно попадает в `dist/logo.svg`, а Sidebar/footer/favicon используют корректный URL с Vite base path;
- как сейчас собирается проект и какие GitHub Actions checks реально выполняются;
- какие GitHub repository variables необходимы для API Adapter и Keycloak;
- поддерживает ли Manus deployment существующего Vite/React репозитория без переписывания проекта;
- какие инфраструктурные компоненты отсутствуют для полного production runtime;
- какие DNS, HTTPS, CORS, Keycloak redirect URI и backend endpoints потребуются.

Составь конкретный deployment plan с этапами, перечнем необходимых доступов, стоимостью/ограничениями Manus hosting (если применимо), рисками и критериями приёмки. Раздели static frontend deployment и full-stack runtime. Не заявляй, что backend или авторизация работают, пока это не проверено реальными запросами.

## Команда 2 — подготовка frontend deployment (после согласования плана)

Работай с существующим репозиторием `Dach1980/Personal_Expert_AI_Web`. Сохрани React, TypeScript и Vite. Не переписывай UI и не меняй API-контракты.

Предпочтительный путь — использовать существующий GitHub Actions workflow и GitHub Pages. Если предлагаешь Manus hosting, сначала докажи, что он может собрать и развернуть текущий Vite проект из подключённого GitHub repository без генерации нового приложения и без потери синхронизации с GitHub.

Не отключай GitHub Pages и не меняй DNS на новый хостинг до проверки preview URL, прямой загрузки `/Personal_Expert_AI_Web/`, logo/favicon, JS/CSS assets, refresh/deep links, HTTPS и мобильной версии. Подготовь rollback plan.

Публичные frontend параметры передаются только через GitHub Actions repository Variables:
- `VITE_API_BASE_URL` — публичный HTTPS origin Bionic PEA Adapter / trusted gateway;
- `VITE_OIDC_ISSUER` — точный Keycloak realm issuer;
- `VITE_OIDC_CLIENT_ID` — `pea-web`;
- `VITE_OIDC_REDIRECT_URI` — точный callback URL GitHub Pages или согласованного домена.

До получения реальных gateway и issuer URLs не подставляй фиктивные адреса и не создавай mock backend. Не проси и не сохраняй secrets в `VITE_*`. Если значения пока неизвестны, оставь variables пустыми и укажи, что frontend опубликован, но live login/API не подключены.

## Команда 3 — инфраструктурный deployment plan (отдельная задача)

Изучи архитектуру всех трёх репозиториев, но не изменяй их код. Предложи инфраструктуру для Bionic fork, PEA API, PostgreSQL, object storage, processing workers и Keycloak. Определи, какие компоненты могут работать в одном deployment environment, а какие должны быть изолированы.

Обязательные требования: HTTPS, закрытая сеть для PEA/PostgreSQL/storage/LM Studio, public edge только для frontend/Keycloak и Bionic Adapter, проверка JWT RS256/JWKS в Bionic и PEA, tenant/project authorization на сервере, CORS allowlist, backups, health checks, logs без токенов и персональных данных, resource limits и rollback.

Не выставляй LM Studio в публичную сеть. Не включай cloud model provider или cloud fallback. Не создавай production secrets в репозитории. Не запускай `dev-init.sh`, не удаляй Kubernetes/k3d кластеры, volumes или базы данных.

Верни deployment architecture diagram, список ресурсов и ориентировочную стоимость, DNS/TLS схему, environment variables/secrets inventory (только названия, не значения), последовательность установки и E2E acceptance plan. Отдельно перечисли действия, которые требуют моего подтверждения.

## Критерии готовности

- Исходный GitHub repository остаётся source of truth.
- Сборка создаётся из конкретного commit SHA, который можно установить.
- Опубликованная версия совпадает с проверенным commit/build artifact.
- Logo, favicon, CSS и JS assets доступны по HTTPS.
- Frontend не содержит секретов.
- Live login проверен с реальным Keycloak.
- Browser requests идут только в публичный Bionic Adapter, а не напрямую в PEA private API.
- Bionic и PEA независимо проверяют пользователя и tenant/project membership.
- Нет доступа к чужим tenant/project.
- Никакой cloud LLM fallback не включён.
- Любой пункт, не проверенный фактически, помечен `NOT VERIFIED`, а не `DONE`.

## Что передать мне после каждой задачи

1. Список изменённых файлов и commit SHA.
2. URL preview и production, если они созданы.
3. Фактические build/deploy logs и результаты smoke tests.
4. Список GitHub variables/secrets, которые нужно добавить (без значений секретов).
5. DNS/TLS изменения, которые предлагается выполнить.
6. Все оставшиеся блокеры и пункты `NOT VERIFIED`.
7. Никаких утверждений о runtime readiness только на основании успешной сборки.
