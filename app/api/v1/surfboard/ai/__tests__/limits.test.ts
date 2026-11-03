import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
  extract: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => false,
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/surfboard/services/aiExtractionService", () => ({
  extractSurveyPlanDataFromText: mocks.extract,
  recognizePersonCount: mocks.count,
}));

const { POST: extractRoute } =
  await import("@/app/api/v1/surfboard/ai/extract-survey-plan/route");
const { POST: countRoute } =
  await import("@/app/api/v1/surfboard/ai/recognize-person-count/route");
const {
  AI_COUNT_LIMIT,
  AI_EXTRACT_LIMIT,
  AI_EXTRACT_MAX_CHARS,
  AI_SURVEY_TITLE_MAX_CHARS,
} = await import("@/surfboard/utils/aiLimits");

/**
 * Both AI routes call a paid model (I-055): the text is capped and an account may make only so many
 * calls an hour. Nothing reaches the model, or even the counter, for a body that is refused.
 */
const as = (sub: string) => ({
  sub,
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});
const post = (path: string, body: unknown) =>
  new NextRequest(`http://localhost/api/v1/surfboard/ai/${path}`, {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const CASES = [
  {
    name: "extract-survey-plan",
    route: extractRoute,
    field: "extractedText",
    max: AI_EXTRACT_MAX_CHARS,
    limit: AI_EXTRACT_LIMIT,
    key: "ai-extract:",
    service: mocks.extract,
  },
  {
    name: "recognize-person-count",
    route: countRoute,
    field: "surveyTitle",
    max: AI_SURVEY_TITLE_MAX_CHARS,
    limit: AI_COUNT_LIMIT,
    key: "ai-count:",
    service: mocks.count,
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as("u1"));
  mocks.limit.mockResolvedValue(true);
  mocks.extract.mockResolvedValue({ success: true, data: { planNumber: "P" } });
  mocks.count.mockResolvedValue({
    success: true,
    data: { count: 2, names: [] },
  });
});

describe.each(CASES)("POST ai/$name", (c) => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await c.route(post(c.name, { [c.field]: "text" }))).status).toBe(
      401
    );
    expect(c.service).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("passes a normal request to the model", async () => {
    const res = await c.route(post(c.name, { [c.field]: "some text" }));
    expect(res.status).toBe(200);
    expect(c.service).toHaveBeenCalledWith("some text");
  });

  it("accepts text of exactly the largest allowed length", async () => {
    const text = "a".repeat(c.max);
    expect((await c.route(post(c.name, { [c.field]: text }))).status).toBe(200);
    expect(c.service).toHaveBeenCalledWith(text);
  });

  it("refuses text one character over the limit with a 400, before the counter and the model", async () => {
    const res = await c.route(
      post(c.name, { [c.field]: "a".repeat(c.max + 1) })
    );
    expect(res.status).toBe(400);
    expect(c.service).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("refuses an empty or missing text with a 400", async () => {
    expect((await c.route(post(c.name, { [c.field]: "" }))).status).toBe(400);
    expect((await c.route(post(c.name, {}))).status).toBe(400);
    expect(c.service).not.toHaveBeenCalled();
  });

  it("counts the call against the signed-in account, with this route's own limit", async () => {
    await c.route(post(c.name, { [c.field]: "text" }));
    expect(mocks.limit).toHaveBeenCalledTimes(1);
    expect(mocks.limit).toHaveBeenCalledWith(`${c.key}u1`, undefined, c.limit);

    mocks.session.mockResolvedValue(as("u2"));
    await c.route(post(c.name, { [c.field]: "text" }));
    expect(mocks.limit).toHaveBeenLastCalledWith(
      `${c.key}u2`,
      undefined,
      c.limit
    );
  });

  it("answers 429 and never reaches the model once the account is over its limit", async () => {
    mocks.limit.mockResolvedValue(false);
    const res = await c.route(post(c.name, { [c.field]: "text" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      success: false,
      error: "Too many AI requests. Please try again in a little while.",
    });
    expect(c.service).not.toHaveBeenCalled();
  });
});

describe("the limits themselves", () => {
  it("are an hour long, and hold a real day's use while still being a ceiling", () => {
    expect(AI_EXTRACT_LIMIT).toEqual({ max: 60, windowMs: 3_600_000 });
    expect(AI_COUNT_LIMIT).toEqual({ max: 120, windowMs: 3_600_000 });
    expect(AI_EXTRACT_MAX_CHARS).toBeGreaterThan(25_000); // the service keeps at most 25,000
  });
});
