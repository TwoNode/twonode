export type GBCCertificateTicket = {
  ticketNumber: string;
  name: string;
  checkedInAt: Date | string | null;
  // ADR-0008: set once the certificate is issued; used to build the verify URL
  certificatePublicId?: string | null;
  // Frozen at issue time; the PDF prefers these over editionRef
  certificateEventName?: string | null;
  certificateTheme?: string | null;
  certificateSubTheme?: string | null;
  certificateVenue?: string | null;
  certificateStartDate?: Date | string | null;
  certificateEndDate?: Date | string | null;
  editionRef: {
    name: string;
    theme: string;
    subTheme: string;
    venue: string;
    startDate: Date | string;
    endDate: Date | string;
  };
};
