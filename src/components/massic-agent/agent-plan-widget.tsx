"use client";
import { AgentPlanList } from "./agent-plan-list";
import type { AgentPlan, ResourceType } from "./types";

export function AgentPlanWidget({ plan, type, selectedIds, onSelection, onCreateNewPlan }: { plan: AgentPlan; type: ResourceType; selectedIds: string[]; onSelection: (ids: string[]) => void; onCreateNewPlan: () => void }) {
  return <AgentPlanList plan={plan} type={type} selectedIds={selectedIds} onSelection={onSelection} onCreateNewPlan={onCreateNewPlan} />;
}
