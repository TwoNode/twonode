_MDA-Requested Enhancements_
_1. Certificate of Deposit (CoD) Submission – Acceptance Checkbox_
_Requirement_
Before proceeding to payment during CoD submission, the system must require the user to explicitly acknowledge a "query-related" condition.

_Functional Detail_

1. Add a mandatory checkbox just before payment.
2. The checkbox functions like a Terms & Conditions acceptance.
3. The user cannot proceed to payment unless checked.
   “I accept that queries on my submission will attract additional fees.”

_Notes_
Text content should be configurable (admin-level setting).

_2. Query Management Enhancements_
_2.1 Query Permission Scope_
_Requirement_

Charting MDA roles should now be able to raise queries:

_2.2 Batched Query Dispatch Logic_
Problem Being Solved

Queries are currently raised and sent independently, leading to fragmented feedback to surveyors.

New Logic

Queries must not be sent immediately when raised.

The system should hold all queries until all relevant roles have completed their assigned actions.

Example Flow

Charting raises a query.

Account and SURCON approve.

Records I has not yet acted → system holds query.

Records I later raises a query.

Both queries (Charting + Records I) are then sent together to the surveyor as a single consolidated query notification.

Key Rule
_Queries are dispatched only after all required workflow roles have either approved or queried._

_2.3 Query Response Fee Logic_
Requirement

Responding to queries will now require payment of the CoD fee for that specific record.

_Configuration_

The payable amount must be configurable via Settings:

Example:100% of CoD fee

_Notes_
-System must block query response submission until payment is completed.
-Fee rule applies per queried record, not per submission batch.

_3. Plan Types & Workflow Routing_
_3.1 Plan Type Visibility_
Requirement

Plan Type must be:
A visible field on the MDA interface
Clearly displayed per record

If a Reference Plan Number exists, it must also be visible to MDA users.

_4. OSSG API Integration & Document Hashing_
_4.1 Document Preparation_
Requirement

Generate a hash of the final document.

Embed a QR Code (top-right corner of the document).

Export the final document as PNG.

Ready for transmission to the OSSG server via API.

_4.2 OSSG API Payload Mapping_

The following fields must be sent to OSSG with exact mappings:

OSSG Field-----Source in System
PLAN NUMBER-----planNumber
TITLE-----surveyTitle
LOCALITY-----lga
AREA-----Locality
BEACON USED-----pillarNumbers (mapped, see below)
SIZE-----deededArea
REMARKS-----approvedChartingRemarks
QUOTED COORDINATE (REFERENCE)-----(Coordinate of pillar with index 0)
4.3 Beacon (Pillar) Number Compression Logic
Input Example
DU5057ARA, DU5058ARA, DU5059ARA, DC1695ARA

Required Output
DU5057ARA–DU5059ARA, DC1695ARA

Rules

Detect continuous numeric sequences before the suffix (e.g., “ARA”).
Compress continuous ranges.
Non-continuous values remain listed individually.

_5. New Role: Archive_
Requirement

Introduce a new role: Archive.

Characteristics

Does not alter or interrupt the existing workflow.

Used strictly as an internal tracking role by MDA.

Purpose

To track physical plan delivery from:

Records II Officer → Archive Officer
