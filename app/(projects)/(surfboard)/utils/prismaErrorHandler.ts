import { Prisma } from "@/prisma/generated";

/**
 * Maps Prisma error codes to user-friendly messages
 */
const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2000: "The provided value is too long for the field",
  P2001: "Record not found",
  P2002: "A record with this value already exists",
  P2003: "Related record not found",
  P2004: "Database constraint violation",
  P2005: "Invalid value provided for the field",
  P2006: "The provided value is invalid",
  P2007: "Data validation error",
  P2008: "Query parsing failed",
  P2009: "Query validation failed",
  P2010: "Raw query failed",
  P2011: "Null constraint violation",
  P2012: "Missing required value",
  P2013: "Missing required argument",
  P2014: "Relation violation",
  P2015: "Related record not found",
  P2016: "Query interpretation error",
  P2017: "Records not connected",
  P2018: "Required connected records not found",
  P2019: "Input error",
  P2020: "Value out of range",
  P2021: "Table does not exist",
  P2022: "Column does not exist",
  P2023: "Inconsistent column data",
  P2024: "Connection pool timeout",
  P2025: "Record to update/delete not found",
  P2026: "Database query error",
  P2027: "Multiple database errors occurred",
  P2028: "Transaction API error",
  P2030: "Cannot find fulltext index",
  P2033: "Number out of range",
  P2034: "Transaction failed",
};

/**
 * Handles Prisma errors and returns user-friendly error messages
 * @param error - The error object from a try-catch block
 * @param context - Optional context about what operation was being performed
 * @returns A user-friendly error message
 */
export function handlePrismaError(error: unknown, context?: string): string {
  // Log the full error for debugging
  console.error(`Prisma error${context ? ` in ${context}` : ""}:`, error);

  // Handle Prisma Client Known Request Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const userMessage = PRISMA_ERROR_MESSAGES[error.code];

    if (userMessage) {
      return userMessage;
    }

    // Handle specific common cases with more detail
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || [];
        if (target.includes("planNumber")) {
          return "This plan number already exists";
        }
        if (target.includes("email")) {
          return "This email is already registered";
        }
        return "A record with this value already exists";

      case "P2025":
        return "The record you're trying to update or delete was not found";

      case "P2003":
        return "Cannot perform this operation due to related records";

      default:
        return "A database error occurred. Please try again later.";
    }
  }

  // Handle Prisma Client Validation Errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data provided. Please check your input and try again.";
  }

  // Handle Prisma Client Initialization Errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database connection error. Please try again later.";
  }

  // Handle Prisma Client Rust Panic Errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "A critical database error occurred. Please contact support.";
  }

  // Handle Prisma Client Unknown Request Errors
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return "An unexpected database error occurred. Please try again later.";
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // Don't expose internal error messages to users
    // but return a generic message
    return error.message || "An unexpected error occurred";
  }

  // Fallback for unknown error types
  return "An unexpected error occurred. Please try again later.";
}

/**
 * Wraps a Prisma operation with error handling
 * @param operation - The async Prisma operation to execute
 * @param context - Context about what operation is being performed
 * @returns The result of the operation or throws a user-friendly error
 */
export async function withPrismaErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const userMessage = handlePrismaError(error, context);
    throw new Error(userMessage);
  }
}
