"use client";

import { useEffect } from "react";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { formatDateTime } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function DocumentsPanel() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const documents = useWorkspaceStore((s) => s.documents);
  const session = useWorkspaceStore((s) => s.session);
  const ingestBusy = useWorkspaceStore((s) => s.ingestBusy);
  const api = useWorkspaceStore((s) => s.api);
  const removeDocument = useWorkspaceStore((s) => s.removeDocument);
  const toggleActiveDocument = useWorkspaceStore((s) => s.toggleActiveDocument);
  const reindexCorpus = useWorkspaceStore((s) => s.reindexCorpus);
  const refreshApiStatus = useWorkspaceStore((s) => s.refreshApiStatus);

  const projectDocs = documents.filter((d) => d.projectId === activeProjectId);

  useEffect(() => {
    void refreshApiStatus();
  }, [refreshApiStatus]);

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
        <div>
          <div className="mb-2">
            <LayerBadge layer="rag" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            RAG corpus
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
            Product sites crawled into Chroma. Re-index rebuilds embeddings from sitemaps.
          </p>
          <p className="mt-2 font-mono text-[11px] text-[var(--ink-soft)]">
            API {api.status}
            {api.status === "online" ? ` · ${api.chunkCount} chunks indexed` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={ingestBusy}
          onClick={() => void reindexCorpus()}
          className="rounded-2xl bg-[var(--accent-deep)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
        >
          {ingestBusy ? "Indexing…" : "Re-index corpus"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {projectDocs.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No corpus sources configured.</p>
        ) : (
          <ul className="space-y-3">
            {projectDocs.map((doc) => {
              const inSession = session.activeDocumentIds.includes(doc.id);
              return (
                <li
                  key={doc.id}
                  className="animate-rise rounded-2xl border border-[var(--line)] bg-white/75 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{doc.summary}</p>
                      <p className="mt-2 font-mono text-[11px] text-[var(--ink-soft)]">
                        {doc.sizeLabel} · {doc.chunkCount} chunks ·{" "}
                        {formatDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={[
                          "rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                          doc.status === "ready"
                            ? "bg-[color-mix(in_oklab,var(--accent)_14%,white)] text-[var(--accent-deep)]"
                            : doc.status === "indexing"
                              ? "animate-pulse-soft bg-[color-mix(in_oklab,var(--session)_14%,white)] text-[var(--session)]"
                              : doc.status === "failed"
                                ? "bg-[color-mix(in_oklab,var(--danger)_12%,white)] text-[var(--danger)]"
                                : "bg-black/5 text-[var(--ink-soft)]",
                        ].join(" ")}
                      >
                        {doc.status}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={doc.status !== "ready"}
                          onClick={() => toggleActiveDocument(doc.id)}
                          className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs disabled:opacity-40"
                        >
                          {inSession ? "Unpin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--danger)]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
