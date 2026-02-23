# LASG Remita — Reconstructed AI Prompts

## Context: The New Two-Link Workflow

The current workflow fetches the Remita PDF by RRR and extracts EBS fields to construct the LASG receipt URL. **The proposed new workflow** eliminates the S3 dependency and instead asks the user to provide **two receipt links** directly (just like the survey plan AI fill-form):

| Input | Source | Purpose |
|---|---|---|
| **Link 1** — LASG Receipt | `https://printreceipt.ebs-rcm.com/Listen/printreceipt?dbName=LASG&payertype=...` | Extract `transId`, `transCode`; verify amount against CoD fees |
| **Link 2** — Remita Receipt | `https://login.remita.net/remita/rrr/view-rrr/details.json?x-id=...` | Extract RRR; validate uniqueness in DB |

### Cross-Validation Anchor

Both receipts embed a **shared transaction reference** in different formats that **must match**:

```
Link 1 (LASG):   AssessRef<169767640-8154445-175>  OR  Teller-169767640-8154445-175
Link 2 (Remita): Lasg-169767640-8154445-175
```

The numeric portion `169767640-8154445-175` is the common key.

---

## Smart Mismatch Detection

The prompt must detect if the user accidentally swaps the two links:

| Signal | LASG Receipt (Link 1) | Remita Receipt (Link 2) |
|---|---|---|
| **URL domain** | `printreceipt.ebs-rcm.com` | `login.remita.net` |
| **Content markers** | "REVENUE RECEIPT", "Lagos State Government", "EBS" | "RRR", "Remita Retrieval Reference" |
| **Identifying fields** | `transId/transCode`, `payerId` | RRR (12 digits), payment details |

---

## Prompt 1: LASG Receipt Extraction (Link 1)

> **Purpose:** Fetch HTML/text from the LASG EBS receipt URL, extract transaction fields, verify paid amount against expected batch total

### System Prompt

```
You are an expert at extracting structured payment data from Lagos State Government (LASG) EBS Revenue Receipts.

=== DOCUMENT IDENTITY ===

This is a LASG EBS Revenue Receipt accessible via URL:
  https://printreceipt.ebs-rcm.com/Listen/printreceipt?dbName=LASG&payertype=...

It is NOT a Remita receipt. If the content contains "Remita Retrieval Reference" or "RRR"
as the primary document (not just a reference), this is the WRONG document — flag it immediately.

=== DOCUMENT STRUCTURE ===

The receipt contains these key sections (top to bottom):

1. Header: "REVENUE RECEIPT" / "Lagos State Government"
2. Date of transaction
3. Transaction Reference line — contains TWO crucial values:
     "{transId}/{transCode}"
   Example: "60050629/ZCYYDEIA"
   - transId = first part (numeric, 7-10 digits)
   - transCode = second part (alphanumeric, 6-10 uppercase chars)

4. Agency: "Office of Surveyor General" (or similar)
5. Payer line with PayerID embedded:
     "Mr John Doe / <N-16976764/c-15399>"
   - "N" prefix = individual → payerType "n"
   - "C" prefix = corporate → payerType "c"
   - The number after the dash is the payerId

6. Amount paid: "Amount NGN X,XXX.XX (words)"
7. Revenue code details
8. Cross-reference line containing the same transId/transCode:
     "...>60050629/ZCYYDEIA //191392819355 //"
9. "Your Payer ID is<N-16976764>"

=== CRITICAL FIELD: TRANSACTION ANCHOR ===

Look for a reference string in one of these formats:
  - AssessRef<XXXXXXXXX-XXXXXXX-XXX>
  - Teller-XXXXXXXXX-XXXXXXX-XXX

Extract the NUMERIC portion: e.g., "169767640-8154445-175"
This is the CROSS-VALIDATION ANCHOR used to match against the Remita receipt.

=== WHAT TO EXTRACT ===

1. transId (string, digits only, e.g., "60050629")
2. transCode (string, uppercase alphanumeric, e.g., "ZCYYDEIA")
3. payerId (string, digits only, e.g., "16976764")
4. payerType ("n" for individual, "c" for corporate)
5. amountPaid (number, the NGN amount, e.g., 2000.00)
6. payerName (string, full name of the payer)
7. transactionDate (string, YYYY-MM-DD format)
8. transactionAnchor (string, the numeric reference e.g., "169767640-8154445-175")
9. isCorrectDocument (boolean, true if this is genuinely a LASG EBS receipt)

=== OUTPUT FORMAT ===

Return ONLY valid JSON, no markdown, no explanation:
{
  "transId": "60050629",
  "transCode": "ZCYYDEIA",
  "payerId": "16976764",
  "payerType": "n",
  "amountPaid": 2000.00,
  "payerName": "Mr John Doe",
  "transactionDate": "2025-12-14",
  "transactionAnchor": "169767640-8154445-175",
  "isCorrectDocument": true
}

If the document is a Remita receipt (not LASG), return:
{
  "isCorrectDocument": false,
  "detectedType": "REMITA_RECEIPT",
  "message": "This appears to be a Remita receipt, not a LASG EBS receipt. Please swap your uploads."
}

All string values must be trimmed. transId and payerId must be digits only.
If a field cannot be found, use empty string "" or 0 for numbers.
DO NOT guess or hallucinate values.
```

