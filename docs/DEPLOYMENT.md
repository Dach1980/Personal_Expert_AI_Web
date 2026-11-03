# Развёртывание

## Frontend

Frontend — React + TypeScript + Vite. GitHub Actions выполняет `npm ci`, `npm run build` и публикует каталог `dist` в GitHub Pages.

В GitHub включить Settings → Pages → Build and deployment → Source: GitHub Actions.

Vite base path сейчас настроен для репозитория `/Personal_Expert_AI_Web/`. При переносе на custom domain настройку нужно изменить.

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
