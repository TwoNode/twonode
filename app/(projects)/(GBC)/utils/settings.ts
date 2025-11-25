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
  tickets: {
    earlyBirdPrice: 100000,
    regularPrice: 120000,
    companyPrice: 150000,
    vipPrice: 200000,
    studentPrice: 50000,
    earlyBirdDeadline: "2026-02-28",
    maxCapacity: 1000,
    maxEarlyBirdCapacity: 500,
    maxCompanyCapacity: 500,
    maxStudentCapacity: 500,
    maxVipCapacity: 500,
    maxRegularCapacity: 500,
    earlyBirdInfoList: [
      "Full conference access",
      "All keynote sessions",
      "Networking opportunities",
      "Lunch & refreshments",
      "Conference materials",
      "Certificate of attendance",
      "Access to exhibition area",
    ],
    companyInfoList: [
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
      "Lunch & refreshments",
      "Conference materials",
      "Certificate of attendance",
      "Access to exhibition area",
    ],
    regularInfoList: [
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
