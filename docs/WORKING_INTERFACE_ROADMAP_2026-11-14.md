# Краткий roadmap до работы в интерфейсе с документацией

Дата актуализации: 2026-11-14 (P0 уточнён по исходному коду)  
Основная ветка: main

## Цель ближайшего релиза

Открыть реальный Web-интерфейс Personal Expert AI, войти через Keycloak, увидеть tenant **Personal Expert AI** и проект **Первый проект**, загрузить PDF, дождаться обработки, затем задать вопрос и получить ответ с проверяемыми цитатами.

Это не план дальнейшего исследования инфраструктуры. Каждый следующий пункт должен приводить к запуску интерфейса или к проверке конкретного пользовательского сценария.

## Что уже подтверждено

- [x] Локальный PEA FastAPI запущен; GET /health вернул HTTP 200.
- [x] Keycloak realm stack-app, клиент pea-web; PKCE Authorization Code + S256 прошёл проверку.
- [x] Проверены подписи RS256, issuer, audience, nonce и согласованность subject в ID/access tokens.
- [x] В PEA создан пользователь, tenant **Personal Expert AI** и проект **Первый проект**; membership пользователя — owner / project_manager.
- [x] Создана корректная OIDC identity mapping для фактического Keycloak subject.
- [x] PEA Web содержит React UI, OIDC-клиент, tenant/project navigation, чат и DocumentWorkspace.
- [x] В PEA Web есть Bionic Adapter API client и UI загрузки/просмотра документов.

## Что НЕ подтверждено

- [ ] Авторизованные запросы GET /api/v1/session, GET /api/v1/tenants и GET /api/v1/projects с реальным access token.
- [ ] Запущенный fork-specific Bionic runtime и доступный из браузера HTTPS PEA Adapter.
- [ ] Сквозная цепочка Web → Keycloak → Bionic Adapter → PEA.
- [ ] Production-mode Web. GitHub Pages намеренно остаётся demo mode; демо-экран не подключён к реальным данным.
- [ ] Реальная загрузка файла, сохранение версии и обработка worker-ом до SourceFragments.
- [ ] Интерактивный PEA retrieval tool в Bionic Agent Runtime и grounded answers с citations.
- [ ] Live E2E и security acceptance.

## Краткий порядок работ

### P0. Закрыть авторизованный доступ к PEA — точный сценарий

Проверка сверена с текущим кодом main: app/api/auth.py и app/api/routes.py.

**Предусловия**
- FastAPI уже слушает http://127.0.0.1:8000; второй сервер не запускать.
- Получить свежий access token через существующий PKCE smoke flow для клиента pea-web. Нужен именно access token, не ID token; токен должен иметь audience pea-api.
- Не печатать токен, не присылать его в чат, не сохранять в файл или историю shell.

**Три запроса**
1. GET http://127.0.0.1:8000/api/v1/session с Authorization: Bearer. Ожидание: HTTP 200, поля userId, displayName; tenantId пока null — это штатно до выбора tenant.
2. GET http://127.0.0.1:8000/api/v1/tenants с тем же Bearer. Ожидание: HTTP 200, массив memberships; среди них tenant **Personal Expert AI**, роль owner.
3. GET http://127.0.0.1:8000/api/v1/projects с Bearer и X-Tenant-ID: 2714a044-b972-4594-a0fb-c188cce390e2. Ожидание: HTTP 200, проект **Первый проект** (ID 20a8d7f4-8e13-4818-b513-77c9d074b802).

**Отрицательные проверки**
- Без Bearer /api/v1/session должен вернуть 401.
- Невалидный X-Tenant-ID должен вернуть 400.
- Tenant, в котором у пользователя нет активного membership, не должен раскрывать проекты (ожидается 404).

**Фактический статус**
- Код маршрутов и ожидаемые проверки изучены.
- Запросы к localhost пользователя из ChatGPT выполнить нельзя: localhost доступен только на его компьютере/WSL. Поэтому P0 не помечается пройденным до получения локальных результатов.
- Нужен один локальный прогон; токен вводить скрыто, выводить только HTTP-коды и JSON без секретов.

Критерий: все три авторизованных запроса возвращают ожидаемые данные; негативные проверки не раскрывают чужие данные.

### P1. Поднять реальный Bionic Adapter

1. Исправить устаревшие realm/issuer/JWKS настройки Bionic на stack-app.
2. Собрать и развернуть именно fork-specific Bionic image, не upstream image.
3. Настроить server-to-server доступ Bionic → PEA, JWT validation и membership enforcement.
4. Проверить HTTPS endpoint Adapter и CORS allowlist для Web.

Критерий: Adapter доступен по HTTPS и корректно проксирует session, tenants и projects в PEA; подмена tenant/project со стороны браузера не даёт доступа.

### P2. Открыть настоящий Web-интерфейс

1. Собрать PEA Web в production mode с реальными публичными параметрами Keycloak и HTTPS Adapter.
2. Запустить Web на доступном HTTPS origin (GitHub Pages остаётся demo, пока backend недоступен публично).
3. Пройти browser login/logout и проверить tenant/project selector.

Критерий: пользователь входит в интерфейс и видит **Personal Expert AI → Первый проект** из живого PEA API.

### P3. Первый документ и обработка

1. Загрузить тестовый PDF через DocumentWorkspace.
2. Проверить создание immutable document version и processing run.
3. Убедиться, что worker завершил обработку и создал SourceFragments/artifacts.
4. Проверить просмотр статуса и извлечённого содержимого в UI.

Критерий: PDF не просто выбран в браузере, а сохранён и обработан backend/worker.

### P4. Вопросы по документу с доказательствами

1. Реализовать/подключить interactive pea_search в Bionic Agent Runtime.
2. Передавать в prompt только фрагменты, разрешённые PEA ACL для текущего tenant/project.
3. Возвращать citations с документом, immutable version, страницей и fragment provenance.
4. Проверить ответы на тестовых вопросах и негативные сценарии доступа.

Критерий: ответ в чате содержит проверяемые ссылки на реальные фрагменты загруженного документа.

## Следующий конкретный шаг

**P0 — один локальный прогон трёх API-запросов.** API-контракт уже сверен с исходным кодом. Единственное действие, недоступное из ChatGPT, — выполнить запросы к localhost пользователя. После получения трёх ответов сразу переходим к Bionic deployment; общий аудит среды не повторяем.

## Правила статусов

- «Реализовано в коде» не означает «работает в реальном окружении».
- «Запущен сервис» не означает «пользовательский сценарий принят».
- Каждый пункт закрывается только конкретным результатом проверки.
- Не выводить токены, пароли, файл окружения, ключи и содержимое секретов в логи или переписку.
- Не выполнять разрушительные действия с k3d, PostgreSQL, volumes или локальными данными ради ускорения.
