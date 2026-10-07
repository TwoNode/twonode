# 0009. GBC edition 2.0 is the April 30, 2026 event

- **Status:** Accepted
- **Date:** 2026-10-07
- **Related:** `gbc_editions`, `gbc/services/editionService.ts`, [0008](./0008-gbc-certificate-access.md)

## Context

The 240 prod tickets belong to GBC 2, held on April 30, 2026 at Whitestone Event Place. The prod edition row `2.0` had been created on 2026-10-01 and never edited, and held a different event (Nov 15 to 16, 2026, Lagos, "Mapping the Future…"). Certificates read the edition live, so every attendee's certificate showed the wrong date and theme.

## Decision

Edition `2.0` is the April 30, 2026 event: theme "Geospatial Capital: A Catalyst for Inclusive Growth", sub-theme "Driving Transformation in Land Administration and Energy", venue Whitestone Event Place, ticket prefix `GBC2`, status PAST. Prod was updated on 2026-10-07 to match staging, which already held these values. The previous row is backed up. A later event gets its own edition key.

## Consequences

- Prod has no ACTIVE edition until GBC 3.0 is created and activated in the admin. That is fine while no tickets are on sale.
- Because the certificate reads the edition live, the same mistake can recur on any edit. Copying the event details onto the ticket at issue time ([0008](./0008-gbc-certificate-access.md)) removes this.
