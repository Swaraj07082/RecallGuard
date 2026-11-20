# RecallGuard

A hands-on project for learning **production-style RAG guardrails and evaluation**.

RecallGuard is a single-turn RAG chatbot over product docs (Ai Twin + Streamoji), with:

- **Input guardrails** — block query PII and prompt-injection attempts
- **Context guardrails** — redact PII in retrieved chunks before generation
- **Output screening** — score the model answer against a policy (prompt leak, secrets, jailbreak ack, output PII)
- **Offline evals** — DeepEval metrics on a golden set (faithfulness, answer relevancy, contextual precision/recall/relevancy)
- **Online evals** — sampled live turns scored with the RAG triad and optionally sent to Langfuse
- **UI workspace** — Next.js front end wired to the FastAPI RAG API

Built to practice the full loop: retrieve → guard → generate → screen → evaluate.

## Architecture

```text
User message
  → PII block + injection block
  → retrieve (Chroma) + rerank
  → redact chunk PII
  → generate (Groq)
  → output policy screen
  → answer (+ optional online eval sample)
```

| Layer | What it does |
|--------|----------------|
| `backend/guardrails/` | Query PII, injection, chunk redact, output policy |
| `backend/retriever.py` + `reranker.py` | Vector search + cross-encoder rerank |
| `backend/generator.py` | Context-grounded answer generation |
| `backend/eval/` | Offline metrics, regression, online triad |
| `src/` | Workspace UI (chat, corpus, policies, eval) |

## Quick start

### 1. Backend

```bash
pip install -r backend/requirements.txt
cp .env.example .env
# set GROQ_API_KEY in .env

uvicorn backend.main:app --reload --port 8000
```

Optional first index (crawls product sitemaps into Chroma):

```bash
curl -X POST http://localhost:8000/ingest
```

### 2. Frontend

```bash
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `GET` | `/status` | Indexed chunk count |
| `POST` | `/chat` | Guarded RAG turn |
| `POST` | `/query` | Same pipeline with query echo |
| `POST` | `/ingest` | Clear store, crawl sitemaps, re-index |

## Guardrails (what to look at)

1. **Query PII** — `backend/guardrails/pii.py` → block before retrieve  
2. **Prompt injection** — `backend/guardrails/injection.py` → block before retrieve  
3. **Chunk PII** — `sanitize_chunks()` after retrieve, before generate  
4. **Output policy** — `backend/guardrails/output_policy.py` → score/refuse/redact before return  

## Evals (what to look at)

- Offline scripts under `backend/eval/` (`faithfulness.py`, `answerRelevancy.py`, contextual metrics, `regression_test.py`)
- Golden cases in `backend/eval/golden_dataset.json`
- Online sampling in `backend/eval/online_eval.py` (set `OPENROUTER_API_KEY` + optional Langfuse keys)

```bash
# example offline run (from repo root, with deps + keys configured)
python -m backend.eval.regression_test
```

## Environment

Copy `.env.example` → `.env` (API) and `.env.local` (Next). Never commit real keys — `.env*` is gitignored except `.env.example`.

## Why this repo exists

Most RAG demos stop at “retrieve + answer.” RecallGuard focuses on the parts that matter in real systems:

- stop bad inputs early  
- don’t feed raw PII into the model  
- catch bad outputs after generation  
- measure quality offline and on live traffic  

## License

Personal learning project.
