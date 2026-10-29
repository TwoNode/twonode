/**
 * Calls the mobile API over HTTP, as the app does, and checks every answer
 * against the contract in `lib/mobile/contract` (TASK-0015 1C.5). The unit
 * tests prove the code and the contract agree; this proves a running server
 * (local, staging or production) still answers what the app is promised, so
 * run it after a deploy and before an app release.
 *
 *   API_BASE=https://staging.example.com CHECK_EMAIL=... CHECK_PASSWORD=... npm run contract:live
 *
 * It uses a surveyor account you name, and only reads: it signs in (which
 * makes one device session), fetches every read route the app uses, refreshes
 * once and signs the session out again. Nothing else is created or changed.
 * Use an account that has some plans and a batch if you want those routes
 * checked with data; an empty account still checks the shapes.
 *
 * The password is read from the environment and never printed.
 */
import { z } from "zod/v4";
import * as S from "@/lib/mobile/contract/schemas";

const BASE = (process.env.API_BASE ?? "http://127.0.0.1:3211").replace(
  /\/$/,
  ""
);
const EMAIL = process.env.CHECK_EMAIL;
const PASSWORD = process.env.CHECK_PASSWORD;
const DEVICE_ID = `contract-check-${Date.now().toString(36)}`;

if (!EMAIL || !PASSWORD) {
  console.error(
    "Set CHECK_EMAIL and CHECK_PASSWORD (and API_BASE if it is not http://127.0.0.1:3211)."
  );
  process.exit(2);
}

let failures = 0;
let checks = 0;

type Answer = { status: number; body: unknown };

