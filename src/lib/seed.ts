import type {
  DocumentRecord,
  EvalSuite,
  MemoryItem,
  PolicyRule,
  Project,
  SessionState,
} from "./types";

export const projects: Project[] = [
  {
    id: "proj_product",
    name: "Product Knowledge",
    description: "Live RAG over Ai Twin and Streamoji Avatars docs.",
    updatedAt: "2026-11-20T12:00:00.000Z",
  },
];

export const documents: DocumentRecord[] = [
  {
    id: "doc_aitwin",
    projectId: "proj_product",
    name: "aitwin.me",
    sizeLabel: "sitemap",
    status: "queued",
    chunkCount: 0,
    uploadedAt: "2026-11-20T12:00:00.000Z",
    summary: "Product site corpus. Run Re-index to crawl and embed pages.",
    url: "https://aitwin.me",
    sourceSite: "aitwin.me",
  },
  {
    id: "doc_streamoji",
    projectId: "proj_product",
    name: "avatars.streamoji.com",
    sizeLabel: "sitemap",
    status: "queued",
    chunkCount: 0,
    uploadedAt: "2026-11-20T12:00:00.000Z",
    summary: "Avatar product docs. Indexed via the RecallGuard crawl pipeline.",
    url: "https://avatars.streamoji.com",
    sourceSite: "avatars.streamoji.com",
  },
];

export const memories: MemoryItem[] = [
  {
    id: "mem_1",
    projectId: "proj_product",
    kind: "preference",
    content: "Prefer concise answers with cited page URLs.",
    confidence: 0.92,
    sourceConversationId: "conv_seed",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
];

export const session: SessionState = {
  conversationId: "conv_live",
  projectId: "proj_product",
  goal: "Ask grounded questions about Ai Twin and Streamoji.",
  openQuestions: [],
  draftDecisions: [],
  activeDocumentIds: ["doc_aitwin", "doc_streamoji"],
  startedAt: new Date().toISOString(),
};

export const policies: PolicyRule[] = [
  {
    id: "pol_1",
    name: "Query PII block",
    description: "Reject user messages that contain emails, phones, SSNs, or cards.",
    scope: "rag",
    effect: "deny",
    enabled: true,
  },
  {
    id: "pol_2",
    name: "Prompt injection block",
    description: "Reject instruction-override and exfiltration-style queries.",
    scope: "rag",
    effect: "deny",
    enabled: true,
  },
  {
    id: "pol_3",
    name: "Chunk PII redact",
    description: "Mask PII in retrieved chunks before they reach the generator.",
    scope: "rag",
    effect: "allow",
    enabled: true,
  },
  {
    id: "pol_4",
    name: "Output policy screen",
    description: "Score answers for leaks and secrets; refuse or redact before return.",
    scope: "export",
    effect: "deny",
    enabled: true,
  },
];

export const evalSuite: EvalSuite = {
  id: "suite_core",
  name: "RAG + guardrail suite",
  description:
    "Offline DeepEval metrics plus online triad sampling. Guardrails run on every chat turn.",
  cases: [
    {
      id: "ev_1",
      name: "Faithfulness on golden set",
      layer: "eval",
      assertion: "Answers stay grounded in retrieved context chunks.",
      status: "pass",
      evidence: "backend/eval/faithfulness.py + golden_dataset.json",
      lastRunAt: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "ev_2",
      name: "Answer relevancy",
      layer: "eval",
      assertion: "Generated answers address the user question.",
      status: "pass",
      evidence: "backend/eval/answerRelevancy.py",
      lastRunAt: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "ev_3",
      name: "Contextual relevancy / precision / recall",
      layer: "rag",
      assertion: "Retrieved context is relevant and complete enough for the question.",
      status: "pass",
      evidence: "contextual* metrics + regression_test.py",
      lastRunAt: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "ev_4",
      name: "Online RAG triad sample",
      layer: "eval",
      assertion: "Sampled live turns score contextual relevancy, faithfulness, answer relevancy.",
      status: "pass",
      evidence: "online_eval.run_rag_triad → Langfuse scores",
      lastRunAt: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "ev_5",
      name: "Guardrail path live",
      layer: "policy",
      assertion: "Chat path enforces PII, injection, chunk redact, and output screening.",
      status: "pass",
      evidence: "agent.chat → guardrails package on every /chat turn",
      lastRunAt: "2026-11-20T12:00:00.000Z",
    },
  ],
};
