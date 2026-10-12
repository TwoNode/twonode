// ADR-0008: the certificate pages are public. Only these fields may reach the
// browser; passing the whole ticket row leaked email, phone, payment data and
// the unguessable publicId. Add a field here only if it belongs on the certificate.
interface TicketForView {
  ticketNumber: string;
  name: string;
  checkedInAt: Date | null;
  certificateEventName?: string | null;
  certificateTheme?: string | null;
  certificateSubTheme?: string | null;
  certificateVenue?: string | null;
  certificateStartDate?: Date | null;
  certificateEndDate?: Date | null;
  editionRef: {
    name: string;
    theme: string;
    subTheme: string;
    venue: string;
    startDate: Date;
    endDate: Date;
  };
}

export function toCertificateView(t: TicketForView) {
  return {
    ticketNumber: t.ticketNumber,
    name: t.name,
    checkedInAt: t.checkedInAt,
    certificateEventName: t.certificateEventName ?? null,
    certificateTheme: t.certificateTheme ?? null,
    certificateSubTheme: t.certificateSubTheme ?? null,
    certificateVenue: t.certificateVenue ?? null,
    certificateStartDate: t.certificateStartDate ?? null,
    certificateEndDate: t.certificateEndDate ?? null,
    editionRef: {
      name: t.editionRef.name,
      theme: t.editionRef.theme,
      subTheme: t.editionRef.subTheme,
      venue: t.editionRef.venue,
      startDate: t.editionRef.startDate,
      endDate: t.editionRef.endDate,
    },
  };
}
