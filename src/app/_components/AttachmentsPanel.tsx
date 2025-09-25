"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const CATEGORY_OPTIONS = [
  { value: "Invoice", label: "Invoice" },
  { value: "Warranty", label: "Warranty" },
  { value: "Policy", label: "Policy" },
  { value: "Photo", label: "Photo" },
  { value: "Receipt", label: "Receipt" },
  { value: "Quote", label: "Quote" },
  { value: "Manual", label: "Manual" },
  { value: "Service", label: "Service Report" },
  { value: "Other", label: "Other" },
] as const;

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load documents");
    return res.json();
  });

type TargetType = "asset" | "task" | "warranty";

type AttachmentsPanelProps = {
  targetType: TargetType;
  targetId: string;
  heading?: string;
  description?: string;
  emptyState?: string;
};

type DocumentDto = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  documentDate: string | null;
  fileUrl: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleDateString();
}

export default function AttachmentsPanel({
  targetType,
  targetId,
  heading = "Attachments",
  description,
  emptyState = "No documents yet.",
}: AttachmentsPanelProps) {
  const query = useMemo(
    () => `/api/documents?targetType=${targetType}&targetId=${targetId}`,
    [targetType, targetId]
  );
  const { data, mutate, isLoading } = useSWR<{ documents: DocumentDto[] }>(query, fetcher);

  const documents = data?.documents ?? [];
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("Invoice");
  const [title, setTitle] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formEl = event.currentTarget;
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 10MB limit.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("targetType", targetType);
      formData.append("targetId", targetId);
      formData.append("category", category);
      if (title.trim()) formData.append("title", title.trim());
      if (descriptionText.trim()) formData.append("description", descriptionText.trim());
      if (documentDate) formData.append("documentDate", documentDate);
      formData.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to upload document");
      }

      formEl.reset();
      setTitle("");
      setDescriptionText("");
      setDocumentDate("");
      mutate();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const ok = window.confirm("Hide this document? You can restore it later if needed.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not remove document");
      }
      mutate();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not remove document");
    }
  }

  return (
    <section className="card" style={{ marginTop: "1.5rem" }}>
      <div className="card-header">
        <div className="card-title">{heading}</div>
        {description ? <div className="card-description">{description}</div> : null}
      </div>
      <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <form onSubmit={handleUpload} className="grid" style={{ gap: "0.75rem" }}>
          <div className="grid grid-3" style={{ gap: "0.75rem" }}>
            <label className="field">
              <span className="label">Type</span>
              <select
                className="border rounded p-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Document date</span>
              <input
                type="date"
                name="documentDate"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="border rounded p-2"
              />
            </label>
            <label className="field">
              <span className="label">Title</span>
              <input
                type="text"
                name="title"
                placeholder="Optional title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border rounded p-2"
              />
            </label>
          </div>

          <label className="field">
            <span className="label">Description</span>
            <input
              type="text"
              name="description"
              placeholder="Notes (optional)"
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              className="border rounded p-2"
            />
          </label>

          <label className="field">
            <span className="label">File</span>
            <input type="file" name="file" className="border rounded p-2" required />
            <small className="text-xs text-muted-foreground">Maximum size 10 MB.</small>
          </label>

          <div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        </form>

        <div>
          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-muted-foreground">{emptyState}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table" style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Document date</th>
                    <th>Uploaded</th>
                    <th>Size</th>
                    <th>Description</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.category}</td>
                      <td>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                          {doc.title}
                        </a>
                      </td>
                      <td>{formatDate(doc.documentDate)}</td>
                      <td>{formatDate(doc.createdAt)}</td>
                      <td>{formatFileSize(doc.fileSize)}</td>
                      <td>{doc.description || "--"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="text-sm text-red-600 flex items-center gap-1"
                          aria-label="Delete document"
                        >
                          <svg
                            aria-hidden="true"
                            focusable="false"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

