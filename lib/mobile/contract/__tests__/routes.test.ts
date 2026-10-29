import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  gate: vi.fn(),
}));

// The database is never reached: any query rejects, so a handler that gets as far as one answers
// with a 500, which is all these tests need to know ("it got past the checks I am asking about").
vi.mock("@/lib/prisma", () => {
  const deep = (): unknown =>
    new Proxy(function () {}, {
      get: (_target, prop) => (prop === "then" ? undefined : deep()),
      apply: () => {
        const rejected = Promise.reject(new Error("database touched"));
        rejected.catch(() => undefined);
        return rejected;
      },
    });
  return { default: deep() };
});
vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  consumeRateLimit: vi.fn(async () => true),
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => true,
  assertMobileClientAllowed: mocks.gate,
  assertMobileSignInEnabled: vi.fn(),
}));

const { ENDPOINTS } = await import("@/lib/mobile/contract/endpoints");
const { ERROR_CODES } = await import("@/lib/mobile/contract/errorCodes");
const errors = await import("@/lib/api/errors");
const { parsePlanSummaryQuery } =
  await import("@/surfboard/utils/planSummaryQuery");
const { parsePlanStatsQuery } =
  await import("@/surfboard/utils/planStatsQuery");
const { parseBatchSummaryQuery } =
  await import("@/surfboard/utils/batchSummaryQuery");
const { SurfboardRole } = await import("@/utils/platform");

type Endpoint = (typeof ENDPOINTS)[number];

const ROOT = path.join(__dirname, "../../../..");
const ROUTES: Record<string, () => Promise<Record<string, unknown>>> = {
  "app/api/v1/auth/mobile/login/route.ts": () =>
    import("@/app/api/v1/auth/mobile/login/route"),
  "app/api/v1/auth/mobile/refresh/route.ts": () =>
    import("@/app/api/v1/auth/mobile/refresh/route"),
  "app/api/v1/auth/mobile/logout/route.ts": () =>
    import("@/app/api/v1/auth/mobile/logout/route"),
  "app/api/v1/auth/mobile/request-password-reset/route.ts": () =>
    import("@/app/api/v1/auth/mobile/request-password-reset/route"),
  "app/api/v1/auth/me/route.ts": () => import("@/app/api/v1/auth/me/route"),
  "app/api/v1/auth/mobile/devices/route.ts": () =>
    import("@/app/api/v1/auth/mobile/devices/route"),
  "app/api/v1/auth/mobile/devices/[familyId]/route.ts": () =>
    import("@/app/api/v1/auth/mobile/devices/[familyId]/route"),
  "app/api/v1/auth/mobile/verify-email/route.ts": () =>
    import("@/app/api/v1/auth/mobile/verify-email/route"),
  "app/api/v1/auth/mobile/resend-verification/route.ts": () =>
    import("@/app/api/v1/auth/mobile/resend-verification/route"),
  "app/api/v1/auth/mobile/push-token/route.ts": () =>
    import("@/app/api/v1/auth/mobile/push-token/route"),
  "app/api/v1/surfboard/plans/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/summary/route"),
  "app/api/v1/surfboard/plans/counts/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/counts/route"),
  "app/api/v1/surfboard/plans/[planId]/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/[planId]/summary/route"),
  "app/api/v1/surfboard/plans/[planId]/files/[n]/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/[planId]/files/[n]/route"),
  "app/api/v1/surfboard/plans/map/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/map/route"),
  "app/api/v1/surfboard/settings/coordinate-shifts/route.ts": () =>
    import("@/app/api/v1/surfboard/settings/coordinate-shifts/route"),
  "app/api/v1/surfboard/cod/batches/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/cod/batches/summary/route"),
  "app/api/v1/surfboard/cod/batches/[batchId]/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/cod/batches/[batchId]/summary/route"),
  "app/api/v1/surfboard/plans/stats/route.ts": () =>
    import("@/app/api/v1/surfboard/plans/stats/route"),
  "app/api/v1/surfboard/profile/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/profile/summary/route"),
  "app/api/v1/surfboard/subscription/summary/route.ts": () =>
    import("@/app/api/v1/surfboard/subscription/summary/route"),
  "app/api/v1/surfboard/qr/wallet-summary/route.ts": () =>
    import("@/app/api/v1/surfboard/qr/wallet-summary/route"),
};

