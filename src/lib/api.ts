const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export type ApiChunk = {
  text: string;
  score?: number;
  doc_id?: string;
  filename?: string;
  url?: string;
  source_site?: string;
  title?: string;
  chunk_index?: number;
  pii_redacted?: string[];
};

export type OutputPolicy = {
  allowed: boolean;
  score: number;
  findings: string[];
};

export type ChatResponse = {
  answer: string;
  chunks: ApiChunk[];
  output_policy: OutputPolicy;
};

export type IngestResponse = {
  sitemaps: string[];
  pages_ok: number;
  pages_failed: number;
  chunk_count: number;
  indexed_count: number;
  sources: string[];
  index_error?: string;
};

export type StatusResponse = {
  status: string;
  chunk_count: number;
};

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText || "Request failed";
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
    else if (Array.isArray(body?.detail)) detail = JSON.stringify(body.detail);
  } catch {
  }
  return new ApiError(res.status, detail);
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw await parseError(res);
  const health = (await res.json()) as { status: string };
  let chunk_count = 0;
  try {
    const statusRes = await fetch(`${API_BASE}/status`, { cache: "no-store" });
    if (statusRes.ok) {
      const data = (await statusRes.json()) as StatusResponse;
      chunk_count = data.chunk_count ?? 0;
    }
  } catch {
  }
  return { status: health.status || "ok", chunk_count };
}

export async function postChat(message: string, k = 4): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, k }),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ChatResponse;
}

export async function postIngest(): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/ingest`, { method: "POST" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as IngestResponse;
}

export { API_BASE };
