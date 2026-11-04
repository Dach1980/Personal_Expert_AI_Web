# Развёртывание

## Frontend

Frontend — React + TypeScript + Vite. GitHub Actions выполняет установку npm-зависимостей, `npm run build`, проверяет обязательные статические ресурсы и публикует каталог `dist` в GitHub Pages. В репозитории пока нет `package-lock.json`, поэтому установка пока выполняется через `npm install`; переход на `npm ci` — отдельная задача после фиксации lockfile.

В GitHub включить Settings → Pages → Build and deployment → Source: GitHub Actions.

Vite base path сейчас настроен для репозитория `/Personal_Expert_AI_Web/`. При переносе на custom domain настройку нужно изменить.

Брендинг хранится в `assets/logo.svg`. Vite использует `assets/` как `publicDir` и копирует исходный SVG в `dist/logo.svg`; в приложении и favicon используется URL `${BASE_URL}logo.svg`. Workflow проверяет, что файл присутствует в Pages artifact до публикации.

## API Adapter / Bionic

Backend gateway и Bionic запускаются отдельно — на сервере или в локальной инфраструктуре. Для доступа браузера требуется HTTPS и CORS с точным allowlist origin.

Публичный сайт не может обращаться к localhost компьютера разработчика как к серверу. Не помещать секреты в `VITE_*` переменные: Vite встраивает их в клиентский bundle.

## LM Studio

LM Studio должен быть доступен Bionic/gateway по приватному сетевому адресу. Не публиковать порт LM Studio в интернет.

Отдельно проверить:
- список моделей;
- chat completions;
- streaming;
- embeddings;
- tool/function calling выбранной модели.

Наличие OpenAI-compatible API не гарантирует совместимость всех функций Bionic.