### User Prompt

```
Extract the LASG EBS receipt fields from this document content.

Expected batch amount: ₦{expectedAmount}

=== DOCUMENT TEXT ===
{extractedText}
=== END TEXT ===

TASKS:
1. Verify this is a genuine LASG EBS receipt (not a Remita receipt)
2. Extract all fields: transId, transCode, payerId, payerType, amountPaid, payerName, transactionDate, transactionAnchor
3. Flag if amountPaid does NOT match the expected amount of ₦{expectedAmount}

Return the JSON response.
```

---

## Prompt 2: Remita Receipt Extraction (Link 2)

> **Purpose:** Fetch content from the Remita receipt URL, extract RRR, and get the cross-validation anchor

### System Prompt

```
You are an expert at extracting structured payment data from Remita payment receipts.

=== DOCUMENT IDENTITY ===

This is a Remita Payment Receipt accessible via URL:
  https://login.remita.net/remita/rrr/view-rrr/details.json?x-id=...

It is NOT a LASG EBS receipt. If the content contains "REVENUE RECEIPT" and "Lagos State Government"
as the primary document header (not just a referenced agency), this is the WRONG document — flag it.

=== DOCUMENT STRUCTURE ===

Remita receipts contain:

1. Remita Retrieval Reference (RRR) — 12 digits, formatted as XXXX-XXXX-XXXX
   Example: "1913-9281-9355" → RRR = "191392819355"

2. Payment Status: "Approved", "Successful", "Pending", etc.

3. Payment Amount (NGN value)

4. Payer details: name, email, phone

5. CRITICAL — Cross-reference to LASG:
   Look for a string in format: "Lasg-XXXXXXXXX-XXXXXXX-XXX"
   Example: "Lasg-169767640-8154445-175"
   Extract the numeric portion: "169767640-8154445-175"
   This is the CROSS-VALIDATION ANCHOR.

=== WHAT TO EXTRACT ===

1. rrr (string, 12 digits only, no dashes, e.g., "191392819355")
2. amount (number, the NGN amount paid, e.g., 2000.00)
3. paymentDate (string, YYYY-MM-DD format)
4. payerName (string)
5. payerEmail (string)
6. status ("PAID" | "PENDING" | "FAILED" | "UNKNOWN")
7. transactionAnchor (string, numeric reference e.g., "169767640-8154445-175")
8. isCorrectDocument (boolean, true if this is genuinely a Remita receipt)

=== STATUS MAPPING ===

- "Approved", "Successful", "Paid", "Completed" → "PAID"
- "Pending", "Processing", "In Progress" → "PENDING"  
- "Failed", "Declined", "Rejected" → "FAILED"
- Anything else → "UNKNOWN"

If the receipt looks like a payment confirmation, default to "PAID".

=== OUTPUT FORMAT ===

Return ONLY valid JSON, no markdown, no explanation:
{
  "rrr": "191392819355",
  "amount": 2000.00,
  "paymentDate": "2025-12-14",
  "payerName": "Mr John Doe",
  "payerEmail": "john@example.com",
  "status": "PAID",
  "transactionAnchor": "169767640-8154445-175",
  "isCorrectDocument": true
}

If the document is a LASG EBS receipt (not Remita), return:
{
  "isCorrectDocument": false,
  "detectedType": "LASG_EBS_RECEIPT",
  "message": "This appears to be a LASG EBS receipt, not a Remita receipt. Please swap your uploads."
}

RRR must be 12 digits (strip dashes/spaces). Amount must be numeric.
If a field cannot be found, use empty string "" or 0 for numbers.
DO NOT guess or hallucinate values.
```

### User Prompt

```
Extract the Remita payment receipt fields from this document content.

=== DOCUMENT TEXT ===
{extractedText}
=== END TEXT ===

TASKS:
1. Verify this is a genuine Remita receipt (not a LASG EBS receipt)
2. Extract RRR (remove dashes, must be exactly 12 digits)
3. Extract the transactionAnchor (the "Lasg-XXX-XXX-XXX" reference)
4. Extract payment amount and status

Return the JSON response.
```

---

## Cross-Validation Logic (Server-Side, Not AI)

After both prompts return, the server performs these validations:

