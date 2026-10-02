import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/prisma/generated";
import {
  ForbiddenError,
  handleApiError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/lib/api/errors";

/**
 * handleApiError is the single funnel every API route's error path goes
 * through (directly or via withAuth) — this is where §6.6's structured
 * logging is wired in, so it's the one place that needs a real test of
 * "does the right thing get logged at the right level."
 */

function parseLoggedJson(spy: ReturnType<typeof vi.spyOn>) {
  expect(spy).toHaveBeenCalledTimes(1);
  return JSON.parse(spy.mock.calls[0][0] as string);
}

describe("handleApiError logging", () => {
  it("logs a 4xx ApiError at warn, not error — expected control flow shouldn't page anyone", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = handleApiError(new NotFoundError("Plan"), {
      route: "/api/v1/x",
      method: "GET",
    });

    expect(res.status).toBe(404);
    const logged = parseLoggedJson(warnSpy);
    expect(logged).toMatchObject({
      level: "warn",
      message: "Plan not found",
      code: "NOT_FOUND",
      status: 404,
      route: "/api/v1/x",
      method: "GET",
    });
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("still logs unauthenticated/forbidden at warn (noisy but expected, not a bug)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    handleApiError(new UnauthenticatedError());
    handleApiError(new ForbiddenError());
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("logs a validation error's code at warn level", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = handleApiError(
      new ValidationError({ amount: "must be positive" })
    );
    expect(res.status).toBe(400);
    const logged = parseLoggedJson(warnSpy);
    expect(logged.code).toBe("VALIDATION_ERROR");
    warnSpy.mockRestore();
  });

  it("logs an unmapped Prisma error at error level with the stack trace attached", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prismaErr = new Prisma.PrismaClientKnownRequestError("boom", {
      code: "P2025",
      clientVersion: "5.0.0",
    });

    handleApiError(prismaErr, { route: "/api/v1/y", method: "POST" });

    const logged = parseLoggedJson(errorSpy);
    expect(logged.level).toBe("error");
    expect(logged.route).toBe("/api/v1/y");
    expect(logged.error).toMatchObject({
      name: "PrismaClientKnownRequestError",
    });
    errorSpy.mockRestore();
  });

  it("logs a totally unexpected thrown value at error level without crashing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError("a raw string thrown from somewhere");
    expect(res.status).toBe(500);
    const logged = parseLoggedJson(errorSpy);
    expect(logged.message).toBe("Unhandled error in API route");
    expect(logged.error).toBe("a raw string thrown from somewhere");
    errorSpy.mockRestore();
  });
});
