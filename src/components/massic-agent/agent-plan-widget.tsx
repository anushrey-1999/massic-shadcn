"use client";
import { AgentPlanTable } from "./agent-plan-table";
import type { AgentPlan, ResourceType } from "./types";

export function AgentPlanWidget({ plan, type, selectedIds, onSelection }: { plan: AgentPlan; type: ResourceType; selectedIds: string[]; onSelection: (ids: string[]) => void }) {
  return <AgentPlanTable plan={plan} type={type} selectedIds={selectedIds} onSelection={onSelection} showPlanHeader={false} />;
}
