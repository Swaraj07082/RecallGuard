"use client";

import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DocumentsPanel } from "@/components/documents/DocumentsPanel";
import { EvalPanel } from "@/components/eval/EvalPanel";
import { Inspector } from "@/components/workspace/Inspector";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { PoliciesPanel } from "@/components/policies/PoliciesPanel";
import { SessionPanel } from "@/components/session/SessionPanel";
import { Sidebar } from "@/components/workspace/Sidebar";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function AppShell() {
  const activeView = useWorkspaceStore((s) => s.activeView);

  return (
    <div className="flex h-dvh gap-3 p-3 md:p-4">
      <Sidebar />
      <main className="flex min-w-0 flex-1">
        {activeView === "chat" && <ChatPanel />}
        {activeView === "documents" && <DocumentsPanel />}
        {activeView === "memory" && <MemoryPanel />}
        {activeView === "session" && <SessionPanel />}
        {activeView === "policies" && <PoliciesPanel />}
        {activeView === "eval" && <EvalPanel />}
      </main>
      <div className="hidden xl:flex">
        <Inspector />
      </div>
    </div>
  );
}
