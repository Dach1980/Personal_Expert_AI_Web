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
  const [messages, setMessages] = useState<ChatMessage[]>(demoMode ? demoMessages : []);
  const [loadState, setLoadState] = useState<LoadState>(demoMode ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const loadWorkspace = async () => {
    setLoadState('loading');
    setError(null);
    try {
      const currentSession = await apiClient.getSession();
      setSession(currentSession);
      if (!currentSession.authenticated) {
        setProjects([]);
        setSelectedId(null);
        setLoadState('ready');
        return;
      }
      const availableProjects = await apiClient.getProjects();
      setProjects(availableProjects);
      setSelectedId((current) =>
        current && availableProjects.some((item) => item.id === current)
          ? current
          : availableProjects[0]?.id ?? null,
      );
      setLoadState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось подключиться к API Adapter.');
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

  const activeProject = selectedProject ?? (demoMode ? demoProjects[0] : null);
  const projectCount = projects.length;
  const identityLabel = demoMode ? 'DEMO' : session?.authenticated ? 'АКТИВНА' : 'НЕТ СЕССИИ';

  return (
    <div className="app-shell">
      <Sidebar active={nav} onChange={setNav} />
      <main className="main-area">
        <header className="topbar">
          <span>Рабочее пространство　/　<b>{activeProject?.name ?? 'Проекты'}</b></span>
          <span className="environment">{demoMode ? '● DEMO MODE' : loadState === 'ready' ? '● API CLIENT' : '● CONNECTING'}</span>
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
              [FileText, 'ДОКУМЕНТЫ', '—', 'Документный API ещё не подключён'],
              [MessageSquare, 'ДИАЛОГИ', '—', 'Conversation API ещё не подключён'],
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
              <p>Проверяем сессию и загружаем доступные проекты через API Adapter.</p>
            </section>
          )}

          {!demoMode && loadState === 'ready' && !session?.authenticated && (
            <section className="panel connection-panel">
              <h2>Требуется вход</h2>
              <p>API Adapter не подтвердил активную пользовательскую сессию. Вход через Keycloak будет включён после развёртывания доверенного OIDC gateway.</p>
            </section>
          )}

          {(nav === 'workspace' || nav === 'projects') && (demoMode || (loadState === 'ready' && session?.authenticated)) && (
            <div className="workspace-grid">
              <ProjectList
                projects={projects}
                selectedId={selectedId ?? ''}
                onSelect={(item) => setSelectedId(item.id)}
              />
              {demoMode && activeProject ? (
                <ChatPanel project={activeProject} messages={messages} onSend={sendDemoMessage} />
              ) : (
                <section className="panel connection-panel">
                  <h2>{selectedProject?.name ?? 'Нет доступных проектов'}</h2>
                  <p>
                    {selectedProject
                      ? 'Проекты загружаются из API Adapter. История диалогов и отправка сообщений появятся после реализации и проверки conversation endpoints.'
                      : 'У пользователя пока нет доступных проектов. После подключения project API здесь появится список из PEA.'}
                  </p>
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
