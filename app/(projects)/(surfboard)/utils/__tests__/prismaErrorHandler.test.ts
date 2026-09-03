import { describe, expect, it } from "vitest";
import { Prisma } from "@/prisma/generated";
import { handlePrismaError, withPrismaErrorHandling } from "../prismaErrorHandler";

/**
 * Converted from a hand-rolled console.log script (no assertion framework,
 * never actually run as part of a build/CI step) into real vitest cases.
 * Two of the original expectations were wrong: P2002 and P2025 both have
 * entries in PRISMA_ERROR_MESSAGES, so handlePrismaError returns those
 * generic messages and never reaches the code's own more specific
 * switch-statement branches for those codes. Assertions below match the
 * function's actual behavior.
 */

describe("handlePrismaError", () => {
  it("maps a unique constraint violation (P2002) to a friendly message", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
      meta: { target: ["planNumber"] },
    });
    expect(handlePrismaError(error, "test")).toBe("A record with this value already exists");
  });

  it("maps record-not-found (P2025)", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    expect(handlePrismaError(error, "test")).toBe("Record to update/delete not found");
  });

  it("maps a foreign key constraint failure (P2003)", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "5.0.0",
    });
    expect(handlePrismaError(error, "test")).toBe("Related record not found");
  });

  it("falls back to a generic message for an unmapped Prisma error code", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unknown error", {
      code: "P9999",
      clientVersion: "5.0.0",
    });
    expect(handlePrismaError(error, "test")).toBe("A database error occurred. Please try again later.");
  });

  it("maps a Prisma validation error", () => {
    const error = new Prisma.PrismaClientValidationError("Validation failed", {
      clientVersion: "5.0.0",
    });
    expect(handlePrismaError(error, "test")).toBe(
      "Invalid data provided. Please check your input and try again."
    );
  });

  it("passes through a standard JS Error's own message", () => {
    const error = new Error("Something went wrong");
    expect(handlePrismaError(error, "test")).toBe("Something went wrong");
  });

  it("falls back to a generic message for a non-Error thrown value", () => {
    expect(handlePrismaError("a plain string", "test")).toBe(
      "An unexpected error occurred. Please try again later."
    );
  });
});

describe("withPrismaErrorHandling", () => {
  it("returns the operation's result on success", async () => {
    await expect(withPrismaErrorHandling(async () => "ok", "test")).resolves.toBe("ok");
  });

  it("rethrows as an Error carrying the friendly message", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    await expect(
      withPrismaErrorHandling(async () => {
        throw prismaError;
      }, "test")
    ).rejects.toThrow("Record to update/delete not found");
  });
});
