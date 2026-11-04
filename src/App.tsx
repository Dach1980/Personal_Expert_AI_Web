import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, MessageSquare, ShieldCheck } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ProjectList } from './components/ProjectList';
import { ChatPanel } from './components/ChatPanel';
import { demoMessages, demoProjects } from './data/demo';
import { apiClient } from './services/api/client';
import type { ChatMessage, Project, Session } from './types';

const logoUrl = `${import.meta.env.BASE_URL}assets/logo.svg`;
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

type LoadState = 'loading' | 'ready' | 'error';

export default function App() {
  const [nav, setNav] = useState('workspace');
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<Project[]>(demoMode ? demoProjects : []);
  const [selectedId, setSelectedId] = useState<string | null>(demoMode ? demoProjects[0]?.id ?? null : null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(demoMode ? demoMessages : []);
  const [loadState, setLoadState] = useState<LoadState>(demoMode ? 'ready' : 'loading');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const loadProjectChat = async (tenantId: string, project: Project) => {
    setConversationId(null);
    setMessages([]);
    setChatError(null);
    const conversations = await apiClient.getConversations(tenantId, project.id);
    const conversation = conversations[0] ?? await apiClient.createConversation(tenantId, project.id);
    setConversationId(conversation.id);
    const history = await apiClient.getMessages(tenantId, project.id, conversation.id);
    setMessages(history.map((message) => ({
      ...message,
      createdAt: message.created_at ?? new Date().toISOString(),
    })));
  };

  const loadWorkspace = async () => {
    setLoadState('loading');
    setError(null);
    try {
      await apiClient.initializeAuth();
      const currentSession = await apiClient.getSession();
      setSession(currentSession);
      if (!currentSession.authenticated) {
        setProjects([]);
        setSelectedId(null);
        setConversationId(null);
        setMessages([]);
        setLoadState('ready');
        return;
      }
      const availableProjects = await apiClient.getProjects();
      setProjects(availableProjects);
      const firstProject = availableProjects[0] ?? null;
      setSelectedId(firstProject?.id ?? null);
      if (firstProject && currentSession.tenantId) {
        await loadProjectChat(currentSession.tenantId, firstProject);
      } else {
        setConversationId(null);
        setMessages([]);
      }
      setLoadState('ready');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось подключиться к API Adapter.';
      if (message === 'Требуется авторизация.') {
        setSession({ authenticated: false });
        setProjects([]);
        setSelectedId(null);
        setConversationId(null);
        setMessages([]);
        setLoadState('ready');
        return;
      }
      setError(message);
      setLoadState('error');
    }
  };

  useEffect(() => {
    if (!demoMode) void loadWorkspace();
  }, []);

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
      { id: assistantId, role: 'assistant', content: '', createdAt: now },
    ]);
    try {
      for await (const delta of apiClient.sendMessage({
        tenantId: session.tenantId,
        projectId: selectedProject.id,
        conversationId,
        content,
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
      <Sidebar active={nav} onChange={setNav} />
      <main className="main-area">
        <header className="topbar">
          <span>Рабочее пространство　/　<b>{activeProject?.name ?? 'Проекты'}</b></span>
          <div className="topbar-actions">
            {session?.authenticated && <span className="user-identity">{session.displayName ?? 'Пользователь'}</span>}
            {!demoMode && session?.authenticated && <button className="text-button" onClick={() => apiClient.logout()}>Выйти</button>}
            <span className="environment">{demoMode ? '● DEMO MODE' : loadState === 'ready' ? '● API CLIENT' : '● CONNECTING'}</span>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">ЭКСПЕРТНАЯ СИСТЕМА · WORKSPACE</div>
              <h1>{nav === 'workspace' ? 'Рабочее пространство' : nav === 'projects' ? 'Мои проекты' : nav === 'knowledge' ? 'База знаний' : 'Настройки'}</h1>
              <p>Проекты, документация и интеллектуальный помощник — в одном пространстве.</p>
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

          {(nav === 'workspace' || nav === 'projects') && (demoMode || (loadState === 'ready' && session?.authenticated)) && (
            <div className="workspace-grid">
              <ProjectList
                projects={projects}
                selectedId={selectedId ?? ''}
                onSelect={(project) => void selectProject(project)}
              />
              {demoMode && activeProject ? (
                <ChatPanel project={activeProject} messages={messages} onSend={sendDemoMessage} />
              ) : selectedProject ? (
                <ChatPanel
                  project={selectedProject}
                  messages={messages}
                  onSend={(content) => void sendRealMessage(content)}
                  sending={sending}
                  error={chatError}
                />
              ) : (
                <section className="panel connection-panel">
                  <h2>Нет доступных проектов</h2>
                  <p>Пользователю пока не назначены проекты в PEA.</p>
                </section>
              )}
            </div>
          )}

          {nav !== 'workspace' && nav !== 'projects' && (
            <section className="panel placeholder-panel">
              <h2>{nav === 'knowledge' ? 'База знаний' : 'Настройки системы'}</h2>
              <p>Раздел будет подключён к backend после реализации соответствующих API методов.</p>
            </section>
          )}

          <footer className="page-footer">
            <img src={logoUrl} alt="Cherkashin AI" />
            <span>PERSONAL EXPERT AI · WEB CLIENT 0.3.0</span>
            <span>{demoMode ? 'Явно включённый демонстрационный режим' : 'Независимый frontend · API Adapter architecture'}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
