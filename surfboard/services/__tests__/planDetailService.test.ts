import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findFirst: mocks.findFirst } },
}));
vi.mock("@/surfboard/services/analyticsService", () => ({
  PROVISIONAL_TYPES: [],
}));
vi.mock("@/surfboard/services/planSearchService", () => ({
  findPillarMatchIds: vi.fn(),
}));

const { getPlanDetail } =
  await import("@/surfboard/services/planDetailService");
const { NotFoundError } = await import("@/lib/api/errors");

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const RECORD_COPY =
  "https://bucket.s3.amazonaws.com/surfboard/LA/2026/0412/redcopy/rc.pdf";
const PDF = "https://bucket.s3.amazonaws.com/surfboard/owner-1/pdf/1700-a.pdf";
const DWG = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cad/1700-b.DWG";
const CERT = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cert/c.png";

// About 33 m by 33 m near Lagos, so roughly 1,100 square metres.
const SQUARE = {
  type: "Polygon",
  coordinates: [
    [
      [3.4, 6.5],
      [3.4003, 6.5],
      [3.4003, 6.5003],
      [3.4, 6.5003],
      [3.4, 6.5],
    ],
  ],
};

/** A plan as the database returns it for the detail select. */
const row = (over: Record<string, unknown> = {}) => ({
  id: PLAN_ID,
  userId: "owner-1",
  planNumber: "LA/2026/0412",
  surveyTitle: "Survey of land at Ajah",
  planType: "APPROVED LAYOUT",
  facilitator: "Adeyemi & Partners",
  lga: "Eti-Osa",
  ward: "Ajah",
  lcda: null,
  locality: "Ajah",
  state: "Lagos",
  dateOnSurveyPlan: new Date("2026-09-12T00:00:00Z"),
  dateLodged: null,
  createdAt: new Date("2026-09-13T08:00:00Z"),
  updatedAt: new Date("2026-10-01T08:00:00Z"),
  redCopyFileUrl: RECORD_COPY,
  sharedTo: ["viewer-1", "viewer-2"],
  status: "PENDING",
  redCopyStatus: "SUBMITTED",
  physicalCopySubmitted: false,
  accountsStatus: "APPROVED",
  chartingStatus: "APPROVED",
  surconStatus: "APPROVED",
  recordsIStatus: "APPROVED",
  intakeStatus: "PENDING",
  recordsIIStatus: "PENDING",
  accountsComment: null,
  accountsApprovedAt: new Date("2026-10-11T09:00:00Z"),
  chartingComment: null,
  chartingApprovedAt: new Date("2026-10-12T09:00:00Z"),
  surconComment: null,
  surconApprovedAt: new Date("2026-10-12T10:00:00Z"),
  recordsIComment: null,
  recordsIApprovedAt: new Date("2026-10-13T09:00:00Z"),
  intakeComment: null,
  intakeApprovedAt: null,
  recordsIIComment: null,
  recordsIIApprovedAt: null,
  batch: { id: "batch-1", batchCode: "CoD-0042", paymentStatus: "LASG_PAID" },
  user: { firstName: "Ada", lastName: "Obi" },
  deededArea: "1,250 m²",
  pillarType: "Regular",
  referencePlanNumber: null,
  pillars: [{}, {}, {}, {}],
  geometry: SQUARE,
  redCopySubmittedAt: new Date("2026-10-10T08:00:00Z"),
  physicalCopySubmittedAt: null,
  archiveReceivedAt: null,
  pdfFilePaths: [PDF],
  cadFilePaths: [DWG],
  certificateFilePaths: [],
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findFirst.mockResolvedValue(row());
});

describe("getPlanDetail: who can read a plan", () => {
  it("looks only at the caller's own and shared plans, never the trash", async () => {
    await getPlanDetail("owner-1", PLAN_ID);
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: PLAN_ID,
      deleted: false,
      OR: [{ userId: "owner-1" }, { sharedTo: { has: "owner-1" } }],
    });
  });

  it("answers not found for a plan that is not theirs, shared or deleted", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getPlanDetail("stranger", PLAN_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it.each(["abc", "../etc", "1", `${PLAN_ID}0`, ""])(
    "answers not found, without asking the database, for the id %j",
    async (id) => {
      await expect(getPlanDetail("owner-1", id)).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(mocks.findFirst).not.toHaveBeenCalled();
    }
  );
});

