"use client";

import { FormEvent, useState } from "react";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { formatDateTime } from "@/lib/format";
import type { MemoryItem } from "@/lib/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function MemoryPanel() {
  const [kind, setKind] = useState<MemoryItem["kind"]>("preference");
  const [content, setContent] = useState("");
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const memories = useWorkspaceStore((s) => s.memories);
  const addMemory = useWorkspaceStore((s) => s.addMemory);
  const updateMemory = useWorkspaceStore((s) => s.updateMemory);
  const removeMemory = useWorkspaceStore((s) => s.removeMemory);

  const projectMemories = memories.filter((m) => m.projectId === activeProjectId);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    addMemory({ kind, content: content.trim() });
    setContent("");
  }

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col rounded-2xl">
      <header className="border-b border-[var(--line)] px-6 py-4">
        <div className="mb-2">
          <LayerBadge layer="memory" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Memory
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
          Facts learned about the user across conversations. Survives session end.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-2 border-b border-[var(--line)] px-6 py-4"
      >
        <label className="text-xs text-[var(--ink-soft)]">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MemoryItem["kind"])}
            className="mt-1 block rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            <option value="preference">Preference</option>
            <option value="decision">Decision</option>
            <option value="fact">Fact</option>
            <option value="person">Person</option>
          </select>
        </label>
        <label className="min-w-[240px] flex-1 text-xs text-[var(--ink-soft)]">
          Content
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Prefer cited clause numbers"
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-[var(--accent-deep)] px-4 py-2 text-sm font-medium text-white"
        >
          Save memory
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {projectMemories.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No long-term memories yet.</p>
        ) : (
          <ul className="space-y-3">
            {projectMemories.map((item) => (
              <li
                key={item.id}
                className="animate-rise rounded-2xl border border-[var(--line)] bg-white/75 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[color-mix(in_oklab,var(--memory)_12%,white)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--memory)]">
                    {item.kind}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                    confidence {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <textarea
                  value={item.content}
                  onChange={(e) => updateMemory(item.id, e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-transparent bg-transparent text-sm leading-relaxed outline-none focus:border-[var(--line)] focus:bg-white"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] text-[var(--ink-soft)]">
                    from {item.sourceConversationId} · updated{" "}
                    {formatDateTime(item.updatedAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMemory(item.id)}
                    className="text-xs text-[var(--danger)]"
                  >
                    Forget
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
