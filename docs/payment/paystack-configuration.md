# Paystack Configuration Guide

## Overview

This document explains the Paystack integration configuration and the recent changes made to support test/live environment tracking with separate keys for each environment.

## Changes Made

### 1. Added `isLive` Field

Both `Property` and `OneTimeUserProperty` models now include an `isLive` field to track whether a transaction is in test or live environment:

```sql
isLive Boolean @default(false) // Track if this is a live or test transaction
```

### 2. Fixed Paystack Callback URL Issue

The Paystack callback URL was incorrectly pointing to `http://localhost:3000` in development. This has been fixed by:

- Creating a new `getPaystackCallbackUrl()` function that uses `ONLINE_BASE_URL` for production callbacks
- Updating all Paystack initialization calls to use the new function
- Adding environment tracking to Paystack metadata

### 3. Environment-Based Paystack Key Management

The system now uses different Paystack keys for test and live environments:

- **Test Environment**: Uses `PAYSTACK_TEST_SECRET` and `PAYSTACK_TEST_PUBLIC_KEY`
- **Live Environment**: Uses `PAYSTACK_LIVE_SECRET` and `PAYSTACK_LIVE_PUBLIC_KEY`

The appropriate keys are automatically selected based on the `isLive` field in the database.

## Environment Variables Required

Add these environment variables to your `.env` file:

```env
# Base URL for the application (used for general navigation)
BASE_URL=http://localhost:3000

# Production URL for Paystack callbacks (must be publicly accessible)
ONLINE_BASE_URL=https://your-production-domain.com

# Paystack Test Environment Keys
PAYSTACK_TEST_SECRET=sk_test_your_test_secret_key
PAYSTACK_TEST_PUBLIC_KEY=pk_test_your_test_public_key

# Paystack Live Environment Keys
PAYSTACK_LIVE_SECRET=sk_live_your_live_secret_key
PAYSTACK_LIVE_PUBLIC_KEY=pk_live_your_live_public_key

# Node environment
NODE_ENV=development
```

## How It Works

### Environment Detection

`isLive` comes from `isPaystackLive()` in `lib/paystackMode.ts`. Every Vercel deployment, previews included, runs with `NODE_ENV=production`, so `NODE_ENV` alone made staging use the live keys. The order is now:

1. `PAYSTACK_MODE=live|test` forces a mode.
2. A Vercel **preview** deployment (staging, branch URLs) is **test**.
3. Otherwise `NODE_ENV=production` is **live**, and anything else (local dev) is **test**.

`getPaystackSecret()` in the same file picks the secret for the mode. It is used for the Surfboard API client and for checking webhook signatures (Paystack signs an event with the key of the mode that produced it). In test mode `PAYSTACK_TEST_SECRET` wins; in live mode `PAYSTACK_SECRET_KEY` / `PAYSTACK_LIVE_SECRET`.

### Setting up a test-mode staging on Vercel

Vercel → Project → Settings → Environment Variables, scope **Preview** only (never change Production):

| Variable                          | Value                                              |
| --------------------------------- | -------------------------------------------------- |
| `PAYSTACK_TEST_SECRET`            | the Paystack **test** secret key (`sk_test_…`)     |
| `PAYSTACK_TEST_PUBLIC_KEY`        | the test public key (`pk_test_…`)                  |
| `PAYSTACK_SECRET_KEY`             | same test secret (used by older code paths)        |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | the test public key (read by the browser at build) |
| `BASE_URL`                        | the staging URL (used for emails and callbacks)    |

Then redeploy: `NEXT_PUBLIC_*` values are baked in at build time. In the Paystack dashboard, switch to **Test mode**, and set the test webhook URL to `<staging URL>/api/webhooks/paystack?x-vercel-protection-bypass=<bypass secret>`. Paystack cannot send headers, and Vercel's deployment protection otherwise answers its requests with 401. References then read `SURFBOARD_SUB_test_…`.

### Paystack Key Selection

The system automatically selects the appropriate Paystack keys:

1. **During Payment Initialization**: The `isLive` field determines which keys to use
2. **During Payment Verification**: The database record's `isLive` field determines which keys to use
3. **During Webhook Processing**: The environment determines which secret key to use for signature verification

