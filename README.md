# Personal Expert AI Web

Отдельный frontend для Personal Expert AI. Первая версия — статический адаптивный интерфейс с демонстрационным чатом, списком проектов и подготовленной точкой интеграции с API Adapter.

## Текущий этап

- [x] Базовое рабочее пространство и навигация.
- [x] Список проектов и поиск.
- [x] Демонстрационный чат.
- [x] Адаптивная вёрстка.
- [x] Workflow публикации GitHub Pages.
- [ ] Реальная серверная авторизация.
- [ ] API Adapter и интеграция Bionic.
- [ ] История диалогов и streaming.
- [ ] RAG, загрузка документов и проверка разграничения доступа.

## Публикация

GitHub → Settings → Pages → Build and deployment → Source: GitHub Actions.

Workflow из `.github/workflows/deploy-pages.yml` публикует `index.html` на GitHub Pages при push в `main`.

## Архитектура

Browser (GitHub Pages) → API Adapter / Backend Gateway → Bionic → LM Studio.

GitHub Pages размещает только статические файлы. Bionic, gateway, база данных, хранилище документов и LM Studio запускаются отдельно.

## Безопасность

Демонстрационный экран входа не является аутентификацией. Нельзя помещать ключи API, токены Bionic, пароли или секреты в публичный frontend. Проверка пользователя, tenant/project permissions и доступ к документам должны выполняться на backend для каждого запроса. LM Studio не следует открывать напрямую в публичный интернет.

Подробности целевого контракта: [docs/API_ADAPTER.md](docs/API_ADAPTER.md).
