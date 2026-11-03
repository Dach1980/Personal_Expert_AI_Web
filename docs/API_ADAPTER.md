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

## Статус

React API client добавлен как отдельный сервисный слой. Пока он не подключён к UI runtime и не проверен на реальном backend. Все перечисленные endpoint-ы — draft до подтверждения реализации Adapter и Bionic.
