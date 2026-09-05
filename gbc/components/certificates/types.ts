export type GBCCertificateTicket = {
  ticketNumber: string;
  name: string;
  checkedInAt: Date | string | null;
  editionRef: {
    name: string;
    theme: string;
    subTheme: string;
    venue: string;
    startDate: Date | string;
    endDate: Date | string;
  };
};
