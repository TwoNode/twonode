import type { ApiResult } from "@/lib/api/types";
import type { GBCEdition } from "@/gbc/utils/settings";
import type { GalleryItem } from "@/gbc/types/gallery";
import type { Speaker } from "@/gbc/types/speaker";

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

export type AddAdminInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "ADMIN" | "SUPERADMIN";
};

export type UploadResult = { key: string; url: string; thumbnailKey?: string; thumbnailUrl?: string };
export type UploadKind = "sponsor-logo" | "partner-logo" | "speaker-photo" | "gallery-media";

export type GalleryInput = {
  title: string;
  description?: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  mediaS3Key?: string;
  thumbnailUrl?: string;
  thumbnailS3Key?: string;
  year: number;
  order?: number;
  visible?: boolean;
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
    list: (year?: number) =>
      jsonFetch<GalleryItem[]>(`${BASE}/gallery${year ? `?year=${year}` : ""}`),

    listAll: () => jsonFetch<GalleryItem[]>(`${BASE}/admin/gallery`),

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
    list: () => jsonFetch<Speaker[]>(`${BASE}/speakers`),

    listAll: () => jsonFetch<Speaker[]>(`${BASE}/admin/speakers`),

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
};
