# Payment Verification Feature

## Overview

The Payment Verification feature allows administrators to manually verify payment status with Paystack for all requests in the system. This is particularly useful for:

- Resolving payment discrepancies
- Updating payment status for requests that may have been missed by webhooks
- Bulk verification of unpaid requests
- Manual verification of individual requests

## Access

The Payment Verification page is accessible to admin users at:

```
/reva-restricted/dashboard/payment-verification
```

## Features

### 1. View All Requests

- Displays both authenticated user requests and one-time user requests
- Shows payment status, environment (test/live), and request details
- Real-time filtering and search capabilities

### 2. Bulk Verification

- Verify all unpaid requests at once
- Automatic database updates based on Paystack verification results
- Progress tracking and result summary

### 3. Individual Verification

- Verify payment status for specific requests
- Confirmation dialog before verification
- Immediate feedback on verification results

### 4. Filtering and Search

- Search by reference, address, email, or title
- Filter by payment status (All, Paid, Unpaid, Processing)
- Real-time filtering without page reload

### 5. Verification Results

- Detailed results for each verification attempt
- Color-coded success/failure indicators
- Status change tracking (original → new status)

## How It Works

### Payment Verification Process

1. **Fetch Requests**: Retrieves all requests from both `property` and `oneTimeUserProperty` tables
2. **Paystack Verification**: Calls Paystack's transaction verification API using the request reference
3. **Status Update**: Updates the database based on Paystack's response:
   - If Paystack reports `status: "success"` → Updates to "Paid"
   - If Paystack reports any other status → Updates to "Unpaid"
4. **Result Tracking**: Records verification results for display and audit purposes

### Environment Handling

The system automatically detects the correct Paystack environment (test/live) based on the `isLive` field in the database:

- `isLive: false` → Uses test Paystack keys
- `isLive: true` → Uses live Paystack keys

### Database Updates

For authenticated users:

```typescript
await updatePropertyTransactionStatus(
  reference,
  "Processing",
  newPaymentStatus,
  statusMessage,
  errorMessage
);
```

For one-time users:

```typescript
await updateOneTimeTransactionStatus(
  reference,
  "Processing",
  newPaymentStatus,
  statusMessage,
  errorMessage
);
```

## Security Considerations

1. **Admin Access Only**: Only users with admin privileges can access this feature
2. **Audit Trail**: All verification attempts are logged with timestamps
3. **Confirmation Dialogs**: Individual verifications require explicit confirmation
4. **Error Handling**: Comprehensive error handling prevents system crashes

## Usage Guidelines

### When to Use

- **Payment Discrepancies**: When there's a mismatch between database status and actual payment
- **Webhook Failures**: When Paystack webhooks may have failed to update the database
- **Manual Reconciliation**: For periodic payment status reconciliation
- **Customer Support**: To resolve customer payment issues

### Best Practices

1. **Verify in Batches**: Use bulk verification for efficiency
2. **Check Results**: Always review verification results
3. **Monitor Logs**: Check console logs for any verification errors
4. **Test Environment**: Test with test transactions before using on live data

### Limitations

1. **Rate Limiting**: Paystack may have rate limits on verification requests
2. **Network Dependencies**: Requires stable internet connection to Paystack
3. **Transaction Age**: Very old transactions may not be verifiable
4. **Environment Mismatch**: Cannot verify test transactions with live keys or vice versa

## Troubleshooting

### Common Issues

1. **"Failed to verify payment with Paystack"**
   - Check internet connection
   - Verify Paystack API keys are correct
   - Check if transaction reference exists in Paystack

2. **"Reference not found"**
   - Verify the reference format is correct
   - Check if the transaction exists in the correct environment

3. **"Invalid signature"**
   - Ensure Paystack secret keys match the environment
   - Check environment variables are set correctly

### Error Handling

The system includes comprehensive error handling:

- Network errors are caught and reported
- Invalid responses are handled gracefully
- Database update failures are logged
- User-friendly error messages are displayed

## API Integration

The feature integrates with existing Paystack utilities:

`PaymentVerification.tsx` itself calls the typed API client (not a direct server-action import — repointed during Phase 5's action-file retirement, see `docs/development-history/phases/phase-5-retirement.md`):

```typescript
import { revaApi } from "@/reva/apiClient";

await revaApi.admin.requests.verifyPayment(
  reference,
  isLive,
  "authenticated" /* or "oneTime" */
);
// → POST /api/v1/reva/admin/requests/:reference/verify-payment
```

Server-side, that route still verifies against Paystack via `verifyPaystackTransaction` (`app/(projects)/(reva)/reva/actions/paystackActions.ts` — deliberately kept as a thin, shared server-side utility rather than migrated into a service, since Phase 5 confirmed it's still imported directly by `reva/services/paymentService.ts` too) and updates state through `reva/services/propertyRequestService.ts`'s `updatePropertyTransactionStatus`/`updateOneTimeTransactionStatus`.

## Future Enhancements

Potential improvements for future versions:

1. **Scheduled Verification**: Automatic periodic verification of unpaid requests
2. **Email Notifications**: Notify admins of verification results
3. **Export Results**: Export verification results to CSV/Excel
4. **Advanced Filtering**: Filter by date range, amount, etc.
5. **Bulk Actions**: Bulk update payment status without verification
6. **Audit Log**: Detailed audit trail of all verification activities
