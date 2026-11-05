import type { ChatMessage, Conversation, DocumentRecord, DocumentVersion, Evidence, Finding, MessageCitation, ProcessingArtifact, ProcessingRun, Project, Review, Session, SourceFragment } from '../../types';

export interface SendMessageInput {
  tenantId: string;
  projectId: string;
  conversationId: string;
  content: string;
  signal?: AbortSignal;
  onCitation?: (citation: MessageCitation) => void;
}

export interface ExpertApi {
  initializeAuth(): Promise<void>;
  login(): Promise<void>;
  logout(): void;
  getSession(): Promise<Session>;
  getProjects(): Promise<Project[]>;
  getConversations(tenantId: string, projectId: string): Promise<Conversation[]>;
  createConversation(tenantId: string, projectId: string): Promise<Conversation>;
  getMessages(tenantId: string, projectId: string, conversationId: string): Promise<ChatMessage[]>;
  getDocuments(tenantId: string, projectId: string): Promise<DocumentRecord[]>;
  createDocument(tenantId: string, projectId: string, title: string, documentType?: string): Promise<DocumentRecord>;
  uploadDocumentVersion(tenantId: string, projectId: string, documentId: string, file: File, idempotencyKey: string): Promise<DocumentVersion>;
  getVersions(tenantId: string, projectId: string, documentId: string): Promise<DocumentVersion[]>;
  getFragments(tenantId: string, projectId: string, documentId: string, versionId: string): Promise<SourceFragment[]>;
  getArtifacts(tenantId: string, projectId: string, documentId: string, versionId: string): Promise<ProcessingArtifact[]>;
  getProcessingRuns(tenantId: string, projectId: string, documentId: string, versionId: string): Promise<ProcessingRun[]>;
  enqueueProcessing(tenantId: string, projectId: string, documentId: string, versionId: string, idempotencyKey: string): Promise<ProcessingRun>;
  getReviews(tenantId: string, projectId: string): Promise<Review[]>;
  getFindings(tenantId: string, projectId: string, reviewId: string): Promise<Finding[]>;
  getEvidence(tenantId: string, projectId: string, findingId: string): Promise<Evidence[]>;
  getArtifactContent(tenantId: string, projectId: string, documentId: string, versionId: string, artifactId: string): Promise<Blob>;
  sendMessage(input: SendMessageInput): AsyncIterable<string>;
}
