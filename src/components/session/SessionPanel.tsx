"use client";

import { FormEvent, useState } from "react";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { formatDateTime } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function SessionPanel() {
  const [question, setQuestion] = useState("");
  const [decision, setDecision] = useState("");
  const session = useWorkspaceStore((s) => s.session);
  const documents = useWorkspaceStore((s) => s.documents);
  const updateSessionGoal = useWorkspaceStore((s) => s.updateSessionGoal);
  const addOpenQuestion = useWorkspaceStore((s) => s.addOpenQuestion);
  const removeOpenQuestion = useWorkspaceStore((s) => s.removeOpenQuestion);
  const addDraftDecision = useWorkspaceStore((s) => s.addDraftDecision);
  const removeDraftDecision = useWorkspaceStore((s) => s.removeDraftDecision);
  const endConversation = useWorkspaceStore((s) => s.endConversation);

  const pinnedDocs = documents.filter((d) =>
    session.activeDocumentIds.includes(d.id),
  );

  function submitQuestion(e: FormEvent) {
    e.preventDefault();
    addOpenQuestion(question);
    setQuestion("");
  }

  function submitDecision(e: FormEvent) {
    e.preventDefault();
    addDraftDecision(decision);
    setDecision("");
  }

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
        <div>
          <div className="mb-2">
            <LayerBadge layer="session" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Session context
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
            Temporary working state for this conversation. Cleared when you end it.
          </p>
        </div>
        <button
          type="button"
          onClick={endConversation}
          className="rounded-xl border border-[var(--danger)]/30 bg-white px-4 py-2 text-sm text-[var(--danger)]"
        >
          Clear session
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-6 scrollbar-thin">
        <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Goal
          </p>
          <textarea
            value={session.goal}
            onChange={(e) => updateSessionGoal(e.target.value)}
            rows={2}
            placeholder="What are you trying to decide right now?"
            className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
          />
          <p className="mt-2 font-mono text-[11px] text-[var(--ink-soft)]">
            started {formatDateTime(session.startedAt)} · {session.conversationId}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Open questions
          </p>
          <ul className="mt-2 space-y-2">
            {session.openQuestions.map((q, index) => (
              <li
                key={`${q}-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-[var(--bg-1)] px-3 py-2 text-sm"
              >
                <span>{q}</span>
                <button
                  type="button"
                  onClick={() => removeOpenQuestion(index)}
                  className="text-xs text-[var(--ink-soft)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={submitQuestion} className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Add an open question"
              className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent-deep)] px-3 py-2 text-sm text-white"
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Draft decisions
          </p>
          <ul className="mt-2 space-y-2">
            {session.draftDecisions.map((d, index) => (
              <li
                key={`${d}-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-[var(--bg-1)] px-3 py-2 text-sm"
              >
                <span>{d}</span>
                <button
                  type="button"
                  onClick={() => removeDraftDecision(index)}
                  className="text-xs text-[var(--ink-soft)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={submitDecision} className="mt-3 flex gap-2">
            <input
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Add a draft decision"
              className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent-deep)] px-3 py-2 text-sm text-white"
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Pinned RAG documents
          </p>
          {pinnedDocs.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              None pinned. Pin from Documents to scope retrieval for this session.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {pinnedDocs.map((doc) => (
                <li key={doc.id} className="text-sm">
                  {doc.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
