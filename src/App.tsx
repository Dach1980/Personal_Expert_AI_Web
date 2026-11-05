import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, MessageSquare, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ProjectList } from './components/ProjectList';
import { ChatPanel } from './components/ChatPanel';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { AdminAuditRoadmap } from './components/AdminAuditRoadmap';
import { demoMessages, demoProjects } from './data/demo';
import { apiClient } from './services/api/client';
import { chooseTenantId } from './services/tenant-selection';
import type { ChatMessage, Conversation, MessageCitation, Project, Session, TenantMembership } from './types';

const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

type LoadState = 'loading' | 'ready' | 'error';
type Theme = 'light' | 'dark';

function navFromPath(pathname: string): string {
  const segment = pathname.replace(/\/+$/, '').split('/').pop();
  return segment === 'projects' || segment === 'knowledge' || segment === 'settings' || segment === 'admin' ? segment : 'workspace';
}

export default function App() {
  const [nav, setNav] = useState(() => navFromPath(window.location.pathname));
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = window.localStorage.getItem('pea-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [session, setSession] = useState<Session | null>(null);
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [adminAccess, setAdminAccess] = useState(false);
  const [projects, setProjects] = useState<Project[]>(demoMode ? demoProjects : []);
  const [selectedId, setSelectedId] = useState<string | null>(demoMode ? demoProjects[0]?.id ?? null : null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(demoMode ? demoMessages : []);
  const [loadState, setLoadState] = useState<LoadState>(demoMode ? 'ready' : 'loading');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const loadConversation = async (tenantId: string, project: Project, conversation: Conversation) => {
    setConversationId(conversation.id);
    setMessages([]);
    setChatError(null);
    const history = await apiClient.getMessages(tenantId, project.id, conversation.id);
    setMessages(history.map((message) => ({
      ...message,
      createdAt: message.created_at ?? new Date().toISOString(),
    })));
  };

  const loadProjectChat = async (tenantId: string, project: Project) => {
    setConversationId(null);
    setConversations([]);
    setMessages([]);
    setChatError(null);
    const available = await apiClient.getConversations(tenantId, project.id);
    const ordered = [...available].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const conversation = ordered[0] ?? await apiClient.createConversation(tenantId, project.id);
    setConversations(ordered.length ? ordered : [conversation]);
    await loadConversation(tenantId, project, conversation);
  };

  const createNewConversation = async () => {
    if (!session?.tenantId || !selectedProject || demoMode) return;
    setChatError(null);
    try {
      const conversation = await apiClient.createConversation(session.tenantId, selectedProject.id);
      setConversations((current) => [conversation, ...current]);
      await loadConversation(session.tenantId, selectedProject, conversation);
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : 'Не удалось создать диалог.');
    }
  };

  const selectConversation = async (conversationIdValue: string) => {
    if (!session?.tenantId || !selectedProject) return;
    const conversation = conversations.find((item) => item.id === conversationIdValue);
    if (!conversation) return;
    setLoadState('loading');
    try {
      await loadConversation(session.tenantId, selectedProject, conversation);
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : 'Не удалось загрузить историю диалога.');
    } finally {
      setLoadState('ready');
    }
  };

  const loadWorkspace = async () => {
    setLoadState('loading');
    setError(null);
    try {
      await apiClient.initializeAuth();
      const currentSession = await apiClient.getSession();
      if (!currentSession.authenticated) {
        setSession(currentSession);
        setTenants([]);
        setSelectedTenantId(null);
        setAdminAccess(false);
        setProjects([]);
        setSelectedId(null);
        setConversationId(null);
        setConversations([]);
        setMessages([]);
        setLoadState('ready');
        return;
      }

      let canAdmin = false;
      try {
        const admin = await apiClient.getAdminMe();
        canAdmin = admin.permissions.includes('system.audit.read') || admin.permissions.includes('system.tenants.read');
      } catch {
        canAdmin = false;
      }
      setAdminAccess(canAdmin);

      const availableTenants = await apiClient.getTenants();
      setTenants(availableTenants);
      const rememberedTenantId = window.localStorage.getItem('pea-selected-tenant');
      const selected = chooseTenantId(availableTenants, rememberedTenantId);
      setSelectedTenantId(selected);
      if (!selected) {
        setSession({ ...currentSession, tenantId: null });
        setProjects([]);
        setSelectedId(null);
        setConversationId(null);
        setConversations([]);
        setMessages([]);
        setLoadState('ready');
        return;
      }

      // localStorage stores only the preferred tenant UUID, never an access grant.
      // PEA validates active membership again on every tenant-scoped request.
      window.localStorage.setItem('pea-selected-tenant', selected);
      setSession({ ...currentSession, tenantId: selected });
      const availableProjects = await apiClient.getProjects(selected);
      setProjects(availableProjects);
      const firstProject = availableProjects[0] ?? null;
      setSelectedId(firstProject?.id ?? null);
      if (firstProject) {
        await loadProjectChat(selected, firstProject);
      } else {
        setConversationId(null);
        setConversations([]);
        setMessages([]);
      }
      setLoadState('ready');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось подключиться к API Adapter.';
      if (message === 'Требуется авторизация.') {
        setSession({ authenticated: false });
        setTenants([]);
        setSelectedTenantId(null);
        setAdminAccess(false);
        setProjects([]);
        setSelectedId(null);
        setConversationId(null);
        setConversations([]);
        setMessages([]);
        setLoadState('ready');
        return;
      }
      setError(message);
      setLoadState('error');
    }
  };

  const switchTenant = async (tenantId: string) => {
    if (!tenants.some((tenant) => tenant.id === tenantId) || tenantId === selectedTenantId || sending) return;
    setSelectedTenantId(tenantId);
    window.localStorage.setItem('pea-selected-tenant', tenantId);
    setSession((current) => current ? { ...current, tenantId } : current);
    setProjects([]);
    setSelectedId(null);
    setConversationId(null);
    setConversations([]);
    setMessages([]);
    setChatError(null);
    setError(null);
    setLoadState('loading');
    try {
      const availableProjects = await apiClient.getProjects(tenantId);
      setProjects(availableProjects);
      const firstProject = availableProjects[0] ?? null;
      setSelectedId(firstProject?.id ?? null);
      if (firstProject) await loadProjectChat(tenantId, firstProject);
      setLoadState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось переключить tenant.');
      setLoadState('error');
    }
  };

  useEffect(() => {
    if (!demoMode) void loadWorkspace();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('pea-theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncRoute = () => setNav(navFromPath(window.location.pathname));
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = (nextNav: string) => {
    setNav(nextNav);
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const route = nextNav === 'workspace' ? '/' : `/${nextNav}`;
    window.history.pushState({}, '', `${basePath}${route}`);
  };

  const sendDemoMessage = (content: string) => {
    const now = new Date().toISOString();
    setMessages((old) => [
      ...old,
      { id: crypto.randomUUID(), role: 'user', content, createdAt: now },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Демонстрационный режим: сообщение не отправлено в модель и не анализировалось.',
        createdAt: now,
      },
    ]);
  };

  const selectProject = async (project: Project) => {
    setSelectedId(project.id);
    if (demoMode) return;
    if (!session?.tenantId) {
      setChatError('В сессии отсутствует tenant context.');
      return;
    }
    setLoadState('loading');
    try {
      await loadProjectChat(session.tenantId, project);
      setLoadState('ready');
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : 'Не удалось открыть диалог.');
      setLoadState('ready');
    }
  };

  const sendRealMessage = async (content: string) => {
    if (!session?.tenantId || !selectedProject || !conversationId || sending) return;
    setSending(true);
    setChatError(null);
    const now = new Date().toISOString();
    const assistantId = crypto.randomUUID();
    setMessages((old) => [
      ...old,
      { id: crypto.randomUUID(), role: 'user', content, createdAt: now },
      { id: assistantId, role: 'assistant', content: '', createdAt: now, citations: [] },
    ]);
    const appendCitation = (citation: MessageCitation) => {
      setMessages((old) => old.map((message) =>
        message.id === assistantId
          ? { ...message, citations: [...(message.citations ?? []), citation] }
          : message,
      ));
    };
    try {
      for await (const delta of apiClient.sendMessage({
        tenantId: session.tenantId,
        projectId: selectedProject.id,
        conversationId,
        content,
        onCitation: appendCitation,
      })) {
        setMessages((old) => old.map((message) =>
          message.id === assistantId
            ? { ...message, content: message.content + delta }
            : message,
        ));
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось получить ответ локальной модели.';
      setChatError(message);
      setMessages((old) => old.map((item) =>
        item.id === assistantId && !item.content
          ? { ...item, content: 'Ответ не получен. Сообщение пользователя сохранено в истории.' }
          : item,
      ));
    } finally {
      setSending(false);
    }
  };

  const activeProject = selectedProject ?? (demoMode ? demoProjects[0] : null);
  const projectCount = projects.length;
  const identityLabel = demoMode ? 'DEMO' : session?.authenticated ? 'АКТИВНА' : 'НЕТ СЕССИИ';

  return (
    <div className="app-shell">
      <Sidebar active={nav} onChange={navigate} showAdmin={adminAccess} />
      <main className="main-area">
        <header className="topbar">
          <span>Рабочее пространство　/　<b>{activeProject?.name ?? 'Проекты'}</b></span>
          <div className="topbar-actions">
            {session?.authenticated && tenants.length > 0 && (
              <label className="tenant-switcher">
                <span>Организация</span>
                <select aria-label="Выбрать tenant" value={selectedTenantId ?? ''} disabled={sending || loadState === 'loading'} onChange={(event) => void switchTenant(event.target.value)}>
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            )}
            {session?.authenticated && <span className="user-identity">{session.displayName ?? 'Пользователь'}</span>}
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
            </button>
            {!demoMode && session?.authenticated && <button className="text-button" onClick={() => apiClient.logout()}>Выйти</button>}
            <span className="environment">{demoMode ? '● DEMO MODE' : loadState === 'ready' ? '● API CLIENT' : '● CONNECTING'}</span>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">ЭКСПЕРТНАЯ СИСТЕМА · WORKSPACE</div>
              <h1>{nav === 'workspace' ? 'Рабочее пространство' : nav === 'projects' ? 'Мои проекты' : nav === 'knowledge' ? 'База знаний' : nav === 'admin' ? 'Аудит и Roadmap' : 'Настройки'}</h1>
              <p>{nav === 'admin' ? 'Административные данные PEA и контроль этапов интеграции.' : 'Проекты, документация и интеллектуальный помощник — в одном пространстве.'}</p>
            </div>
          </div>
          <div className="stats-grid">
            {[
              [Activity, 'ПРОЕКТЫ', demoMode ? String(projectCount) : loadState === 'ready' ? String(projectCount) : '—', demoMode ? 'Демонстрационные записи' : 'Данные API Adapter'],
              [FileText, 'ДОКУМЕНТЫ', '—', 'Подключение document workspace — следующий этап'],
              [MessageSquare, 'ДИАЛОГИ', conversationId ? '1' : '—', 'История диалогов PEA'],
              [ShieldCheck, 'ДОСТУП', identityLabel, demoMode ? 'Права не проверяются' : 'Сессия проверяется backend'],
            ].map(([Icon, label, value, note], index) => {
              const ItemIcon = Icon as typeof Activity;
              return (
                <article className="stat-card" key={index}>
                  <ItemIcon size={18} />
                  <span>{label as string}</span>
                  <strong>{value as string}</strong>
                  <small>{note as string}</small>
                </article>
              );
            })}
          </div>

          {loadState === 'error' && !demoMode && (
            <section className="panel connection-panel" role="alert">
              <h2>Не удалось загрузить рабочее пространство</h2>
              <p>{error}</p>
              <p>Проверьте HTTPS API Adapter, адрес VITE_API_BASE_URL, cookie-сессию и CORS allowlist.</p>
              <button className="secondary-button" onClick={() => void loadWorkspace()}>Повторить подключение</button>
            </section>
          )}

          {!demoMode && loadState === 'loading' && (
            <section className="panel connection-panel" aria-live="polite">
              <h2>Подключение к Personal Expert AI</h2>
              <p>Проверяем сессию, загружаем проекты и историю диалогов.</p>
            </section>
          )}

          {!demoMode && loadState === 'ready' && !session?.authenticated && (
            <section className="panel connection-panel">
              <h2>Требуется вход</h2>
              <p>Вход выполняется через Keycloak Authorization Code + PKCE. API принимает только подписанный access token с нужной аудиторией и проверяет членство в PEA.</p>
              <button className="secondary-button login-button" onClick={() => void apiClient.login().catch((cause) => setError(cause instanceof Error ? cause.message : 'Не удалось начать вход.'))}>Войти через Keycloak</button>
              {error && <p role="alert">{error}</p>}
            </section>
          )}

          {(nav === 'workspace' || nav === 'projects' || nav === 'knowledge') && (demoMode || (loadState === 'ready' && session?.authenticated)) && (
            <div className="workspace-grid">
              <ProjectList
                projects={projects}
                selectedId={selectedId ?? ''}
                onSelect={(project) => void selectProject(project)}
              />
              {nav === 'knowledge' ? (
                selectedProject && session?.tenantId && !demoMode ? (
                  <DocumentWorkspace tenantId={session.tenantId} project={selectedProject} />
                ) : (
                  <section className="panel connection-panel">
                    <h2>Документы проекта</h2>
                    <p>Для просмотра документов выберите авторизованный проект. В демонстрационном режиме реальные документы недоступны.</p>
                  </section>
                )
              ) : demoMode && activeProject ? (
                <ChatPanel project={activeProject} messages={messages} onSend={sendDemoMessage} />
              ) : selectedProject ? (
                <ChatPanel
                  project={selectedProject}
                  messages={messages}
                  conversations={conversations}
                  activeConversationId={conversationId}
                  onSelectConversation={(id) => void selectConversation(id)}
                  onNewConversation={() => void createNewConversation()}
                  onSend={(content) => void sendRealMessage(content)}
                  sending={sending}
                  error={chatError}
                />
              ) : (
                <section className="panel connection-panel">
                  <h2>{tenants.length === 0 ? 'Нет доступных организаций' : 'Нет доступных проектов'}</h2>
                  <p>{tenants.length === 0 ? 'Для этой учётной записи нет активных членств в tenant. Обратитесь к администратору PEA.' : 'В выбранной организации пользователю пока не назначены проекты.'}</p>
                </section>
              )}
            </div>
          )}

          {nav === 'admin' && adminAccess && <AdminAuditRoadmap />}

          {nav === 'admin' && !adminAccess && (
            <section className="panel connection-panel" role="alert"><h2>Доступ запрещён</h2><p>Для раздела требуются административные разрешения PEA system.audit.read и/или system.tenants.read.</p></section>
          )}

          {nav === 'settings' && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <div className="panel-heading"><div><h2>Внешний вид</h2><p>Локальные предпочтения интерфейса этого браузера.</p></div></div>
                <label className="settings-row">
                  <span><b>Тема оформления</b><small>Выбор сохраняется на этом устройстве.</small></span>
                  <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
                    <option value="dark">Тёмная</option>
                    <option value="light">Светлая</option>
                  </select>
                </label>
              </section>
              <section className="panel settings-panel">
                <div className="panel-heading"><div><h2>Учётная запись</h2><p>Информация о текущей проверенной сессии.</p></div></div>
                <div className="settings-row"><span><b>Статус</b><small>{demoMode ? 'Демонстрационный режим — доступ не проверяется.' : session?.authenticated ? 'Keycloak session authenticated' : 'Нет активной сессии'}</small></span><strong>{demoMode ? 'DEMO' : session?.authenticated ? 'Активна' : 'Не выполнен вход'}</strong></div>
                <div className="settings-row"><span><b>Пользователь</b><small>{session?.displayName ?? 'Не определён'}</small></span></div>
                <div className="settings-row"><span><b>Tenant context</b><small>{session?.tenantId ?? 'Не получен от API'}</small></span></div>
                {!demoMode && session?.authenticated && <button className="secondary-button" onClick={() => apiClient.logout()}>Выйти из системы</button>}
              </section>
              <section className="panel settings-panel">
                <div className="panel-heading"><div><h2>Подключения</h2><p>Состояние клиентской конфигурации без раскрытия токенов и секретов.</p></div></div>
                <div className="settings-row"><span><b>API Adapter</b><small>{import.meta.env.VITE_API_BASE_URL ? 'Адрес задан при сборке frontend.' : 'Адрес не задан в сборке.'}</small></span><strong>{import.meta.env.VITE_API_BASE_URL ? 'Настроен' : 'Не настроен'}</strong></div>
                <div className="settings-row"><span><b>Keycloak issuer</b><small>{import.meta.env.VITE_OIDC_ISSUER ? 'Issuer задан при сборке.' : 'Issuer не задан в сборке.'}</small></span><strong>{import.meta.env.VITE_OIDC_ISSUER ? 'Настроен' : 'Не настроен'}</strong></div>
                <p className="muted">Настройки сервера, модели и хранилища управляются на backend и не редактируются из публичного браузера.</p>
              </section>
            </div>
          )}

          <footer className="page-footer">
            <img src={logoUrl} alt="Cherkashin AI" />
            <span>PERSONAL EXPERT AI · WEB CLIENT 0.4.0</span>
            <span>{demoMode ? 'Явно включённый демонстрационный режим' : 'Независимый frontend · API Adapter architecture'}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
