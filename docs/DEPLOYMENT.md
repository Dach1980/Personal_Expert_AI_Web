# Развёртывание

## Frontend

GitHub Pages публикует статический frontend. Включить Settings → Pages → Build and deployment → GitHub Actions.

## Backend Gateway / Bionic

Запускаются отдельно на сервере или в локальной инфраструктуре. Для доступа браузера необходим HTTPS и ограниченный CORS. Публичный сайт не может обращаться к localhost компьютера разработчика как к серверу.

## LM Studio

LM Studio должен быть доступен Bionic/gateway по приватному сетевому адресу. Не публиковать порт LM Studio в интернет. Проверить отдельно:
- список моделей;
- chat completions;
- streaming;
- embeddings;
- tool/function calling для выбранной модели.

Наличие OpenAI-compatible API не гарантирует совместимость всех функций Bionic.
