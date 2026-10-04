import { describe, expect, it } from "vitest";
import {
  buildOneTimeReference,
  findOneTimePaymentProblem,
  isPlanId,
  userIdFromOneTimeReference,
} from "@/surfboard/services/oneTimePayment";

const USER = "0b8f3c1e-5d7a-4c52-9a41-0c1d2e3f4a5b";
const REF = buildOneTimeReference(true, USER, 1759000000000);

const paid = (over: Record<string, unknown> = {}) => ({
  reference: REF,
  amount: 16700 * 100,
  currency: "NGN",
  ...over,
});

describe("one-time reference", () => {
  it("round-trips the user id, whatever the id looks like", () => {
    expect(REF).toBe(`SURFBOARD_ONETIME_SUB_live_1759000000000_${USER}`);
    expect(userIdFromOneTimeReference(REF)).toBe(USER);
    expect(
      userIdFromOneTimeReference(buildOneTimeReference(false, "a_b-c_1", 5))
    ).toBe("a_b-c_1");
  });

  it.each([
    undefined,
    null,
    "",
    "SURFBOARD_SUB_live_1_user", // recurring references are not one-time
    "SURFBOARD_ONETIME_SUB_live_notanumber_user",
    "SURFBOARD_ONETIME_SUB_live_1_", // no user id
    `x${REF}`, // anchored
  ])("does not recognise %j as a reference this app issued", (ref) => {
    expect(userIdFromOneTimeReference(ref as any)).toBeNull();
  });
});

describe("isPlanId", () => {
  it("accepts the real plans and nothing inherited from Object.prototype", () => {
    for (const id of ["monthly", "quarterly", "annually"])
      expect(isPlanId(id)).toBe(true);
    for (const id of [
      "constructor",
      "__proto__",
      "toString",
      "hasOwnProperty",
      "weekly",
      "",
      undefined,
      null,
      5,
    ])
      expect(isPlanId(id)).toBe(false);
  });
});

describe("findOneTimePaymentProblem", () => {
  const check = (
    over: Partial<Parameters<typeof findOneTimePaymentProblem>[0]> = {}
  ) =>
    findOneTimePaymentProblem({
      planId: "monthly",
      userId: USER,
      reference: REF,
      transaction: paid(),
      ...over,
    });

  it("accepts a full payment for the claimed plan, in kobo", () => {
    expect(check()).toBeNull();
    expect(
      check({ planId: "quarterly", transaction: paid({ amount: 5_000_000 }) })
    ).toBeNull();
    expect(
      check({ planId: "annually", transaction: paid({ amount: 20_000_000 }) })
    ).toBeNull();
  });

  it("accepts an overpayment rather than refusing a genuine payer over a fee or rounding difference", () => {
    expect(
      check({ transaction: paid({ amount: 16700 * 100 + 150 }) })
    ).toBeNull();
  });

  it("rejects underpayment — a few naira must not buy the annual plan", () => {
    expect(
      check({ planId: "annually", transaction: paid({ amount: 100 * 100 }) })
    ).toMatchObject({ code: "UNDERPAID" });
    // One kobo short is still short.
    expect(
      check({ transaction: paid({ amount: 16700 * 100 - 1 }) })
    ).toMatchObject({ code: "UNDERPAID" });
    // The monthly price does not cover the annual plan.
    expect(
      check({ planId: "annually", transaction: paid({ amount: 16700 * 100 }) })
    ).toMatchObject({ code: "UNDERPAID" });
  });

  it("rejects amounts that aren't a real number of kobo", () => {
    for (const amount of ["1670000", NaN, undefined, null, Infinity - Infinity])
      expect(check({ transaction: paid({ amount }) })).toMatchObject({
        code: "UNDERPAID",
      });
  });

  it("rejects a reference that was issued to a different account", () => {
    expect(check({ userId: "someone-else" })).toMatchObject({
      code: "REFERENCE_NOT_ISSUED_TO_USER",
    });
  });

  it("rejects a reference this app didn't issue", () => {
    expect(
      check({
        reference: "PSK_whatever",
        transaction: paid({ reference: "PSK_whatever" }),
      })
    ).toMatchObject({ code: "REFERENCE_NOT_ISSUED_TO_USER" });
  });

  it("rejects a transaction whose reference isn't the one being claimed", () => {
    expect(
      check({ transaction: paid({ reference: `${REF}_other` }) })
    ).toMatchObject({ code: "REFERENCE_MISMATCH" });
  });

  it("rejects a payment that wasn't in naira", () => {
    expect(check({ transaction: paid({ currency: "USD" }) })).toMatchObject({
      code: "WRONG_CURRENCY",
    });
  });

  it.each(["constructor", "__proto__", "weekly", "", undefined])(
    "rejects an invalid plan id %j",
    (planId) => {
      expect(check({ planId })).toMatchObject({ code: "INVALID_PLAN" });
    }
  );
});
