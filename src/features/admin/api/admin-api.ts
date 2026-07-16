"use client";

import { adminClient } from "./admin-client";
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
  return adminClient.post<Envelope<{ token: string; user: AdminSessionUser }>>(
    "/admin/auth/google",
    { credential },
    { skipAdminAuth: true },
  );
}

export async function logoutAdminSession() {
  return adminClient.post<Envelope<Record<string, never>>>(
    "/admin/auth/logout",
    {},
  );
}

export async function getAdminSession() {
  return adminClient.get<Envelope<{ user: AdminSessionUser }>>(
    "/admin/session",
  );
}

export async function getAdminOverview(query: AdminQuery) {
  return adminClient.get<Envelope<AdminOverviewData>>(
    `/admin/overview${queryString(query)}`,
  );
}

export async function getAdminFilters() {
  return adminClient.get<
    Envelope<{
      agencies: Array<{ value: string; label: string }>;
      industries: string[];
      cms: string[];
      plans: string[];
      countries: string[];
      statuses: string[];
    }>
  >("/admin/filters");
}

export async function startAdminIndustrySync() {
  return adminClient.post<
    Envelope<{ run: AdminIndustrySyncRun; alreadyRunning: boolean }>
  >("/admin/industry/sync", {});
}

export async function getAdminIndustrySyncStatus() {
  return adminClient.get<Envelope<{ run: AdminIndustrySyncRun | null }>>(
    "/admin/industry/sync/status",
  );
}

export async function getAdminModule(
  module: AdminModuleKey,
  query: AdminQuery,
) {
  return adminClient.get<Envelope<AdminModuleData>>(
    `/admin/modules/${module}${queryString(query)}`,
  );
}

export async function getAdminBusinesses(query: AdminQuery) {
  return adminClient.get<Envelope<AdminBusinessesData>>(
    `/admin/businesses${queryString(query)}`,
  );
}

export async function getAdminBusiness(id: string, query: AdminQuery = {}) {
  return adminClient.get<
    Envelope<{
      dimension: AdminBusiness;
      latest: Record<string, unknown> | null;
      analytics: AdminModuleData;
    }>
  >(`/admin/businesses/${id}${queryString(query)}`);
}

export async function getAdminAgency(id: string, query: AdminQuery) {
  return adminClient.get<
    Envelope<{
      agency: { id: string; name: string };
      businesses: AdminBusiness[];
      modules: AdminModuleData[];
    }>
  >(`/admin/agencies/${id}${queryString(query)}`);
}

export async function getAdminIntelligence(query: AdminQuery) {
  return adminClient.get<
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
  >(`/admin/intelligence${queryString(query)}`);
}

export async function downloadAdminExport(
  module: AdminModuleKey,
  query: AdminQuery,
) {
  const response = await adminClient.download(
    `/admin/exports/${module}.csv${queryString(query)}`,
  );
  const blob = response.data;
  const disposition = response.headers["content-disposition"] || "";
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
