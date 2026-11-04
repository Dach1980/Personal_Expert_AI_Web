# API Adapter — целевой контракт (draft)

Этот документ описывает предлагаемый контракт между React UI и отдельным backend gateway. Он не утверждает, что эти endpoints уже существуют в Bionic. Перед интеграцией сверяемся с API фактически развёрнутой версии Bionic.

## Принципы

- UI не обращается напрямую к Bionic или LM Studio.
- Adapter нормализует пользователей, проекты, диалоги, сообщения, документы, citations, streaming и ошибки.
- Credentials и внутренние адреса не передаются браузеру.
- Bionic можно заменить другим backend без переписывания UI.
- Любой идентификатор проекта/диалога проверяется на сервере по текущей сессии.

## Предлагаемые endpoints

| Method | Path | Назначение |
|---|---|---|
| GET | /api/v1/session | Текущий пользователь и права |
| POST | /api/v1/auth/login | Вход |
| POST | /api/v1/auth/logout | Выход |
| GET | /api/v1/projects | Доступные проекты |
| POST | /api/v1/projects | Создать проект |
| GET | /api/v1/projects/{id} | Получить проект |
| GET | /api/v1/projects/{id}/conversations | История диалогов |
| POST | /api/v1/projects/{id}/conversations | Создать диалог |
| GET | /api/v1/projects/{id}/conversations/{conversationId}/messages | История сообщений |
| POST | /api/v1/conversations/{id}/messages | Отправить сообщение и получить поток ответа |
| POST | /api/v1/projects/{id}/documents | Загрузить документ |
| GET | /api/v1/documents/{id} | Метаданные документа |
| GET | /api/v1/documents/{id}/pages/{page} | Страница/представление источника |

## Streaming

Предлагаемый нормализованный формат — Server-Sent Events (SSE), если выбранный gateway может его обеспечить:

```text
event: message_start
data: {"messageId":"..."}

event: text_delta
data: {"delta":"Фрагмент ответа"}

event: citation
data: {"documentId":"...","page":12,"label":"СП ..."}

event: message_end
data: {"messageId":"..."}
```

Формат выше — проектный контракт нашего Adapter, а не утверждение о протоколе Bionic. Frontend SSE parser в текущей версии — заготовка; требуется согласовать точный envelope и обработку всех событий.

## Безопасность и изоляция

- Проверять пользователя и права доступа на backend для каждого запроса.
- Не доверять tenantId, projectId или userId из тела запроса без серверной проверки.
- Проверять принадлежность conversation проекту и пользователя проекту.
- Фильтровать retrieval по правам доступа до формирования контекста модели.
- Для cookie-сессии использовать HttpOnly, Secure, SameSite и CSRF-защиту.
- Ограничить CORS конкретным origin, не использовать wildcard с credentials.
- Ограничить размер запросов, частоту запросов и длительность stream.
- Не публиковать LM Studio напрямую в интернет.
- Не записывать токены и секреты в логи.

## План проверки Bionic

1. Зафиксировать версию Bionic и фактическую API-документацию.
2. Проверить, есть ли независимые проекты/workspaces и как они хранятся.
3. Проверить авторизацию, пользователей, роли и механизм выдачи/проверки прав.
4. Проверить CRUD проектов и диалогов, историю и порядок сообщений.
5. Проверить streaming, отмену, таймауты и reconnect.
6. Проверить загрузку/индексацию документов, retrieval и citations с точными страницами.
7. Проверить, можно ли ограничить RAG контекст документами, доступными конкретному пользователю/проекту.
8. Проверить совместимость с LM Studio: chat completions, streaming, embeddings и tool calling.
9. Провести негативные тесты: пользователь A не должен получить документы, диалоги или цитаты проекта пользователя B.

## Ошибки

Gateway возвращает нормализованные коды: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, UPSTREAM_ERROR. Текст ошибки не должен раскрывать внутренние секреты и инфраструктурные адреса.

## Фактический статус на 2026-11-04

### Авторизация

- Публичный SPA использует Keycloak public client `pea-web`, Authorization Code + PKCE S256.
- Access/refresh tokens находятся только в памяти JavaScript; PKCE verifier/state/nonce хранятся в sessionStorage только на время redirect round-trip.
- SPA передаёт Bearer access token на Bionic PEA Adapter. Bionic проверяет RS256/JWKS, issuer, audience и временные claims, затем проксирует тот же токен в PEA. PEA выполняет независимую проверку и membership authorization.
- Bionic CORS разрешает только точный origin из `PEA_WEB_ORIGIN`; wildcard и cookie credentials не используются.
- Keycloak client/scope provisioning реализован в PEA bootstrap script, но применение к реальному Stack realm и проверка redirect/login требуют запуска с admin credentials.

### Реализованные API

| Browser path (Bionic) | PEA upstream | Назначение |
|---|---|---|
| `GET /api/pea/session` | `GET /api/v1/session` | Проверенная сессия и tenant |
| `GET /api/pea/projects` | `GET /api/v1/projects` | Проекты текущего пользователя |
| `GET /api/pea/tenants/{tenant}/projects/{project}/conversations` | Тот же путь под `/api/v1` | История диалогов |
| `POST /api/pea/tenants/{tenant}/projects/{project}/conversations` | Тот же путь под `/api/v1` | Создать диалог |
| `GET .../conversations/{conversation}/messages` | Тот же путь под `/api/v1` | История сообщений |
| `POST .../conversations/{conversation}/messages` | Тот же путь под `/api/v1` | SSE-ответ локальной модели |

PEA хранит диалоги/сообщения в tenant- и project-scoped таблицах с RLS и composite FK. Чат обращается к LM Studio через provider abstraction и не имеет cloud fallback. Если `PEA_LLM_MODEL` не задан, endpoint закрывается с HTTP 503.

Bionic Adapter уже имел GET-маршруты для документов, версий, source fragments, artifacts, knowledge, reviews, findings и evidence. Они остаются серверными read endpoints; frontend document browser, upload UI и полноценный просмотр evidence ещё не завершены.

### Переменные окружения frontend

- `VITE_API_BASE_URL`: публичный HTTPS origin Bionic server/API gateway (без завершающего path).
- `VITE_OIDC_ISSUER`: точный issuer общего Keycloak realm.
- `VITE_OIDC_CLIENT_ID=pea-web`.
- `VITE_OIDC_REDIRECT_URI`: точный callback URL, разрешённый в Keycloak; по умолчанию origin + Pages base path.

### Границы проверки

GitHub Actions подтверждает frontend build и backend unit/integration/build checks после каждого соответствующего commit. Это не доказывает, что Stack realm уже обновлён, Bionic/PEA доступны друг другу в реальной сети, LM Studio отвечает на целевой модели или браузерный вход завершает полный E2E flow. Эти проверки требуют реального развернутого окружения.

## Статус

React API client подключён к UI runtime для Keycloak PKCE session, projects, conversations и streaming chat. Документные Bionic read routes существуют, но загрузка/просмотр документов в Pages UI и live E2E остаются открытыми.
