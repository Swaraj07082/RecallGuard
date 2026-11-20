"use client";

import { LayerBadge } from "@/components/ui/LayerBadge";
import { formatDateTime } from "@/lib/format";
import type { LayerId } from "@/lib/types";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function EvalPanel() {
  const evalSuite = useWorkspaceStore((s) => s.evalSuite);
  const rerunEval = useWorkspaceStore((s) => s.rerunEval);

  const pass = evalSuite.cases.filter((c) => c.status === "pass").length;
  const fail = evalSuite.cases.filter((c) => c.status === "fail").length;
  const pending = evalSuite.cases.filter((c) => c.status === "pending").length;

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col rounded-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
        <div>
          <div className="mb-2">
            <LayerBadge layer="eval" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {evalSuite.name}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
            {evalSuite.description}
          </p>
        </div>
        <button
          type="button"
          onClick={rerunEval}
          className="rounded-2xl bg-[var(--accent-deep)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Re-run suite
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3 border-b border-[var(--line)] px-6 py-4">
        <Stat label="Pass" value={pass} tone="pass" />
        <Stat label="Fail" value={fail} tone="fail" />
        <Stat label="Pending" value={pending} tone="pending" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <ul className="space-y-3">
          {evalSuite.cases.map((item) => (
            <li
              key={item.id}
              className="animate-rise rounded-2xl border border-[var(--line)] bg-white/75 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <LayerBadge layer={item.layer as LayerId} />
                <StatusPill status={item.status} />
                <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                  {formatDateTime(item.lastRunAt)}
                </span>
              </div>
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.assertion}</p>
              <p className="mt-3 rounded-xl bg-[var(--bg-1)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--ink)]">
                {item.evidence}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pass" | "fail" | "pending";
}) {
  const color =
    tone === "pass"
      ? "text-[var(--accent-deep)]"
      : tone === "fail"
        ? "text-[var(--danger)]"
        : "text-[var(--session)]";

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: "pass" | "fail" | "pending" }) {
  const styles =
    status === "pass"
      ? "bg-[color-mix(in_oklab,var(--accent)_12%,white)] text-[var(--accent-deep)]"
      : status === "fail"
        ? "bg-[color-mix(in_oklab,var(--danger)_12%,white)] text-[var(--danger)]"
        : "bg-[color-mix(in_oklab,var(--session)_12%,white)] text-[var(--session)]";

  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles}`}>
      {status}
    </span>
  );
}
