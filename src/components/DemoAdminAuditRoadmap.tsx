const roadmap = [
  { title: 'Локальная среда Windows / WSL2', status: 'Выполнено 2026-11-07: Docker Desktop, PostgreSQL 16 healthy, LM Studio доступна из Ubuntu, uv установлен; Python 3.12 ещё не установлен.' },
  { title: 'Python 3.12 и зависимости PEA', status: 'Следующий шаг: создать .venv через uv и установить database / processing / llm / dev extras.' },
  { title: 'PostgreSQL schema и миграции', status: 'PostgreSQL запущен и принимает подключения; Alembic upgrade и schema / RLS tests ещё не запускались.' },
  { title: 'Локальный PEA API + LM Studio', status: 'Ожидает подготовки Python и миграций; WSL → LM Studio API уже проверен, PEA → LM Studio ещё нет.' },
  { title: 'Document ingestion и SourceFragments', status: 'Реализация есть в backend; локальная загрузка, worker и artifacts требуют E2E.' },
  { title: 'Keycloak, trusted Bionic Adapter и Admin RBAC', status: 'Код и контракты есть; live realm, grants, browser login и gateway ещё не приняты.' },
  { title: 'Tenant/project switching и изоляция', status: 'Требуются проверки на двух реальных тестовых tenants/projects и negative API tests.' },
  { title: 'Interactive pea_search и citations', status: 'Блокирующий пробел: scheduled retrieval не заменяет retrieval tool для обычного чата.' },
  { title: 'Полная функциональная приёмка', status: 'Login → tenant → project → upload → processing → local model → retrieval → citations; пока не выполнено.' },
];

const events = [
  { action: 'document.version.uploaded', time: 'Пример события', outcome: 'DEMO' },
  { action: 'tenant.context.selected', time: 'Пример события', outcome: 'DEMO' },
  { action: 'system_admin.grant.provisioned', time: 'Не выполнялось в реальной системе', outcome: 'NOT EXECUTED' },
];

export function DemoAdminAuditRoadmap() {
  return (
    <div className="admin-grid">
      <section className="panel admin-panel admin-wide">
        <div className="panel-heading"><div><h2>Демонстрационная административная панель</h2><p>Синтетические примеры. Никаких реальных пользователей, разрешений или событий PEA здесь нет.</p></div><span className="status-chip">DEMO ONLY</span></div>
        <p className="admin-identity">Реальный системный администратор не авторизован. Этот экран показывает структуру интерфейса и план работ.</p>
      </section>
      <section className="panel admin-panel">
        <div className="panel-heading"><div><h2>Системные разрешения</h2><p>В демонстрационном режиме не назначаются и не проверяются.</p></div></div>
        <div className="admin-permissions"><span className="status-chip">system.audit.read — пример</span><span className="status-chip">system.tenants.read — пример</span><span className="status-chip">system.roadmap.read — планируется</span></div>
      </section>
      <section className="panel admin-panel">
        <div className="panel-heading"><div><h2>Журнал событий</h2><p>Иллюстрация формата аудита.</p></div><span className="count">{events.length}</span></div>
        <div className="admin-list">{events.map((event) => <article className="admin-event" key={event.action}><div className="admin-event-heading"><b>{event.action}</b><span className="status-chip">{event.outcome}</span></div><small>{event.time}</small></article>)}</div>
      </section>
      <section className="panel admin-panel admin-wide">
        <div className="panel-heading"><div><h2>Roadmap разработки</h2><p>Статусы разделяют готовность среды, исходный код, CI и фактическую runtime-приёмку.</p></div></div>
        <div className="admin-list">{roadmap.map((item, index) => <div className="admin-row roadmap-row" key={item.title}><span><b>{index + 1}. {item.title}</b><small>{item.status}</small></span></div>)}</div>
        <p className="muted"><a href="https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs/ADMIN_ROADMAP_2026-11-07.md" target="_blank" rel="noreferrer">Подробный roadmap и критерии приёмки</a></p>
      </section>
    </div>
  );
}
