import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';
import type { SystemAdminMe, SystemAuditEvent, TenantRecord } from '../types';

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

const tomorrowPlan = [
  "P0 — выполнить авторизованные GET /api/v1/session, GET /api/v1/tenants и GET /api/v1/projects с X-Tenant-ID. Токен не выводить и не передавать в переписке.",
  "P1 — развернуть fork-specific Bionic image: исправить старые bionic-gpt issuer/JWKS URLs на stack-app, проверить конфигурацию и поднять защищённый PEA Adapter.",
  "P2 — собрать PEA Web в production mode с реальным Keycloak и HTTPS Adapter; открыть интерфейс и пройти login/logout.",
  "P3 — убедиться, что после входа видны tenant Personal Expert AI и проект Первый проект.",
  "P4 — загрузить тестовый PDF, проверить immutable version, worker processing и появление SourceFragments/artifacts.",
  "P5 — подключить interactive pea_search и проверить ответ по документу с citations. После этого можно принимать первый рабочий сценарий.",
];

export function AdminAuditRoadmap() {
  const [admin, setAdmin] = useState<SystemAdminMe | null>(null);
  const [events, setEvents] = useState<SystemAuditEvent[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const current = await apiClient.getAdminMe();
        if (!active) return;
        setAdmin(current);
        const [auditResult, tenantResult] = await Promise.allSettled([
          current.permissions.includes('system.audit.read')
            ? apiClient.getAdminAuditEvents()
            : Promise.reject(new Error('Нет разрешения system.audit.read')),
          current.permissions.includes('system.tenants.read')
            ? apiClient.getAdminTenants()
            : Promise.reject(new Error('Нет разрешения system.tenants.read')),
        ]);
        if (!active) return;
        if (auditResult.status === 'fulfilled') setEvents(auditResult.value);
        else setAuditError(auditResult.reason instanceof Error ? auditResult.reason.message : 'Не удалось получить аудит.');
        if (tenantResult.status === 'fulfilled') setTenants(tenantResult.value);
        else setTenantError(tenantResult.reason instanceof Error ? tenantResult.reason.message : 'Не удалось получить список tenant.');
      } catch (cause) {
        if (active) setAuditError(cause instanceof Error ? cause.message : 'Нет доступа к административному API.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <section className="panel connection-panel" aria-live="polite"><h2>Загрузка административных данных</h2><p>Проверяем разрешения и получаем данные из PEA.</p></section>;
  }

  return (
    <div className="admin-grid">
      <section className="panel admin-panel">
        <div className="panel-heading"><div><h2>Административные разрешения</h2><p>Данные получены из PEA; интерфейс не назначает права.</p></div></div>
        <p className="admin-identity">User ID: {admin?.user_id ?? '—'}</p>
        <div className="admin-permissions">
          {(admin?.permissions ?? []).map((permission) => <span className="status-chip" key={permission}>{permission}</span>)}
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="panel-heading"><div><h2>Tenant на платформе</h2><p>Инвентаризация доступна только с system.tenants.read.</p></div><span className="count">{tenants.length}</span></div>
        {tenantError ? <p className="admin-error" role="alert">{tenantError}</p> : tenants.length === 0 ? <p className="muted">Нет доступных записей.</p> : (
          <div className="admin-list">{tenants.map((tenant) => (
            <div className="admin-row" key={tenant.id}><span><b>{tenant.name}</b><small>{tenant.id}</small></span><span className="status-chip">{tenant.status}</span></div>
          ))}</div>
        )}
      </section>

      <section className="panel admin-panel admin-wide">
        <div className="panel-heading"><div><h2>Журнал аудита</h2><p>Последние события из append-only журнала PEA.</p></div><span className="count">{events.length}</span></div>
        {auditError ? <p className="admin-error" role="alert">{auditError}</p> : events.length === 0 ? <p className="muted">Событий пока нет или они недоступны текущей роли.</p> : (
          <div className="admin-list">{events.map((event) => (
            <article className="admin-event" key={event.id}>
              <div className="admin-event-heading"><b>{event.action}</b><span className="status-chip">{event.outcome}</span></div>
              <small>{new Date(event.created_at).toLocaleString()} · {event.target_type} · {event.actor_user_id}</small>
              {event.tenant_id && <small>Tenant: {event.tenant_id}</small>}
              {Object.keys(event.details ?? {}).length > 0 && <pre>{JSON.stringify(event.details, null, 2)}</pre>}
            </article>
          ))}</div>
        )}
      </section>

      <section className="panel admin-panel admin-wide">
        <div className="panel-heading"><div><h2>Roadmap Personal Expert AI</h2><p>Состояние на 14 ноября 2026. Здесь отделены подтверждённые факты от непроверенных интеграций.</p></div></div>
        <div className="admin-list">{roadmap.map((item, index) => (
          <div className="admin-row roadmap-row" key={item.title}><span><b>{index + 1}. {item.title}</b><small>{item.status}</small></span></div>
        ))}</div>
        <div className="panel-heading"><div><h3>Краткий план до первого рабочего сценария</h3><p>Выполнять по порядку; переход к deployment — только после прохождения security и configuration gates.</p></div></div>
        <ol className="admin-list">{tomorrowPlan.map((item) => <li className="admin-row roadmap-row" key={item}>{item}</li>)}</ol>
        <p className="muted"><a href="https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs/WORKING_INTERFACE_ROADMAP_2026-11-14.md" target="_blank" rel="noreferrer">Краткий roadmap до рабочего интерфейса и документов</a></p>
      </section>
    </div>
  );
}
