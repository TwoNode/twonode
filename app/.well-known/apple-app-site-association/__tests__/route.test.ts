import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("GET /.well-known/apple-app-site-association", () => {
  it("names the Surfboard app and only the verification link", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.applinks.details).toEqual([
      {
        appIDs: ["2VU8V89255.com.twonode.surfboard"],
        components: [{ "/": "/surfboard/verify-email", "?": { token: "?*" } }],
      },
    ]);
  });

  it("does not claim the reset link or any invitation: those stay on the website", async () => {
    const text = JSON.stringify(await GET().json());
    expect(text).not.toMatch(/reset-password|accept-invite/);
  });
});
