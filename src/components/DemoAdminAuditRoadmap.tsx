const roadmap = [
  { title: "PEA API и локальная база", status: "ПОДТВЕРЖДЕНО: FastAPI запущен, GET /health вернул HTTP 200; PostgreSQL 16 работает локально." },
  { title: "Keycloak / OIDC PKCE", status: "ПОДТВЕРЖДЕНО: realm stack-app, клиент pea-web; PKCE S256, RS256/JWKS, issuer, audience и nonce прошли smoke test." },
  { title: "Пользователь, tenant и проект", status: "ПОДТВЕРЖДЕНО: пользователь и membership созданы; tenant Personal Expert AI и проект Первый проект существуют. Правильная identity mapping создана." },
  { title: "Авторизованный PEA API", status: "СЛЕДУЮЩИЙ ШАГ: ещё не приняты GET /api/v1/session, GET /api/v1/tenants и GET /api/v1/projects с X-Tenant-ID и реальным access token." },
  { title: "Bionic fork и PEA Adapter", status: "НЕ ГОТОВО: fork-specific runtime не подтверждён как развёрнутый; нужно исправить stack-app issuer/JWKS, собрать fork image и поднять защищённый Adapter." },
  { title: "Настоящий Web-интерфейс", status: "КОД ЕСТЬ: React UI, OIDC client, tenant/project selector, чат и DocumentWorkspace. GitHub Pages сейчас demo mode; live Web → Adapter → PEA не принято." },
  { title: "Загрузка и обработка документов", status: "НЕ ПРИНЯТО: нужно проверить upload → immutable version → worker → SourceFragments/artifacts в реальном окружении." },
  { title: "Вопросы по документам с citations", status: "НЕ ГОТОВО: требуется interactive pea_search в Bionic Agent Runtime, ACL до prompt и citations с provenance реальных фрагментов." },
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
        <p className="muted"><a href="https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs/WORKING_INTERFACE_ROADMAP_2026-11-14.md" target="_blank" rel="noreferrer">Краткий roadmap до рабочего интерфейса и документов</a></p>
      </section>
    </div>
  );
}