async function call(
  method: string,
  path: string,
  opts: {
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<Answer> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-app-version": "9.9.9",
      "x-app-platform": "android",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
    ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}

/** Where `sent` has a key that `kept` (what the schema keeps) does not: a field the contract does not know. */
function lostPaths(sent: unknown, kept: unknown, at = "$"): string[] {
  if (Array.isArray(sent))
    return sent.flatMap((item, i) =>
      lostPaths(item, (kept as unknown[] | undefined)?.[i], `${at}[${i}]`)
    );
  if (sent && typeof sent === "object") {
    const keptObject = (kept ?? {}) as Record<string, unknown>;
    return Object.entries(sent).flatMap(([key, value]) =>
      key in keptObject
        ? lostPaths(value, keptObject[key], `${at}.${key}`)
        : [`${at}.${key}`]
    );
  }
  return [];
}

function report(name: string, problems: string[]) {
  checks += 1;
  if (problems.length === 0) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}`);
    for (const problem of problems.slice(0, 6))
      console.log(`        ${problem}`);
  }
}

/** The answer is a success whose `data` is `schema`, with nothing the schema does not know. */
function expectData(name: string, answer: Answer, schema: z.ZodType) {
  const problems: string[] = [];
  if (answer.status !== 200)
    problems.push(`status ${answer.status}, expected 200`);
  const parsed = S.envelope(schema).safeParse(answer.body);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 4))
      problems.push(`${issue.path.join(".") || "(body)"}: ${issue.message}`);
  } else {
    for (const path of lostPaths(answer.body, parsed.data))
      problems.push(`unknown field ${path}`);
  }
  report(name, problems);
  return parsed.success ? (parsed.data as { data: unknown }).data : undefined;
}

function expectFailure(
  name: string,
  answer: Answer,
  status: number,
  code?: string
) {
  const problems: string[] = [];
  if (answer.status !== status)
    problems.push(`status ${answer.status}, expected ${status}`);
  const parsed = S.ErrorBody.safeParse(answer.body);
  if (!parsed.success) problems.push("not the failure envelope");
  else if (code && parsed.data.code !== code)
    problems.push(`code ${parsed.data.code}, expected ${code}`);
  report(name, problems);
}

async function main() {
  console.log(`Checking ${BASE}\n`);

  // -- sign in
  const login = await call("POST", "/api/v1/auth/mobile/login", {
    body: {
      platform: "surfboard",
      email: EMAIL,
      password: PASSWORD,
      deviceId: DEVICE_ID,
      deviceLabel: "contract check",
      appVersion: "9.9.9",
    },
  });
  const session = expectData("POST auth/mobile/login", login, S.LoginData) as
    z.infer<typeof S.LoginData> | undefined;
  if (!session) {
    console.log("\nCannot go on without a session.");
    process.exit(1);
  }
  const token = session.accessToken;

  expectFailure(
    "POST auth/mobile/login, wrong password",
    await call("POST", "/api/v1/auth/mobile/login", {
      body: {
        platform: "surfboard",
        email: EMAIL,
        password: `${PASSWORD}-wrong`,
        deviceId: DEVICE_ID,
      },
    }),
    401
  );
  expectFailure(
    "GET plans/counts without a session",
    await call("GET", "/api/v1/surfboard/plans/counts"),
    401,
    "UNAUTHENTICATED"
  );

  // -- the account
  expectData(
    "GET auth/me",
    await call("GET", "/api/v1/auth/me?platform=surfboard", { token }),
    S.MeData
  );
  expectData(
    "GET auth/mobile/devices",
    await call("GET", "/api/v1/auth/mobile/devices", { token }),
    z.array(S.DeviceSessionData)
  );
  expectData(
    "GET surfboard/profile/summary",
    await call("GET", "/api/v1/surfboard/profile/summary", { token }),
    S.ProfileSummaryData
  );
  expectData(
    "GET surfboard/subscription/summary",
    await call("GET", "/api/v1/surfboard/subscription/summary", { token }),
    S.SubscriptionSummaryData
  );
  expectData(
    "GET surfboard/qr/wallet-summary",
    await call("GET", "/api/v1/surfboard/qr/wallet-summary", { token }),
    S.WalletSummaryData
  );

  // -- plans
  const mine = expectData(
    "GET plans/summary",
    await call("GET", "/api/v1/surfboard/plans/summary", { token }),
    S.PlanListData
  ) as z.infer<typeof S.PlanListData> | undefined;
  expectData(
    "GET plans/summary?scope=shared-with-me",
    await call(
      "GET",
      "/api/v1/surfboard/plans/summary?scope=shared-with-me&pageSize=5",
      { token }
    ),
    S.PlanListData
  );
  expectData(
    "GET plans/summary with every filter",
    await call(
      "GET",
      "/api/v1/surfboard/plans/summary?displayStatus=QUERIED,LODGED&provisional=exclude&sortField=planNumber&sortOrder=asc&dateFrom=2020-01-01&dateTo=2030-12-31&pageSize=3",
      { token }
    ),
    S.PlanListData
  );
  expectFailure(
    "GET plans/summary with a bad status",
    await call("GET", "/api/v1/surfboard/plans/summary?displayStatus=NOPE", {
      token,
    }),
    400,
    "VALIDATION_ERROR"
  );
  expectData(
    "GET plans/counts",
    await call("GET", "/api/v1/surfboard/plans/counts", { token }),
    S.PlanCountsData
  );
  expectData(
    "GET plans/stats",
    await call("GET", "/api/v1/surfboard/plans/stats", { token }),
    S.PlanStatsData
  );
  expectData(
    "GET plans/stats with a range",
    await call(
      "GET",
      "/api/v1/surfboard/plans/stats?dateFrom=2020-01-01&dateTo=2030-12-31",
      { token }
    ),
    S.PlanStatsData
  );
  expectFailure(
    "GET plans/stats with the range reversed",
    await call(
      "GET",
      "/api/v1/surfboard/plans/stats?dateFrom=2030-01-01&dateTo=2020-01-01",
      { token }
    ),
    400,
    "VALIDATION_ERROR"
  );
  expectData(
    "GET plans/map",
    await call("GET", "/api/v1/surfboard/plans/map", { token }),
    S.PlanMapData
  );
  expectData(
    "GET settings/coordinate-shifts (no session)",
    await call("GET", "/api/v1/surfboard/settings/coordinate-shifts"),
    S.CoordinateShiftsData
  );

  const planId = mine?.data[0]?.id;
  if (planId) {
    const detail = expectData(
      "GET plans/{id}/summary",
      await call("GET", `/api/v1/surfboard/plans/${planId}/summary`, { token }),
      S.PlanDetailData
    ) as z.infer<typeof S.PlanDetailData> | undefined;
    for (const [n, file] of (detail?.files ?? []).entries()) {
      const answer = await call(
        "GET",
        `/api/v1/surfboard/plans/${planId}/files/${n}`,
        { token }
      );
      if (file.viewable)
        expectData(
          `GET plans/{id}/files/${n} (${file.kind}, ${file.format})`,
          answer,
          S.PlanFileLinkData
        );
      else
        expectFailure(
          `GET plans/{id}/files/${n} (${file.kind}, ${file.format}) is not viewable`,
          answer,
          422,
          "FILE_NOT_VIEWABLE"
        );
    }
  } else {
    console.log("SKIP  plan detail and files: this account has no plans");
  }
  expectFailure(
    "GET plans/{unknown}/summary",
    await call(
      "GET",
      "/api/v1/surfboard/plans/00000000-0000-4000-8000-000000000000/summary",
      { token }
    ),
    404,
    "NOT_FOUND"
  );

  // -- records
  const batches = expectData(
    "GET cod/batches/summary",
    await call("GET", "/api/v1/surfboard/cod/batches/summary", { token }),
    S.BatchListData
  ) as z.infer<typeof S.BatchListData> | undefined;
  expectData(
    "GET cod/batches/summary?scope=history",
    await call(
      "GET",
      "/api/v1/surfboard/cod/batches/summary?scope=history&pageSize=5",
      { token }
    ),
    S.BatchListData
  );
  const batchId = batches?.data[0]?.id;
  if (batchId)
    expectData(
      "GET cod/batches/{id}/summary",
      await call("GET", `/api/v1/surfboard/cod/batches/${batchId}/summary`, {
        token,
      }),
      S.BatchDetailData
    );
  else console.log("SKIP  batch detail: this account has no active batch");
  expectFailure(
    "GET cod/batches/{unknown}/summary",
    await call("GET", "/api/v1/surfboard/cod/batches/does-not-exist/summary", {
      token,
    }),
    404,
    "NOT_FOUND"
  );

  // -- the session itself
  const refreshed = expectData(
    "POST auth/mobile/refresh",
    await call("POST", "/api/v1/auth/mobile/refresh", {
      body: { platform: "surfboard", refreshToken: session.refreshToken },
    }),
    S.RefreshData
  ) as z.infer<typeof S.RefreshData> | undefined;
  expectFailure(
    "POST auth/mobile/refresh with a token the server never issued",
    await call("POST", "/api/v1/auth/mobile/refresh", {
      body: {
        platform: "surfboard",
        refreshToken: "not-a-token-the-server-ever-issued",
      },
    }),
    401,
    "SESSION_INVALID"
  );
  expectData(
    "POST auth/mobile/logout",
    await call("POST", "/api/v1/auth/mobile/logout", {
      body: {
        platform: "surfboard",
        refreshToken: (refreshed ?? session).refreshToken,
      },
    }),
    S.Empty
  );

  console.log(`\n${checks - failures} of ${checks} checks passed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
