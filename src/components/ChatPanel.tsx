import { useState } from 'react';
import { ArrowUp, Bot, Paperclip, Sparkles } from 'lucide-react';
import type { ChatMessage, Project } from '../types';

export function ChatPanel({
  project,
  messages,
  onSend,
  sending = false,
  error,
}: {
  project: Project;
  messages: ChatMessage[];
  onSend: (content: string) => void;
  sending?: boolean;
  error?: string | null;
}) {
  const [draft, setDraft] = useState('');
  const submit = () => {
    const content = draft.trim();
    if (content && !sending) {
      onSend(content);
      setDraft('');
    }
  };

  return (
    <section className="panel chat-panel">
      <header className="chat-header">
        <div className="assistant-avatar"><Bot /></div>
        <div className="chat-title">
          <h2>Экспертный помощник</h2>
          <p>Контекст: <b>{project.name}</b></p>
        </div>
        <span className="environment">{sending ? '● ОТВЕЧАЕТ' : '● ЛОКАЛЬНЫЙ API'}</span>
      </header>
      <div className="messages" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={'message-row ' + message.role}>
            {message.role === 'assistant' && (
              <span className="message-avatar"><Sparkles size={14} /></span>
            )}
            <div className="message-bubble">
              {message.content || (sending ? '…' : '')}
              {!!message.citations?.length && (
                <div className="message-citations" aria-label="Источники ответа">
                  <b>Источники</b>
                  {message.citations.map((citation, index) => {
                    const label = citation.title ?? citation.document_title ?? 'Документ';
                    const locator = [
                      citation.page !== undefined ? `стр. ${citation.page}` : null,
                      citation.sheet ? `лист ${citation.sheet}` : null,
                    ].filter(Boolean).join(', ');
                    const safeUrl = citation.url && /^https?:\/\//i.test(citation.url) ? citation.url : null;
                    return (
                      <div className="message-citation" key={citation.id ?? citation.source_fragment_id ?? index}>
                        {safeUrl ? (
                          <a href={safeUrl} target="_blank" rel="noopener noreferrer">{label}</a>
                        ) : (
                          <span>{label}</span>
                        )}
                        {locator && <small>{locator}</small>}
                        {citation.excerpt && <small>{citation.excerpt}</small>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {!messages.length && (
          <div className="empty-chat">
            <Bot size={24} />
            <p>Задайте вопрос по выбранному проекту.</p>
            <small>Ответ будет сформирован локальной моделью. Пока retrieval не подключён, модель не имеет автоматического доступа к документам проекта.</small>
          </div>
        )}
      </div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <div className="composer">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Задайте вопрос…"
          disabled={sending}
        />
        <div className="composer-footer">
          <span><Paperclip size={14} /> Документы — через раздел проекта</span>
          <button className="send-button" disabled={!draft.trim() || sending} onClick={submit}>
            {sending ? 'Ответ…' : 'Отправить'} <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