describe("getPlanDetail: the owner's view", () => {
  it("returns the summary and the key facts", async () => {
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d).toMatchObject({
      id: PLAN_ID,
      planNumber: "LA/2026/0412",
      displayStatus: { code: "READY_FOR_PHYSICAL" },
      isOwner: true,
      sharedCount: 2,
      ownerName: null,
      deededArea: "1,250 m²",
      pillarType: "Regular",
      pillarCount: 4,
      referencePlanNumber: null,
      hasRecordCopy: true,
      submittedAt: "2026-10-10T08:00:00.000Z",
      physicalCopySubmittedAt: null,
      archiveReceivedAt: null,
      batch: { id: "batch-1", batchCode: "CoD-0042" },
    });
  });

  it("works out the area and centre from the boundary without returning it", async () => {
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d.areaSqM).toBeGreaterThan(900);
    expect(d.areaSqM).toBeLessThan(1300);
    expect(d.centroid!.lng).toBeCloseTo(3.40015, 4);
    expect(d.centroid!.lat).toBeCloseTo(6.50015, 4);
    const json = JSON.stringify(d);
    expect(json).not.toContain("coordinates");
    expect(json).not.toContain("geometry");
    expect(json).not.toContain("pillars");
  });

  it.each([null, {}, { type: "Point", coordinates: [1, 2] }, 42])(
    "gives no area or centre for an unusable boundary (%j)",
    async (geometry) => {
      mocks.findFirst.mockResolvedValue(row({ geometry }));
      const d = await getPlanDetail("owner-1", PLAN_ID);
      expect(d.areaSqM).toBeNull();
      expect(d.centroid).toBeNull();
    }
  );

  it("says when each review acted, and nothing for one that is pending", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        recordsIStatus: "PENDING",
        // left over from before the plan went back to pending
        recordsIApprovedAt: new Date("2026-09-01T00:00:00Z"),
      })
    );
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d.stageDecidedAt).toEqual({
      accounts: "2026-10-11T09:00:00.000Z",
      charting: "2026-10-12T09:00:00.000Z",
      surcon: "2026-10-12T10:00:00.000Z",
      recordsI: null,
      intake: null,
      recordsII: null,
    });
  });

  it("counts a missing review as pending", async () => {
    mocks.findFirst.mockResolvedValue(
      row({ intakeStatus: null, recordsIIStatus: null })
    );
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d.stages.intake).toBe("PENDING");
    expect(d.stageDecidedAt.recordsII).toBeNull();
  });

  it("gives the reviewer's words and when for a query, to the owner", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        chartingStatus: "QUERIED",
        chartingComment: "Closure outside tolerance.",
        chartingApprovedAt: new Date("2026-10-14T09:00:00Z"),
      })
    );
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d.displayStatus).toEqual({
      code: "QUERIED",
      label: "Queried by Charting",
    });
    expect(d.queries).toEqual([
      {
        stage: "charting",
        label: "Charting",
        comment: "Closure outside tolerance.",
        at: "2026-10-14T09:00:00.000Z",
      },
    ]);
    expect(d.stageDecidedAt.charting).toBe("2026-10-14T09:00:00.000Z");
  });

  it("does not report a submission date for a record copy that was never accepted", async () => {
    for (const redCopyStatus of ["NOT_SUBMITTED", "FAILED"]) {
      mocks.findFirst.mockResolvedValue(row({ redCopyStatus }));
      expect((await getPlanDetail("owner-1", PLAN_ID)).submittedAt).toBeNull();
    }
  });

  it("carries the hand-in and archive dates once they happen", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        physicalCopySubmitted: true,
        physicalCopySubmittedAt: new Date("2026-10-15T08:00:00Z"),
        archiveReceivedAt: new Date("2026-10-18T08:00:00Z"),
        status: "LODGED",
        dateLodged: new Date("2026-10-17T00:00:00Z"),
      })
    );
    const d = await getPlanDetail("owner-1", PLAN_ID);
    expect(d).toMatchObject({
      displayStatus: { code: "LODGED" },
      physicalCopySubmittedAt: "2026-10-15T08:00:00.000Z",
      archiveReceivedAt: "2026-10-18T08:00:00.000Z",
      dateLodged: "2026-10-17T00:00:00.000Z",
    });
  });
});

