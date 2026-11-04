import { afterEach, describe, expect, it, vi } from "vitest";
import { developmentOnly } from "@/lib/api/developmentOnly";

afterEach(() => vi.unstubAllEnvs());

describe("developmentOnly", () => {
  it.each(["production", "test"])(
    "answers 404 and never runs the handler when NODE_ENV is %s",
    async (env) => {
      vi.stubEnv("NODE_ENV", env);
      const handler = vi.fn(async () => new Response("ran"));
      const res = await developmentOnly(handler)();
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ success: false, error: "Not found" });
      expect(handler).not.toHaveBeenCalled();
    }
  );

  it("passes the request and context through on a development server", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const handler = vi.fn(
      async (_a: string, _b: number) => new Response("ran")
    );
    const res = await developmentOnly(handler)("req", 7);
    expect(await res.text()).toBe("ran");
    expect(handler).toHaveBeenCalledWith("req", 7);
  });

  it("looks at NODE_ENV on every request, not once when the module loads", async () => {
    const handler = vi.fn(async () => new Response("ran"));
    const wrapped = developmentOnly(handler);
    vi.stubEnv("NODE_ENV", "development");
    expect((await wrapped()).status).toBe(200);
    vi.stubEnv("NODE_ENV", "production");
    expect((await wrapped()).status).toBe(404);
  });
});
