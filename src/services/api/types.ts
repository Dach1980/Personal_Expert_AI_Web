import type { ChatMessage, Conversation, Project, Session } from '../../types';

export interface SendMessageInput {
  tenantId: string;
  projectId: string;
  conversationId: string;
  content: string;
  signal?: AbortSignal;
}

export interface ExpertApi {\n  initializeAuth(): Promise<void>;\n  login(): Promise<void>;\n  logout(): void;
  getSession(): Promise<Session>;
  getProjects(): Promise<Project[]>;
  getConversations(tenantId: string, projectId: string): Promise<Conversation[]>;
  createConversation(tenantId: string, projectId: string): Promise<Conversation>;
  getMessages(tenantId: string, projectId: string, conversationId: string): Promise<ChatMessage[]>;
  sendMessage(input: SendMessageInput): AsyncIterable<string>;
}
