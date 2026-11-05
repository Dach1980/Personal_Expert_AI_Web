import type { ChatMessage, Conversation, DocumentRecord, DocumentVersion, Evidence, Finding, MessageCitation, ProcessingArtifact, ProcessingRun, Project, Review, Session, SourceFragment, SystemAdminMe, SystemAuditEvent, TenantMembership, TenantRecord } from '../../types';
import type { ExpertApi, SendMessageInput } from './types';
import { beginLogin, endLoginSession, getAccessToken, initializeOidc } from './oidc';
import { normalizeSseEvent, parseCitationPayload, parseSseStream } from './sse';

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
  getTenants: () => request<TenantMembership[]>('/api/pea/tenants'),
  getProjects: (tenantId) => request<Project[]>(`/api/pea/tenants/${encodeURIComponent(tenantId)}/projects`),
  getAdminMe: () => request<SystemAdminMe>('/api/pea/admin/me'),
  getAdminAuditEvents: () => request<SystemAuditEvent[]>('/api/pea/admin/audit-events'),
  getAdminTenants: () => request<TenantRecord[]>('/api/pea/admin/tenants'),
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

    for await (const rawEvent of parseSseStream(response.body)) {
      const event = normalizeSseEvent(rawEvent);
      const data = event.data && typeof event.data === 'object'
        ? event.data as Record<string, unknown>
        : {};
      if (event.type === 'error') {
        throw new Error(typeof data.message === 'string' ? data.message : 'Ошибка локальной модели.');
      }
      if (event.type === 'text_delta') {
        const delta = typeof data.delta === 'string'
          ? data.delta
          : typeof data.text === 'string'
            ? data.text
            : '';
        if (delta) yield delta;
        continue;
      }
      if (event.type === 'citation' || event.type === 'citations') {
        const citationPayload = 'citations' in data ? data.citations : data;
        if (citationPayload !== undefined) {
          const encoded = JSON.stringify(citationPayload);
          for (const citation of parseCitationPayload(encoded)) {
            input.onCitation?.(citation as MessageCitation);
          }
        }
      }
      // PEA currently emits done; future usage/meta/heartbeat events remain non-text.
    }
  },
};
