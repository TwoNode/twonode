import type { ApiResult } from "@/lib/api/types";
import type { GBCEdition } from "@/gbc/utils/settings";

/**
 * Thin typed wrapper around /api/v1/gbc/* — starts with just the editions
 * surface, for the admin event-switcher (gbc-restricted/editions). Same-origin
 * fetch already sends cookies, so no credentials option is needed. Extend as
 * more admin pages get repointed off their legacy "use server" actions.
 */

const BASE = "/api/v1/gbc";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res.json();
}

export type EditionAdminStats = {
  edition: GBCEdition;
  ticketsSold: number;
  checkedIn: number;
  revenue: number;
  sponsors: { id: string; name: string }[];
  speakers: { id: string; name: string }[];
};

export type CreateEditionInput = Omit<GBCEdition, "status"> & { status?: GBCEdition["status"] };

export type SendCertificatesResult = { sent: number; failed: number; message: string };

export type AdminSummary = {
  id: string;
  kindeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPERADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddAdminInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "ADMIN" | "SUPERADMIN";
};

export const gbcApi = {
  editions: {
    list: () => jsonFetch<GBCEdition[]>(`${BASE}/editions`),

    adminStats: (key: string) => jsonFetch<EditionAdminStats>(`${BASE}/admin/editions/${encodeURIComponent(key)}/stats`),

    create: (input: CreateEditionInput) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions`, { method: "POST", body: JSON.stringify(input) }),

    activate: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/activate`, { method: "PATCH" }),

    archive: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/archive`, { method: "PATCH" }),
  },

  certificates: {
    sendBulk: (ticketNumbers: string[], emailBody: string) =>
      jsonFetch<SendCertificatesResult>(`${BASE}/admin/certificates/send`, {
        method: "POST",
        body: JSON.stringify({ ticketNumbers, emailBody }),
      }),
  },

  users: {
    list: () => jsonFetch<AdminSummary[]>(`${BASE}/admin/users`),

    add: (input: AddAdminInput) =>
      jsonFetch<AdminSummary>(`${BASE}/admin/users`, { method: "POST", body: JSON.stringify(input) }),

    updateRole: (id: string, role: "USER" | "ADMIN" | "SUPERADMIN") =>
      jsonFetch<AdminSummary>(`${BASE}/admin/users/${encodeURIComponent(id)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),

    toggleStatus: (id: string, isActive: boolean) =>
      jsonFetch<AdminSummary>(`${BASE}/admin/users/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),

    remove: (id: string) =>
      jsonFetch<undefined>(`${BASE}/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
};
