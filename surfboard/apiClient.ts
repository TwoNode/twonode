import type { ApiResult } from "@/lib/api/types";
import type { QREarningsSettingsData } from "@/surfboard/services/qrEarningsService";
import type {
  BatchLockRole,
  MDARole,
} from "@/surfboard/services/planLockService";
import type {
  AnalyticsDimension,
  DimensionBreakdownRow,
  LodgementTrend,
  MdaStageRole,
  MdaStageStats,
  StatCards,
  TimeTrendPoint,
} from "@/surfboard/services/analyticsService";

/**
 * Thin typed wrapper around the /api/v1/surfboard/* routes, for client
 * components that used to import server actions directly from
 * qrEarningsActions.ts / settingsActions.ts. Same-origin fetch already
 * sends cookies, so no credentials option is needed.
 */

const BASE = "/api/v1/surfboard";

async function jsonFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res.json();
}

async function formFetch<T>(
  url: string,
  formData: FormData,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? "POST",
    body: formData,
  });
  return res.json();
}

/** Shared query-string builder for the plans.list/shared/sharedWithMe trio — same filter/sort shape, same param names. */
function buildPlanListQuery(
  page?: number,
  pageSize?: number,
  filters?: PlanFilters,
  sort?: PlanSort,
): string {
  const sp = new URLSearchParams();
  if (page) sp.set("page", String(page));
  if (pageSize) sp.set("pageSize", String(pageSize));
  if (filters?.search) sp.set("search", filters.search);
  if (filters?.status?.length) sp.set("status", filters.status.join(","));
  if (filters?.planType?.length) sp.set("planType", filters.planType.join(","));
  if (filters?.facilitator) sp.set("facilitator", filters.facilitator);
  if (filters?.dateFrom)
    sp.set("dateFrom", new Date(filters.dateFrom).toISOString());
  if (filters?.dateTo) sp.set("dateTo", new Date(filters.dateTo).toISOString());
  if (sort) {
    sp.set("sortField", sort.field);
    sp.set("sortOrder", sort.order);
  }
  return sp.toString();
}

export type AnalyticsDateRangeParam = { dateFrom?: string | Date; dateTo?: string | Date };

/** Appends `&dateFrom=...&dateTo=...` (URL-encoded, ISO) when either bound is set — shared by every analytics.* call that takes a date range. */
function dateRangeQuery(range?: AnalyticsDateRangeParam): string {
  const sp = new URLSearchParams();
  if (range?.dateFrom) sp.set("dateFrom", new Date(range.dateFrom).toISOString());
  if (range?.dateTo) sp.set("dateTo", new Date(range.dateTo).toISOString());
  const qs = sp.toString();
  return qs ? `&${qs}` : "";
}

export type PlanFilters = {
  search?: string;
  status?: string[];
  planType?: string[];
  facilitator?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
};

export type PlanSort = {
  field:
    | "createdAt"
    | "updatedAt"
    | "surveyTitle"
    | "planNumber"
    | "status"
    | "dateOnSurveyPlan";
  order: "asc" | "desc";
};

/** {plans, total, totalPages} — plans go through withGeometry() server-side, so the shape isn't the raw SurfboardPlan[] Prisma type. */
export type PaginatedPlans = {
  plans: any[];
  total: number;
  totalPages: number;
};

export type PillarInput = {
  pillarNumber: string | number;
  easting: number;
  northing: number;
  [key: string]: any;
};

export type CreatePlanInput = {
  planNumber: string;
  surveyTitle: string;
  planType: string;
  referencePlanNumber?: string | null;
  deededArea: string;
  facilitator: string;
  pillarType: string;
  geometry: any;
  pillars: PillarInput[];
  pdfFilePaths: string[];
  cadFilePaths: string[];
  certificateFilePaths?: string[];
  dateOnSurveyPlan: string;
  dateLodged?: string | null;
  ward?: string | null;
  lcda?: string | null;
  lga?: string | null;
  state?: string | null;
  locality?: string | null;
  isLive?: boolean;
  personCount?: number;
  reasonForWithdrawalAndResubmission?: string | null;
  pillarTypeReferencePlanNumber?: string | null;
  parcels?: any;
  withdrawalAndResubmissionStatus?: string;
};

export type UpdatePlanInput = Partial<Omit<CreatePlanInput, "isLive">>;

export type AdminBoundaryResult = {
  wardname: string;
  lcdaname: string;
  lganame: string;
  statename: string;
};

export type SearchUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
};

export type ResubmitPlanInput = {
  pillars?: any;
  recordCopyUrl?: string;
  location?: { lga?: string; lcda?: string; ward?: string; state?: string };
  lasgReceiptUrl?: string;
  remitaReceiptUrl?: string;
};

