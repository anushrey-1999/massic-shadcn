"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./use-api";
import {
  monitoringErrorMessage,
  monitoringGet,
  type MonitoringCardTag,
} from "./use-monitoring-screen";

/**
 * Monitoring notification reads and marks. The account bell covers every business on the
 * account; the business bell covers one. Counts come from their own endpoints so a badge never
 * waits on the list, and every mark refreshes both counts and both lists.
 */

export type NotificationScope =
  | { kind: "account" }
  | { kind: "business"; businessId: string; name: string; website?: string | null };

export interface NotificationFilters {
  businessId: string | null;
  types: string[];
  unreadOnly: boolean;
}

export interface MonitoringNotificationCardRef {
  type: "anomaly" | "change" | "data_issue";
  cardId: string;
  metric?: string;
  eventName?: string | null;
  dates?: { start: string; end: string };
  range?: { start: string; end: string };
}

export interface MonitoringNotification {
  id: string;
  sentDate: string;
  tag: MonitoringCardTag;
  tagLabel: string;
  title: string;
  subtitle: string;
  cardRef: MonitoringNotificationCardRef | null;
  seen: boolean;
  seenAt: string | null;
}

export interface NotificationBusiness {
  id: string;
  name: string;
  website: string | null;
}

export interface NotificationGroup {
  business: NotificationBusiness;
  unseen: number;
  items: MonitoringNotification[];
}

export interface NotificationTypeOption {
  key: string;
  label: string;
}

/** Both list endpoints, normalised to the grouped shape the sheet renders. */
export interface NotificationPanel {
  unseen: number;
  groups: NotificationGroup[];
  businesses: (NotificationBusiness & { unseen: number })[];
  allBusinesses: string;
  types: NotificationTypeOption[];
  markAll: string;
  empty: { all: string; unread: string; filtered: string };
}

interface BusinessListResponse {
  unseen: number;
  items: MonitoringNotification[];
  types: NotificationTypeOption[];
  markAll: string;
  empty: NotificationPanel["empty"];
}

type AccountListResponse = NotificationPanel;

const ROOT_KEY = "monitoring-notifications";
const COUNT_REFRESH_MS = 5 * 60 * 1000;
// A bell remounting on navigation or a quick tab switch reuses a count this fresh.
const COUNT_STALE_MS = 60 * 1000;
const ACCOUNT_KEY = "account";

interface CountData {
  unread: number;
}

interface MarkResponse {
  data: { unseen: number; marked?: number };
}

function scopeKey(scope: NotificationScope): string {
  return scope.kind === "account" ? ACCOUNT_KEY : scope.businessId;
}

function countKey(key: string) {
  return [ROOT_KEY, "count", key];
}

function filterParams(filters: NotificationFilters, scope: NotificationScope): Record<string, string> {
  const params: Record<string, string> = {};
  if (scope.kind === "account" && filters.businessId) params.businessId = filters.businessId;
  if (filters.types.length) params.types = filters.types.join(",");
  if (filters.unreadOnly) params.unread = "true";
  return params;
}

export function useNotificationCount(scope: NotificationScope | null) {
  return useQuery({
    queryKey: countKey(scope ? scopeKey(scope) : ""),
    queryFn: () =>
      monitoringGet<CountData>(
        scope?.kind === "business"
          ? `/businesses/${scope.businessId}/notifications/unread-count`
          : "/notifications/unread-count",
        {}
      ),
    enabled: Boolean(scope),
    staleTime: COUNT_STALE_MS,
    refetchInterval: COUNT_REFRESH_MS,
    refetchOnWindowFocus: true,
    select: (data) => data.unread,
  });
}