describe("getPlanDetail: files", () => {
  it("lists the record copy first, then plans, drawings and certificates, as the website names them", async () => {
    mocks.findFirst.mockResolvedValue(
      row({ pdfFilePaths: [PDF, `${PDF}?x=1`], certificateFilePaths: [CERT] })
    );
    const { files } = await getPlanDetail("owner-1", PLAN_ID);
    expect(files.map((f) => [f.kind, f.name, f.format, f.viewable])).toEqual([
      ["RECORD_COPY", "LA_2026_0412.pdf", "pdf", true],
      ["SURVEY_PLAN", "LA_2026_0412.pdf", "pdf", true],
      ["SURVEY_PLAN", "LA_2026_0412_2.pdf", "pdf", true],
      ["DRAWING", "LA_2026_0412.dwg", "dwg", false],
      ["CERTIFICATE", "LA_2026_0412.png", "png", true],
    ]);
  });

  it("hands back each stored reference unchanged, for the file gateway", async () => {
    const { files } = await getPlanDetail("owner-1", PLAN_ID);
    expect(files.map((f) => f.ref)).toEqual([RECORD_COPY, PDF, DWG]);
  });

  it("skips empty entries and handles a name without an extension", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        redCopyFileUrl: null,
        pdfFilePaths: ["", "https://b/surfboard/o/pdf/noext"],
        cadFilePaths: [],
      })
    );
    const { files, hasRecordCopy } = await getPlanDetail("owner-1", PLAN_ID);
    expect(hasRecordCopy).toBe(false);
    expect(files).toEqual([
      {
        kind: "SURVEY_PLAN",
        name: "LA_2026_0412",
        format: "",
        viewable: false,
        ref: "https://b/surfboard/o/pdf/noext",
      },
    ]);
  });
});

describe("getPlanDetail: a plan shared with the caller (I-037)", () => {
  const shared = (over: Record<string, unknown> = {}) =>
    row({
      sharedTo: ["viewer-1", "viewer-2"],
      accountsComment: "Payment receipt does not match the batch.",
      chartingStatus: "QUERIED",
      chartingComment: "Closure outside tolerance.",
      user: { firstName: "Ada", lastName: "Obi" },
      ...over,
    });

  beforeEach(() => {
    mocks.findFirst.mockResolvedValue(shared());
  });

  it("says a record copy exists but offers neither its link nor a file entry for it", async () => {
    const d = await getPlanDetail("viewer-1", PLAN_ID);
    expect(d.hasRecordCopy).toBe(true);
    expect(d.files.map((f) => f.kind)).toEqual(["SURVEY_PLAN", "DRAWING"]);
    expect(JSON.stringify(d)).not.toContain(RECORD_COPY);
    expect(JSON.stringify(d)).not.toContain("redcopy");
  });

  it("still shares the plan's own files, as the file gateway does", async () => {
    const d = await getPlanDetail("viewer-1", PLAN_ID);
    expect(d.files.map((f) => f.ref)).toEqual([PDF, DWG]);
  });

  it("names the owner and nothing else about them or the other viewers", async () => {
    const d = await getPlanDetail("viewer-1", PLAN_ID);
    expect(d).toMatchObject({
      isOwner: false,
      ownerName: "Ada Obi",
      sharedCount: 0,
    });
    const json = JSON.stringify(d);
    expect(json).not.toContain("viewer-2");
    expect(json).not.toContain("@");
    expect(json).not.toContain("sharedTo");
  });

  it("gives no reviewer comments, even for a queried plan", async () => {
    const d = await getPlanDetail("viewer-1", PLAN_ID);
    expect(d.displayStatus.code).toBe("QUERIED");
    expect(d.queries).toEqual([]);
    expect(JSON.stringify(d)).not.toContain("Closure outside tolerance");
    expect(JSON.stringify(d)).not.toContain("Payment receipt");
  });

  it("gives no batch and never reveals the owner's payment state", async () => {
    mocks.findFirst.mockResolvedValue(shared({ chartingStatus: "APPROVED" }));
    const d = await getPlanDetail("viewer-1", PLAN_ID);
    expect(d.batch).toBeNull();
    // Four approvals and a paid batch would be "ready" for the owner.
    expect(d.displayStatus.code).toBe("IN_REVIEW");
    expect(JSON.stringify(d)).not.toContain("CoD-0042");
    expect(JSON.stringify(d)).not.toContain("batch-1");
  });

  it("is the same plan as the owner sees: same facts, area and dates", async () => {
    const owner = await getPlanDetail("owner-1", PLAN_ID);
    const viewer = await getPlanDetail("viewer-1", PLAN_ID);
    for (const key of [
      "planNumber",
      "deededArea",
      "pillarCount",
      "areaSqM",
      "centroid",
      "stageDecidedAt",
      "submittedAt",
    ] as const) {
      expect(viewer[key], key).toEqual(owner[key]);
    }
  });
});