async function handlerFor(endpoint: Endpoint) {
  const loader = ROUTES[endpoint.routeFile];
  expect(
    loader,
    `${endpoint.routeFile} is imported at the top of this test`
  ).toBeTypeOf("function");
  const module = await loader();
  const handler = module[endpoint.method.toUpperCase()];
  expect(
    handler,
    `${endpoint.routeFile} exports ${endpoint.method.toUpperCase()}`
  ).toBeTypeOf("function");
  return handler as (req: NextRequest, ctx?: unknown) => Promise<Response>;
}

/** A request to the endpoint as the app would send it, with the documented example values. */
function requestFor(endpoint: Endpoint, body?: unknown) {
  const params = endpoint.params ?? [];
  const pathValues = Object.fromEntries(
    params.filter((p) => p.in === "path").map((p) => [p.name, p.example])
  );
  const query = new URLSearchParams(
    params
      .filter((p) => p.in === "query" && p.required)
      .map((p) => [p.name, p.example])
  ).toString();
  const url = endpoint.path.replace(
    /\{(\w+)\}/g,
    (_, name: string) => pathValues[name]
  );
  const req = new NextRequest(
    `http://localhost${url}${query ? `?${query}` : ""}`,
    {
      method: endpoint.method.toUpperCase(),
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
        "x-app-version": "1.0.0",
        "x-app-platform": "android",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  );
  return { req, ctx: { params: Promise.resolve(pathValues) } };
}

async function call(endpoint: Endpoint, body?: unknown) {
  const handler = await handlerFor(endpoint);
  const { req, ctx } = requestFor(endpoint, body);
  const res = await handler(req, ctx);
  const json = (await res.json().catch(() => null)) as { code?: string } | null;
  return { status: res.status, code: json?.code };
}

const session = (over: Record<string, unknown> = {}) => ({
  sub: "user-1",
  role: SurfboardRole.USER,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

beforeEach(() => {
  mocks.session.mockReset().mockResolvedValue(session());
  mocks.gate.mockReset().mockResolvedValue(undefined);
});

const signedIn = ENDPOINTS.filter((e) => e.access !== "public");

describe("the documented routes are real", () => {
  it.each(ENDPOINTS.map((e) => [e.operationId, e] as const))(
    "%s: its route file answers that method",
    async (_id, endpoint) => {
      await handlerFor(endpoint);
    },
    // Each route file is imported cold (some pull in S3 and PDF code), which can pass 5 s when the
    // whole suite runs on a busy machine; alone the file takes under 7 s for all of them.
    30_000
  );

  it("documents every method of every route under auth/mobile (nothing undocumented can be added)", () => {
    const dir = path.join(ROOT, "app/api/v1/auth/mobile");
    const files: string[] = [];
    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "route.ts")
          files.push(path.relative(ROOT, full));
      }
    };
    walk(dir);

    const exported = files.flatMap((file) => {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      return Array.from(
        source.matchAll(
          /export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g
        ),
        (m) => `${m[1]} ${file}`
      );
    });
    const documented = ENDPOINTS.filter((e) =>
      e.routeFile.startsWith("app/api/v1/auth/mobile/")
    ).map((e) => `${e.method.toUpperCase()} ${e.routeFile}`);
    expect(exported.sort()).toEqual(documented.sort());
  });
});

describe("who may call what", () => {
  it.each(signedIn.map((e) => [e.operationId, e] as const))(
    "%s: no session is a 401 UNAUTHENTICATED",
    async (_id, endpoint) => {
      mocks.session.mockResolvedValue(null);
      expect(await call(endpoint)).toMatchObject({
        status: 401,
        code: "UNAUTHENTICATED",
      });
    }
  );

  it.each(signedIn.map((e) => [e.operationId, e] as const))(
    "%s: an unverified account past its grace is held back only where the contract says",
    async (_id, endpoint) => {
      mocks.session.mockResolvedValue(
        session({ emailVerified: false, mustVerifyNow: true })
      );
      const { code } = await call(endpoint, endpoint.body?.example);
      if (endpoint.access === "surveyor")
        expect(code).toBe("EMAIL_VERIFICATION_REQUIRED");
      else expect(code).not.toBe("EMAIL_VERIFICATION_REQUIRED");
    }
  );

  it.each(signedIn.map((e) => [e.operationId, e] as const))(
    "%s: another role is refused only where the contract says it is for surveyors",
    async (_id, endpoint) => {
      mocks.session.mockResolvedValue(session({ role: SurfboardRole.ADMIN }));
      const { code } = await call(endpoint, endpoint.body?.example);
      if (
        endpoint.access === "surveyor" ||
        endpoint.access === "surveyor-unverified"
      )
        expect(code).toBe("FORBIDDEN");
      else expect(code).not.toBe("FORBIDDEN");
    }
  );

  it.each(
    ENDPOINTS.filter((e) => e.access === "public").map(
      (e) => [e.operationId, e] as const
    )
  )("%s: needs no session", async (_id, endpoint) => {
    mocks.session.mockResolvedValue(null);
    const { code } = await call(endpoint, endpoint.body?.example);
    expect(code).not.toBe("UNAUTHENTICATED");
  });
});

