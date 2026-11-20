import type { LayerId } from "@/lib/types";

const LABELS: Record<LayerId, string> = {
  rag: "RAG",
  memory: "Memory",
  session: "Session",
  policy: "Policy",
  eval: "Eval",
};

export function LayerBadge({
  layer,
  active = false,
  onClick,
}: {
  layer: LayerId;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
    `layer-${layer}`,
    active ? "ring-1 ring-[var(--ink)]/20" : "opacity-90",
    onClick ? "cursor-pointer transition hover:opacity-100" : "",
  ].join(" ");

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {LABELS[layer]}
      </button>
    );
  }

  return <span className={className}>{LABELS[layer]}</span>;
}
