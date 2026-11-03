# API Adapter — целевой контракт (draft)

Этот документ описывает контракт между UI и отдельным backend gateway. Он не утверждает, что эти endpoints уже существуют в Bionic. Перед интеграцией сверяемся с API фактически развёрнутой версии Bionic.

## Цели

- Не связывать UI напрямую с Bionic.
- Нормализовать пользователей, проекты, диалоги, сообщения, streaming и ошибки.
- Скрыть credentials и внутренние адреса LM Studio от браузера.
- Сохранить возможность заменить Bionic собственным backend.

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
| GET | /api/v1/conversations/{id}/messages | История сообщений |
| POST | /api/v1/conversations/{id}/messages | Отправить сообщение и получить поток ответа |

## Streaming

Предпочтительный нормализованный формат — Server-Sent Events (SSE), если его поддерживает выбранный gateway:

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

Это формат нашего adapter, не заявление о формате Bionic.

## Безопасность

- Проверять пользователя и права доступа на backend для каждого запроса.
- Не доверять tenantId, projectId или userId из тела запроса без серверной проверки.
- Проверять принадлежность conversation проекту и пользователя проекту.
- Для cookie-сессии использовать HttpOnly, Secure, SameSite и CSRF-защиту.
- Ограничить CORS конкретным origin, не использовать wildcard с credentials.
- Ограничить размер запросов, частоту запросов и длительность stream.
- Не публиковать LM Studio напрямую в интернет.
- Не записывать токены и секреты в логи.

## Этапы проверки Bionic

1. Зафиксировать версию и фактические API Bionic.
2. Проверить модель авторизации и границы доступа.
3. Проверить CRUD проектов и диалогов.
4. Проверить историю и порядок сообщений.
5. Проверить streaming, отмену, таймауты и reconnect.
6. Проверить загрузку/индексацию документов, retrieval и citations.
7. Проверить фильтрацию RAG по доступам пользователя и проекта.
8. Проверить совместимость с LM Studio: chat completions, streaming, embeddings и tool calling.

## Ошибки

Gateway возвращает нормализованные коды: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, UPSTREAM_ERROR. Текст ошибки не должен раскрывать внутренние секреты и инфраструктурные адреса.