describe("the app version gate", () => {
  it.each(ENDPOINTS.map((e) => [e.operationId, e] as const))(
    "%s: checked exactly when the contract says",
    async (_id, endpoint) => {
      await call(endpoint, endpoint.body?.example);
      expect(mocks.gate.mock.calls.length > 0).toBe(endpoint.versionGate);
    }
  );
});

/** How each list's own parser reads its query string. */
const PARSERS: Record<string, (params: URLSearchParams) => unknown> = {
  listPlanSummaries: parsePlanSummaryQuery,
  planStats: parsePlanStatsQuery,
  listBatchSummaries: parseBatchSummaryQuery,
};
const plain = (value: unknown) => JSON.stringify(value);

describe("query parameters", () => {
  const withParser = ENDPOINTS.filter((e) => PARSERS[e.operationId]);

  it("every list with a query string has a parser to compare with", () => {
    const needing = ENDPOINTS.filter((e) =>
      (e.params ?? []).some((p) => p.in === "query" && !p.required)
    ).map((e) => e.operationId);
    expect(needing.sort()).toEqual(withParser.map((e) => e.operationId).sort());
  });

  for (const endpoint of withParser) {
    const parse = PARSERS[endpoint.operationId];
    const params = (endpoint.params ?? []).filter((p) => p.in === "query");

    it.each(params.map((p) => [p.name, p] as const))(
      `${endpoint.operationId}: "%s" is read by the real parser`,
      (_name, param) => {
        const baseline = plain(parse(new URLSearchParams()));
        expect(
          plain(parse(new URLSearchParams({ [param.name]: param.example })))
        ).not.toBe(baseline);
      }
    );

    it(`${endpoint.operationId}: every documented example is accepted together`, () => {
      expect(() =>
        parse(new URLSearchParams(params.map((p) => [p.name, p.example])))
      ).not.toThrow();
    });

    it(`${endpoint.operationId}: a value outside a documented list is a 400 VALIDATION_ERROR`, () => {
      const enums = params.flatMap((p) => {
        const schema = z.toJSONSchema(p.schema) as { enum?: string[] };
        return schema.enum ? [{ param: p, options: schema.enum }] : [];
      });
      for (const { param, options } of enums) {
        for (const option of options)
          expect(
            () => parse(new URLSearchParams({ [param.name]: option })),
            `${param.name}=${option}`
          ).not.toThrow();
        expect(
          () => parse(new URLSearchParams({ [param.name]: "bogus" })),
          `${param.name}=bogus`
        ).toThrow(errors.ValidationError);
      }
    });
  }
});

describe("request bodies", () => {
  const withBody = ENDPOINTS.filter((e) => e.body);

  it.each(withBody.map((e) => [e.operationId, e] as const))(
    "%s: the example is a valid request body for the real route",
    async (_id, endpoint) => {
      const { status, code } = await call(endpoint, endpoint.body!.example);
      expect(code).not.toBe("VALIDATION_ERROR");
      expect(status).not.toBe(400);
    }
  );

  it.each(withBody.map((e) => [e.operationId, e] as const))(
    "%s: each invalid example is refused with 400 VALIDATION_ERROR",
    async (_id, endpoint) => {
      for (const invalid of endpoint.body!.invalid) {
        expect(
          await call(endpoint, invalid),
          JSON.stringify(invalid)
        ).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
      }
    }
  );

  it.each(withBody.map((e) => [e.operationId, e] as const))(
    "%s: the example also satisfies the schema the document publishes",
    (_id, endpoint) => {
      expect(
        endpoint.body!.schema.safeParse(endpoint.body!.example).success
      ).toBe(true);
      for (const invalid of endpoint.body!.invalid)
        expect(
          endpoint.body!.schema.safeParse(invalid).success,
          JSON.stringify(invalid)
        ).toBe(false);
    }
  );
});