export type QRAccessState = {
  accessState: "FREE" | "PAYWALL_REQUIRED" | "PAID_ACTIVE" | "EXPIRED";
  serviceType?: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT";
  expiresAt?: string;
  scanCount?: number;
  freeLimit?: number;
  isCoDAvailable: boolean;
  planId: string;
  planNumber: string;
  pricing: QREarningsSettingsData;
};

export const surfboardApi = {
  qr: {
    accessState: (planId: string, token?: string) =>
      jsonFetch<QRAccessState>(
        `${BASE}/qr/access-state?planId=${encodeURIComponent(planId)}${token ? `&token=${encodeURIComponent(token)}` : ""}`,
      ),

    initiatePayment: (input: {
      planId: string;
      serviceType: "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT";
      payerEmail?: string;
      payerName?: string;
    }) =>
      jsonFetch<{
        reference: string;
        amountInNaira: number;
        amountInKobo: number;
        paystackKey: string;
        serviceType: string;
        planNumber: string;
        payerEmail: string;
      }>(`${BASE}/qr/payments`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    verifyPayment: (reference: string, paystackRef?: string) =>
      jsonFetch<{ accessToken: string | null; expiresAt?: string }>(
        `${BASE}/qr/payments/verify`,
        {
          method: "POST",
          body: JSON.stringify({ reference, paystackRef }),
        },
      ),

    earningsOverview: () => jsonFetch<any>(`${BASE}/qr/earnings-overview`),

    settings: () => jsonFetch<QREarningsSettingsData>(`${BASE}/qr/settings`),

    saveBankDetails: (input: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
    }) =>
      jsonFetch<any>(`${BASE}/qr/bank-details`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    requestWithdrawal: (amount: number) =>
      jsonFetch<any>(`${BASE}/qr/withdrawals`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
  },
  admin: {
    kyc: {
      list: () => jsonFetch<any[]>(`${BASE}/admin/kyc`),
      toggleVerification: (userId: string, status: boolean) =>
        jsonFetch<{ success: boolean }>(`${BASE}/admin/kyc`, {
          method: "POST",
          body: JSON.stringify({ userId, status }),
        }),
    },

    qr: {
      stats: () => jsonFetch<any>(`${BASE}/admin/qr/stats`),

      pendingWithdrawals: () =>
        jsonFetch<any[]>(`${BASE}/admin/qr/withdrawals`),

      processWithdrawal: (
        id: string,
        action: "APPROVE_PAYOUT" | "REJECT",
        adminComment?: string,
      ) =>
        jsonFetch<{ message: string }>(
          `${BASE}/admin/qr/withdrawals/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ action, adminComment }),
          },
        ),

      updateSettings: (settings: QREarningsSettingsData) =>
        jsonFetch<{ message: string }>(`${BASE}/admin/qr/settings`, {
          method: "PATCH",
          body: JSON.stringify(settings),
        }),
    },

    auditLogs: {
      list: (
        params: {
          page?: number;
          pageSize?: number;
          action?: string;
          entity?: string;
          userId?: string;
          search?: string;
          startDate?: Date;
          endDate?: Date;
        } = {},
      ) => {
        const qs = new URLSearchParams();
        if (params.page) qs.set("page", String(params.page));
        if (params.pageSize) qs.set("pageSize", String(params.pageSize));
        if (params.action) qs.set("action", params.action);
        if (params.entity) qs.set("entity", params.entity);
        if (params.userId) qs.set("userId", params.userId);
        if (params.search) qs.set("search", params.search);
        if (params.startDate)
          qs.set("startDate", params.startDate.toISOString());
        if (params.endDate) qs.set("endDate", params.endDate.toISOString());
        return jsonFetch<{
          data: any[];
          pagination: { page: number; pageSize: number; total: number; totalPages: number };
        }>(`${BASE}/admin/audit-logs?${qs.toString()}`);
      },

      filters: () =>
        jsonFetch<{ actions: string[]; entities: string[] }>(
          `${BASE}/admin/audit-logs/filters`,
        ),
    },

    users: {
      list: (
        params: {
          page?: number;
          pageSize?: number;
          search?: string;
          roleGroup?: "admins" | "mda";
          role?: string;
          status?: "active" | "inactive";
        } = {},
      ) => {
        const qs = new URLSearchParams();
        if (params.page) qs.set("page", String(params.page));
        if (params.pageSize) qs.set("pageSize", String(params.pageSize));
        if (params.search) qs.set("search", params.search);
        if (params.roleGroup) qs.set("roleGroup", params.roleGroup);
        if (params.role) qs.set("role", params.role);
        if (params.status) qs.set("status", params.status);
        const query = qs.toString();
        return jsonFetch<any>(`${BASE}/admin/users${query ? `?${query}` : ""}`);
      },

      stats: () => jsonFetch<any>(`${BASE}/admin/users/stats`),

      create: (input: {
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      }) =>
        jsonFetch<any>(`${BASE}/admin/users`, {
          method: "POST",
          body: JSON.stringify(input),
        }),

      updateRole: (id: string, role: string) =>
        jsonFetch<any>(`${BASE}/admin/users/${encodeURIComponent(id)}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }),

      setStatus: (id: string, isActive: boolean) =>
        jsonFetch<any>(`${BASE}/admin/users/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        }),

      updateSubscription: (
        id: string,
        input: {
          planCode: string;
          planName: string;
          amount: number;
          interval: string;
          status: string;
          currentEnd?: string | Date | null;
        },
      ) =>
        jsonFetch<any>(
          `${BASE}/admin/users/${encodeURIComponent(id)}/subscription`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),

      cancelSubscription: (id: string) =>
        jsonFetch<any>(
          `${BASE}/admin/users/${encodeURIComponent(id)}/subscription`,
          { method: "DELETE" },
        ),

      promote: (id: string) =>
        jsonFetch<any>(
          `${BASE}/admin/users/${encodeURIComponent(id)}/promote`,
          { method: "POST" },
        ),
    },

    plansMap: () => jsonFetch<{ plans: any[] }>(`${BASE}/admin/plans/map`),

    plans: {
      list: (
        params: {
          page?: number;
          pageSize?: number;
          search?: string;
          status?: string;
          tab?: "all" | "person-count" | "queries";
        } = {},
      ) => {
        const qs = new URLSearchParams();
        qs.set("page", String(params.page ?? 1));
        if (params.pageSize) qs.set("pageSize", String(params.pageSize));
        if (params.search) qs.set("search", params.search);
        if (params.status) qs.set("status", params.status);
        if (params.tab) qs.set("tab", params.tab);
        return jsonFetch<{
          data: any[];
          pagination: { page: number; pageSize: number; total: number; totalPages: number };
        }>(`${BASE}/admin/plans?${qs.toString()}`);
      },

      stats: () =>
        jsonFetch<{ total: number; pending: number; underReview: number; lodged: number; queried: number }>(
          `${BASE}/admin/plans/stats`,
        ),
    },
  },

  plans: {
    list: (params?: {
      page?: number;
      pageSize?: number;
      noPagination?: boolean;
      filters?: PlanFilters;
      sort?: PlanSort;
    }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      if (params?.noPagination) sp.set("noPagination", "true");
      const f = params?.filters;
      if (f?.search) sp.set("search", f.search);
      if (f?.status?.length) sp.set("status", f.status.join(","));
      if (f?.planType?.length) sp.set("planType", f.planType.join(","));
      if (f?.facilitator) sp.set("facilitator", f.facilitator);
      if (f?.dateFrom) sp.set("dateFrom", new Date(f.dateFrom).toISOString());
      if (f?.dateTo) sp.set("dateTo", new Date(f.dateTo).toISOString());
      if (params?.sort) {
        sp.set("sortField", params.sort.field);
        sp.set("sortOrder", params.sort.order);
      }
      const qs = sp.toString();
      return jsonFetch<PaginatedPlans>(`${BASE}/plans${qs ? `?${qs}` : ""}`);
    },

    get: (planId: string, forEdit?: boolean) =>
      jsonFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}${forEdit ? "?forEdit=true" : ""}`,
      ),

    create: (input: CreatePlanInput) =>
      jsonFetch<any>(`${BASE}/plans`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (planId: string, input: UpdatePlanInput) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...input, id: planId }),
      }),

    delete: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}`, {
        method: "DELETE",
      }),

    checkNumberExists: (planNumber: string, excludeId?: string) =>
      jsonFetch<{ exists: boolean }>(
        `${BASE}/plans/check-number?planNumber=${encodeURIComponent(planNumber)}${excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ""}`,
      ),

    deleted: (page?: number, pageSize?: number) => {
      const sp = new URLSearchParams();
      if (page) sp.set("page", String(page));
      if (pageSize) sp.set("pageSize", String(pageSize));
      const qs = sp.toString();
      return jsonFetch<PaginatedPlans>(
        `${BASE}/plans/deleted${qs ? `?${qs}` : ""}`,
      );
    },

    facilitators: (withPlanNumbers?: boolean) =>
      jsonFetch<any>(
        `${BASE}/plans/facilitators${withPlanNumbers ? "?withPlanNumbers=true" : ""}`,
      ),

    boundaries: (geometry: any) =>
      jsonFetch<AdminBoundaryResult | null>(`${BASE}/plans/geo/boundaries`, {
        method: "POST",
        body: JSON.stringify({ geometry }),
      }),

    /** Bulk — a surveyor marks a selection of their own plans as physically submitted (prerequisite for the Intake queue). */
    submitPhysicalCopies: (planIds: string[]) =>
      jsonFetch<any>(`${BASE}/plans/physical-copy`, {
        method: "POST",
        body: JSON.stringify({ planIds }),
      }),

    queried: () => jsonFetch<any[]>(`${BASE}/plans/queried`),

    referenceNumbers: (planType: string) =>
      jsonFetch<string[]>(
        `${BASE}/plans/reference-numbers?planType=${encodeURIComponent(planType)}`,
      ),

    adminBoundaries: (geometry: object) =>
      jsonFetch<{
        wardname: string;
        lcdaname: string;
        lganame: string;
        statename: string;
      } | null>(`${BASE}/plans/geo/boundaries`, {
        method: "POST",
        body: JSON.stringify({ geometry }),
      }),

    shared: (
      page?: number,
      pageSize?: number,
      filters?: PlanFilters,
      sort?: PlanSort,
    ) =>
      jsonFetch<PaginatedPlans>(
        `${BASE}/plans/shared?${buildPlanListQuery(page ?? 1, pageSize ?? 10, filters, sort)}`,
      ),

    sharedWithMe: (
      page?: number,
      pageSize?: number,
      filters?: PlanFilters,
      sort?: PlanSort,
    ) =>
      jsonFetch<PaginatedPlans>(
        `${BASE}/plans/shared-with-me?${buildPlanListQuery(page ?? 1, pageSize ?? 10, filters, sort)}`,
      ),

    deleteAttachment: (
      planId: string,
      fileUrl: string,
      fileType: "pdf" | "cad" | "certificate",
    ) =>
      jsonFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}/attachments`,
        {
          method: "DELETE",
          body: JSON.stringify({ fileUrl, fileType }),
        },
      ),

    permanentDelete: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/permanent`, {
        method: "DELETE",
      }),

    /** ctx.session.role must be a non-USER (staff) role — server re-checks regardless of what's passed here. */
    verifyPersonCount: (planId: string, count: number) =>
      jsonFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}/person-count`,
        {
          method: "PATCH",
          body: JSON.stringify({ count }),
        },
      ),

    /** Admin-only correction of a survey title. */
    updateTitle: (planId: string, surveyTitle: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/title`, {
        method: "PATCH",
        body: JSON.stringify({ surveyTitle }),
      }),

    /** Public, QR-gated: redacts geometry/pillars/centroid/user unless the caller has a PAID_ACTIVE or FREE QR-earnings session. */
    getPublic: (planId: string, token?: string) =>
      jsonFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}/public${token ? `?token=${encodeURIComponent(token)}` : ""}`,
      ),

    /** Public, ungated — full plan data, no redaction. Increments the QR scan counter. */
    getPublicFull: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/public/full`),

    generateQR: (
      planId: string,
      options?: {
        darkColor?: string;
        lightColor?: string;
        minLightAlpha?: number;
        margin?: number;
        scale?: number;
        width?: number;
        forceOpaque?: boolean;
      },
    ) => {
      const sp = new URLSearchParams();
      if (options?.darkColor) sp.set("darkColor", options.darkColor);
      if (options?.lightColor) sp.set("lightColor", options.lightColor);
      if (options?.minLightAlpha !== undefined)
        sp.set("minLightAlpha", String(options.minLightAlpha));
      if (options?.margin !== undefined)
        sp.set("margin", String(options.margin));
      if (options?.scale !== undefined) sp.set("scale", String(options.scale));
      if (options?.width !== undefined) sp.set("width", String(options.width));
      if (options?.forceOpaque) sp.set("forceOpaque", "true");
      const qs = sp.toString();
      return jsonFetch<{ qrCodeDataUrl: string }>(
        `${BASE}/plans/${encodeURIComponent(planId)}/qr${qs ? `?${qs}` : ""}`,
      );
    },

    /** Staff-only — sends the plan back to QUERIED. */
    query: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/query`, {
        method: "POST",
      }),

    updateRecordCopy: (planId: string, redCopyFileUrl: string) =>
      jsonFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}/record-copy`,
        {
          method: "PATCH",
          body: JSON.stringify({ redCopyFileUrl }),
        },
      ),

    /** multipart/form-data — the red-copy file itself, not a JSON body. */
    submitRedCopy: (planId: string, formData: FormData) =>
      formFetch<any>(
        `${BASE}/plans/${encodeURIComponent(planId)}/red-copy`,
        formData,
      ),

    restore: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/restore`, {
        method: "POST",
      }),

    resubmit: (planId: string, input: ResubmitPlanInput) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/resubmit`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    share: (planId: string, userId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/share`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),

    unshare: (planId: string, userId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/share`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }),

    updateStatus: (
      planId: string,
      status: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW",
    ) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    getWithSurveyor: (planId: string) =>
      jsonFetch<any>(`${BASE}/plans/${encodeURIComponent(planId)}/surveyor`),
  },

  cod: {
    batches: {
      /** For USER: their own batches. For ADMIN/SUPERADMIN: every batch, optionally filtered by status. */
      list: (status?: string) =>
        jsonFetch<any[]>(
          `${BASE}/cod/batches${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        ),

      /** Admin-only, paginated/searchable variant of list() — the admin Batch Management page. */
      listPaginated: (params: { page?: number; pageSize?: number; status?: string; search?: string } = {}) => {
        const qs = new URLSearchParams();
        qs.set("page", String(params.page ?? 1));
        if (params.pageSize) qs.set("pageSize", String(params.pageSize));
        if (params.status) qs.set("status", params.status);
        if (params.search) qs.set("search", params.search);
        return jsonFetch<{
          data: any[];
          pagination: { page: number; pageSize: number; total: number; totalPages: number };
        }>(`${BASE}/cod/batches?${qs.toString()}`);
      },

      statsByStatus: (status: string) =>
        jsonFetch<{ count: number; totalPlans: number; totalAmount: number }>(
          `${BASE}/cod/batches/stats?status=${encodeURIComponent(status)}`,
        ),

      submit: (planIds: string[], acceptanceAcknowledged: true) =>
        jsonFetch<any>(`${BASE}/cod/batches`, {
          method: "POST",
          body: JSON.stringify({ planIds, acceptanceAcknowledged }),
        }),

      get: (batchId: string) =>
        jsonFetch<any>(`${BASE}/cod/batches/${encodeURIComponent(batchId)}`),

      /** Admin manual receipt upload — receipt is already uploaded to S3 by the client; this just records it. */
      uploadLasgReceipt: (
        batchId: string,
        receiptUrl: string,
        receiptS3Key: string,
      ) =>
        jsonFetch<any>(
          `${BASE}/cod/batches/${encodeURIComponent(batchId)}/lasg-receipt`,
          {
            method: "POST",
            body: JSON.stringify({ receiptUrl, receiptS3Key }),
          },
        ),

      retryPayment: (batchId: string) =>
        jsonFetch<any>(
          `${BASE}/cod/batches/${encodeURIComponent(batchId)}/payment/retry`,
          { method: "POST" },
        ),

      /** Fallback single-receipt AI-analysis path (vs. the two-link cross-validated flow below). */
      verifyLasgReceiptLink: (batchId: string, receiptUrl: string) =>
        jsonFetch<any>(
          `${BASE}/cod/batches/${encodeURIComponent(batchId)}/payment/verify-lasg`,
          {
            method: "POST",
            body: JSON.stringify({ receiptUrl }),
          },
        ),

      verifyPaymentLinks: (
        batchId: string,
        lasgReceiptUrl: string,
        remitaReceiptUrl: string,
      ) =>
        jsonFetch<any>(
          `${BASE}/cod/batches/${encodeURIComponent(batchId)}/payment/verify-links`,
          {
            method: "POST",
            body: JSON.stringify({ lasgReceiptUrl, remitaReceiptUrl }),
          },
        ),

      /** Legacy single-reference Remita verification path — batchId is in the URL only, verifyBatchPayment looks the batch up by reference. */
      verifyPayment: (batchId: string, reference: string) =>
        jsonFetch<any>(
          `${BASE}/cod/batches/${encodeURIComponent(batchId)}/payment/verify`,
          {
            method: "POST",
            body: JSON.stringify({ reference }),
          },
        ),

      /** Dev-only debug tool (SUPERADMIN, non-production) — resets every plan's batch/stage/lock fields and deletes all batches. */
      reset: () =>
        jsonFetch<{ deletedCount: number }>(`${BASE}/cod/batches/reset`, {
          method: "POST",
        }),
    },

    /** Client-side fee preview before batch submit — same calculation batch submit uses internally. */
    feePreview: (input: {
      zone: string;
      areaSqM: number;
      surveyTitle: string;
      zoneFees: Array<{
        range: string;
        start: number;
        end: number;
        lagosZoneA: number;
        lagosZoneB: number;
        lagosZoneC: number;
        lagosZoneD: number;
      }>;
      ethnicity?: string;
    }) =>
      jsonFetch<{ fee: number; isDoubleFee: boolean }>(
        `${BASE}/cod/fee-preview`,
        { method: "POST", body: JSON.stringify(input) },
      ),

    locks: {
      /** FIFO claim of the oldest ready batch, for the 3 stages whose locking is batch- not plan-level. */
      claimNextBatch: (role: BatchLockRole) =>
        jsonFetch<any>(`${BASE}/cod/locks/batch/next`, {
          method: "POST",
          body: JSON.stringify({ role }),
        }),

      releaseBatch: (role: BatchLockRole) =>
        jsonFetch<any>(`${BASE}/cod/locks/batch/release`, {
          method: "POST",
          body: JSON.stringify({ role }),
        }),

      /** FIFO claim: get and lock the oldest available plan for the caller's stage. */
      claimNextPlan: (role: MDARole) =>
        jsonFetch<any>(`${BASE}/cod/locks/next`, {
          method: "POST",
          body: JSON.stringify({ role }),
        }),

      getStatus: (planId: string, role: MDARole) =>
        jsonFetch<any>(
          `${BASE}/cod/locks/${encodeURIComponent(planId)}?role=${encodeURIComponent(role)}`,
        ),

      acquire: (planId: string, role: MDARole) =>
        jsonFetch<any>(`${BASE}/cod/locks/${encodeURIComponent(planId)}`, {
          method: "POST",
          body: JSON.stringify({ role }),
        }),

      release: (planId: string, role: MDARole) =>
        jsonFetch<any>(`${BASE}/cod/locks/${encodeURIComponent(planId)}`, {
          method: "DELETE",
          body: JSON.stringify({ role }),
        }),

      /** Called when leaving the MDA admin page — release every lock the caller holds for their stage. */
      releaseAll: (role: MDARole) =>
        jsonFetch<{ releasedCount: number }>(`${BASE}/cod/locks/release-all`, {
          method: "POST",
          body: JSON.stringify({ role }),
        }),
    },

    payerProfile: () => jsonFetch<any>(`${BASE}/cod/payer-profile`),

    zone: (geometry: any) =>
      jsonFetch<{ zone: string | null }>(`${BASE}/cod/zone`, {
        method: "POST",
        body: JSON.stringify({ geometry }),
      }),
  },

  mda: {
    remarks: {
      charting: () => jsonFetch<string[]>(`${BASE}/mda/remarks/charting`),

      queryReasons: (
        role:
          | "accounts"
          | "charting"
          | "surcon"
          | "records-i"
          | "records-ii"
          | "intake",
      ) =>
        jsonFetch<string[]>(`${BASE}/mda/remarks/query-reasons?role=${role}`),
    },

    accounts: {
      batches: (view?: "history") =>
        jsonFetch<any[]>(
          `${BASE}/mda/accounts/batches${view ? `?view=${view}` : ""}`,
        ),

      /** MDA_SUPERADMIN can view (the GET above) but not decide — matches the source's role check exactly. */
      decide: (batchId: string, approved: boolean, comment?: string) =>
        jsonFetch<any>(
          `${BASE}/mda/accounts/batches/${encodeURIComponent(batchId)}/decision`,
          {
            method: "POST",
            body: JSON.stringify({ approved, comment }),
          },
        ),
    },

    archive: {
      batches: (view?: "history") =>
        jsonFetch<any[]>(
          `${BASE}/mda/archive/batches${view ? `?view=${view}` : ""}`,
        ),

      markArchived: (planId: string, notes?: string) =>
        jsonFetch<any>(
          `${BASE}/mda/archive/plans/${encodeURIComponent(planId)}`,
          {
            method: "POST",
            body: JSON.stringify({ notes }),
          },
        ),
    },

    intake: {
      batches: (view?: "history") =>
        jsonFetch<any[]>(
          `${BASE}/mda/intake/batches${view ? `?view=${view}` : ""}`,
        ),

      /** Batch-level variant: approves/queries every eligible plan in the batch in one transaction. */
      decide: (batchId: string, approved: boolean, comment?: string) =>
        jsonFetch<any>(
          `${BASE}/mda/intake/batches/${encodeURIComponent(batchId)}/decision`,
          {
            method: "POST",
            body: JSON.stringify({ approved, comment }),
          },
        ),
    },

    /** Sidebar badge counts — every MDA-adjacent role can read this. */
    pendingCounts: () => jsonFetch<any>(`${BASE}/mda/pending-counts`),

    recordsII: {
      batches: (view?: "history") =>
        jsonFetch<any[]>(
          `${BASE}/mda/records-ii/batches${view ? `?view=${view}` : ""}`,
        ),

      /** Approval here transmits to OSSG and sets the plan LODGED — kept separate from the shared /mda/:role decision route below. */
      decide: (planId: string, approved: boolean, comment?: string) =>
        jsonFetch<any>(
          `${BASE}/mda/records-ii/plans/${encodeURIComponent(planId)}/decision`,
          {
            method: "POST",
            body: JSON.stringify({ approved, comment }),
          },
        ),
    },

    /** Shared queue/history + decision routes for charting | surcon | records-i | intake, selected by :role. */
    stage: {
      plans: (
        role: "charting" | "surcon" | "records-i" | "records-ii",
        view?: "history",
      ) =>
        jsonFetch<any[]>(
          `${BASE}/mda/${role}/plans${view ? `?view=${view}` : ""}`,
        ),

      decide: (
        role: "charting" | "surcon" | "records-i" | "intake",
        planId: string,
        approved: boolean,
        comment?: string,
      ) =>
        jsonFetch<any>(
          `${BASE}/mda/${role}/plans/${encodeURIComponent(planId)}/decision`,
          {
            method: "POST",
            body: JSON.stringify({ approved, comment }),
          },
        ),
    },

    stageStats: () =>
      jsonFetch<Record<string, MdaStageStats>>(`${BASE}/mda/stage-stats`),
  },

  users: {
    lookup: (email: string, surconRegNumber: string) =>
      jsonFetch<any>(
        `${BASE}/users/lookup?email=${encodeURIComponent(email)}&surconRegNumber=${encodeURIComponent(surconRegNumber)}`,
      ),

    search: (query: string) =>
      jsonFetch<SearchUser[]>(
        `${BASE}/users/search?query=${encodeURIComponent(query)}`,
      ),
  },

  analytics: {
    /** ADMIN/SUPERADMIN get the full-population view, USER gets their own plans only (scoped server-side). */
    stats: () => jsonFetch<StatCards>(`${BASE}/analytics?section=stats`),

    dimension: (dimension: AnalyticsDimension, range?: AnalyticsDateRangeParam) =>
      jsonFetch<DimensionBreakdownRow[]>(
        `${BASE}/analytics?section=dimension&dimension=${dimension}${dateRangeQuery(range)}`,
      ),

    lodgementTrend: () =>
      jsonFetch<LodgementTrend>(`${BASE}/analytics?section=lodgement-trend`),

    timeTrend: () =>
      jsonFetch<TimeTrendPoint[]>(`${BASE}/analytics?section=time-trend`),

    /** Own-plans-only dashboard analytics (facilitator/LGA/pillar breakdowns + pending certificates). Filtered by `dateOnSurveyPlan` when a range is given. */
    dashboard: (range?: AnalyticsDateRangeParam) =>
      jsonFetch<any>(`${BASE}/analytics?section=dashboard${dateRangeQuery(range)}`),

    /** MDA stage roles use this instead — queue depth/time-in-stage, not the platform-wide numbers above. */
    mdaStageStats: () =>
      jsonFetch<Record<MdaStageRole, MdaStageStats>>(`${BASE}/mda/stage-stats`),
  },

  session: {
    /** The legacy multi-platform cookie session, not the native JWT one — see app/api/v1/surfboard/session/route.ts. */
    get: () => jsonFetch<any>(`${BASE}/session`),
  },

  profile: {
    get: () => jsonFetch<any>(`${BASE}/profile`),

    update: (formData: FormData) =>
      formFetch<any>(`${BASE}/profile`, formData, { method: "PATCH" }),
  },

  subscriptionAnalytics: {
    get: () => jsonFetch<any>(`${BASE}/subscription-analytics`),
  },

  subscription: {
    /** Self-service — clears the caller's own subscription. Dev-only debug tool. */
    clear: () =>
      jsonFetch<{ deletedCount: number }>(`${BASE}/subscription/clear`, {
        method: "POST",
      }),

    get: () => jsonFetch<any>(`${BASE}/subscription`),

    userAndActiveSub: () =>
      jsonFetch<{ subscription: any | null; user: any }>(
        `${BASE}/subscription/user-and-active`,
      ),

    initiate: (planId: string) =>
      jsonFetch<any>(`${BASE}/subscription/initiate`, {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),

    verify: (reference: string) =>
      jsonFetch<any>(`${BASE}/subscription/verify`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      }),

    disable: () =>
      jsonFetch<{
        message: string;
        data?: { currentEnd: string; nextPaymentDate: string | null };
      }>(`${BASE}/subscription/disable`, { method: "POST" }),
  },

  files: {
    /**
     * Matches the source uploadSurfboardFileToS3's ergonomics: returns
     * {url, key, originalName} directly, throws on failure — `userId` is
     * whatever S3-key-namespace string the caller passes (every real
     * caller actually passes a plan number there, preserved as-is).
     */
    uploadSurfboardFile: async (
      file: File,
      fileType: "pdf" | "cad" | "certificate" | "redcopy",
      userId: string,
      planNumber?: string,
      filename?: string,
    ) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      fd.append("userId", userId);
      if (planNumber) fd.append("planNumber", planNumber);
      if (filename) fd.append("filename", filename);
      const result = await formFetch<{
        url: string;
        key: string;
        originalName: string;
      }>(`${BASE}/files/upload`, fd);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    /** userId resolved from the session server-side — matches uploadSurfboardFileWithAuth. */
    uploadSurfboardFileWithAuth: async (
      file: File,
      fileType: "pdf" | "cad" | "certificate" | "redcopy",
      planNumber?: string,
    ) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      if (planNumber) fd.append("planNumber", planNumber);
      const result = await formFetch<{
        url: string;
        key: string;
        originalName: string;
      }>(`${BASE}/files/upload-with-auth`, fd);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    /** Matches getSurfboardUploadTargetsMulti's ergonomics — returns the target array directly, throws on failure. */
    uploadTargetsMulti: async (formData: FormData) => {
      const result = await formFetch<
        { key: string; url: string; publicUrl: string }[]
      >(`${BASE}/files/upload-multi`, formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    /** Matches deleteSurfboardFileFromS3's ergonomics — void on success, throws on failure. */
    deleteSurfboardFile: async (input: { key?: string; url?: string }) => {
      const result = await jsonFetch<{ success: boolean }>(
        `${BASE}/files/delete`,
        { method: "POST", body: JSON.stringify(input) },
      );
      if (!result.success) throw new Error(result.error);
    },
  },

  notifications: {
    list: (params?: {
      includeRead?: boolean;
      includeDismissed?: boolean;
      limit?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.includeRead === false) qs.set("includeRead", "false");
      if (params?.includeDismissed) qs.set("includeDismissed", "true");
      if (params?.limit) qs.set("limit", String(params.limit));
      const query = qs.toString();
      return jsonFetch<any[]>(
        `${BASE}/notifications${query ? `?${query}` : ""}`,
      );
    },

    /** Paginated variant for the admin Notification Management page — passing `page` switches the route to the paginated envelope shape. */
    listPaginated: (params: {
      page?: number;
      pageSize?: number;
      search?: string;
      includeRead?: boolean;
      includeDismissed?: boolean;
      type?: string;
      audience?: string;
    } = {}) => {
      const qs = new URLSearchParams();
      qs.set("page", String(params.page ?? 1));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params.search) qs.set("search", params.search);
      if (params.includeRead === false) qs.set("includeRead", "false");
      if (params.includeDismissed) qs.set("includeDismissed", "true");
      if (params.type) qs.set("type", params.type);
      if (params.audience) qs.set("audience", params.audience);
      return jsonFetch<any>(`${BASE}/notifications?${qs.toString()}`);
    },

    stats: () => jsonFetch<any>(`${BASE}/notifications/stats`),

    create: (input: {
      type:
        | "INFO"
        | "SUCCESS"
        | "WARNING"
        | "ERROR"
        | "SYSTEM"
        | "PLAN"
        | "SHARING";
      title: string;
      message: string;
      audience:
        | "SPECIFIC_USERS"
        | "GENERAL_ADMINS"
        | "SUPERADMIN"
        | "ALL_USERS";
      userIds?: string[];
      link?: string;
      metadata?: any;
      sendEmail?: boolean;
    }) =>
      jsonFetch<{ id: string }>(`${BASE}/notifications`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    unreadCount: () =>
      jsonFetch<{ count: number }>(`${BASE}/notifications/unread-count`),

    markRead: (id: string) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/notifications/${encodeURIComponent(id)}/read`,
        { method: "POST" },
      ),

    dismiss: (id: string) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/notifications/${encodeURIComponent(id)}/dismiss`,
        { method: "POST" },
      ),

    remove: (id: string) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/notifications/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
  },

  ai: {
    extractSurveyPlan: (extractedText: string) =>
      jsonFetch<any>(`${BASE}/ai/extract-survey-plan`, {
        method: "POST",
        body: JSON.stringify({ extractedText }),
      }),

    recognizePersonCount: (surveyTitle: string) =>
      jsonFetch<{ count: number; names: string[] }>(
        `${BASE}/ai/recognize-person-count`,
        {
          method: "POST",
          body: JSON.stringify({ surveyTitle }),
        },
      ),
  },

  recordCopy: {
    downloadPdf: (planId: string) =>
      jsonFetch<string>(
        `${BASE}/plans/${encodeURIComponent(planId)}/record-copy/download`,
      ),

    saveVerification: (
      planId: string,
      verdict: string,
      score: number,
      verificationData: any,
    ) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/plans/${encodeURIComponent(planId)}/record-copy/verification`,
        {
          method: "POST",
          body: JSON.stringify({ verdict, score, verificationData }),
        },
      ),
  },

  settings: {
    get: () => jsonFetch<any>(`${BASE}/settings`),

    update: (settings: any) =>
      jsonFetch<{ success: boolean }>(`${BASE}/settings`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),

    history: () => jsonFetch<any[]>(`${BASE}/settings/history`),

    revert: (settingsId: string) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/settings/revert/${encodeURIComponent(settingsId)}`,
        { method: "POST" },
      ),

    reset: () =>
      jsonFetch<{ success: boolean }>(`${BASE}/settings/reset`, {
        method: "POST",
      }),

    codSubmission: () =>
      jsonFetch<{
        codAcceptanceText: string;
        codPolicyContent: string;
        queryResponseFeePercent: number;
      }>(`${BASE}/settings/cod-submission`),

    coordinateShifts: () =>
      jsonFetch<
        Record<string, { eastingShift: number; northingShift: number }>
      >(`${BASE}/settings/coordinate-shifts`),

    sendAccountUpdateInquiry: (details: string) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/settings/account-update-inquiry`,
        {
          method: "POST",
          body: JSON.stringify({ details }),
        },
      ),

    toggleUserKyc: (userId: string, status: boolean) =>
      jsonFetch<{ success: boolean }>(
        `${BASE}/admin/users/${encodeURIComponent(userId)}/kyc`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      ),
  },
};