export function useNotifications(scope: NotificationScope, filters: NotificationFilters, enabled: boolean) {
  return useQuery({
    queryKey: [ROOT_KEY, "list", scopeKey(scope), filters.businessId, filters.types.join(","), filters.unreadOnly],
    queryFn: async (): Promise<NotificationPanel> => {
      const params = filterParams(filters, scope);
      if (scope.kind === "account") {
        return monitoringGet<AccountListResponse>("/notifications", params);
      }
      const data = await monitoringGet<BusinessListResponse>(
        `/businesses/${scope.businessId}/notifications`,
        params
      );
      const business = { id: scope.businessId, name: scope.name, website: scope.website ?? null };
      return {
        unseen: data.unseen,
        groups: data.items.length
          ? [{ business, unseen: data.items.filter((item) => !item.seen).length, items: data.items }]
          : [],
        businesses: [],
        allBusinesses: "",
        types: data.types,
        markAll: data.markAll,
        empty: data.empty,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

/**
 * Marks update the badges from what they already know (the mark's own response, or a local
 * decrement) instead of refetching every count; only the lists are refreshed. On failure the
 * counts are refetched so a badge never stays wrong.
 */
function useNotificationCache() {
  const queryClient = useQueryClient();
  return {
    setCount: (key: string, unread: number) =>
      queryClient.setQueryData<CountData>(countKey(key), { unread: Math.max(0, unread) }),
    decrement: (key: string, by: number) =>
      queryClient.setQueryData<CountData>(countKey(key), (data) =>
        data ? { unread: Math.max(0, data.unread - by) } : data
      ),
    snapshot: (keys: string[]) => keys.map((key) => [key, queryClient.getQueryData<CountData>(countKey(key))] as const),
    restore: (entries: ReadonlyArray<readonly [string, CountData | undefined]>) =>
      entries.forEach(([key, data]) => queryClient.setQueryData(countKey(key), data)),
    cancelCounts: () => queryClient.cancelQueries({ queryKey: [ROOT_KEY, "count"] }),
    refreshCounts: (exceptKey?: string) =>
      queryClient.invalidateQueries({
        queryKey: [ROOT_KEY, "count"],
        predicate: (query) => query.queryKey[2] !== exceptKey,
      }),
    refreshLists: () => queryClient.invalidateQueries({ queryKey: [ROOT_KEY, "list"] }),
  };
}

interface MarkSeenInput {
  businessId: string;
  notificationId: string;
  /** The business's unread count before this mark, when the caller knows it. */
  businessUnseen?: number;
}

export function useMarkNotificationSeen() {
  const cache = useNotificationCache();
  return useMutation({
    mutationFn: ({ businessId, notificationId }: MarkSeenInput) =>
      api.post<MarkResponse>(`/monitoring/businesses/${businessId}/notifications/${notificationId}/seen`, "node"),
    onMutate: async ({ businessId, businessUnseen }) => {
      await cache.cancelCounts();
      const previous = cache.snapshot([ACCOUNT_KEY, businessId]);
      cache.decrement(ACCOUNT_KEY, 1);
      // Seeding the business count lets the page this click opens show it without a fetch.
      if (businessUnseen !== undefined) cache.setCount(businessId, businessUnseen - 1);
      else cache.decrement(businessId, 1);
      return { previous };
    },
    onSuccess: (response, { businessId }) => cache.setCount(businessId, response.data.unseen),
    onError: (error, _input, context) => {
      if (context) cache.restore(context.previous);
      cache.refreshCounts();
      toast.error(monitoringErrorMessage(error));
    },
    onSettled: () => cache.refreshLists(),
  });
}

export function useMarkAllNotificationsSeen() {
  const cache = useNotificationCache();
  return useMutation({
    mutationFn: ({ scope, filters }: { scope: NotificationScope; filters: NotificationFilters }) => {
      const types = filters.types.length ? filters.types : undefined;
      if (scope.kind === "business") {
        return api.post<MarkResponse>(`/monitoring/businesses/${scope.businessId}/notifications/seen-all`, "node", { types });
      }
      return api.post<MarkResponse>("/monitoring/notifications/seen-all", "node", {
        businessId: filters.businessId ?? undefined,
        types,
      });
    },
    onSuccess: (response, { scope }) => {
      const key = scopeKey(scope);
      cache.setCount(key, response.data.unseen);
      if (scope.kind === "business") cache.decrement(ACCOUNT_KEY, response.data.marked ?? 0);
      // An account-wide mark can touch any business, so the other badges are refetched.
      else cache.refreshCounts(key);
    },
    onError: (error) => {
      cache.refreshCounts();
      toast.error(monitoringErrorMessage(error));
    },
    onSettled: () => cache.refreshLists(),
  });
}
