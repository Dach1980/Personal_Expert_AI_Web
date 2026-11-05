import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the diagnostic local to the browser; never transmit user data.
    console.error('Personal Expert AI failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', padding: '48px 24px', boxSizing: 'border-box', background: '#10131b', color: '#edf0f7', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 760, margin: '8vh auto', padding: 28, border: '1px solid #514a83', borderRadius: 14, background: '#1c2230' }}>
            <p style={{ color: '#bcb2ff', letterSpacing: 2, fontSize: 11 }}>PERSONAL EXPERT AI · FRONTEND</p>
            <h1 style={{ fontSize: 24 }}>Не удалось запустить интерфейс</h1>
            <p style={{ color: '#b8c0d0', lineHeight: 1.6 }}>
              Приложение загрузилось, но React обнаружил ошибку при отображении. Обновите страницу.
              Если ошибка повторится, отправьте разработчику текст ниже.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, borderRadius: 8, background: '#10131b', color: '#ffb4a8', fontSize: 12 }}>
              {this.state.error.name}: {this.state.error.message}
            </pre>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 16px', border: 0, borderRadius: 8, background: '#7565df', color: 'white', cursor: 'pointer' }}>
              Обновить страницу
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
