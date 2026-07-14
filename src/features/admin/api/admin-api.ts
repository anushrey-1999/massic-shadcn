"use client";

import Cookies from "js-cookie";
import { api, getBaseURLByPlatform } from "@/hooks/use-api";
import type {
  AdminBusinessesData,
  AdminBusiness,
  AdminModuleData,
  AdminModuleKey,
  AdminIndustrySyncRun,
  AdminOverviewData,
  AdminRangeKey,
  AdminSessionUser,
} from "../types";

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AdminQuery {
  range?: AdminRangeKey;
  agencyId?: string;
  groupBy?: string;
  metric?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | undefined;
}

function queryString(query: AdminQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function adminGoogleLogin(credential: string) {
  return api.post<Envelope<{ token: string; user: Record<string, unknown> }>>(
    "/admin/auth/google",
    "node",
    { credential },
    { skipAuth: true, suppressUnauthorizedSession: true },
  );
}

export async function getAdminSession() {
  return api.get<Envelope<{ user: AdminSessionUser }>>(
    "/admin/session",
    "node",
    { suppressUnauthorizedSession: true },
  );
}

export async function getAdminOverview(query: AdminQuery) {
  return api.get<Envelope<AdminOverviewData>>(
    `/admin/overview${queryString(query)}`,
    "node",
  );
}

export async function getAdminFilters() {
  return api.get<
    Envelope<{
      agencies: Array<{ value: string; label: string }>;
      industries: string[];
      cms: string[];
      plans: string[];
      countries: string[];
      statuses: string[];
    }>
  >("/admin/filters", "node");
}

export async function startAdminIndustrySync() {
  return api.post<
    Envelope<{ run: AdminIndustrySyncRun; alreadyRunning: boolean }>
  >("/admin/industry/sync", "node", {});
}

export async function getAdminIndustrySyncStatus() {
  return api.get<Envelope<{ run: AdminIndustrySyncRun | null }>>(
    "/admin/industry/sync/status",
    "node",
  );
}

export async function getAdminModule(
  module: AdminModuleKey,
  query: AdminQuery,
) {
  return api.get<Envelope<AdminModuleData>>(
    `/admin/modules/${module}${queryString(query)}`,
    "node",
  );
}

export async function getAdminBusinesses(query: AdminQuery) {
  return api.get<Envelope<AdminBusinessesData>>(
    `/admin/businesses${queryString(query)}`,
    "node",
  );
}

export async function getAdminBusiness(id: string, query: AdminQuery = {}) {
  return api.get<
    Envelope<{
      dimension: AdminBusiness;
      latest: Record<string, unknown> | null;
      analytics: AdminModuleData;
    }>
  >(`/admin/businesses/${id}${queryString(query)}`, "node");
}

export async function getAdminAgency(id: string, query: AdminQuery) {
  return api.get<
    Envelope<{
      agency: { id: string; name: string };
      businesses: AdminBusiness[];
      modules: AdminModuleData[];
    }>
  >(`/admin/agencies/${id}${queryString(query)}`, "node");
}

export async function getAdminIntelligence(query: AdminQuery) {
  return api.get<
    Envelope<{
      meta: { metric: string; dimension: string; freshnessDate: string | null };
      target: {
        value: number | null;
        cohort: string | null;
        percentileRank: number | null;
        gapToMedian: number | null;
        statusMix: Record<string, number>;
      };
      cohort: {
        count: number;
        p25: number | null;
        median: number | null;
        p75: number | null;
        statusMix: Record<string, number>;
        rankAvailable: boolean;
      };
    }>
  >(`/admin/intelligence${queryString(query)}`, "node");
}

export async function downloadAdminExport(
  module: AdminModuleKey,
  query: AdminQuery,
) {
  const token = Cookies.get("token");
  const response = await fetch(
    `${getBaseURLByPlatform("node")}/admin/exports/${module}.csv${queryString(query)}`,
    {
      headers: token ? { Token: token } : undefined,
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Export failed");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] || `massic-${module}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
