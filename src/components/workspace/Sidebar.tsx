"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ViewId } from "@/lib/types";

const NAV: { id: ViewId; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "RAG" },
  { id: "documents", label: "Corpus", hint: "Index" },
  { id: "memory", label: "Memory", hint: "Long" },
  { id: "session", label: "Session", hint: "Short" },
  { id: "policies", label: "Policies", hint: "Guards" },
  { id: "eval", label: "Eval", hint: "Proof" },
];

export function Sidebar() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeView = useWorkspaceStore((s) => s.activeView);
  const api = useWorkspaceStore((s) => s.api);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const refreshApiStatus = useWorkspaceStore((s) => s.refreshApiStatus);

  useEffect(() => {
    void refreshApiStatus();
    const id = window.setInterval(() => void refreshApiStatus(), 20000);
    return () => window.clearInterval(id);
  }, [refreshApiStatus]);

  return (
    <aside className="panel flex h-full w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl">
      <div className="relative overflow-hidden border-b border-[var(--line)] px-5 py-5">
        <div className="brand-glow pointer-events-none absolute inset-0" />
        <p className="relative font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
          RecallGuard
        </p>
        <p className="relative mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
          Guarded RAG with eval evidence.
        </p>
      </div>

      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">
          <span className="text-[11px] font-medium text-[var(--ink-soft)]">Backend</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                api.status === "online"
                  ? "bg-[var(--accent)]"
                  : api.status === "offline"
                    ? "bg-[var(--danger)]"
                    : "animate-pulse-soft bg-[var(--session)]",
              ].join(" ")}
            />
            {api.status === "online"
              ? `${api.chunkCount} chunks`
              : api.status === "offline"
                ? "offline"
                : "checking"}
          </span>
        </div>
      </div>

      <div className="border-b border-[var(--line)] px-4 py-4">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Projects
        </p>
        <div className="space-y-1">
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setActiveProject(project.id)}
                className={[
                  "w-full rounded-xl px-3 py-2.5 text-left transition",
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--ink)] hover:bg-white/70",
                ].join(" ")}
              >
                <span className="block text-sm font-medium">{project.name}</span>
                <span
                  className={[
                    "mt-0.5 block text-[11px] leading-snug",
                    active ? "text-white/80" : "text-[var(--ink-soft)]",
                  ].join(" ")}
                >
                  {project.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {NAV.map((item) => {
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={[
                "flex w-full items-baseline justify-between rounded-xl px-3 py-2.5 text-left transition",
                active
                  ? "bg-white text-[var(--accent-deep)] shadow-sm"
                  : "text-[var(--ink-soft)] hover:bg-white/60 hover:text-[var(--ink)]",
              ].join(" ")}
            >
              <span className="text-sm font-medium">{item.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                {item.hint}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
