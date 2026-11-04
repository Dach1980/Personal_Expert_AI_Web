import type { ChatMessage, Conversation, DocumentRecord, DocumentVersion, Evidence, Finding, ProcessingArtifact, ProcessingRun, Project, Review, Session, SourceFragment } from '../../types';
import type { ExpertApi, SendMessageInput } from './types';
import { beginLogin, endLoginSession, getAccessToken, initializeOidc } from './oidc';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error('API Adapter не настроен.');
  const accessToken = await getAccessToken();
  const response = await fetch(BASE + path, {
    ...init,
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Требуется авторизация.'
        : response.status === 403
          ? 'Недостаточно прав.'
          : `Ошибка API: HTTP ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

const scope = (tenantId: string, projectId: string) =>
  `/api/pea/tenants/${encodeURIComponent(tenantId)}/projects/${encodeURIComponent(projectId)}`;

async function requestBlob(path: string): Promise<Blob> {
  if (!BASE) throw new Error('API Adapter не настроен.');
  const accessToken = await getAccessToken();
  const response = await fetch(BASE + path, {
    credentials: 'omit',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Не удалось получить файл: HTTP ${response.status}`);
  return response.blob();
}

const documentScope = (tenantId: string, projectId: string, documentId: string) =>
  `${scope(tenantId, projectId)}/documents/${encodeURIComponent(documentId)}`;

export const apiClient: ExpertApi = {
  initializeAuth: initializeOidc,
  login: beginLogin,
  logout: endLoginSession,
  getSession: () => request<Session>('/api/pea/session'),
  getProjects: () => request<Project[]>('/api/pea/projects'),
  getConversations: (tenantId, projectId) =>
    request<Conversation[]>(`${scope(tenantId, projectId)}/conversations`),
  createConversation: (tenantId, projectId) =>
    request<Conversation>(`${scope(tenantId, projectId)}/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Новый диалог' }),
    }),
  getDocuments: (tenantId, projectId) =>
    request<DocumentRecord[]>(`${scope(tenantId, projectId)}/documents`),
  createDocument: (tenantId, projectId, title, documentType) =>
    request<DocumentRecord>(`${scope(tenantId, projectId)}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title, document_type: documentType ?? null }),
    }),
  async uploadDocumentVersion(tenantId, projectId, documentId, file, idempotencyKey) {
    if (!BASE) throw new Error('API Adapter не настроен.');
    const accessToken = await getAccessToken();
    const form = new FormData();
    form.append('file', file, file.name);
    const response = await fetch(`${documentScope(tenantId, projectId, documentId)}/versions`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: form,
    });
    if (!response.ok) throw new Error(`Загрузка документа завершилась ошибкой HTTP ${response.status}`);
    return response.json() as Promise<DocumentVersion>;
  },
  getVersions: (tenantId, projectId, documentId) =>
    request<DocumentVersion[]>(`${documentScope(tenantId, projectId, documentId)}/versions`),
  getFragments: (tenantId, projectId, documentId, versionId) =>
    request<SourceFragment[]>(
      `${documentScope(tenantId, projectId, documentId)}/versions/${encodeURIComponent(versionId)}/source-fragments`,
    ),
  getArtifacts: (tenantId, projectId, documentId, versionId) =>
    request<ProcessingArtifact[]>(
      `${documentScope(tenantId, projectId, documentId)}/versions/${encodeURIComponent(versionId)}/artifacts`,
    ),
  getProcessingRuns: (tenantId, projectId, documentId, versionId) =>
    request<ProcessingRun[]>(
      `${documentScope(tenantId, projectId, documentId)}/versions/${encodeURIComponent(versionId)}/processing-runs`,
    ),
  async enqueueProcessing(tenantId, projectId, documentId, versionId, idempotencyKey) {
    return request<ProcessingRun>(
      `${documentScope(tenantId, projectId, documentId)}/versions/${encodeURIComponent(versionId)}/processing-runs`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ pipeline_name: 'document-ingestion', pipeline_version: '1', parser_manifest: {} }),
      },
    );
  },
  getReviews: (tenantId, projectId) =>
    request<Review[]>(`${scope(tenantId, projectId)}/reviews`),
  getFindings: (tenantId, projectId, reviewId) =>
    request<Finding[]>(
      `${scope(tenantId, projectId)}/reviews/${encodeURIComponent(reviewId)}/findings`,
    ),
  getEvidence: (tenantId, projectId, findingId) =>
    request<Evidence[]>(
      `${scope(tenantId, projectId)}/findings/${encodeURIComponent(findingId)}/evidence`,
    ),
  getArtifactContent: (tenantId, projectId, documentId, versionId, artifactId) =>
    requestBlob(
      `${documentScope(tenantId, projectId, documentId)}/versions/${encodeURIComponent(versionId)}/artifacts/${encodeURIComponent(artifactId)}/content`,
    ),
  getMessages: (tenantId, projectId, conversationId) =>
    request<ChatMessage[]>(
      `${scope(tenantId, projectId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    ),
  async *sendMessage(input: SendMessageInput) {
    if (!BASE) throw new Error('API Adapter не настроен.');
    const accessToken = await getAccessToken();
    const response = await fetch(
      `${BASE}${scope(input.tenantId, input.projectId)}/conversations/${encodeURIComponent(input.conversationId)}/messages`,
      {
        method: 'POST',
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ content: input.content }),
        signal: input.signal,
      },
    );
    if (!response.ok || !response.body) {
      throw new Error(
        response.status === 401
          ? 'Требуется авторизация.'
          : response.status === 403
            ? 'Недостаточно прав.'
            : `Ошибка отправки сообщения: HTTP ${response.status}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';
        for (const eventText of events) {
          const lines = eventText.split(/\r?\n/);
          const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
          const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
          if (!data) continue;
          if (eventName === 'error') {
            const parsed = JSON.parse(data) as { message?: string };
            throw new Error(parsed.message ?? 'Ошибка локальной модели.');
          }
          if (eventName === 'text_delta') {
            const parsed = JSON.parse(data) as { delta?: string };
            if (parsed.delta) yield parsed.delta;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
