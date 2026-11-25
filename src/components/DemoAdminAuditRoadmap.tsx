import { ProjectHandoff } from './ProjectHandoff';
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
      <ProjectHandoff />
    </div>
  );
}
