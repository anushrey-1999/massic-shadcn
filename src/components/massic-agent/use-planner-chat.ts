"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";
import { agentKeys } from "./agent-api";
import { AGENT_CHAT_MODE_TAGS, AGENT_CHAT_MODES } from "./agent-modes";
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

/** Main workspace navigation, with plan context in Planner and General modes. */
export function usePlannerChat(
  business: string,
  mode: AgentChatMode = "planner",
) {
  const { agentId, tag, supportsPlans } = AGENT_CHAT_MODES[mode];
  const [threadId, setThreadId] = useQueryState("thread");
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<Record<string, PlanDraft>>({});
  const planRef = useRef<PlanDraft>(emptyPlanDraft());
  const chat = useAgentChat(business, {
    agentId,
    tag,
    listTags: AGENT_CHAT_MODE_TAGS,
    threadId,
    onThreadChange: (thread, previousKey) => {
      if (supportsPlans && thread && previousKey)
        setPlans((previous) => ({
          ...previous,
          [thread]: previous[previousKey] ?? emptyPlanDraft(),
        }));
      void setThreadId(thread);
    },
    buildRequest: (message, options) =>
      buildChatRequest({
        agentId,
        threadId,
        message,
        resource: supportsPlans ? planRef.current.resource : null,
        selectedIds: supportsPlans ? planRef.current.selectedIds : [],
        omitView: !supportsPlans || options?.omitView,
      }),
    onTurnEnd: (message, thread) => {
      if (!supportsPlans) return;
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
        if (part.widget === "resource_table")
          void queryClient.invalidateQueries({
            queryKey: agentKeys.plan(business, part.resource.id),
          });
    },
  });
  const plan = (supportsPlans && plans[chat.activeKey]) || emptyPlanDraft();
  planRef.current = plan;
  useEffect(() => {
    if (
      !supportsPlans ||
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
  }, [supportsPlans, threadId, chat.knownThread, chat.history.messages.data]);
  const updateDraft = (patch: Partial<ChatDraft & PlanDraft>) => {
    const { resource, selectedIds, preferredSurface, ...draft } = patch;
    if (Object.keys(draft).length) chat.updateDraft(draft);
    if (
      supportsPlans &&
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
    if (!supportsPlans) return;
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
