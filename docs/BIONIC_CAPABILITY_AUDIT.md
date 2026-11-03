# Bionic GPT — аудит интеграции для Personal Expert AI

**Целевой продукт:** [bionic-gpt/bionic-gpt](https://github.com/bionic-gpt/bionic-gpt). Это именно Bionic GPT — самостоятельная open-source платформа, которую пользователь указал для проекта. Это НЕ LM Studio Bionic и НЕ репозиторий `bionic-gpt/bionic` (такой адрес не является нужным исходным репозиторием).

Дата сверки публичных материалов: 3 ноября 2026 года.

## Что это за платформа

Bionic GPT позиционируется как self-hosted enterprise AI platform. В README проекта перечислены:
- AI workspace и история диалогов;
- подключение hosted, private и local моделей;
- RAG и datasets;
- runtime инструментов и sandboxed code execution;
- virtual filesystem для вложений, datasets, skills и артефактов;
- identity, teams, permissions, audit и usage controls;
- PostgreSQL persistence и object storage.

Основной репозиторий: https://github.com/bionic-gpt/bionic-gpt  
Документация: https://bionic-gpt.com/docs/  
Локальный запуск через Docker Compose (PoC): https://bionic-gpt.com/docs/running-locally/docker-compose/

## Предварительная оценка соответствия

| Требование | По публичной документации | Что ещё необходимо проверить |
|---|---|---|
| Независимые проекты / workspaces | Есть понятия workspace, projects и datasets в платформе | Проверить модель владения, CRUD и API для интеграции с внешним UI |
| Пользовательская авторизация | Заявлены Identity, SSO/OIDC и team-based permissions | Проверить community edition, конфигурацию IdP, роли и API auth |
| История диалогов | История conversations заявлена как базовая функция | Проверить endpoints, pagination, export и ownership |
| Streaming | Платформа описывает OpenAI-compatible API | Проверить stream протокол, события, отмену и ошибки на выбранной версии |
| RAG | Заявлены knowledge search, datasets и RAG pipelines | Проверить индексацию PDF, retrieval, метаданные и фильтрацию по ACL |
| Источники и страницы документов | Работа с документами и RAG заявлены | Отдельно подтвердить citations с document ID, номером страницы и открытием исходного фрагмента |
| Разграничение доступа | Заявлены teams, permissions, audit | Проверить реальное enforcement на уровне project, dataset, conversation и retrieval |

Важно: наличие функции в платформе не означает автоматически, что все операции доступны через стабильный внешний API. Это выясняется по API-документации и runtime-тесту.

## Предлагаемая архитектура

На первом этапе целесообразно использовать Bionic GPT как self-hosted backend-платформу, а не переписывать её функции в собственном frontend.

```text
React + TypeScript frontend
      GitHub Pages
          |
          | HTTPS
          v
Bionic GPT deployment
  - identity / teams / permissions
  - workspaces / conversations
  - RAG / datasets
  - model provider
          |
          v
Local / private model endpoint

Дополнительный Personal Expert AI layer:
  - domain-specific document lifecycle
  - engineering document metadata
  - normative editions and clauses
  - page-level evidence contract
  - specialized review workflow
```

При этом frontend не должен хранить секреты и напрямую обращаться к приватным адресам. Для внешней публикации потребуется HTTPS backend endpoint и корректная CORS/auth конфигурация. GitHub Pages — только статический хостинг; он не исполняет Rust backend, PostgreSQL, object storage или inference.

## Ограничения текущего этапа

Пользователь пока не имеет доступа к LM Studio/Bionic runtime. Поэтому:
- не устанавливаем Bionic наугад;
- не заявляем, что API уже проверен;
- не придумываем endpoints;
- не отправляем проектные документы в сторонние облачные модели;
- продолжаем развивать frontend и интеграционный контракт по публичному коду и документации.

## План проверки по репозиторию

1. Зафиксировать релиз/commit Bionic GPT, который выберем для тестирования.
2. Изучить Docker Compose и Kubernetes deployment, сервисы, порты, volumes и secrets.
3. Разобрать OpenAPI/API schema и auth flow из исходного кода и документации.
4. Найти точные API методы для users, teams, workspaces/projects, conversations, datasets/documents.
5. Проверить streaming и citation payload.
6. Проверить permissions enforcement и изоляцию retrieval.
7. Подготовить совместимый API adapter только после подтверждения реальных маршрутов.

## Решение на данный момент

Bionic GPT выглядит гораздо более близким к нашей задаче, чем ранее ошибочно рассмотренный LM Studio Bionic: в его публичном описании прямо заявлены workspace, RAG, identity, teams, permissions и audit. Следующий этап — статический аудит исходного кода и API-контрактов Bionic GPT, затем разработка UI под подтверждённые возможности.

**Runtime integration: NOT TESTED.** Для неё позже потребуется доступ к среде, где можно запустить Bionic GPT и настроить локальный/private model provider.

## Проверенные детали по официальной документации

Публичные материалы Bionic GPT подтверждают более конкретные возможности, чем было известно на предыдущем этапе:

- API key используется как Bearer token для OpenAI-compatible API.
- `GET /v1/models` возвращает список моделей.
- `POST /v1/chat/completions` поддерживает параметр `stream: true`.
- Документная загрузка поддерживается через `POST /v1/document_upload`; API key предварительно связывается с Dataset.
- Teams позволяют управлять доступом к datasets, Projects и другим общим ресурсам.
- Для моделей можно указывать OpenAI-compatible endpoint; документация также описывает подключение Ollama как локального inference engine.

Источники:
- API: https://bionic-gpt.com/docs/guides/api/
- Document pipelines: https://bionic-gpt.com/docs/guides/uploading-documents/
- Teams: https://bionic-gpt.com/docs/guides/teams/
- Managing models: https://bionic-gpt.com/docs/guides/managing-models/
- Ollama: https://bionic-gpt.com/docs/running-locally/ollama/

### Что это означает для нашего проекта

1. Для первого прототипа нам, вероятно, не потребуется писать собственный inference server: Bionic GPT уже предоставляет OpenAI-compatible chat API.
2. Для загрузки документов есть отдельный API, но необходимо проверить, как возвращаются идентификаторы документов, статусы обработки, ошибки и связь с Dataset.
3. Team-based permissions и Projects заявлены, однако нужно провести отрицательные тесты: пользователь из Team A не должен получить документы/цитаты Team B через chat или retrieval.
4. Публичный API пример подтверждает модели и chat completions, но не подтверждает универсальные CRUD endpoints для внешнего управления всеми сущностями UI. Не следует выдумывать такие маршруты.
5. Поддержка Ollama означает, что отсутствие LM Studio не блокирует потенциальное использование Bionic GPT. Но для работы всё равно нужен доступный inference endpoint (локальный, частный или внешний, который пользователь осознанно выберет).

**Обновлённый статус:** документально подтверждены базовый OpenAI-compatible API, Bearer API key, document upload API, team permissions и подключение Ollama. Не проверены фактический runtime, точные citation payloads с номерами страниц, streaming на установленной версии и enforcement ACL на реальных запросах.
