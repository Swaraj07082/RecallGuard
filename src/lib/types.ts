export type LayerId = "rag" | "memory" | "session" | "policy" | "eval";

export type ViewId =
  | "chat"
  | "documents"
  | "memory"
  | "session"
  | "policies"
  | "eval";

export type Project = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
};

export type DocumentRecord = {
  id: string;
  projectId: string;
  name: string;
  sizeLabel: string;
  status: "queued" | "indexing" | "ready" | "failed";
  chunkCount: number;
  uploadedAt: string;
  summary: string;
  url?: string;
  sourceSite?: string;
};

export type MemoryItem = {
  id: string;
  projectId: string;
  kind: "preference" | "decision" | "fact" | "person";
  content: string;
  confidence: number;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionState = {
  conversationId: string;
  projectId: string;
  goal: string;
  openQuestions: string[];
  draftDecisions: string[];
  activeDocumentIds: string[];
  startedAt: string;
};

export type PolicyRule = {
  id: string;
  name: string;
  description: string;
  scope: "rag" | "memory" | "tools" | "export";
  effect: "allow" | "deny";
  enabled: boolean;
};

export type ChatSource = {
  url?: string;
  title?: string;
  filename?: string;
  chunkIndex?: number;
  score?: number;
  piiRedacted?: string[];
};

export type ChatOutputPolicy = {
  allowed: boolean;
  score: number;
  findings: string[];
};

export type ChatMessage = {
  id: string;
  projectId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  layerHints: LayerId[];
  sources?: ChatSource[];
  outputPolicy?: ChatOutputPolicy;
  error?: boolean;
};

export type EvalCase = {
  id: string;
  name: string;
  layer: LayerId;
  assertion: string;
  status: "pass" | "fail" | "pending";
  evidence: string;
  lastRunAt: string;
};

export type EvalSuite = {
  id: string;
  name: string;
  description: string;
  cases: EvalCase[];
};

export type ApiConnection = {
  status: "unknown" | "online" | "offline";
  chunkCount: number;
  checkedAt: string | null;
};
