import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';
import type { SystemAdminMe, SystemAuditEvent, TenantRecord } from '../types';

const roadmap = [
  { title: "Локальная среда Windows / WSL2 и PEA", status: "Базовая среда и PEA API подготовлены; PostgreSQL 16, Alembic/RLS и backend tests проверялись ранее. PEA /health отвечает HTTP 200 локально и из k3d через host.docker.internal." },
  { title: "k3d Kubernetes для Bionic", status: "Готово: кластер k3d-bionic; server/agent nodes Ready, Traefik доступен на localhost:30000, local-path provisioner работает." },
  { title: "Stack / CNPG / Keycloak Operators", status: "Готово: CNPG, Keycloak и Stack operators Running/Ready; CNPG cluster keycloak-db-cluster healthy, PVC 10 GiB Bound." },
  { title: "Keycloak и OIDC realm", status: "Готово: realm stack-app, discovery и JWKS HTTP 200; pea-api audience, pea-api-context scope, pea-bionic-worker и pea-web созданы и настроены." },
  { title: "Worker token и PEA workload authorization", status: "Токен pea-bionic-worker выдаётся; RS256/JWKS, issuer, audience pea-api, expiry и scope проверены. Фактическая workload-авторизация в PEA API ещё не принята." },
  { title: "Развёртывание Bionic Stack", status: "Ещё не выполнено. Нужны Kubernetes Secret worker, исправление stale bionic-gpt URLs на stack-app в infra-as-code/stack.yaml, проверка manifest и сетевых зависимостей." },
  { title: "PEA ↔ Bionic: trusted adapter и runtime OIDC", status: "Нужны browser login/logout, Bionic JWT validation, strip client-supplied X-Forwarded-Access-Token, PEA identity/membership enforcement и E2E." },
  { title: "Документы и локальный inference", status: "Не принято: pod-to-PEA/LM Studio networking, upload → immutable version → worker → SourceFragments и локальный Qwen inference без cloud fallback." },
  { title: "Interactive pea_search и citations", status: "Следующий функциональный этап после базовой связки: обычный интерактивный чат должен получать conversation-scoped context; ACL до prompt, citations с immutable provenance." },
  { title: "Hermes-inspired PEA Memory Engine MVP", status: "После interactive pea_search: PEA-owned episodic, long-term и project memory; provenance, извлечение, хранение и повторное использование в новых диалогах." },
  { title: "Memory governance и Skills", status: "После MVP: versioned Skills, подтверждение фактов, scopes/retention/deletion, forgetting, audit trail и user/tenant/project isolation." },
  { title: "Полная функциональная и security-приёмка", status: "Login → tenant → project → upload → processing → interactive retrieval → локальный Qwen → grounded citations; затем negative security tests." },
];

const tomorrowPlan = [
  "Проверить, что PEA API принимает Worker token на предназначенном workload/delegation endpoint и проверяет scope, instance и grant — не ограничиваться проверкой подписи JWT.",
  "Без вывода секрета создать Kubernetes Secret для pea-bionic-worker.",
  "Исправить infra-as-code/stack.yaml: заменить старый realm bionic-gpt на stack-app в issuer/JWKS/token/logout URL; проверить manifest и все обязательные зависимости.",
  "Проверить доступность PEA API и LM Studio именно из будущих Bionic pods.",
  "Выполнить stack deploy только после прохождения предыдущих security/configuration gates; затем проверить pods, browser OIDC login/logout и PEA membership enforcement.",
  "Провести первый сценарий upload → processing/SourceFragments → локальный LM Studio inference. Если deployment gate не пройден, зафиксировать блокер, не обходить проверку.",
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
        <div className="panel-heading"><div><h2>Roadmap Personal Expert AI</h2><p>План учитывает фактический статус локального стенда, CI и отдельные runtime gates.</p></div></div>
        <div className="admin-list">{roadmap.map((item, index) => (
          <div className="admin-row roadmap-row" key={item.title}><span><b>{index + 1}. {item.title}</b><small>{item.status}</small></span></div>
        ))}</div>
        <div className="panel-heading"><div><h3>План на 9 ноября 2026</h3><p>Выполнять по порядку; переход к deployment — только после прохождения security и configuration gates.</p></div></div>
        <ol className="admin-list">{tomorrowPlan.map((item) => <li className="admin-row roadmap-row" key={item}>{item}</li>)}</ol>
        <p className="muted"><a href="https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs/ADMIN_ROADMAP_2026-11-07.md" target="_blank" rel="noreferrer">Подробный roadmap и критерии приёмки</a></p>
      </section>
    </div>
  );
}