describe("the failure codes", () => {
  it("match the error classes the routes throw", () => {
    const cases: [
      InstanceType<(typeof errors)["ApiError"]>,
      keyof typeof ERROR_CODES,
    ][] = [
      [new errors.ValidationError({}), "VALIDATION_ERROR"],
      [new errors.UnauthenticatedError(), "UNAUTHENTICATED"],
      [new errors.ForbiddenError(), "FORBIDDEN"],
      [new errors.NotFoundError("Plan"), "NOT_FOUND"],
      [new errors.RateLimitError(), "RATE_LIMITED"],
      [new errors.SubscriptionRequiredError(), "SUBSCRIPTION_REQUIRED"],
      [
        new errors.EmailVerificationRequiredError(),
        "EMAIL_VERIFICATION_REQUIRED",
      ],
      [
        new errors.AppUpdateRequiredError({
          platform: "android",
          minimumVersion: "2.0.0",
          storeUrl: "",
        }),
        "APP_UPDATE_REQUIRED",
      ],
      [new errors.MobileSignInDisabledError(), "MOBILE_SIGN_IN_DISABLED"],
    ];
    for (const [error, code] of cases) {
      expect(error.code).toBe(code);
      expect(error.status).toBe(ERROR_CODES[code].status);
    }
  });

  it("are exactly the codes written in the documented routes and the file-link service", () => {
    const sources = [
      ...new Set(ENDPOINTS.map((e) => e.routeFile)),
      "surfboard/services/planFileLinkService.ts",
    ];
    const found = new Map<string, number>();
    for (const file of sources) {
      const text = fs.readFileSync(path.join(ROOT, file), "utf8");
      for (const m of text.matchAll(/new ApiError\(\s*(\d{3}),\s*"([A-Z_]+)"/g))
        found.set(m[2], Number(m[1]));
      for (const m of text.matchAll(/\[(\d{3}),\s*"([A-Z_]+)",/g))
        found.set(m[2], Number(m[1]));
      for (const m of text.matchAll(/code:\s*"([A-Z_]+)"/g))
        if (!found.has(m[1])) found.set(m[1], 0);
      for (const m of text.matchAll(/:\s*"(VERIFICATION_CODE_[A-Z]+)"/g))
        found.set(m[1], 400);
    }
    // Codes that come from the shared error classes rather than being written in a route.
    const fromClasses = [
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "RATE_LIMITED",
      "SUBSCRIPTION_REQUIRED",
      "EMAIL_VERIFICATION_REQUIRED",
      "APP_UPDATE_REQUIRED",
      "MOBILE_SIGN_IN_DISABLED",
    ];

    expect([...new Set([...found.keys(), ...fromClasses])].sort()).toEqual(
      Object.keys(ERROR_CODES).sort()
    );
    for (const [code, status] of found) {
      if (status)
        expect(ERROR_CODES[code as keyof typeof ERROR_CODES].status, code).toBe(
          status
        );
    }
  });

  it("are only listed against an operation once, and every one is used by some operation or by the shared gates", () => {
    // SUBSCRIPTION_REQUIRED is on the list because the app reacts to it, but only capability
    // actions (which the app does not make yet) return it: none of these reads ever does.
    const usedByGates = new Set([
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "EMAIL_VERIFICATION_REQUIRED",
      "APP_UPDATE_REQUIRED",
      "SUBSCRIPTION_REQUIRED",
    ]);
    const used = new Set(ENDPOINTS.flatMap((e) => e.errors ?? []));
    const unused = Object.keys(ERROR_CODES).filter(
      (code) => !used.has(code as never) && !usedByGates.has(code)
    );
    expect(unused).toEqual([]);
    for (const endpoint of ENDPOINTS) {
      expect(new Set(endpoint.errors).size, endpoint.operationId).toBe(
        (endpoint.errors ?? []).length
      );
    }
  });
});
