import { describe, expect, it } from "vitest";
import { loginUrlWithReturn } from "../loginReturn";

describe("loginUrlWithReturn", () => {
  it("returns to the page the user was on, with its query", () => {
    expect(
      loginUrlWithReturn("/reva-restricted/login", {
        pathname: "/reva-restricted/dashboard/details",
        search: "?reference=reva_x",
      })
    ).toBe(
      "/reva-restricted/login?post_login_redirect_url=%2Freva-restricted%2Fdashboard%2Fdetails%3Freference%3Dreva_x"
    );
  });

  it("matches what the proxy attaches (a relative path, encoded)", () => {
    const url = loginUrlWithReturn("/reva/login", {
      pathname: "/reva/dashboard",
      search: "",
    });
    const back = new URL(url, "http://x").searchParams.get(
      "post_login_redirect_url"
    );
    expect(back).toBe("/reva/dashboard");
  });

  it("adds nothing on authentication pages or the home page", () => {
    for (const pathname of [
      "/",
      "/reva/login",
      "/reva-restricted/login",
      "/surfboard/error-login",
      "/api/auth/logout",
    ]) {
      expect(loginUrlWithReturn("/reva/login", { pathname, search: "" })).toBe(
        "/reva/login"
      );
    }
  });

  it("falls back to the plain login path without a browser", () => {
    expect(loginUrlWithReturn("/reva/login")).toBe("/reva/login");
  });
});
