// Define the settings structure with TypeScript types
export type GBCSettingsData = {
  event: {
    name: string;
    date: string;
    time: string;
    venue: string;
    theme: string;
    subTheme: string;
    description: string;
    registrationOpens: string;
    registrationCloses: string;
    importantNotices: string[];
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    city: string;
    officeHours: string;
    responseTime: string;
    satisfactionRate: string;
    twitter: string;
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  tickets: {
    earlyBirdPrice: number;
    regularPrice: number;
    companyPrice: number;
    vipPrice: number;
    studentPrice: number;
    earlyBirdDeadline: string;
    maxCapacity: number;
    maxEarlyBirdCapacity: number;
    maxCompanyCapacity: number;
    maxStudentCapacity: number;
    maxVipCapacity: number;
    maxRegularCapacity: number;
    earlyBirdInfoList: string[];
    companyInfoList: string[];
    vipInfoList: string[];
    studentInfoList: string[];
    regularInfoList: string[];
    pauseTicketReg: boolean;
  };
  notifications: {
    emailTicketConfirmation: boolean;
    emailEventReminder7Days: boolean;
    emailEventReminder1Day: boolean;
    emailAdminNewTicket: boolean;
    emailCheckinConfirmation: boolean;
    smsTicketConfirmation: boolean;
  };
  gallery: {
    enabled: boolean;
    showYearFilter: boolean;
    defaultYear: number;
    itemsPerPage: number;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    automaticBackups: boolean;
  };
};

/**
 * One entry per conference year (1.0, 2.0, ...). Was a JSON array inside
 * this settings blob (see phase-4-gbc.md's original edition-metadata plan);
 * promoted to its own `GBCEdition` table (see prisma/schema/gbc.prisma) once
 * editions became a real cross-record concern — this type is now just the
 * API-facing shape editionService.ts serializes gbc_editions rows into, kept
 * here since it's imported alongside the rest of GBCSettingsData throughout
 * the GBC frontend/apiClient. Exactly one entry should have status "ACTIVE"
 * at a time, enforced in editionService.ts and backed by a DB partial
 * unique index.
 */
export type GBCEdition = {
  key: string;
  name: string;
  theme: string;
  subTheme: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "ACTIVE" | "PAST";
  ticketPrefix: string;
};

// Default settings object
export const defaultSettings: GBCSettingsData = {
  event: {
    name: "Geospatial Builders Conference 2.0",
    date: "2026-03-15",
    time: "09:00",
    venue: "Eko Hotel & Suites, Lagos",
    theme: "Geospatial Capital: A Catalyst for Inclusive Growth",
    subTheme: "Driving Transformation in Land Administration and Energy",
    description: "The premier platform for geospatial innovation in Nigeria",
    registrationOpens: "2026-01-01",
    registrationCloses: "2026-03-10",
    importantNotices: [
      "Registration has a deadline",
      "Tickets are limited",
      "Early bird tickets are still available",
    ],
  },
  contact: {
    email: "info@twonodetechnologies.com",
    phone: "+234-916-0002-740",
    address: "Eko Hotel & Suites",
    city: "Lagos, Nigeria",
    officeHours: "Mon-Fri 9AM-5PM",
    responseTime: "24hrs",
    satisfactionRate: "98%",
    twitter: "https://twitter.com/GBCByTwoNodeTechnologies",
    facebook: "https://www.facebook.com/GBCByTwoNodeTechnologies",
    instagram: "https://www.instagram.com/GBCByTwoNodeTechnologies",
    linkedin: "https://www.linkedin.com/GBCByTwoNodeTechnologies",
    youtube: "https://www.youtube.com/GBCByTwoNodeTechnologies",
  },
  tickets: {
    earlyBirdPrice: 100000,
    regularPrice: 120000,
    companyPrice: 250000,
    vipPrice: 200000,
    studentPrice: 20000,
    earlyBirdDeadline: "2026-02-28",
    maxCapacity: 800,
    maxEarlyBirdCapacity: 500,
    maxCompanyCapacity: 500,
    maxStudentCapacity: 500,
    maxVipCapacity: 500,
    maxRegularCapacity: 500,
    earlyBirdInfoList: [
      "One Attendee",
      "Full conference access",
      "All keynote sessions",
      "Networking opportunities",
      "Lunch & refreshments",
      "Conference materials",
      "Certificate of attendance",
      "Access to exhibition area",
    ],
    companyInfoList: [
      "Group Ticket (Five Attendees)",
      "Tickets for 5 attendees",
      "Full conference access",
      "All keynote sessions",
      "Premium seating",
      "Company mention in materials",
      "Dedicated networking area",
      "VIP access to all sessions",
    ],
    vipInfoList: [
      "Full conference access",
      "All keynote sessions",
      "Networking opportunities",
      "Lunch & refreshments",
      "Conference materials",
      "Certificate of attendance",
      "Access to exhibition area",
    ],
    studentInfoList: [
      "Full conference access",
      "All keynote sessions",
      "Networking opportunities",
      "Certificate of attendance",
    ],
    regularInfoList: [
      "Pair Ticket (Two attendees)",
      "Tickets for 2 attendees",
      "Full conference access",
      "All keynote sessions",
      "Networking opportunities",
      "Lunch & refreshments",
      "Conference materials",
      "Certificate of attendance",
      "Access to exhibition area",
    ],
    pauseTicketReg: false,
  },
  notifications: {
    emailTicketConfirmation: true,
    emailEventReminder7Days: true,
    emailEventReminder1Day: true,
    emailAdminNewTicket: true,
    emailCheckinConfirmation: false,
    smsTicketConfirmation: false,
  },
  gallery: {
    enabled: true,
    showYearFilter: true,
    defaultYear: 2025,
    itemsPerPage: 12,
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
    automaticBackups: true,
  },
};
