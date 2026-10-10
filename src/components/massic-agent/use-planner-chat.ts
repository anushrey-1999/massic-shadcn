"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";
import { agentKeys } from "./agent-api";
import {
  buildChatRequest,
  lastMatchingPlan,
  resourcePlanSurface,
} from "./agent-model";
import { useAgentChat, type ChatDraft } from "./use-agent-chat";
import type { AgentChatMode, PlanSurface, ResourceRef } from "./types";

type PlanDraft = {
  resource: ResourceRef | null;
  selectedIds: string[];
  preferredSurface?: PlanSurface;
};
const emptyPlanDraft = (): PlanDraft => ({ resource: null, selectedIds: [] });

/** Main workspace navigation, with plan context restricted to Planner mode. */
export function usePlannerChat(
  business: string,
  mode: AgentChatMode = "planner",
) {
  const isPlanner = mode === "planner";
  const [threadId, setThreadId] = useQueryState("thread");
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<Record<string, PlanDraft>>({});
  const planRef = useRef<PlanDraft>(emptyPlanDraft());
  const chat = useAgentChat(business, {
    agentId: mode,
    tag: isPlanner ? "chat" : "analytics",
    threadId,
    onThreadChange: (thread, previousKey) => {
      if (isPlanner && thread && previousKey)
        setPlans((previous) => ({
          ...previous,
          [thread]: previous[previousKey] ?? emptyPlanDraft(),
        }));
      void setThreadId(thread);
    },
    buildRequest: (message, options) =>
      buildChatRequest({
        agentId: mode,
        threadId,
        message,
        resource: isPlanner ? planRef.current.resource : null,
        selectedIds: isPlanner ? planRef.current.selectedIds : [],
        omitView: !isPlanner || options?.omitView,
      }),
    onTurnEnd: (message, thread) => {
      if (!isPlanner) return;
      const resource = lastMatchingPlan(message.widgetParts ?? []);
      if (resource)
        setPlans((previous) => ({
          ...previous,
          [thread]: {
            ...previous[thread],
            resource,
            selectedIds: [],
            preferredSurface: resourcePlanSurface(resource.type),
          },
        }));
      void queryClient.invalidateQueries({
        queryKey: agentKeys.plans(business),
      });
      for (const part of message.widgetParts ?? [])
        void queryClient.invalidateQueries({
          queryKey: agentKeys.plan(business, part.resource.id),
        });
    },
  });
  const plan = (isPlanner && plans[chat.activeKey]) || emptyPlanDraft();
  planRef.current = plan;
  useEffect(() => {
    if (
      !isPlanner ||
      !threadId ||
      !chat.knownThread ||
      !chat.history.messages.data
    )
      return;
    setPlans((previous) => {
      if (previous[threadId]) return previous;
      const resource = lastMatchingPlan(
        chat.history.hydrated.flatMap((entry) =>
          entry.kind === "message" ? (entry.message.widgetParts ?? []) : [],
        ),
      );
      return {
        ...previous,
        [threadId]: {
          ...emptyPlanDraft(),
          resource,
          preferredSurface: resource
            ? resourcePlanSurface(resource.type)
            : undefined,
        },
      };
    });
  }, [isPlanner, threadId, chat.knownThread, chat.history.messages.data]);
  const updateDraft = (patch: Partial<ChatDraft & PlanDraft>) => {
    const { resource, selectedIds, preferredSurface, ...draft } = patch;
    if (Object.keys(draft).length) chat.updateDraft(draft);
    if (
      isPlanner &&
      ("resource" in patch ||
        "selectedIds" in patch ||
        "preferredSurface" in patch)
    ) {
      setPlans((previous) => ({
        ...previous,
        [chat.activeKey]: {
          ...(previous[chat.activeKey] ?? emptyPlanDraft()),
          ...("resource" in patch ? { resource: resource ?? null } : {}),
          ...(selectedIds ? { selectedIds } : {}),
          ...("preferredSurface" in patch ? { preferredSurface } : {}),
        },
      }));
    }
  };
  const newChat = (
    resource: ResourceRef | null = null,
    preferredSurface?: PlanSurface,
  ) => {
    const key = chat.newChat();
    if (!isPlanner) return;
    setPlans((previous) => ({
      ...previous,
      [key]: {
        resource,
        selectedIds: [],
        preferredSurface:
          preferredSurface ??
          (resource ? resourcePlanSurface(resource.type) : undefined),
      },
    }));
  };
  return {
    ...chat,
    draft: { ...chat.draft, ...plan },
    updateDraft,
    newChat,
    openPlan: (resource: ResourceRef) =>
      updateDraft({
        resource,
        selectedIds: [],
        preferredSurface: resourcePlanSurface(resource.type),
      }),
  };
}
