import type { ActivityStep, AgentEvent, AgentMessage } from "./types";
import { widgetParts } from "./agent-model";

const labels: Record<string, string> = { search_knowledge: "Searching knowledge", get_business_profile: "Reading business profile", get_strategy_statuses: "Checking strategy", get_pages_details: "Reading web details", get_clusters_details: "Reading social tactics", get_webpage_plan: "Reading web plan", get_social_channels_plan: "Reading social plan", save_webpages_plan: "Saving web plan", save_social_channels_plan: "Saving social plan", activate_plan: "Activating plan", recall_memory: "Recalling context", write_memory: "Saving context" };
export const toolLabel = (name: string) => labels[name] ?? name.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
export function reduceAgentEvent(message: AgentMessage, event: AgentEvent): AgentMessage {
  const activity = [...(message.activity ?? [])];
  const scope = event.path ?? event.agent ?? "orchestrator";
  const depth = event.depth ?? 0;
  const settle = (status: ActivityStep["status"]) => activity.map(s => s.status === "running" ? { ...s, status } : s);
  switch (event.type) {
    case "thread_meta": return { ...message, turnId: event.turn_id, id: `${event.turn_id}-assistant` };
    case "token": return depth === 0 ? { ...message, content: message.content + event.text } : message;
    case "message_complete": return depth === 0 ? { ...message, content: event.content, partial: event.partial } : message;
    case "summarising_history": return { ...message, activity: [...activity, { id: `summary-${activity.length}`, label: "Summarising earlier messages", scope, depth, status: "done" }] };
    case "dispatch_start": return { ...message, activity: [...activity, { id: `dispatch:${event.child}:${activity.length}`, label: `${event.child === "webpages" ? "Web" : event.child === "social_channels" ? "Social" : event.child} planning`, detail: event.task, scope: event.child, depth: depth + 1, status: "running" }] };
    case "dispatch_end": {
      const index = activity.findLastIndex(s => s.id.startsWith(`dispatch:${event.child}:`) && s.status === "running");
      if (index >= 0) activity[index] = { ...activity[index], status: "done", detail: event.summary ?? activity[index].detail };
      return { ...message, activity };
    }
    case "tool_call_start": return { ...message, activity: [...activity.filter(s => s.id !== event.call_id), { id: event.call_id, label: toolLabel(event.tool_name), scope, depth, status: "running" }] };
    case "tool_call_end": return { ...message, activity: activity.map(s => s.id === event.call_id ? { ...s, status: event.success === false ? "error" : "done" } : s) };
    case "citations": return event.document ? { ...message, citations: event.document } : message;
    case "cancelled": return { ...message, status: "cancelled", partial: true, activity: settle("cancelled") };
    case "error": return { ...message, status: "error", error: event.message, partial: !!message.content, activity: settle("error") };
    case "turn_end": return depth > 0 ? message : { ...message, status: message.status === "error" ? "error" : event.status, partial: message.partial || event.status === "cancelled", widgetParts: widgetParts(event.widget_parts), activity: settle(event.status === "complete" ? "done" : event.status) };
    default: return message;
  }
}
