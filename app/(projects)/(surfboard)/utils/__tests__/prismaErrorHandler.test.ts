/**
 * Test file to verify Prisma error handling
 * This file demonstrates how the error handler works with different Prisma errors
 */

import { Prisma } from "@prisma/client";
import { handlePrismaError } from "../prismaErrorHandler";

// Test cases for different Prisma errors
const testCases = [
  {
    name: "Unique constraint violation (P2002)",
    error: new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["planNumber"] },
      }
    ),
    expectedMessage: "This plan number already exists",
  },
  {
    name: "Record not found (P2025)",
    error: new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    }),
    expectedMessage:
      "The record you're trying to update or delete was not found",
  },
  {
    name: "Foreign key constraint (P2003)",
    error: new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      {
        code: "P2003",
        clientVersion: "5.0.0",
      }
    ),
    expectedMessage: "Cannot perform this operation due to related records",
  },
  {
    name: "Validation error",
    error: new Prisma.PrismaClientValidationError("Validation failed", {
      clientVersion: "5.0.0",
    }),
    expectedMessage:
      "Invalid data provided. Please check your input and try again.",
  },
  {
    name: "Unknown error code",
    error: new Prisma.PrismaClientKnownRequestError("Unknown error", {
      code: "P9999",
      clientVersion: "5.0.0",
    }),
    expectedMessage: "A database error occurred. Please try again later.",
  },
  {
    name: "Standard JavaScript Error",
    error: new Error("Something went wrong"),
    expectedMessage: "Something went wrong",
  },
];

// Run tests
console.log("=== Prisma Error Handler Tests ===\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  const result = handlePrismaError(testCase.error, "test");
  const passed = result === testCase.expectedMessage;

  console.log(`  Expected: "${testCase.expectedMessage}"`);
  console.log(`  Got:      "${result}"`);
  console.log(`  Status:   ${passed ? "✅ PASS" : "❌ FAIL"}\n`);
});

console.log("=== Tests Complete ===");
