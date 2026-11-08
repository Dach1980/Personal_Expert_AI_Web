const roadmap = [
  { title: "Локальная среда Windows / WSL2 и PEA", status: "Базовая среда подготовлена; PostgreSQL 16, 15 Alembic migrations, RLS и тесты backend проверялись ранее. После перезапуска требуется подтвердить API и LM Studio runtime." },
  { title: "k3d Kubernetes для Bionic", status: "Выполнено 2026-11-08: кластер k3d-bionic создан; узлы Ready; Traefik и local-path provisioner работают." },
  { title: "Stack / CNPG / Keycloak Operators", status: "Stack init выполнен до создания Keycloak; CNPG Operator 1/1, Keycloak Operator 1/1, Stack Operator 1/1. Keycloak DB ещё настраивает primary." },
  { title: "Keycloak и его PostgreSQL", status: "PVC базы Bound (10 GiB); CNPG Cluster в состоянии Setting up primary. Keycloak pod Running, но 0/1 и перезапускался. Требуется диагностика до Stack deploy." },
  { title: "Развёртывание Bionic Stack", status: "Ожидает полной готовности Keycloak и проверки dev manifest, image references, секретов и сетевых зависимостей." },
  { title: "PEA ↔ Bionic: OIDC и trusted adapter", status: "Требуется runtime-проверка Keycloak → Web → Bionic → PEA; issuer/JWKS берутся из реального OIDC discovery, токены и tenant scope проверяются сервером." },
  { title: "Документы и локальный inference", status: "Проверить upload → immutable version → worker → SourceFragments и доступ Bionic pod к PEA API и LM Studio/Qwen без cloud fallback." },
  { title: "Interactive pea_search и citations", status: "Обязательный следующий функциональный этап после запуска и проверки базовой связки: обычный интерактивный диалог должен получать conversation-scoped PEA retrieval context; scheduled retrieval недостаточен." },
  { title: "Hermes-inspired PEA Memory Engine MVP", status: "Запланировано сразу после interactive pea_search: PEA-owned episodic, long-term и project memory; provenance, автоматическое извлечение, хранение и повторное использование воспоминаний в новых диалогах." },
  { title: "Memory governance и Skills", status: "Следующий этап после MVP: versioned Skills, подтверждение важных фактов, scopes/retention/deletion, забывание, audit trail и строгая tenant/project/user isolation." },
  { title: "Полная функциональная и security-приёмка", status: "Login → tenant → project → upload → processing → interactive retrieval → локальный Qwen → grounded citations; затем negative security tests и проверка изоляции." },
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
