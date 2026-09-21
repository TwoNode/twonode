import type { ApiResult } from "@/lib/api/types";
import { createAuditLogApi } from "@/lib/api/auditLogClient";
import type { AdminInvitationRow, InviteAdminInput, InviteResult } from "@/lib/api/adminInvitationTypes";
import type { GBCEdition, GBCSettingsData } from "@/gbc/utils/settings";
import type { GalleryItem } from "@/gbc/types/gallery";
import type { Speaker } from "@/gbc/types/speaker";
import type { Sponsor, SponsorTier, SponsorTierWithCount } from "@/gbc/types/sponsor";
import type { GBCTicket, GBCUserNotificationType, GBCUserNotificationAudience } from "@/prisma/generated";
import type { EncryptedUserData } from "@/utils/encryptedCookies";

export type GBCNotificationItem = {
  id: string;
  type: GBCUserNotificationType;
  title: string;
  message: string;
  audience: GBCUserNotificationAudience;
  link: string | null;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
};

/**
 * Thin typed wrapper around /api/v1/gbc/* — starts with just the editions
 * surface, for the admin event-switcher (gbc-restricted/editions). Same-origin
 * fetch already sends cookies, so no credentials option is needed. Extend as
 * more admin pages get repointed off their legacy "use server" actions.
 */

const BASE = "/api/v1/gbc";

const editionQuery = (edition?: string) => (edition ? `?edition=${encodeURIComponent(edition)}` : "");

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res.json();
}

/** No Content-Type header — the browser sets the multipart boundary itself for a FormData body. */
async function formFetch<T>(url: string, formData: FormData): Promise<ApiResult<T>> {
  const res = await fetch(url, { method: "POST", body: formData });
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

export type UploadResult = { key: string; url: string; thumbnailKey?: string; thumbnailUrl?: string };
export type UploadKind = "sponsor-logo" | "partner-logo" | "speaker-photo" | "gallery-media";

export type SettingsPatch = { [K in keyof GBCSettingsData]?: Partial<GBCSettingsData[K]> };

export type ContactFormInput = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  type: "GENERAL" | "SPONSORSHIP" | "TECHNICAL" | "MEDIA" | "SPEAKING";
};

export type QRTicketData = {
  ticketNumber: string;
  name: string;
  email: string;
  ticketType: string;
  hash: string;
  timestamp: number;
};

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  type: string | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  notes: string | null;
  /** GBCEdition key current when the inquiry was submitted. */
  edition: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketPurchaseInput = {
  name: string;
  email: string;
  phone?: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  profession: string;
  otherProfession?: string;
  ticketType: "EARLY_BIRD" | "REGULAR" | "COMPANY" | "VIP" | "STUDENT";
};

export type AttendeeInput = {
  name: string;
  email: string;
  phone?: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  profession: string;
  otherProfession?: string;
  isPrimary?: boolean;
};

export type PurchaseResult = { ticket: GBCTicket; reference: string; paymentUrl: string };
export type MultiPurchaseResult = { tickets: GBCTicket[]; reference: string; paymentUrl: string };
export type TicketAvailability = { availableTickets: number; maxTickets: number; soldEarlyBirdTickets: number };
export type TicketStats = {
  totalTickets: number;
  completedTickets: number;
  pendingTickets: number;
  checkedInTickets: number;
  availableTickets: number;
  totalRevenue: number;
  maxTickets: number;
  soldEarlyBirdTickets: number;
};

export type GalleryInput = {
  title: string;
  description?: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  mediaS3Key?: string;
  thumbnailUrl?: string;
  thumbnailS3Key?: string;
  /** Omitted, derived from the edition's start date. */
  year?: number;
  order?: number;
  visible?: boolean;
  /** GBCEdition key this item belongs to — omitted, defaults to the active edition. */
  edition?: string;
};

export type SpeakerInput = {
  name: string;
  title: string;
  bio: string;
  photo: string;
  photoS3Key?: string;
  tier: "KEYNOTE" | "PANELIST" | "FIRESIDE_CHAT";
  company?: string;
  linkedin?: string;
  twitter?: string;
  order?: number;
  visible?: boolean;
  featured?: boolean;
  /** GBCEdition key this speaker belongs to — omitted, defaults to the active edition. */
  edition?: string;
};

export type SponsorInput = {
  name: string;
  logo: string;
  logoS3Key?: string;
  /** Key of a sponsor tier (see gbcApi.sponsorTiers). */
  tier: string;
  description?: string;
  website?: string;
  order?: number;
  visible?: boolean;
  /** GBCEdition key this sponsor belongs to — omitted, defaults to the active edition. */
  edition?: string;
};

