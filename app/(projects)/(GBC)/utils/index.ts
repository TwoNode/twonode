// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateTicketNumber(): string {
  const prefix = "GBC2";
  // Generate a UUID v4 and take the first 5 characters after removing hyphens
  const uuid = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 5)
    .toUpperCase();
  return `${prefix}-${uuid}`;
}

export function calculateTicketPrice(
  ticketType: "EARLY_BIRD" | "REGULAR" | "COMPANY",
  ticketSettings?: {
    earlyBirdPrice?: number;
    regularPrice?: number;
    companyPrice?: number;
  }
): number {
  // Default prices if settings not provided
  const defaultPrices = {
    earlyBirdPrice: 100000,
    regularPrice: 120000,
    companyPrice: 250000,
  };

  switch (ticketType) {
    case "EARLY_BIRD":
      return ticketSettings?.earlyBirdPrice ?? defaultPrices.earlyBirdPrice;
    case "REGULAR":
      return ticketSettings?.regularPrice ?? defaultPrices.regularPrice;
    case "COMPANY":
      return ticketSettings?.companyPrice ?? defaultPrices.companyPrice;
    default:
      throw new Error(`Unknown ticket type: ${ticketType}`);
  }
}

/**
 * Check if a specific ticket type is available based on capacity and sold tickets
 * @param ticketType - The type of ticket to check
 * @param soldEarlyBirdTickets - Number of early bird tickets sold
 * @param settings - Ticket settings with capacity limits
 * @returns Object with availability status and reason
 */
export function isTicketTypeAvailable(
  ticketType: "EARLY_BIRD" | "REGULAR" | "COMPANY",
  soldEarlyBirdTickets: number,
  settings?: {
    maxEarlyBirdCapacity?: number;
  }
): { available: boolean; reason?: string } {
  const maxEarlyBirdCapacity = settings?.maxEarlyBirdCapacity ?? 1000;

  switch (ticketType) {
    case "EARLY_BIRD":
      // Early bird is available if capacity not reached
      if (soldEarlyBirdTickets >= maxEarlyBirdCapacity) {
        return {
          available: false,
          reason: "Early bird tickets are sold out",
        };
      }
      return { available: true };

    case "REGULAR":
      // Regular is only available when early bird is sold out
      if (soldEarlyBirdTickets < maxEarlyBirdCapacity) {
        return {
          available: false,
          reason:
            "Regular tickets will be available after early bird sells out",
        };
      }
      return { available: true };

    case "COMPANY":
      // Company tickets are always available (alongside either early bird or regular)
      return { available: true };

    default:
      return { available: false, reason: "Invalid ticket type" };
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
