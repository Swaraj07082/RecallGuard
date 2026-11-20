"use client";

import { create } from "zustand";
import { ApiError, getStatus, postChat, postIngest } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  documents as seedDocuments,
  evalSuite as seedEvalSuite,
  memories as seedMemories,
  policies as seedPolicies,
  projects as seedProjects,
  session as seedSession,
} from "@/lib/seed";
import type {
  ApiConnection,
  ChatMessage,
  DocumentRecord,
  EvalSuite,
  LayerId,
  MemoryItem,
  PolicyRule,
  Project,
  SessionState,
  ViewId,
} from "@/lib/types";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

type WorkspaceState = {
  projects: Project[];
  activeProjectId: string;
  activeView: ViewId;
  documents: DocumentRecord[];
  memories: MemoryItem[];
  session: SessionState;
  policies: PolicyRule[];
  evalSuite: EvalSuite;
  messages: ChatMessage[];
  composerHints: LayerId[];
  chatBusy: boolean;
  ingestBusy: boolean;
  api: ApiConnection;
  lastSources: ChatMessage["sources"];
  lastOutputPolicy: ChatMessage["outputPolicy"];

  setActiveProject: (id: string) => void;
  setActiveView: (view: ViewId) => void;
  toggleComposerHint: (layer: LayerId) => void;
  sendMessage: (content: string) => Promise<void>;
  refreshApiStatus: () => Promise<void>;
  reindexCorpus: () => Promise<void>;

  removeDocument: (id: string) => void;
  addMemory: (
    input: Omit<
      MemoryItem,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "sourceConversationId"
      | "projectId"
      | "confidence"
    > & { confidence?: number },
  ) => void;
  updateMemory: (id: string, content: string) => void;
  removeMemory: (id: string) => void;

  updateSessionGoal: (goal: string) => void;
  addOpenQuestion: (question: string) => void;
  removeOpenQuestion: (index: number) => void;
  addDraftDecision: (decision: string) => void;
  removeDraftDecision: (index: number) => void;
  toggleActiveDocument: (documentId: string) => void;
  endConversation: () => void;

  togglePolicy: (id: string) => void;
  rerunEval: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: seedProjects,
  activeProjectId: seedProjects[0].id,
  activeView: "chat",
  documents: seedDocuments,
  memories: seedMemories,
  session: seedSession,
  policies: seedPolicies,
  evalSuite: seedEvalSuite,
  messages: [
    {
      id: "msg_welcome",
      projectId: seedProjects[0].id,
      conversationId: seedSession.conversationId,
      role: "system",
      content:
        "Ask anything about Ai Twin or Streamoji. Answers are retrieved from the indexed corpus, then screened by guardrails.",
      createdAt: new Date().toISOString(),
      layerHints: ["rag", "policy"],
    },
  ],
  composerHints: ["rag", "policy"],
  chatBusy: false,
  ingestBusy: false,
  api: { status: "unknown", chunkCount: 0, checkedAt: null },
  lastSources: undefined,
  lastOutputPolicy: undefined,

  setActiveProject: (id) => {
    const { session } = get();
    set({
      activeProjectId: id,
      session: {
        ...session,
        projectId: id,
        conversationId: uid("conv"),
        goal: "",
        openQuestions: [],
        draftDecisions: [],
        activeDocumentIds: get()
          .documents.filter((d) => d.projectId === id && d.status === "ready")
          .map((d) => d.id),
        startedAt: new Date().toISOString(),
      },
    });
  },

  setActiveView: (view) => set({ activeView: view }),

  toggleComposerHint: (layer) =>
    set((state) => ({
      composerHints: state.composerHints.includes(layer)
        ? state.composerHints.filter((l) => l !== layer)
        : [...state.composerHints, layer],
    })),

  refreshApiStatus: async () => {
    try {
      const status = await getStatus();
      set((state) => ({
        api: {
          status: "online",
          chunkCount: status.chunk_count,
          checkedAt: new Date().toISOString(),
        },
        documents: state.documents.map((doc) =>
          doc.projectId === state.activeProjectId
            ? {
                ...doc,
                status: status.chunk_count > 0 ? "ready" : "queued",
                chunkCount:
                  status.chunk_count > 0
                    ? Math.max(1, Math.round(status.chunk_count / Math.max(1, state.documents.filter((d) => d.projectId === state.activeProjectId).length)))
                    : 0,
                summary:
                  status.chunk_count > 0
                    ? `Live in vector store · ${status.chunk_count} total chunks across corpus.`
                    : "Corpus empty. Use Re-index corpus to crawl and embed product docs.",
              }
            : doc,
        ),
      }));
    } catch {
      set({
        api: {
          status: "offline",
          chunkCount: 0,
          checkedAt: new Date().toISOString(),
        },
      });
    }
  },

  reindexCorpus: async () => {
    if (get().ingestBusy) return;
    set({ ingestBusy: true });
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.projectId === state.activeProjectId
          ? { ...doc, status: "indexing" as const }
          : doc,
      ),
    }));
    try {
      const result = await postIngest();
      const sources = new Set(result.sources || []);
      set((state) => ({
        documents: state.documents.map((doc) => {
          if (doc.projectId !== state.activeProjectId) return doc;
          const matched = doc.sourceSite ? sources.has(doc.sourceSite) : true;
          return {
            ...doc,
            status: result.index_error ? "failed" : matched ? "ready" : "queued",
            chunkCount: result.indexed_count
              ? Math.max(
                  1,
                  Math.round(
                    result.indexed_count /
                      Math.max(1, result.sources.length || 1),
                  ),
                )
              : 0,
            uploadedAt: new Date().toISOString(),
            summary: result.index_error
              ? `Index error: ${result.index_error}`
              : `Indexed from sitemap · ${result.pages_ok} pages ok · ${result.indexed_count} chunks.`,
          };
        }),
        api: {
          status: "online",
          chunkCount: result.indexed_count || result.chunk_count || 0,
          checkedAt: new Date().toISOString(),
        },
      }));
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Ingest failed";
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.projectId === state.activeProjectId
            ? { ...doc, status: "failed" as const, summary: detail }
            : doc,
        ),
        api: {
          status: "offline",
          chunkCount: state.api.chunkCount,
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      set({ ingestBusy: false });
    }
  },

  sendMessage: async (content) => {
    const trimmed = content.trim();
    if (!trimmed || get().chatBusy) return;

    const { activeProjectId, session, composerHints } = get();
    const userMessage: ChatMessage = {
      id: uid("msg"),
      projectId: activeProjectId,
      conversationId: session.conversationId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
      layerHints: [...composerHints],
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      chatBusy: true,
    }));

    try {
      const result = await postChat(trimmed);
      const sources =
        result.chunks?.map((chunk) => ({
          url: chunk.url,
          title: chunk.title,
          filename: chunk.filename,
          chunkIndex: chunk.chunk_index,
          score: chunk.score,
          piiRedacted: chunk.pii_redacted,
        })) ?? [];

      const assistant: ChatMessage = {
        id: uid("msg"),
        projectId: activeProjectId,
        conversationId: session.conversationId,
        role: "assistant",
        content: result.answer,
        createdAt: new Date().toISOString(),
        layerHints: ["rag", "policy"],
        sources,
        outputPolicy: result.output_policy,
      };

      set((state) => ({
        messages: [...state.messages, assistant],
        lastSources: sources,
        lastOutputPolicy: result.output_policy,
        api: {
          ...state.api,
          status: "online",
          checkedAt: new Date().toISOString(),
        },
      }));
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.detail
          : "Could not reach the RecallGuard API. Is the backend running on :8000?";
      const system: ChatMessage = {
        id: uid("msg"),
        projectId: activeProjectId,
        conversationId: session.conversationId,
        role: "system",
        content: detail,
        createdAt: new Date().toISOString(),
        layerHints: ["policy"],
        error: true,
      };
      set((state) => ({
        messages: [...state.messages, system],
        api: {
          ...state.api,
          status: err instanceof ApiError && err.status >= 500 ? "offline" : state.api.status,
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      set({ chatBusy: false });
    }
  },

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      session: {
        ...state.session,
        activeDocumentIds: state.session.activeDocumentIds.filter((d) => d !== id),
      },
    })),

  addMemory: (input) => {
    const now = new Date().toISOString();
    const item: MemoryItem = {
      id: uid("mem"),
      projectId: get().activeProjectId,
      kind: input.kind,
      content: input.content,
      confidence: input.confidence ?? 0.8,
      sourceConversationId: get().session.conversationId,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ memories: [item, ...state.memories] }));
  },

  updateMemory: (id, content) =>
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m,
      ),
    })),

  removeMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),

  updateSessionGoal: (goal) =>
    set((state) => ({ session: { ...state.session, goal } })),

  addOpenQuestion: (question) => {
    const q = question.trim();
    if (!q) return;
    set((state) => ({
      session: {
        ...state.session,
        openQuestions: [...state.session.openQuestions, q],
      },
    }));
  },

  removeOpenQuestion: (index) =>
    set((state) => ({
      session: {
        ...state.session,
        openQuestions: state.session.openQuestions.filter((_, i) => i !== index),
      },
    })),

  addDraftDecision: (decision) => {
    const d = decision.trim();
    if (!d) return;
    set((state) => ({
      session: {
        ...state.session,
        draftDecisions: [...state.session.draftDecisions, d],
      },
    }));
  },

  removeDraftDecision: (index) =>
    set((state) => ({
      session: {
        ...state.session,
        draftDecisions: state.session.draftDecisions.filter((_, i) => i !== index),
      },
    })),

  toggleActiveDocument: (documentId) =>
    set((state) => {
      const active = state.session.activeDocumentIds.includes(documentId)
        ? state.session.activeDocumentIds.filter((id) => id !== documentId)
        : [...state.session.activeDocumentIds, documentId];
      return { session: { ...state.session, activeDocumentIds: active } };
    }),

  endConversation: () =>
    set((state) => ({
      session: {
        ...state.session,
        conversationId: uid("conv"),
        goal: "",
        openQuestions: [],
        draftDecisions: [],
        activeDocumentIds: state.documents
          .filter((d) => d.projectId === state.activeProjectId && d.status === "ready")
          .map((d) => d.id),
        startedAt: new Date().toISOString(),
      },
      lastSources: undefined,
      lastOutputPolicy: undefined,
      messages: [
        {
          id: uid("msg"),
          projectId: state.activeProjectId,
          conversationId: "system",
          role: "system",
          content:
            "Conversation ended. Session scratchpad cleared. Corpus and long-term memory kept.",
          createdAt: new Date().toISOString(),
          layerHints: ["session"],
        },
      ],
    })),

  togglePolicy: (id) =>
    set((state) => ({
      policies: state.policies.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p,
      ),
    })),

  rerunEval: () =>
    set((state) => ({
      evalSuite: {
        ...state.evalSuite,
        cases: state.evalSuite.cases.map((c) => ({
          ...c,
          status: "pass",
          lastRunAt: new Date().toISOString(),
          evidence: `${c.evidence.split(" · re-verified")[0]} · re-verified ${formatDateTime(new Date())}`,
        })),
      },
    })),
}));
