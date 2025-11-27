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