export type Partner = {
  id: string;
  name: string;
  logo: string;
  logoS3Key?: string | null;
  description?: string | null;
  website?: string | null;
  order: number;
  visible: boolean;
  edition: string;
  createdAt: string;
  updatedAt: string;
};

export const gbcApi = {
  editions: {
    list: () => jsonFetch<GBCEdition[]>(`${BASE}/editions`),

    /** The edition the public site is about (ACTIVE, else the most recent PAST); null if none exist. */
    current: () => jsonFetch<GBCEdition | null>(`${BASE}/editions/current`),

    adminStats: (key: string) => jsonFetch<EditionAdminStats>(`${BASE}/admin/editions/${encodeURIComponent(key)}/stats`),

    create: (input: CreateEditionInput) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions`, { method: "POST", body: JSON.stringify(input) }),

    activate: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/activate`, { method: "PATCH" }),

    archive: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/archive`, { method: "PATCH" }),

    delete: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/delete`, { method: "DELETE" }),

    restore: (key: string) =>
      jsonFetch<GBCEdition[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/restore`, { method: "PATCH" }),

    permanentDelete: (key: string) =>
      jsonFetch<(GBCEdition & { deletedAt: string })[]>(`${BASE}/admin/editions/${encodeURIComponent(key)}/permanent`, {
        method: "DELETE",
      }),

    recycleBin: () =>
      jsonFetch<(GBCEdition & { deletedAt: string })[]>(`${BASE}/admin/editions/recycle-bin`),
  },

  certificates: {
    sendBulk: (ticketNumbers: string[], emailBody: string) =>
      jsonFetch<SendCertificatesResult>(`${BASE}/admin/certificates/send`, {
        method: "POST",
        body: JSON.stringify({ ticketNumbers, emailBody }),
      }),

    /** Ticket numbers matching the Certificates list filters, across every page. */
    recipients: (filters: { search?: string; checkedIn: string; edition: string }) => {
      const query = new URLSearchParams({ checkedIn: filters.checkedIn, edition: filters.edition });
      if (filters.search) query.set("search", filters.search);
      return jsonFetch<{ ticketNumbers: string[] }>(`${BASE}/admin/certificates/recipients?${query}`);
    },
  },

  auditLogs: createAuditLogApi(`${BASE}/admin/audit-logs`),

  invitations: {
    list: () => jsonFetch<AdminInvitationRow[]>(`${BASE}/admin/invitations`),

    create: (input: InviteAdminInput) =>
      jsonFetch<InviteResult>(`${BASE}/admin/invitations`, { method: "POST", body: JSON.stringify(input) }),

    resend: (id: string) =>
      jsonFetch<InviteResult>(`${BASE}/admin/invitations/${encodeURIComponent(id)}/resend`, { method: "POST" }),

    revoke: (id: string) =>
      jsonFetch<AdminInvitationRow>(`${BASE}/admin/invitations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  users: {
    list: () => jsonFetch<AdminSummary[]>(`${BASE}/admin/users`),

    stats: () => jsonFetch<{ total: number; superAdmins: number; admins: number }>(`${BASE}/admin/users/stats`),

    listPaginated: (params: {
      page?: number;
      pageSize?: number;
      search?: string;
      roles?: ("ADMIN" | "SUPERADMIN")[];
      statuses?: boolean[];
    } = {}) => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page ?? 1));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.roles) qs.set("roles", params.roles.join(","));
      if (params.statuses) qs.set("statuses", params.statuses.map(String).join(","));
      return jsonFetch<{
        data: AdminSummary[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`${BASE}/admin/users?${qs.toString()}`);
    },

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

  session: {
    /** Legacy multi-platform cookie session, native-JWT-adapted fallback — see app/api/v1/gbc/session/route.ts. */
    get: () => jsonFetch<EncryptedUserData>(`${BASE}/session`),
  },

  notifications: {
    list: (params?: { includeRead?: boolean; includeDismissed?: boolean; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.includeRead === false) qs.set("includeRead", "false");
      if (params?.includeDismissed) qs.set("includeDismissed", "true");
      if (params?.limit) qs.set("limit", String(params.limit));
      const query = qs.toString();
      return jsonFetch<GBCNotificationItem[]>(`${BASE}/notifications${query ? `?${query}` : ""}`);
    },

    listPaginated: (params: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: GBCUserNotificationType;
      includeRead?: boolean;
      includeDismissed?: boolean;
    } = {}) => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page ?? 1));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.type) qs.set("type", params.type);
      if (params.includeRead === false) qs.set("includeRead", "false");
      if (params.includeDismissed) qs.set("includeDismissed", "true");
      return jsonFetch<{
        data: GBCNotificationItem[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`${BASE}/notifications?${qs.toString()}`);
    },

    create: (input: {
      type: GBCUserNotificationType;
      title: string;
      message: string;
      audience: GBCUserNotificationAudience;
      userIds?: string[];
      link?: string;
      metadata?: any;
    }) => jsonFetch<{ id: string }>(`${BASE}/notifications`, { method: "POST", body: JSON.stringify(input) }),

    unreadCount: () => jsonFetch<{ count: number }>(`${BASE}/notifications/unread-count`),

    markRead: (id: string) =>
      jsonFetch<{ success: boolean }>(`${BASE}/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),

    dismiss: (id: string) =>
      jsonFetch<{ success: boolean }>(`${BASE}/notifications/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),

    remove: (id: string) =>
      jsonFetch<{ success: boolean }>(`${BASE}/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  uploads: {
    file: (kind: UploadKind, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return formFetch<UploadResult>(`${BASE}/admin/uploads/${kind}`, formData);
    },

    deleteFile: (key: string) =>
      jsonFetch<undefined>(`${BASE}/admin/uploads`, { method: "DELETE", body: JSON.stringify({ key }) }),
  },

  gallery: {
    list: (year?: number, edition?: string) => {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      if (edition) params.set("edition", edition);
      const qs = params.toString();
      return jsonFetch<GalleryItem[]>(`${BASE}/gallery${qs ? `?${qs}` : ""}`);
    },

    listAll: (edition?: string) =>
      jsonFetch<GalleryItem[]>(`${BASE}/admin/gallery${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),

    create: (input: GalleryInput) =>
      jsonFetch<GalleryItem>(`${BASE}/admin/gallery`, { method: "POST", body: JSON.stringify(input) }),

    update: (id: string, input: Partial<GalleryInput>) =>
      jsonFetch<GalleryItem>(`${BASE}/admin/gallery/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    remove: (id: string) =>
      jsonFetch<undefined>(`${BASE}/admin/gallery/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  speakers: {
    list: (edition?: string) =>
      jsonFetch<Speaker[]>(`${BASE}/speakers${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),

    listAll: (edition?: string) =>
      jsonFetch<Speaker[]>(`${BASE}/admin/speakers${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),

    create: (input: SpeakerInput) =>
      jsonFetch<Speaker>(`${BASE}/admin/speakers`, { method: "POST", body: JSON.stringify(input) }),

    update: (id: string, input: Partial<SpeakerInput>) =>
      jsonFetch<Speaker>(`${BASE}/admin/speakers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    remove: (id: string) =>
      jsonFetch<undefined>(`${BASE}/admin/speakers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  /** Admin-managed sponsorship levels (Headline, Impact, ...). */
  sponsorTiers: {
    list: () => jsonFetch<SponsorTierWithCount[]>(`${BASE}/admin/sponsor-tiers`),

    create: (input: { name: string; description?: string | null; size?: string }) =>
      jsonFetch<SponsorTier>(`${BASE}/admin/sponsor-tiers`, { method: "POST", body: JSON.stringify(input) }),

    update: (key: string, patch: { name?: string; description?: string | null; size?: string }) =>
      jsonFetch<SponsorTier>(`${BASE}/admin/sponsor-tiers/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),

    /** Sets the public display order to the order of `keys` (every tier, once). */
    reorder: (keys: string[]) =>
      jsonFetch<SponsorTier[]>(`${BASE}/admin/sponsor-tiers/order`, { method: "PUT", body: JSON.stringify({ keys }) }),

    /** Refused with 409 while sponsors are still in the tier. */
    remove: (key: string) =>
      jsonFetch<undefined>(`${BASE}/admin/sponsor-tiers/${encodeURIComponent(key)}`, { method: "DELETE" }),
  },

  sponsors: {
    list: (edition?: string) =>
      jsonFetch<Sponsor[]>(`${BASE}/sponsors${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),

    listAll: (edition?: string) =>
      jsonFetch<Sponsor[]>(`${BASE}/admin/sponsors${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),

    create: (input: SponsorInput) =>
      jsonFetch<Sponsor>(`${BASE}/admin/sponsors`, { method: "POST", body: JSON.stringify(input) }),

    // newLogoS3Key is separate from logoS3Key: the route only deletes the old
    // S3 object when a *new* upload actually replaced it, not on every edit.
    update: (id: string, input: Partial<SponsorInput>, newLogoS3Key?: string) =>
      jsonFetch<Sponsor>(`${BASE}/admin/sponsors/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...input, newLogoS3Key }),
      }),

    remove: (id: string) =>
      jsonFetch<undefined>(`${BASE}/admin/sponsors/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  partners: {
    list: (edition?: string) =>
      jsonFetch<Partner[]>(`${BASE}/partners${edition ? `?edition=${encodeURIComponent(edition)}` : ""}`),
  },

  settings: {
    /** Without `edition`, the settings of the edition the public site shows. */
    get: (edition?: string) => jsonFetch<GBCSettingsData>(`${BASE}/settings${editionQuery(edition)}`),

    /** Writes the given edition's settings (created on first save); without `edition`, the one the public site shows. */
    update: (patch: SettingsPatch, edition?: string) =>
      jsonFetch<GBCSettingsData>(`${BASE}/admin/settings${editionQuery(edition)}`, { method: "PATCH", body: JSON.stringify(patch) }),

    reset: (edition?: string) =>
      jsonFetch<GBCSettingsData>(`${BASE}/admin/settings/reset${editionQuery(edition)}`, { method: "POST" }),

    previous: (edition?: string) =>
      jsonFetch<GBCSettingsData | null>(`${BASE}/admin/settings/previous${editionQuery(edition)}`),

    rollback: (edition?: string) =>
      jsonFetch<GBCSettingsData>(`${BASE}/admin/settings/rollback${editionQuery(edition)}`, { method: "POST" }),
  },

  tickets: {
    availability: () => jsonFetch<TicketAvailability>(`${BASE}/tickets/availability`),

    byNumber: (ticketNumber: string) => jsonFetch<GBCTicket>(`${BASE}/tickets/${encodeURIComponent(ticketNumber)}`),

    purchase: (input: TicketPurchaseInput) =>
      jsonFetch<PurchaseResult>(`${BASE}/tickets`, { method: "POST", body: JSON.stringify(input) }),

    purchaseGroup: (attendees: AttendeeInput[]) =>
      jsonFetch<MultiPurchaseResult>(`${BASE}/tickets/group`, { method: "POST", body: JSON.stringify({ attendees }) }),

    purchasePair: (attendees: AttendeeInput[]) =>
      jsonFetch<MultiPurchaseResult>(`${BASE}/tickets/pair`, { method: "POST", body: JSON.stringify({ attendees }) }),

    verifyPayment: (reference: string, sendEmail?: boolean) =>
      jsonFetch<{ tickets: GBCTicket[]; count: number; amount: number }>(`${BASE}/payments/verify`, {
        method: "POST",
        body: JSON.stringify({ reference, sendEmail }),
      }),

    admin: {
      list: (filters?: { status?: string; search?: string; limit?: number }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.set("status", filters.status);
        if (filters?.search) params.set("search", filters.search);
        if (filters?.limit) params.set("limit", String(filters.limit));
        const qs = params.toString();
        return jsonFetch<GBCTicket[]>(`${BASE}/admin/tickets${qs ? `?${qs}` : ""}`);
      },

      get: (id: string) => jsonFetch<GBCTicket>(`${BASE}/admin/tickets/${encodeURIComponent(id)}`),

      remove: (id: string) =>
        jsonFetch<undefined>(`${BASE}/admin/tickets/${encodeURIComponent(id)}`, { method: "DELETE" }),

      generateQRCode: (id: string) =>
        jsonFetch<{ url: string; key: string }>(`${BASE}/admin/tickets/${encodeURIComponent(id)}/qr-code`, {
          method: "POST",
        }),

      checkIn: (ticketNumber: string) =>
        jsonFetch<{ ticket: GBCTicket; message: string }>(`${BASE}/admin/tickets/check-in`, {
          method: "POST",
          body: JSON.stringify({ ticketNumber }),
        }),

      export: () => jsonFetch<GBCTicket[]>(`${BASE}/admin/tickets/export`),

      stats: () => jsonFetch<TicketStats>(`${BASE}/admin/tickets/stats`),
    },
  },

  contact: {
    submit: (input: ContactFormInput) =>
      jsonFetch<{ inquiry: Inquiry; message: string }>(`${BASE}/contact`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  inquiries: {
    list: (filters?: { status?: string; type?: string; edition?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.type) params.set("type", filters.type);
      if (filters?.edition) params.set("edition", filters.edition);
      const qs = params.toString();
      return jsonFetch<Inquiry[]>(`${BASE}/admin/inquiries${qs ? `?${qs}` : ""}`);
    },

    remove: (id: string) =>
      jsonFetch<undefined>(`${BASE}/admin/inquiries/${encodeURIComponent(id)}`, { method: "DELETE" }),

    updateStatus: (id: string, status: Inquiry["status"]) =>
      jsonFetch<Inquiry>(`${BASE}/admin/inquiries/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    reply: (id: string, subject: string, message: string) =>
      jsonFetch<undefined>(`${BASE}/admin/inquiries/${encodeURIComponent(id)}/reply`, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      }),
  },

  qr: {
    verify: (qrDataString: string, maxAgeHours?: number) =>
      jsonFetch<{ valid: boolean; data?: QRTicketData; error?: string }>(`${BASE}/admin/qr/verify`, {
        method: "POST",
        body: JSON.stringify({ qrDataString, maxAgeHours }),
      }),
  },
};