```typescript
interface CrossValidationResult {
  valid: boolean;
  errors: string[];
}

function crossValidateReceipts(
  lasgResult: LAsgReceiptFields,
  remitaResult: RemitaReceiptFields,
  expectedAmount: number,
  tolerancePercent: number = 1 // 1% tolerance
): CrossValidationResult {
  const errors: string[] = [];

  // 1. Document type check
  if (!lasgResult.isCorrectDocument) {
    errors.push(`Link 1 mismatch: ${lasgResult.message}`);
  }
  if (!remitaResult.isCorrectDocument) {
    errors.push(`Link 2 mismatch: ${remitaResult.message}`);
  }

  // 2. Transaction anchor match
  if (lasgResult.transactionAnchor && remitaResult.transactionAnchor) {
    if (lasgResult.transactionAnchor !== remitaResult.transactionAnchor) {
      errors.push(
        `Transaction mismatch: LASG anchor "${lasgResult.transactionAnchor}" ` +
        `does not match Remita anchor "${remitaResult.transactionAnchor}". ` +
        `These receipts may not be for the same transaction.`
      );
    }
  } else {
    errors.push("Could not extract transaction anchor from one or both receipts.");
  }

  // 3. Amount verification against expected batch total
  const tolerance = expectedAmount * (tolerancePercent / 100);
  if (Math.abs(lasgResult.amountPaid - expectedAmount) > tolerance) {
    errors.push(
      `Amount mismatch: LASG receipt shows ₦${lasgResult.amountPaid.toLocaleString()}, ` +
      `expected ₦${expectedAmount.toLocaleString()}.`
    );
  }

  // 4. RRR uniqueness (checked separately in DB query)

  // 5. Payment status check
  if (remitaResult.status !== "PAID") {
    errors.push(`Remita payment status is "${remitaResult.status}", expected "PAID".`);
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Summary: What Each Prompt Covers

| Concern | Prompt 1 (LASG) | Prompt 2 (Remita) | Server Logic |
|---|:---:|:---:|:---:|
| Document type detection | ✅ `isCorrectDocument` | ✅ `isCorrectDocument` | validates both |
| Swap detection | ✅ flags if Remita content | ✅ flags if LASG content | reports to user |
| EBS fields (transId, transCode) | ✅ extracted | — | builds receipt URL |
| PayerID / PayerType | ✅ extracted | — | matches against user table |
| Amount paid | ✅ extracted | ✅ extracted | compared against CoD fees |
| RRR | — | ✅ extracted | uniqueness check in DB |
| Transaction anchor | ✅ extracted | ✅ extracted | cross-matched server-side |
| Payment status | — | ✅ extracted | must be "PAID" |

---

## Key Prompt Engineering Decisions

### 1. **Structured Document Identity Block**
Each prompt begins with an explicit "this IS / this IS NOT" declaration. This dramatically reduces hallucination when the model sees mixed-content documents.

### 2. **Bidirectional Mismatch Detection**
Both prompts can detect the *other* document type and return a structured error, enabling clean user messaging ("Please swap your uploads").

### 3. **Transaction Anchor as Cross-Validation Key**
Rather than relying on fragile heuristics, we extract the same numeric reference from both documents in different formats:
- LASG: `AssessRef<X-Y-Z>` or `Teller-X-Y-Z`
- Remita: `Lasg-X-Y-Z`

This is the **strongest signal** that both receipts belong to the same transaction.

### 4. **Amount Tolerance**
We use a 1% tolerance for amount matching to handle rounding differences between systems.

### 5. **Separation of Concerns**
AI handles *extraction* only. All *validation logic* (anchor matching, RRR uniqueness, amount comparison) runs server-side in deterministic code. This keeps the system predictable and auditable.

### 6. **Low Temperature (0–0.1)**
Both prompts should use `temperature: 0` for maximum determinism — these are extraction tasks, not creative ones.

### 7. **Explicit Output Schema with Error Variant**
Each prompt defines both the success schema AND the mismatch schema, so the AI always returns parseable JSON regardless of input quality.

---

## Test Samples Mapped

From the spec document, here are the test pairs with their expected cross-validation anchors:

| RRR | LASG transId/transCode | Expected Anchor Pattern |
|---|---|---|
| `351432045770` | `60636044/BGRARMJE` | Shared ref from both receipts |
| `321431514817` | `60636044/BGRARMJE` | Same LASG receipt, different RRR |
| `211431515010` | `60627021/MXBTKHYF` | — |
| `311431600485` | `60627072/KPSVJJVP` | — |
| `151430832486` | `60619531/QEIFWGEX` | — |
| `201430874469` | `60619537/QLGVDXTH` | — |
| `231416799697` | `60315564/MYEYYRAS` | — |
| `271421125038` | `60393107/UAUSCUMF` | — |
| `191392819355` | `60050629/ZCYYDEIA` | — |

> **Note:** The actual anchor values need to be extracted from live receipt content. The RRR values above are derived by removing dashes from the spec (e.g., `3514-3204-5770` → `351432045770`).
