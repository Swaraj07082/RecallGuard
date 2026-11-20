"use client";

import { LayerBadge } from "@/components/ui/LayerBadge";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function Inspector() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const documents = useWorkspaceStore((s) => s.documents);
  const memories = useWorkspaceStore((s) => s.memories);
  const session = useWorkspaceStore((s) => s.session);
  const policies = useWorkspaceStore((s) => s.policies);
  const evalSuite = useWorkspaceStore((s) => s.evalSuite);
  const api = useWorkspaceStore((s) => s.api);
  const lastSources = useWorkspaceStore((s) => s.lastSources);
  const lastOutputPolicy = useWorkspaceStore((s) => s.lastOutputPolicy);

  const projectDocs = documents.filter((d) => d.projectId === activeProjectId);
  const projectMemories = memories.filter((m) => m.projectId === activeProjectId);
  const enabledPolicies = policies.filter((p) => p.enabled);
  const passCount = evalSuite.cases.filter((c) => c.status === "pass").length;

  return (
    <aside className="panel flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Live layers
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          System boundary
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <section className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <LayerBadge layer="rag" />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              {api.chunkCount} chunks
            </span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Vector corpus from product sitemaps. API {api.status}.
          </p>
          <ul className="mt-2 space-y-1">
            {projectDocs.slice(0, 3).map((doc) => (
              <li key={doc.id} className="truncate text-xs text-[var(--ink)]">
                {doc.name}
              </li>
            ))}
          </ul>
        </section>

        {lastSources && lastSources.length > 0 && (
          <section className="animate-rise rounded-xl border border-[var(--line)] bg-white/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Last retrieval
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                {lastSources.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {lastSources.slice(0, 4).map((source, i) => (
                <li key={`src-${i}`} className="truncate text-xs text-[var(--rag)]">
                  {source.title || source.filename || source.url || `chunk ${i}`}
                </li>
              ))}
            </ul>
            {lastOutputPolicy && (
              <p className="mt-2 font-mono text-[10px] text-[var(--ink-soft)]">
                output score {lastOutputPolicy.score.toFixed(2)}
                {lastOutputPolicy.findings.length
                  ? ` · ${lastOutputPolicy.findings.join(", ")}`
                  : " · clean"}
              </p>
            )}
          </section>
        )}

        <section className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <LayerBadge layer="memory" />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              {projectMemories.length} items
            </span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Preferences kept across conversations (local workspace).
          </p>
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <LayerBadge layer="session" />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              {session.openQuestions.length} open
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            {session.goal || "No active goal in short-term context."}
          </p>
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <LayerBadge layer="policy" />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              {enabledPolicies.length}/{policies.length} on
            </span>
          </div>
          <ul className="space-y-1.5">
            {policies.slice(0, 4).map((policy) => (
              <li
                key={policy.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate">{policy.name}</span>
                <span
                  className={
                    policy.enabled
                      ? policy.effect === "deny"
                        ? "text-[var(--danger)]"
                        : "text-[var(--accent)]"
                      : "text-[var(--ink-soft)]"
                  }
                >
                  {policy.enabled ? policy.effect : "off"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <LayerBadge layer="eval" />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
              {passCount}/{evalSuite.cases.length} pass
            </span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Offline metrics + online triad sampling on chat turns.
          </p>
        </section>
      </div>
    </aside>
  );
}
