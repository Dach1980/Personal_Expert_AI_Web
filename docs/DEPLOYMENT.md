# Развёртывание

## Frontend

Frontend — React + TypeScript + Vite. GitHub Actions собирает каталог `dist` и публикует его в GitHub Pages. Ветка публикации — `main`; Vite base path настроен для `/Personal_Expert_AI_Web/`.

В GitHub включить Settings → Pages → Build and deployment → Source: GitHub Actions.

Исходный логотип находится в `assets/logo.svg`. Vite использует `assets/` как `publicDir` и копирует SVG в `dist/logo.svg`. Sidebar, footer и favicon используют URL с `BASE_URL`. Workflow проверяет наличие логотипа в build artifact и после публикации загружает опубликованный `logo.svg` через HTTPS.

## Режим публичной демонстрации

GitHub Pages по умолчанию собирается с `VITE_DEMO_MODE=true`. Это позволяет открыть интерфейс без Keycloak, Bionic Adapter, PEA API и PostgreSQL. Демонстрационные проекты, документы, события и административный экран являются синтетическими примерами; загрузка и обработка документов, проверка прав и генерация ответов моделью в demo mode не выполняются.

Workflow намеренно фиксирует `VITE_DEMO_MODE=true`, чтобы публичный сайт оставался доступным без backend и не зависел от случайно заданных repository variables. Переключать Pages на production-клиент можно только отдельным изменением workflow после подготовки реального HTTPS Adapter, Keycloak issuer, redirect URI и CORS и успешной live acceptance. Перед таким переключением обязательно задать `VITE_API_BASE_URL` и `VITE_OIDC_ISSUER`.

## Публичная конфигурация frontend

Workflow читает следующие GitHub repository variables (Settings → Secrets and variables → Actions → Variables):

| Variable | Назначение |
|---|---|
| `VITE_API_BASE_URL` | Публичный HTTPS origin Bionic PEA Adapter / trusted gateway. Не адрес PostgreSQL, PEA private API или LM Studio |
| `VITE_OIDC_ISSUER` | Точный issuer URL Keycloak realm |
| `VITE_OIDC_CLIENT_ID` | Public OIDC client; по умолчанию `pea-web` |
| `VITE_OIDC_REDIRECT_URI` | Redirect URI; по умолчанию URL GitHub Pages с repository base path |

Это публичные параметры, не секреты. Не размещать client secret, API key, private key, database password, refresh token или другие credentials в `VITE_*` — они встраиваются в клиентский bundle.

До появления реального HTTPS gateway и Keycloak issuer оставить `VITE_API_BASE_URL` и `VITE_OIDC_ISSUER` пустыми. Workflow выдаёт предупреждение, но публикует статическую оболочку. Не использовать фиктивные адреса `.invalid` и не подменять реальный backend mock API.

Redirect URI необходимо добавить в allowlist public client `pea-web` в Keycloak. Web origin необходимо разрешить в CORS gateway с точным allowlist.

## API Adapter / Bionic

Backend gateway и Bionic запускаются отдельно — на сервере или в локальной инфраструктуре. Для доступа браузера требуется HTTPS и CORS с точным allowlist origin.

Публичный сайт не может обращаться к localhost компьютера разработчика как к серверу. PEA API должен оставаться за доверенной server-to-server границей Bionic Adapter. Браузер не должен обращаться напрямую к PostgreSQL, private storage или LM Studio.

## Keycloak / OIDC

Keycloak — единый Identity Provider. Для `pea-web` использовать public client, Authorization Code Flow, PKCE S256, без client secret в браузере. Проверить точный issuer, redirect URI, Web Origins, audience и realm signing keys. Bionic и PEA независимо проверяют подпись и claims токена; frontend checks не являются границей безопасности.

Web хранит access/refresh tokens только в памяти. После перезагрузки страницы восстановление сессии выполняется top-level OIDC `prompt=none` round-trip через Keycloak SSO, а не сохранением refresh token в `localStorage` или `sessionStorage`. Проверка ID token включает подпись RS256 по JWKS, issuer, audience, expiry и nonce.

## LM Studio

LM Studio должен быть доступен Bionic/gateway по приватному сетевому адресу. Не публиковать порт LM Studio в интернет и не передавать его адрес в frontend.

Отдельно проверить:
- список моделей;
- chat completions;
- streaming;
- embeddings;
- tool/function calling выбранной модели.

Наличие OpenAI-compatible API не гарантирует совместимость всех функций Bionic.
