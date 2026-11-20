"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { formatDateTime } from "@/lib/format";
import type { LayerId } from "@/lib/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const HINT_LAYERS: LayerId[] = ["rag", "memory", "session", "policy"];

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const messages = useWorkspaceStore((s) => s.messages);
  const composerHints = useWorkspaceStore((s) => s.composerHints);
  const session = useWorkspaceStore((s) => s.session);
  const chatBusy = useWorkspaceStore((s) => s.chatBusy);
  const api = useWorkspaceStore((s) => s.api);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const toggleComposerHint = useWorkspaceStore((s) => s.toggleComposerHint);
  const endConversation = useWorkspaceStore((s) => s.endConversation);
  const refreshApiStatus = useWorkspaceStore((s) => s.refreshApiStatus);

  const project = projects.find((p) => p.id === activeProjectId);
  const visibleMessages = messages.filter(
    (m) => m.role === "system" || m.projectId === activeProjectId,
  );

  useEffect(() => {
    void refreshApiStatus();
  }, [refreshApiStatus]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length, chatBusy]);

  async function submit() {
    const text = draft;
    setDraft("");
    await sendMessage(text);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Live RAG chat
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {project?.name ?? "Project"}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
            {session.conversationId}
            <span className="mx-2 opacity-40">·</span>
            <span
              className={
                api.status === "online"
                  ? "text-[var(--accent-deep)]"
                  : api.status === "offline"
                    ? "text-[var(--danger)]"
                    : ""
              }
            >
              api {api.status}
              {api.status === "online" ? ` · ${api.chunkCount} chunks` : ""}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={endConversation}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
        >
          End conversation
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5 scrollbar-thin">
        {visibleMessages.map((message, index) => {
          const isUser = message.role === "user";
          const isAssistant = message.role === "assistant";
          return (
            <article
              key={message.id}
              className={[
                "animate-rise max-w-[88%] rounded-2xl border px-4 py-3",
                isUser
                  ? "ml-auto border-[var(--accent)]/25 bg-[var(--accent)] text-white"
                  : message.error
                    ? "border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_8%,white)] text-[var(--danger)]"
                    : isAssistant
                      ? "border-[var(--line)] bg-white/90 text-[var(--ink)]"
                      : "border-[var(--line)] bg-white/70 text-[var(--ink)]",
              ].join(" ")}
              style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={[
                    "text-[10px] font-semibold uppercase tracking-wider",
                    isUser ? "text-white/70" : "text-[var(--ink-soft)]",
                  ].join(" ")}
                >
                  {isUser ? "You" : isAssistant ? "RecallGuard" : "System"}
                </span>
                {message.layerHints.map((layer) => (
                  <LayerBadge key={layer} layer={layer} />
                ))}
                {message.outputPolicy && (
                  <span
                    className={[
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      message.outputPolicy.allowed
                        ? "bg-[color-mix(in_oklab,var(--accent)_12%,white)] text-[var(--accent-deep)]"
                        : "bg-[color-mix(in_oklab,var(--danger)_12%,white)] text-[var(--danger)]",
                    ].join(" ")}
                  >
                    policy {message.outputPolicy.score.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              {isAssistant && message.sources && message.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {message.sources.slice(0, 4).map((source, i) => {
                    const label =
                      source.title ||
                      source.filename ||
                      source.url ||
                      `chunk ${source.chunkIndex ?? i}`;
                    return source.url ? (
                      <a
                        key={`${message.id}-src-${i}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-full truncate rounded-lg border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1 font-mono text-[10px] text-[var(--rag)] transition hover:border-[var(--rag)]/40"
                      >
                        {label}
                      </a>
                    ) : (
                      <span
                        key={`${message.id}-src-${i}`}
                        className="max-w-full truncate rounded-lg border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1 font-mono text-[10px] text-[var(--ink-soft)]"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
              <p
                className={[
                  "mt-2 font-mono text-[10px]",
                  isUser ? "text-white/60" : "text-[var(--ink-soft)]",
                ].join(" ")}
              >
                {formatDateTime(message.createdAt)}
              </p>
            </article>
          );
        })}
        {chatBusy && (
          <div className="animate-pulse-soft max-w-[60%] rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--ink-soft)]">
            Retrieving · generating · screening…
          </div>
        )}
      </div>

      <div className="border-t border-[var(--line)] px-6 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[var(--ink-soft)]">Layer tags</span>
          {HINT_LAYERS.map((layer) => (
            <LayerBadge
              key={layer}
              layer={layer}
              active={composerHints.includes(layer)}
              onClick={() => toggleComposerHint(layer)}
            />
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            disabled={chatBusy}
            placeholder="Ask about Ai Twin, Streamoji, pricing, features…"
            className="min-h-[72px] flex-1 resize-none rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-3 text-sm outline-none ring-[var(--accent)]/30 transition focus:ring-2 disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="submit"
            disabled={chatBusy || !draft.trim()}
            className="self-end rounded-2xl bg-[var(--accent-deep)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatBusy ? "…" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
