import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';
import type { SystemAdminMe, SystemAuditEvent, TenantRecord } from '../types';

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
        <p className="muted"><a href="https://github.com/Dach1980/Personal_Expert_AI_Web/blob/main/docs/ADMIN_ROADMAP_2026-11-07.md" target="_blank" rel="noreferrer">Подробный roadmap и критерии приёмки</a></p>
      </section>
    </div>
  );
}
