const docsUrl = 'https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs';

export function ProjectHandoff() {
  return (
    <section className="panel admin-panel admin-wide">
      <div className="panel-heading">
        <div>
          <h2>Продолжение проекта</h2>
          <p>25 ноября 2026 · Personal Expert AI</p>
        </div>
      </div>
      <p>В локальном Bionic уже открывали проект, получали ответ Qwen через LM Studio и создавали карточку документа в PEA. Загрузка версии PDF около 5 МБ остановилась на Nginx с ошибкой HTTP 413.</p>
      <h3>С чего начать новый чат</h3>
      <p>Проверить, завершилась ли сборка Stack Operator с исправленным лимитом загрузки. Последний вывод в переписке — загрузка компонента rust-std. Затем проверить конфигурацию Nginx после синхронизации и повторить загрузку PDF.</p>
      <h3>До первого результата проверки документа</h3>
      <ol>
        <li>Загрузить PDF через Bionic и увидеть сохранённую версию после обновления страницы.</li>
        <li>Дождаться обработки в PEA и сверить извлечённый фрагмент с исходной страницей.</li>
        <li>Задать вопрос по PDF и открыть источник ответа с указанием версии и страницы.</li>
      </ol>
      <p><a href={`${docsUrl}/PROJECT_HANDOFF.md`} target="_blank" rel="noreferrer">Сводка, чек-лист и текст для нового чата</a></p>
      <p><a href={`${docsUrl}/chat-archive/site-documentation-review.md#day-18`} target="_blank" rel="noreferrer">Переписка о загрузке PDF за 18 ноября</a></p>
    </section>
  );
}
