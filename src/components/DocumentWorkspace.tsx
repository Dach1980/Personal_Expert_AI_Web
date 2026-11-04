import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Upload, Eye, Layers3, ShieldCheck } from 'lucide-react';
import { apiClient } from '../services/api/client';
import type {
  DocumentRecord,
  DocumentVersion,
  Evidence,
  Finding,
  ProcessingArtifact,
  ProcessingRun,
  Review,
  SourceFragment,
} from '../types';
import type { Project } from '../types';

type FindingEvidence = { finding: Finding; evidence: Evidence[] };

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
};

export function DocumentWorkspace({ tenantId, project }: { tenantId: string; project: Project }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [fragments, setFragments] = useState<SourceFragment[]>([]);
  const [artifacts, setArtifacts] = useState<ProcessingArtifact[]>([]);
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [findingEvidence, setFindingEvidence] = useState<FindingEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? null;
  const selectedVersion = versions.find((item) => item.id === selectedVersionId) ?? null;

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getDocuments(tenantId, project.id);
      setDocuments(result);
      setSelectedDocumentId((current) =>
        current && result.some((item) => item.id === current) ? current : result[0]?.id ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить документы.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
    setVersions([]);
    setSelectedVersionId(null);
    setFragments([]);
    setArtifacts([]);
    setRuns([]);
    setPreviewUrl(null);
  }, [tenantId, project.id]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedDocumentId) {
        setVersions([]);
        setSelectedVersionId(null);
        return;
      }
      try {
        const result = await apiClient.getVersions(tenantId, project.id, selectedDocumentId);
        if (!active) return;
        setVersions(result);
        setSelectedVersionId((current) =>
          current && result.some((item) => item.id === current) ? current : result[0]?.id ?? null,
        );
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить версии.');
      }
    };
    void load();
    return () => { active = false; };
  }, [tenantId, project.id, selectedDocumentId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedDocumentId || !selectedVersionId) {
        setFragments([]);
        setArtifacts([]);
        setRuns([]);
        return;
      }
      try {
        const [fragmentRows, artifactRows, processingRows] = await Promise.all([
          apiClient.getFragments(tenantId, project.id, selectedDocumentId, selectedVersionId),
          apiClient.getArtifacts(tenantId, project.id, selectedDocumentId, selectedVersionId),
          apiClient.getProcessingRuns(tenantId, project.id, selectedDocumentId, selectedVersionId),
        ]);
        if (!active) return;
        setFragments(fragmentRows);
        setArtifacts(artifactRows);
        setRuns(processingRows);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить результаты обработки.');
      }
    };
    void load();
    return () => { active = false; };
  }, [tenantId, project.id, selectedDocumentId, selectedVersionId]);

  useEffect(() => {
    let active = true;
    const loadEvidence = async () => {
      try {
        const reviewRows: Review[] = await apiClient.getReviews(tenantId, project.id);
        const findingsByReview = await Promise.all(
          reviewRows.map(async (review) => ({
            review,
            findings: await apiClient.getFindings(tenantId, project.id, review.id),
          })),
        );
        const rows = await Promise.all(
          findingsByReview.flatMap(({ findings }) =>
            findings.map(async (finding) => ({
              finding,
              evidence: await apiClient.getEvidence(tenantId, project.id, finding.id),
            })),
          ),
        );
        if (active) setFindingEvidence(rows);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить evidence.');
      }
    };
    void loadEvidence();
    return () => { active = false; };
  }, [tenantId, project.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadFile = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      let documentId = selectedDocumentId;
      if (!documentId) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const created = await apiClient.createDocument(
          tenantId,
          project.id,
          file.name,
          extension || undefined,
        );
        documentId = created.id;
        setDocuments((old) => [created, ...old]);
        setSelectedDocumentId(created.id);
      }
      const version = await apiClient.uploadDocumentVersion(
        tenantId,
        project.id,
        documentId,
        file,
        crypto.randomUUID(),
      );
      await apiClient.enqueueProcessing(
        tenantId,
        project.id,
        documentId,
        version.id,
        crypto.randomUUID(),
      );
      await loadDocuments();
      setSelectedDocumentId(documentId);
      setSelectedVersionId(version.id);
      const [versionRows, fragmentRows, artifactRows, processingRows] = await Promise.all([
        apiClient.getVersions(tenantId, project.id, documentId),
        apiClient.getFragments(tenantId, project.id, documentId, version.id),
        apiClient.getArtifacts(tenantId, project.id, documentId, version.id),
        apiClient.getProcessingRuns(tenantId, project.id, documentId, version.id),
      ]);
      setVersions(versionRows);
      setFragments(fragmentRows);
      setArtifacts(artifactRows);
      setRuns(processingRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить документ.');
    } finally {
      setUploading(false);
    }
  };

  const showArtifact = async (artifact: ProcessingArtifact) => {
    if (!selectedDocumentId || !selectedVersionId) return;
    try {
      const blob = await apiClient.getArtifactContent(
        tenantId,
        project.id,
        selectedDocumentId,
        selectedVersionId,
        artifact.id,
      );
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewType(blob.type || artifact.media_type || 'application/octet-stream');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось открыть артефакт.');
    }
  };

  const visibleEvidence = findingEvidence.filter(({ evidence }) =>
    evidence.some((item) => !item.source_fragment_id || fragments.some((fragment) => fragment.id === item.source_fragment_id)),
  );

  return (
    <section className="panel document-workspace">
      <div className="document-heading">
        <div>
          <h2>Документация проекта</h2>
          <p>{project.name} · документы, версии, обработка и доказательства</p>
        </div>
        <label className="upload-button">
          <Upload size={15} /> {uploading ? 'Загрузка…' : 'Загрузить файл'}
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.pptx,.txt,.md"
            disabled={uploading}
            onChange={(event) => {
              void uploadFile(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {error && <p className="document-error" role="alert">{error}</p>}

      <div className="document-grid">
        <div className="document-list">
          <div className="document-subheading">
            <b>Документы</b>
            <button className="icon-button" onClick={() => void loadDocuments()} title="Обновить"><RefreshCw size={14} /></button>
          </div>
          {loading && <p className="muted">Загрузка…</p>}
          {!loading && !documents.length && <p className="muted">В проекте пока нет документов.</p>}
          {documents.map((document) => (
            <button
              key={document.id}
              className={selectedDocumentId === document.id ? 'document-item selected' : 'document-item'}
              onClick={() => {
                setSelectedDocumentId(document.id);
                setSelectedVersionId(null);
                setPreviewUrl(null);
              }}
            >
              <FileText size={16} />
              <span><b>{document.title}</b><small>{document.status} · {document.document_type ?? 'тип не указан'}</small></span>
            </button>
          ))}
        </div>

        <div className="document-detail">
          {!selectedDocument && <p className="muted">Выберите документ или загрузите новый файл.</p>}
          {selectedDocument && (
            <>
              <div className="document-subheading">
                <b>{selectedDocument.title}</b>
                <span className="status-chip">{selectedDocument.status}</span>
              </div>
              <div className="version-row">
                <span>Версии</span>
                <select
                  value={selectedVersionId ?? ''}
                  onChange={(event) => {
                    setSelectedVersionId(event.target.value || null);
                    setPreviewUrl(null);
                  }}
                >
                  {!versions.length && <option value="">Нет версий</option>}
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.original_filename} · {version.status}
                    </option>
                  ))}
                </select>
              </div>
              {selectedVersion && (
                <div className="version-meta">
                  <span>{formatBytes(selectedVersion.size_bytes)}</span>
                  <span>{selectedVersion.media_type}</span>
                  <span>SHA-256: {selectedVersion.checksum_sha256.slice(0, 16)}…</span>
                </div>
              )}
            </>
          )}

          {selectedVersion && (
            <>
              <div className="document-subheading"><b><Layers3 size={14} /> Обработка</b></div>
              {!runs.length && <p className="muted">Очередь обработки ещё не вернула результат.</p>}
              {runs.map((run) => (
                <div className="processing-row" key={run.id}>
                  <span>{run.pipeline_name} · {run.pipeline_version}</span>
                  <span className="status-chip">{run.status}</span>
                  {run.error_message && <small className="document-error">{run.error_message}</small>}
                </div>
              ))}

              <div className="document-subheading"><b>Фрагменты источника ({fragments.length})</b></div>
              {!fragments.length && <p className="muted">Фрагменты появятся после обработки документа.</p>}
              {fragments.map((fragment) => (
                <article className="fragment-card" key={fragment.id}>
                  <div><b>{fragment.fragment_type}</b><small>{fragment.extraction_method ?? 'метод не указан'} · {fragment.content_hash.slice(0, 14)}…</small></div>
                  {fragment.excerpt && <p>{fragment.excerpt}</p>}
                  <details><summary>Locator / координаты</summary><pre>{JSON.stringify(fragment.locator, null, 2)}</pre></details>
                </article>
              ))}

              <div className="document-subheading"><b>Артефакты ({artifacts.length})</b></div>
              {artifacts.map((artifact) => (
                <div className="artifact-row" key={artifact.id}>
                  <span>{artifact.artifact_type} · {artifact.media_type ?? 'binary'}</span>
                  <button className="icon-button" onClick={() => void showArtifact(artifact)} title="Открыть артефакт"><Eye size={14} /></button>
                </div>
              ))}
              {previewUrl && (
                <div className="artifact-preview">
                  <div className="document-subheading"><b>Просмотр артефакта</b><button className="icon-button" onClick={() => setPreviewUrl(null)}>Закрыть</button></div>
                  {previewType?.startsWith('image/') ? (
                    <img src={previewUrl} alt="Артефакт обработки документа" />
                  ) : (
                    <iframe src={previewUrl} title="Артефакт обработки документа" />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="evidence-section">
        <div className="document-subheading"><b><ShieldCheck size={14} /> Evidence и замечания</b></div>
        {!visibleEvidence.length && <p className="muted">Для проекта пока нет связанных доказательств или замечаний.</p>}
        {visibleEvidence.map(({ finding, evidence }) => (
          <article className="finding-card" key={finding.id}>
            <div className="finding-title">
              <b>{finding.title}</b>
              <span className="status-chip">{finding.severity} · {finding.status}</span>
            </div>
            <p>{finding.description}</p>
            {finding.normative_reference && <small>Нормативная ссылка: {finding.normative_reference}</small>}
            {evidence.map((item) => (
              <div className="evidence-item" key={item.id}>
                <b>{item.evidence_type} · {item.relation}</b>
                {item.excerpt && <p>{item.excerpt}</p>}
                {item.reference_uri && <a href={item.reference_uri} target="_blank" rel="noreferrer">{item.reference_label ?? item.reference_uri}</a>}
                {item.source_fragment_id && <small>SourceFragment: {item.source_fragment_id}</small>}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
