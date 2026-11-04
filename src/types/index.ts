export interface Project {
  id: string;
  tenant_id?: string;
  name: string;
  description: string | null;
  code: string | null;
  status?: string;
}
export interface ChatMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string | null;
  createdAt: string;
  created_at?: string;
}
export interface Conversation {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface Session {
  authenticated: boolean;
  userId?: string;
  displayName?: string;
  tenantId?: string;
}
