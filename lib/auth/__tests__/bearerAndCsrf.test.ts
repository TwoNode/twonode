import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { extractBearerToken } from "@/lib/auth/bearer";
import { validateCSRF } from "@/lib/auth/csrf";

const headers = (h: Record<string, string>) => new Headers(h);
const req = (h: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/x", {
    method: "POST",
    headers: h,
  });

describe("extractBearerToken", () => {
  it("reads a Bearer token, case-insensitively and trimmed", () => {
    expect(
      extractBearerToken(headers({ authorization: "Bearer abc.def" }))
    ).toBe("abc.def");
    expect(extractBearerToken(headers({ authorization: "bearer abc" }))).toBe(
      "abc"
    );
    expect(
      extractBearerToken(headers({ authorization: "  Bearer   abc  " }))
    ).toBe("abc");
  });

  it("returns null when there is no usable Bearer credential", () => {
    expect(extractBearerToken(headers({}))).toBeNull();
    expect(extractBearerToken(headers({ authorization: "Bearer" }))).toBeNull();
    expect(
      extractBearerToken(headers({ authorization: "Bearer " }))
    ).toBeNull();
    expect(
      extractBearerToken(headers({ authorization: "Basic abc" }))
    ).toBeNull();
    expect(
      extractBearerToken(headers({ authorization: "Bearer two parts" }))
    ).toBeNull();
  });
});

describe("validateCSRF with a bearer token", () => {
  it("lets a bearer request through with no Origin or Referer (a native app)", () => {
    expect(
      validateCSRF(req({ host: "localhost:3000", authorization: "Bearer abc" }))
    ).toBe(true);
  });

  it("still rejects a cookie-style request: no bearer, no Origin or Referer", () => {
    expect(validateCSRF(req({ host: "localhost:3000" }))).toBe(false);
  });

  it("still rejects a cross-origin request with a non-Bearer Authorization header", () => {
    expect(
      validateCSRF(
        req({
          host: "localhost:3000",
          origin: "https://evil.example",
          authorization: "Basic abc",
        })
      )
    ).toBe(false);
  });

  it("still rejects a cross-origin request that has no Authorization header", () => {
    expect(
      validateCSRF(
        req({ host: "localhost:3000", origin: "https://evil.example" })
      )
    ).toBe(false);
  });
});
