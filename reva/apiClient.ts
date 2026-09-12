import type { ApiResult } from "@/lib/api/types";
import type { Property, OneTimeUserProperty, RevaUser, Notification, Role, NotificationAudience, NotificationType } from "@/prisma/generated";
import type { RevaProfile, ProfileUpdateInput } from "@/reva/services/profileService";
import type { ReportDownload } from "@/reva/services/propertyRequestService";
import type { EncryptedUserData } from "@/utils/encryptedCookies";

/**
 * Thin typed wrapper around /api/v1/reva/* — mirrors gbc/apiClient.ts and
 * surfboard/apiClient.ts's conventions. Same-origin fetch already sends
 * cookies, so no credentials option is needed.
 */

const BASE = "/api/v1/reva";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res.json();
}

async function formFetch<T>(url: string, formData: FormData, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, { ...init, method: init?.method ?? "POST", body: formData });
  return res.json();
}

export type CreateAdminUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "SUPERADMIN";
};

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  userIds?: string[];
  audience?: NotificationAudience;
  link?: string;
  metadata?: any;
};

export type PropertyStatusUpdate = {
  status: "Available" | "Completed" | "Processing";
  paymentStatus: "Paid" | "Unpaid";
  statusMessage: string;
  error: string | null;
};

export type AnyRequestForAdmin =
  | { type: "property"; data: Property & { user: Pick<RevaUser, "id" | "email" | "firstName" | "lastName" | "kindeId"> } }
  | { type: "oneTime"; data: OneTimeUserProperty };

export type ApproveReportResult = { data: Property | OneTimeUserProperty; warnings: string[]; message: string };

export type AdminVerifyResult = {
  reference: string;
  originalStatus: string | null;
  newStatus: "Paid" | "Unpaid";
  success: boolean;
  message: string;
  isLive: boolean;
  data: Property | OneTimeUserProperty;
};
export type UploadReportResult = { data: Property | OneTimeUserProperty; warnings: string[] };

