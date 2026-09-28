import type { ActivityStep, AgentEvent, AgentMessage, TurnStatus } from "./types";
import { widgetParts } from "./agent-model";

const labels: Record<string, string> = { search_knowledge: "Searching knowledge", get_business_profile: "Reading business profile", get_strategy_statuses: "Checking strategy", get_pages_details: "Reading web details", get_clusters_details: "Reading social tactics", get_webpage_plan: "Reading web plan", get_social_channels_plan: "Reading social plan", save_webpages_plan: "Saving web plan", save_social_channels_plan: "Saving social plan", activate_plan: "Activating plan", recall_memory: "Recalling context", write_memory: "Saving context", read_doc: "Reading context", apply_edits: "Updating context" };
const agentLabels: Record<string, string> = { webpages: "Web", social_channels: "Social", doc_writer_memory: "Memory" };

export const toolLabel = (name: string) => labels[name] ?? name.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

const eventPath = (event: AgentEvent) => event.path ?? event.agent ?? "planner";

function settleRunning(activity: ActivityStep[], status: ActivityStep["status"], path?: string) {
  return activity.map(step => step.status === "running" && (!path || step.path === path) ? { ...step, status } : step);
}

function settleThoughts(activity: ActivityStep[], path: string) {
  return activity.map(step => step.kind === "thought" && step.path === path && step.status === "running" ? { ...step, status: "done" as const } : step);
}

function appendThought(activity: ActivityStep[], event: Extract<AgentEvent, { type: "thinking_token" | "token" }>): ActivityStep[] {
  if (!event.text) return activity;
  const path = eventPath(event);
  const index = activity.findLastIndex(step => step.kind === "thought" && step.path === path && step.status === "running");
  if (index >= 0) {
    const next = [...activity];
    next[index] = { ...next[index], label: next[index].label + event.text };
    return next;
  }
  const step: ActivityStep = {
    id: `thought:${path}:${activity.length}`,
    kind: "thought",
    label: event.text,
    scope: event.agent ?? path,
    path,
    depth: event.depth ?? 1,
    status: "running",
  };
  return [...activity, step];
}

export function reduceAgentEvent(message: AgentMessage, event: AgentEvent): AgentMessage {
  let activity = [...(message.activity ?? [])];
  const path = eventPath(event);
  const depth = event.depth ?? 0;
  switch (event.type) {
    case "thread_meta": return { ...message, turnId: event.turn_id, id: `${event.turn_id}-assistant` };
    case "token": return depth === 0 ? { ...message, content: message.content + event.text } : { ...message, activity: appendThought(activity, event) };
    case "thinking_token": return { ...message, activity: appendThought(activity, event) };
    case "message_complete": return depth === 0 ? { ...message, content: event.content, partial: event.partial } : message;
    case "summarising_history": {
      const step: ActivityStep = { id: `summary-${activity.length}`, kind: "summary", label: "Summarising earlier messages", scope: event.agent ?? path, path, depth, status: "done" };
      return { ...message, activity: [...activity, step] };
    }
    case "dispatch_start": {
      activity = settleThoughts(activity, path);
      const step: ActivityStep = { id: `dispatch:${event.child}:${activity.length}`, kind: "dispatch", label: `${agentLabels[event.child] ?? event.child} planning`, detail: event.task, scope: event.child, path, depth: depth + 1, status: "running" };
      return { ...message, activity: [...activity, step] };
    }
    case "dispatch_end": {
      const index = activity.findLastIndex(step => step.kind === "dispatch" && step.path === path && step.id.startsWith(`dispatch:${event.child}:`) && step.status === "running");
      // dispatch_end arrives after the specialist's activity. Keep the original
      // dispatch task here instead of moving its completion summary to the
      // beginning of the rail by mutating the dispatch_start entry.
      if (index >= 0) activity[index] = { ...activity[index], status: "done" };
      return { ...message, activity };
    }
    case "tool_call_start":
      activity = settleThoughts(activity, path);
      return { ...message, activity: [...activity.filter(step => step.id !== event.call_id), { id: event.call_id, kind: "tool", label: toolLabel(event.tool_name), scope: event.agent ?? path, path, depth, status: "running" } satisfies ActivityStep] };
    case "tool_call_end": return { ...message, activity: activity.map(step => step.id === event.call_id ? { ...step, status: event.success === false ? "error" : "done" } : step) };
    case "citations": return event.document ? { ...message, citations: event.document } : message;
    case "cancelled": return { ...message, status: "cancelled", partial: true, activity: settleRunning(activity, "cancelled") };
    case "error": return { ...message, status: "error", error: event.message, partial: !!message.content, activity: settleRunning(activity, "error") };
    case "turn_end": return depth > 0 ? message : { ...message, status: message.status === "error" || message.status === "cancelled" ? message.status : event.status, partial: message.partial || event.status === "cancelled", widgetParts: widgetParts(event.widget_parts), trace: event.trace, activity: settleRunning(activity, event.status === "complete" ? "done" : event.status) };
    default: return message;
  }
}

export function activityFromTrace(events: AgentEvent[], turnStatus: TurnStatus): ActivityStep[] {
  let message: AgentMessage = { id: "trace", role: "assistant", content: "", createdAt: 0, activity: [] };
  for (const event of events) message = reduceAgentEvent(message, event);
  const finalStatus: ActivityStep["status"] = turnStatus === "complete" ? "done" : turnStatus;
  return settleRunning(message.activity ?? [], finalStatus);
}
