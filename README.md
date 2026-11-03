# Personal Expert AI Web

Отдельный frontend-клиент Personal Expert AI. Приложение построено на React + TypeScript + Vite и публикуется как статический сайт через GitHub Pages.

## Текущий этап

- [x] React + TypeScript + Vite.
- [x] Компонентная структура: Sidebar, ProjectList, ChatPanel.
- [x] Адаптивное рабочее пространство и поиск проектов.
- [x] Типизированные модели проекта, сессии и сообщений.
- [x] Изолированный API client для будущего API Adapter.
- [x] GitHub Actions: установка зависимостей, production build, публикация dist.
- [ ] Реальная серверная авторизация и управление сессией.
- [ ] Подключение API Adapter к проверенному Bionic.
- [ ] Реальная история диалогов и потоковая генерация.
- [ ] Загрузка документов, RAG и проверяемые ссылки на страницы источников.
- [ ] Проверка проектных и пользовательских ACL на backend.

## Локальный запуск

Требуется Node.js 22 и npm:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Для подключения backend скопировать `.env.example` в `.env.local` и задать `VITE_API_BASE_URL`. В frontend нельзя помещать API keys, Bionic tokens, пароли или иные секреты.

## Архитектура

```text
React + TypeScript (GitHub Pages)
              |
              v
       API Adapter / Gateway
              |
              v
            Bionic
              |
              v
          LM Studio
```

UI зависит от нашего нормализованного API Adapter contract, а не от внутренних endpoint-ов Bionic. Контракт — проектное предложение, его совместимость с Bionic ещё предстоит подтвердить.

## Важные ограничения текущей версии

Текущий UI использует демонстрационные проекты и локальные сообщения. Вызовы API client подготовлены, но интерфейс пока не переключён на реальную серверную сессию. Авторизация, безопасность, изоляция данных, RAG и streaming не считаются реализованными до интеграционных тестов с backend.

GitHub Pages размещает только статические файлы. Проверку пользователя и разрешений необходимо выполнять на backend для каждого запроса. LM Studio не следует открывать напрямую в публичный интернет.

## Документация

- [API Adapter contract](docs/API_ADAPTER.md)
- [Bionic GPT capability audit](docs/BIONIC_CAPABILITY_AUDIT.md)
- [Deployment](docs/DEPLOYMENT.md)
