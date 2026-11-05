export interface Project {
  id: string;
  tenant_id?: string;
  name: string;
  description: string | null;
  code: string | null;
  status?: string;
}
export interface MessageCitation {
  id?: string;
  title?: string;
  document_title?: string;
  source_fragment_id?: string;
  document_version_id?: string;
  page?: number;
  sheet?: string;
  excerpt?: string;
  url?: string;
  locator?: Record<string, unknown>;
}
export interface ChatMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string | null;
  createdAt: string;
  created_at?: string;
  citations?: MessageCitation[];
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

export interface DocumentRecord {
  id: string;
  title: string;
  document_type: string | null;
  status: string;
}
export interface DocumentVersion {
  id: string;
  document_id: string;
  original_filename: string;
  media_type: string;
  size_bytes: number;
  checksum_sha256: string;
  status: string;
  uploaded_at: string;
}
export interface SourceFragment {
  id: string;
  document_version_id: string;
  fragment_type: string;
  locator: Record<string, unknown>;
  excerpt: string | null;
  content_hash: string;
  extraction_method: string | null;
  quality: Record<string, unknown>;
}
export interface ProcessingArtifact {
  id: string;
  document_version_id: string;
  artifact_type: string;
  media_type: string | null;
  size_bytes: number | null;
  locator: Record<string, unknown>;
  checksum_sha256: string | null;
}
export interface ProcessingRun {
  id: string;
  document_version_id: string;
  pipeline_name: string;
  pipeline_version: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
}
export interface Review {
  id: string;
  document_version_id: string | null;
  title: string;
  scope: string;
  status: string;
  summary: string | null;
}
export interface Finding {
  id: string;
  review_id: string;
  classification: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  normative_reference: string | null;
  requirement_reference: string | null;
  recommendation: string | null;
}
export interface Evidence {
  id: string;
  finding_id: string;
  evidence_type: string;
  relation: string;
  source_fragment_id: string | null;
  excerpt: string | null;
  reference_label: string | null;
  reference_uri: string | null;
  locator: Record<string, unknown>;
}