export const revaApi = {
  profile: {
    get: () => jsonFetch<RevaProfile>(`${BASE}/profile`),

    update: (input: ProfileUpdateInput) =>
      jsonFetch<RevaProfile>(`${BASE}/profile`, { method: "PATCH", body: JSON.stringify(input) }),
  },

  properties: {
    listMine: () => jsonFetch<Property[]>(`${BASE}/properties`),

    submit: (formData: FormData) =>
      formFetch<{ paystack: any; property: Property }>(`${BASE}/properties`, formData),

    transaction: (reference: string) =>
      jsonFetch<Property>(`${BASE}/properties/transactions/${encodeURIComponent(reference)}`),

    updateStatus: (reference: string, input: PropertyStatusUpdate) =>
      jsonFetch<Property>(`${BASE}/properties/${encodeURIComponent(reference)}/status`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
  },

  oneTimeProperties: {
    submit: (formData: FormData) =>
      formFetch<{ paystack: any; property: OneTimeUserProperty }>(`${BASE}/one-time-properties`, formData),

    getById: (id: string, email: string) =>
      jsonFetch<OneTimeUserProperty>(`${BASE}/one-time-properties/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`),

    lookup: (reference: string, email: string) =>
      jsonFetch<OneTimeUserProperty>(
        `${BASE}/one-time-properties/lookup?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`
      ),

    lookupReport: (reference: string, email: string) =>
      jsonFetch<ReportDownload>(
        `${BASE}/one-time-properties/lookup/report?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`
      ),

    updateStatus: (reference: string, input: PropertyStatusUpdate) =>
      jsonFetch<OneTimeUserProperty>(`${BASE}/one-time-properties/status`, {
        method: "PATCH",
        body: JSON.stringify({ reference, ...input }),
      }),

    transaction: (reference: string) =>
      jsonFetch<OneTimeUserProperty>(`${BASE}/one-time-properties/transactions/${encodeURIComponent(reference)}`),
  },

  payments: {
    verifyOneTime: (reference: string) =>
      jsonFetch<OneTimeUserProperty>(`${BASE}/payments/one-time/verify`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      }),

    verify: (reference: string) =>
      jsonFetch<Property>(`${BASE}/payments/verify`, { method: "POST", body: JSON.stringify({ reference }) }),
  },

  notifications: {
    list: () => jsonFetch<Array<Notification & { isRead: boolean; isDismissed: boolean }>>(`${BASE}/notifications`),

    /** Admin-only paginated/searchable variant — the reva-restricted admin notifications list. */
    listPaginated: (params: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: NotificationType;
      status?: "UNREAD" | "READ" | "ALL";
      includeDismissed?: boolean;
    } = {}) => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page ?? 1));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.type) qs.set("type", params.type);
      if (params.status) qs.set("status", params.status);
      if (params.includeDismissed) qs.set("includeDismissed", "true");
      return jsonFetch<{
        data: Array<Notification & { isRead: boolean; isDismissed: boolean }>;
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`${BASE}/notifications?${qs.toString()}`);
    },

    create: (input: CreateNotificationInput) =>
      jsonFetch<Notification>(`${BASE}/notifications`, { method: "POST", body: JSON.stringify(input) }),

    unreadCount: () => jsonFetch<{ count: number }>(`${BASE}/notifications/unread-count`),

    markRead: (id: string) => jsonFetch<Notification>(`${BASE}/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),

    dismiss: (id: string) =>
      jsonFetch<Notification>(`${BASE}/notifications/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
  },

  admin: {
    users: {
      list: () => jsonFetch<RevaUser[]>(`${BASE}/admin/users`),

      listAdmins: () => jsonFetch<RevaUser[]>(`${BASE}/admin/users?scope=admins`),

      /** Paginated/searchable variant — used by the Super Admin page's two browsable list cards. */
      listPaginated: (params: { page?: number; pageSize?: number; scope?: "all" | "admins" | "users"; search?: string } = {}) => {
        const qs = new URLSearchParams();
        qs.set("page", String(params.page ?? 1));
        if (params.pageSize) qs.set("pageSize", String(params.pageSize));
        if (params.scope) qs.set("scope", params.scope);
        if (params.search) qs.set("search", params.search);
        return jsonFetch<{
          data: (RevaUser & { _count: { properties: number } })[];
          pagination: { page: number; pageSize: number; total: number; totalPages: number };
        }>(`${BASE}/admin/users?${qs.toString()}`);
      },

      create: (input: CreateAdminUserInput) =>
        jsonFetch<RevaUser>(`${BASE}/admin/users`, { method: "POST", body: JSON.stringify(input) }),

      remove: (id: string) => jsonFetch<undefined>(`${BASE}/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),

      promote: (id: string, role: "ADMIN" | "SUPERADMIN") =>
        jsonFetch<RevaUser>(`${BASE}/admin/users/${encodeURIComponent(id)}/role`, {
          method: "PATCH",
          body: JSON.stringify({ action: "promote", role }),
        }),

      demote: (id: string) =>
        jsonFetch<RevaUser>(`${BASE}/admin/users/${encodeURIComponent(id)}/role`, {
          method: "PATCH",
          body: JSON.stringify({ action: "demote" }),
        }),

      setActive: (id: string, active: boolean) =>
        jsonFetch<RevaUser>(`${BASE}/admin/users/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ active }),
        }),
    },

    requests: {
      list: (filters?: { limit?: number; onlyWithReport?: boolean; includeOneTimeRequests?: boolean }) => {
        const params = new URLSearchParams();
        if (filters?.limit) params.set("limit", String(filters.limit));
        if (filters?.onlyWithReport) params.set("onlyWithReport", "true");
        if (filters?.includeOneTimeRequests) params.set("includeOneTimeRequests", "true");
        const qs = params.toString();
        return jsonFetch<{ properties: Property[]; oneTimeRequests: OneTimeUserProperty[] | null }>(
          `${BASE}/admin/requests${qs ? `?${qs}` : ""}`
        );
      },

      get: (reference: string) => jsonFetch<AnyRequestForAdmin>(`${BASE}/admin/requests/${encodeURIComponent(reference)}`),

      approve: (reference: string, isApproved: boolean, comment?: string) =>
        jsonFetch<ApproveReportResult>(`${BASE}/admin/requests/${encodeURIComponent(reference)}/approve`, {
          method: "POST",
          body: JSON.stringify({ isApproved, comment }),
        }),

      uploadReport: (reference: string, formData: FormData) =>
        formFetch<UploadReportResult>(`${BASE}/admin/requests/${encodeURIComponent(reference)}/report`, formData),

      verifyPayment: (reference: string, isLive: boolean, type: "authenticated" | "oneTime") =>
        jsonFetch<AdminVerifyResult>(`${BASE}/admin/requests/${encodeURIComponent(reference)}/verify-payment`, {
          method: "POST",
          body: JSON.stringify({ isLive, type }),
        }),
    },
  },

  session: {
    /** The legacy multi-platform cookie session, not the native JWT one — see app/api/v1/reva/session/route.ts. */
    get: () => jsonFetch<EncryptedUserData>(`${BASE}/session`),
  },

  auth: {
    /** The native JWT session (id/email/role) — client components that need "who am I" without a server page. */
    me: () => jsonFetch<{ id: string; email: string; role: string }>(`/api/v1/auth/me?platform=reva`),
  },
};
