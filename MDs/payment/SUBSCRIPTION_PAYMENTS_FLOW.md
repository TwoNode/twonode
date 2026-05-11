# Subscription and Payment Flows Documentation

This document outlines the end-to-end payment and subscription processes for Surfboard and Reva platforms.

## 1. Overview of Platforms
- **Surfboard**: Subscription-based service with monthly, quarterly, and annual plans. Also handles one-time "Certificate of Deposit" payments.
  - [See Detailed Surfboard Subscription Guide](file:///home/rojitech/Documents/RTG_CODE/NextJS/twonodes/MDs/payment/SURFBOARD_SUBSCRIPTION_DETAILED.md)

- **Reva**: One-time payment service for property transactions, supporting both authenticated and guest (one-time) users.

---

## 2. Surfboard Subscription Flow

### A. Non-Technical Flow
1. **Selection**: User goes to the Subscription page and chooses a plan (Monthly, Quarterly, or Yearly).
2. **Payment**: A Paystack popup appears. User completes the payment using Card, Transfer, or USSD.
3. **Verification**: After payment, the system automatically verifies the transaction.
4. **Activation**: The user's account is upgraded, and they get full access to Surfboard features.
5. **Renewal**: Paystack automatically charges the user's card at the end of the period (Monthly/Quarterly/Yearly).

### B. Technical Flow
1. **Initiation**: `SubscriptionManager.tsx` calls `initiateSubscription(planId)`.
   - Path: `app/(projects)/(surfboard)/actions/paystackActions.ts`
   - Action: Generates a unique reference, fetches the plan from Paystack, and initializes a transaction.
2. **Client-Side Payment**: `PaystackPop` is used to collect payment.
3. **Verification**: 
   - **Immediate**: `SubCallback.tsx` or `SubscriptionManager.tsx` calls `verifySubscription(reference)`.
     - Path: `app/(projects)/(surfboard)/actions/paystackActions.ts`
     - Action: Verifies transaction status, fetches the official `subscription_code`, and updates the local DB via `createOrUpdateSubscription`.
   - **Asynchronous (Webhook)**: Paystack sends events to `/api/webhooks/paystack`.
     - Path: `app/api/webhooks/paystack/route.ts`
     - Event: `subscription.create` or `charge.success`.
     - Action: Updates `Subscription` table and logs to `SubscriptionHistory`.
4. **Local DB Schema**:
   - `Subscription`: Stores the current state (`active`, `canceled`, `past_due`), plan details, and Paystack codes (`subCode`, `customerCode`).
   - `SubscriptionHistory`: A ledger of all payment-related events for audit.

---

## 3. Surfboard "Certificate of Deposit" (CoD) Flow

### A. Non-Technical Flow
1. **Checkout**: User pays for a batch of certificates.
2. **Payment**: One-time payment via Paystack.
3. **Confirmation**: The batch is marked as paid once the transaction is successful.

### B. Technical Flow
1. **Identification**: The webhook detects CoD payments via reference prefix (`SurfCoD_` or `SurfCoDRef_`) or metadata.
2. **Processing**: `onCertificatePaymentSuccess` in `route.ts`.
   - Path: `app/api/webhooks/paystack/route.ts`
   - Action: Finds the `CertificateOfDepositBatch` by the payment reference and updates `paymentStatus` to `USER_PAID`.

---

## 4. Reva One-Time Payment Flow

### A. Non-Technical Flow
1. **Request**: User makes a property transaction request.
2. **Payment**: Completes payment via Paystack.
3. **Manual Verification**: Admin can manually sync status if the webhook fails.

### B. Technical Flow
1. **Webhook**: `handleReva` in `route.ts` processes `charge.success`.
   - Path: `app/api/webhooks/paystack/route.ts`
   - Action: Updates transaction status in `revaActions2.ts`.
2. **Admin Verification**: `PaymentVerification.tsx` component allows bulk or single verification.
   - Path: `app/(projects)/reva-restricted/dashboard/payment-verification/PaymentVerification.tsx`
   - Action: Calls `verifyPaystackTransaction` and updates `revaActions.ts`.

---

## 5. Remita Payment Flow (Alternative)

### A. Non-Technical Flow
1. **Portal**: User pays via an embedded Remita iframe.
2. **Receipts**: User receives two emails: one from LASG and one from Remita.
3. **Submission**: User pastes both receipt links into the Surfboard portal.
4. **Verification**: System scrapes/verifies the links and activates the service.

### B. Technical Flow
1. **UI**: `RemitaPaymentModal.tsx`.
2. **Verification**: Calls `verifyBatchPaymentWithLinks(batchId, lasgUrl, remitaUrl)`.
   - Path: `app/(projects)/(surfboard)/actions/codActions.ts` (implied by import).

---

## 6. Key Files and Paths

| Component | File Path |
| :--- | :--- |
| **Webhook Handler** | `app/api/webhooks/paystack/route.ts` |
| **Subscription UI** | `app/(projects)/(surfboard)/surfboard/dashboard/subscription/SubscriptionManager.tsx` |
| **Subscription Logic** | `app/(projects)/(surfboard)/actions/subscriptionActions.ts` |
| **Paystack API Logic** | `app/(projects)/(surfboard)/actions/paystackActions.ts` |
| **Plan Definitions** | `app/(projects)/(surfboard)/utils/paystackSubscription.ts` |
| **Reva Admin Verification** | `app/(projects)/reva-restricted/dashboard/payment-verification/PaymentVerification.tsx` |
| **Remita UI** | `app/(projects)/(surfboard)/components/RemitaPaymentModal.tsx` |
| **Analytics** | `app/(projects)/(surfboard)/actions/subscriptionAnalyticsActions.ts` |
| **Types** | `types/PaystackWebhookType.ts` |
