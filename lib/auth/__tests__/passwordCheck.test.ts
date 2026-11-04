import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

/**
 * I-054: checking a password must cost one bcrypt hash whether or not the account exists, or the
 * time a sign-in takes tells a caller which emails have accounts. These tests use the real bcrypt
 * for the timing check and a spy for the "exactly one compare, against which hash" checks.
 */
const { verifyPassword, NO_ACCOUNT_HASH } =
  await import("@/lib/auth/passwordCheck");

describe("NO_ACCOUNT_HASH", () => {
  it("is a real bcrypt hash at the cost every account password is hashed with (12)", () => {
    expect(NO_ACCOUNT_HASH).toMatch(/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/);
    expect(bcrypt.getRounds(NO_ACCOUNT_HASH)).toBe(12);
  });

  it("matches nothing a person could type", async () => {
    for (const guess of ["", "password", "admin123", NO_ACCOUNT_HASH]) {
      expect(await bcrypt.compare(guess, NO_ACCOUNT_HASH)).toBe(false);
    }
  }, 30_000);
});

describe("verifyPassword: one compare, always", () => {
  it.each([
    ["no stored hash (null)", null],
    ["no stored hash (undefined)", undefined],
    ["an empty stored hash", ""],
  ])(
    "with %s it hashes once against NO_ACCOUNT_HASH and says no",
    async (_l, stored) => {
      const spy = vi.spyOn(bcrypt, "compare");
      spy.mockClear();
      // Even a compare that said "true" must not let an account without a password in.
      spy.mockResolvedValueOnce(true as never);

      expect(await verifyPassword("anything", stored)).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("anything", NO_ACCOUNT_HASH);
      spy.mockRestore();
    }
  );

  it("with a stored hash it compares against that hash and returns the answer", async () => {
    const spy = vi.spyOn(bcrypt, "compare");
    spy.mockClear();
    spy.mockResolvedValueOnce(true as never);
    expect(await verifyPassword("pw", "$2b$12$stored")).toBe(true);
    spy.mockResolvedValueOnce(false as never);
    expect(await verifyPassword("pw", "$2b$12$stored")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, "pw", "$2b$12$stored");
    spy.mockRestore();
  });

  it("really accepts the right password and refuses the wrong one", async () => {
    const hash = await bcrypt.hash("correct horse", 4); // a cheap hash is enough for the logic
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });
});

describe("verifyPassword: the time it takes", () => {
  it("takes about as long for an unknown email as for a wrong password on a real account", async () => {
    const real = await bcrypt.hash("a real password", 12);
    const time = async (stored: string | null) => {
      const t0 = performance.now();
      await verifyPassword("not the password", stored);
      return performance.now() - t0;
    };

    const unknown = await time(null);
    const wrong = await time(real);

    // The old code returned in a millisecond or two for an unknown email.
    expect(unknown).toBeGreaterThan(100);
    expect(unknown / wrong).toBeGreaterThan(0.4);
    expect(unknown / wrong).toBeLessThan(2.5);
  }, 60_000);
});
