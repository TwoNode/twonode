import { beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "@/utils/platform";
import { clientRefreshManager } from "@/lib/auth/clientRefreshManager";

describe("clientRefreshManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates concurrent refresh calls into a single HTTP request", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    // Call refresh concurrently 3 times for the same platform
    const [res1, res2, res3] = await Promise.all([
      clientRefreshManager.refresh(Platform.SURFBOARD),
      clientRefreshManager.refresh(Platform.SURFBOARD),
      clientRefreshManager.refresh(Platform.SURFBOARD),
    ]);

    expect(res1).toBe(true);
    expect(res2).toBe(true);
    expect(res3).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/refresh?platform=surfboard",
      { method: "POST" }
    );
  });

  it("reschedules the background timer when refresh succeeds", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const unregister = clientRefreshManager.register(Platform.SURFBOARD);

    // Fast-forward 10 minutes (refresh should not have fired yet)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(0);

    // Trigger an explicit refresh (e.g. from 401 interceptor) at minute 10
    const refreshed = await clientRefreshManager.refresh(Platform.SURFBOARD);
    expect(refreshed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Fast-forward 3 minutes (which would have been the original 13m mark).
    // Because the timer was shifted, it should NOT fire here!
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Fast-forward another 10 minutes (13 minutes total from the explicit refresh)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    unregister();
    vi.useRealTimers();
  });
});
