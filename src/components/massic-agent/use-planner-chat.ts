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
import type { PlanSurface, ResourceRef } from "./types";

type PlanDraft = {
  resource: ResourceRef | null;
  selectedIds: string[];
  preferredSurface?: PlanSurface;
};
const emptyPlanDraft = (): PlanDraft => ({ resource: null, selectedIds: [] });

/** Planner-only URL navigation, plan context, and cache refresh. */
export function usePlannerChat(business: string) {
  const [threadId, setThreadId] = useQueryState("thread");
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<Record<string, PlanDraft>>({});
  const planRef = useRef<PlanDraft>(emptyPlanDraft());
  const chat = useAgentChat(business, {
    agentId: "planner",
    tag: "chat",
    threadId,
    onThreadChange: (thread, previousKey) => {
      if (thread && previousKey)
        setPlans((previous) => ({
          ...previous,
          [thread]: previous[previousKey] ?? emptyPlanDraft(),
        }));
      void setThreadId(thread);
    },
    buildRequest: (message, options) =>
      buildChatRequest({
        threadId,
        message,
        resource: planRef.current.resource,
        selectedIds: planRef.current.selectedIds,
        omitView: options?.omitView,
      }),
    onTurnEnd: (message, thread) => {
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
  const plan = plans[chat.activeKey] ?? emptyPlanDraft();
  planRef.current = plan;
  useEffect(() => {
    if (!threadId || !chat.knownThread || !chat.history.messages.data) return;
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
  }, [threadId, chat.knownThread, chat.history.messages.data]);
  const updateDraft = (patch: Partial<ChatDraft & PlanDraft>) => {
    const { resource, selectedIds, preferredSurface, ...draft } = patch;
    if (Object.keys(draft).length) chat.updateDraft(draft);
    if (
      "resource" in patch ||
      "selectedIds" in patch ||
      "preferredSurface" in patch
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
