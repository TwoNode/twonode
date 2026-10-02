import { beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "@/utils/platform";
import { clientRefreshManager } from "@/lib/auth/clientRefreshManager";
import { surfboardApi } from "@/surfboard/apiClient";

describe("surfboardApi 401 interceptor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("intercepts 401, calls clientRefreshManager.refresh, and retries the request", async () => {
    let attempts = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      attempts++;
      if (url.includes("/api/v1/auth/refresh")) {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      if (attempts === 1) {
        // First attempt returns 401 UNAUTHORIZED
        return {
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: "UNAUTHENTICATED" }),
        };
      }
      // Second attempt (retry) succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: "p1", planNumber: "SURV/001" },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const refreshSpy = vi.spyOn(clientRefreshManager, "refresh");

    const result = await surfboardApi.plans.get("p1");

    expect(refreshSpy).toHaveBeenCalledWith(Platform.SURFBOARD);
    expect(result).toEqual({
      success: true,
      data: { id: "p1", planNumber: "SURV/001" },
    });
  });

  it("does not retry indefinitely if refresh fails", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/auth/refresh")) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: "Invalid refresh token",
          }),
        };
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: "UNAUTHENTICATED" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await surfboardApi.plans.get("p1");
    expect(result).toEqual({ success: false, error: "UNAUTHENTICATED" });
  });
});
