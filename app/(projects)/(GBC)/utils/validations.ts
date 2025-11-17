// src/lib/validations.ts
import { z } from "zod";

const GBCProfessions = {
  SURVEYOR: "SURVEYOR",
  GIS_ANALYST: "GIS_ANALYST",
  URBAN_PLANNER: "URBAN_PLANNER",
  LAWYER: "LAWYER",
  ENGINEER: "ENGINEER",
  ARCHITECT: "ARCHITECT",
  DATA_SCIENTIST: "DATA_SCIENTIST",
  DEVELOPER: "DEVELOPER",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  STUDENT: "STUDENT",
  RESEARCHER: "RESEARCHER",
  ENTREPRENEUR: "ENTREPRENEUR",
  GOVERNMENT_OFFICIAL: "GOVERNMENT_OFFICIAL",
  NGO_STAFF: "NGO_STAFF",
  CONSULTANT: "CONSULTANT",
  OTHER: "OTHER",
};

// Ticket Purchase Schema
export const ticketPurchaseSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(100),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .min(11, "Phone number must be at least 11 characters")
      .max(15)
      .optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
    profession: z.enum(
      Object.values(GBCProfessions) as [keyof typeof GBCProfessions]
    ),
    otherProfession: z.string().optional(),
    ticketType: z.enum(["EARLY_BIRD", "REGULAR", "COMPANY"]),
  })
  .refine(
    (data) => (data.profession === "OTHER" ? !!data.otherProfession : true),
    {
      message: "Please specify your profession",
      path: ["otherProfession"],
    }
  );

export type TicketPurchaseInput = z.infer<typeof ticketPurchaseSchema>;

// Contact Form Schema
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000),
  type: z.enum(["GENERAL", "SPONSORSHIP", "TECHNICAL"]),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

// Admin Login Schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Sponsor Schema
export const sponsorSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  logo: z.string().url("Must be a valid URL"),
  tier: z.enum(["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"]),
  description: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  order: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
});

export type SponsorInput = z.infer<typeof sponsorSchema>;

// Partner Schema
export const partnerSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  logo: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  order: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
});

export type PartnerInput = z.infer<typeof partnerSchema>;

// Gallery Item Schema
export const gallerySchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  description: z.string().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  mediaUrl: z.string().url("Must be a valid URL"),
  year: z.number().int().min(2020).max(2030),
  order: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
});

export type GalleryInput = z.infer<typeof gallerySchema>;

// Speaker Schema
export const speakerSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  title: z.string().min(2, "Title is required").max(200),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  photo: z.string().url("Must be a valid URL"),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  twitter: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  order: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
});

export type SpeakerInput = z.infer<typeof speakerSchema>;

// Check-in Schema
export const checkInSchema = z.object({
  ticketNumber: z.string().min(1, "Ticket number is required"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

// Refund Schema
export const refundSchema = z.object({
  ticketId: z.string().cuid(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
});

export type RefundInput = z.infer<typeof refundSchema>;
