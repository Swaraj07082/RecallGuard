"use client";

import { LayerBadge } from "@/components/ui/LayerBadge";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function PoliciesPanel() {
  const policies = useWorkspaceStore((s) => s.policies);
  const togglePolicy = useWorkspaceStore((s) => s.togglePolicy);

  return (
    <section className="panel flex h-full min-w-0 flex-1 flex-col rounded-2xl">
      <header className="border-b border-[var(--line)] px-6 py-4">
        <div className="mb-2">
          <LayerBadge layer="policy" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Security policies
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
          Live guardrails on query, retrieval context, and model output for every chat turn.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <ul className="space-y-3">
          {policies.map((policy) => (
            <li
              key={policy.id}
              className="animate-rise flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white/75 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{policy.name}</p>
                  <span className="rounded-md border border-[var(--line)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                    {policy.scope}
                  </span>
                  <span
                    className={[
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      policy.effect === "deny"
                        ? "bg-[color-mix(in_oklab,var(--danger)_12%,white)] text-[var(--danger)]"
                        : "bg-[color-mix(in_oklab,var(--accent)_12%,white)] text-[var(--accent-deep)]",
                    ].join(" ")}
                  >
                    {policy.effect}
                  </span>
                </div>
                <p className="text-sm text-[var(--ink-soft)]">{policy.description}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={policy.enabled}
                onClick={() => togglePolicy(policy.id)}
                className={[
                  "relative h-8 w-14 shrink-0 rounded-full transition",
                  policy.enabled ? "bg-[var(--accent)]" : "bg-[var(--ink)]/20",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                    policy.enabled ? "left-7" : "left-1",
                  ].join(" ")}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