### Callback URL Resolution

1. **Development**: Uses `ONLINE_BASE_URL` for Paystack callbacks (must be production URL)
2. **Production**: Uses `ONLINE_BASE_URL` for Paystack callbacks

This ensures that Paystack can always reach your webhook endpoints, even when testing locally.

### Paystack Metadata

Each transaction now includes environment information in the metadata:

```javascript
metadata: {
  // ... other fields
  isLive: boolean, // Track if this is a live or test transaction
  custom_fields: [
    // ... other fields
    {
      display_name: "Environment",
      variable_name: "isLive",
      value: isLive ? "Live" : "Test",
    },
  ],
}
```

## Files Modified

_(Historical — this is the changelog from when the `isLive` feature was originally built, pre-dating the 2026-08 architecture rebuild. The REVA/Surfboard action-file paths below no longer exist; see `docs/payment/subscription-payments-flow.md` §6 for their current `surfboard/services/*` / `reva/services/*` replacements. `utils/addBaseUrl.ts` and `utils/paystackConfig.ts` are shared utilities, unaffected by the rebuild's per-product folder moves and still live at the paths below.)_

- `prisma/schema/reva.prisma` - Added `isLive` to `Property` and `OneTimeUserProperty` (the schema was a single `prisma/schema.prisma` when this was written; it is now split per product under `prisma/schema/`)
- `utils/addBaseUrl.ts` - Added `getPaystackCallbackUrl()` function
- `utils/paystackConfig.ts` - Environment-based Paystack configuration
- `app/(projects)/(reva)/reva/actions/paystackActions.ts` — **still live**, deliberately kept as the thin shared `verifyPaystackTransaction` utility (imported by `reva/services/paymentService.ts`); ~~`dbActions.ts`~~ is superseded by `reva/services/propertyRequestService.ts`
- ~~`app/(projects)/(surfboard)/subboard/actions/{paystackActions,dbActions}.ts`~~ — superseded by `surfboard/services/paystackSubscriptionService.ts` and `surfboard/services/subscriptionService.ts`
- `app/api/webhooks/paystack/route.ts` - the shared, current webhook path (the `app/api/reva/webhooks/paystack/route.ts` this originally referenced is legacy/superseded)

## Troubleshooting

### Callback URL Still Points to Localhost

If you're still seeing `http://localhost:3000` in Paystack callbacks:

1. Check that `ONLINE_BASE_URL` is set in your environment variables
2. Ensure `ONLINE_BASE_URL` points to your production domain
3. Restart your development server after adding the environment variable

### Paystack Key Errors

If you're getting Paystack key errors:

1. Ensure both test and live keys are set in your environment variables
2. Check that the keys are valid and have the correct permissions
3. Verify that test keys start with `sk_test_` and live keys start with `sk_live_`

### Database Migration

If you haven't run the migration yet:

```bash
npx prisma migrate dev --name add_is_live_field
npx prisma generate
```

### Testing

To test the configuration:

1. **Test Environment**:
   - Set `NODE_ENV=development` in your `.env` file
   - Create a test transaction
   - Check that `isLive` is set to `false` in the database
   - Verify that Paystack uses test keys

2. **Live Environment**:
   - Set `NODE_ENV=production` in your `.env` file
   - Create a test transaction
   - Check that `isLive` is set to `true` in the database
   - Verify that Paystack uses live keys

### Environment Variable Checklist

Make sure you have all these environment variables set:

- [ ] `BASE_URL`
- [ ] `ONLINE_BASE_URL`
- [ ] `PAYSTACK_TEST_SECRET`
- [ ] `PAYSTACK_TEST_PUBLIC_KEY`
- [ ] `PAYSTACK_LIVE_SECRET`
- [ ] `PAYSTACK_LIVE_PUBLIC_KEY`
- [ ] `NODE_ENV`

## Security Notes

1. **Never commit live keys to version control**
2. **Use different keys for test and live environments**
3. **Rotate keys regularly**
4. **Monitor webhook signatures for security**
5. **Use environment-specific webhook URLs in Paystack dashboard**
