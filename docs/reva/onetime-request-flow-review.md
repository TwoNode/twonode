# OneTime Request Flow Review

> **Historical — the critical issues below are resolved.** This review pre-dates the 2026-08 architecture rebuild. Per `docs/development-history/phases/phase-3-reva.md`: the guest tracking page **does exist** (`app/(projects)/reva/onetimerequest/page.tsx` — the review below was written before this was found), and the email-notification gap for `OneTimeUserProperty` approvals was closed with a real email-keyed `Notification` path (no longer silently commented out). See [`./user-flow.md`](./user-flow.md) for REVA's current guest-request flow, and the phase-3 doc for exactly what was fixed and why. Kept here for the historical problem analysis, not as current status.

## Overview

This document provides a comprehensive review of the OneTime request flow, specifically focusing on report upload, approval, and client notification processes in the REVA system.

## Current Flow Analysis

### 1. Request Creation & Initial Processing

**Location**: `app/(projects)/reva/actions/dbActions.ts` - `saveToOneTimeProperty()`

**Process**:

- OneTime requests are created through the form at `/reva/requestform`
- Data is saved to `OneTimeUserProperty` table with initial status "Processing"
- Payment status starts as "Unpaid"
- Initial notifications are sent to admins and optionally to users

**Issues Identified**:

- ✅ Good: Proper initial status setting
- ✅ Good: Admin notifications are sent
- ⚠️ Issue: No specific OneTime request view page for clients

### 2. Payment Processing

**Location**: `app/(projects)/reva/actions/dbActions.ts` - `checkPaymentSuccess()`

**Process**:

- Paystack payment verification
- Status updates to "Processing" and "Paid"
- Payment success notifications

**Issues Identified**:

- ✅ Good: Proper payment verification
- ✅ Good: Status updates are handled correctly
- ⚠️ Issue: No specific client notification for OneTime requests after payment

### 3. Report Upload Process

**Location**: `app/(projects)/reva-restricted/dashboard/details/AdminReportUpload.tsx`

**Process**:

- Admins can upload detailed reports with multiple sections
- Two upload methods: Detailed form and Direct link
- Reports are stored as JSON in the database

**Issues Identified**:

- ✅ Good: Comprehensive report structure
- ✅ Good: Multiple upload options
- ⚠️ Issue: No specific handling for OneTime requests vs regular requests
- ⚠️ Issue: Same approval flow for both request types

### 4. Report Approval Process

**Location**: `app/(projects)/reva-restricted/actions/adminDbActions.ts` - `approveDueDiligenceReport()`

**Process**:

- SuperAdmin can approve/disapprove reports
- Email notifications sent to admins and clients
- In-app notifications created
- Status updates in database

**Issues Identified**:

- ✅ Good: Proper approval workflow
- ✅ Good: Email notifications
- ⚠️ Issue: Email notifications only work for regular users (not OneTime users)
- ⚠️ Issue: No specific OneTime request approval handling

### 5. Client Notification & Access

**Current Issues**:

- **No dedicated OneTime request view page**: Clients can't view their OneTime requests
- **Email notifications fail**: OneTime users don't have user accounts, so email notifications fail
- **No client dashboard**: OneTime users have no way to track their requests

## Critical Issues Found

### 1. Missing Client Access for OneTime Requests

**Problem**: OneTime users have no way to view their requests or reports after submission.

**Current State**:

- Regular users: `/reva/dashboard/details?reference=XXX`
- OneTime users: No equivalent page exists

**Impact**: OneTime users cannot:

- Track their request status
- View uploaded reports
- Download approved reports
- Receive notifications

### 2. Email Notification Failures

**Problem**: Email notifications for OneTime requests fail because the system tries to send emails to user accounts that don't exist.

**Location**: `app/(projects)/reva-restricted/actions/adminDbActions.ts` lines 698-748

**Issue**: The code checks for `property?.user?.email` but OneTime requests don't have associated user accounts.

### 3. Inconsistent Data Handling

**Problem**: The system treats OneTime requests and regular requests differently in some places but not others.

**Examples**:

- Admin dashboard shows OneTime requests separately ✅
- Report upload/approval treats them the same ❌
- Client access completely missing for OneTime requests ❌

## Recommendations

### 1. Create OneTime Request Client View Page

**Action Required**: Create a new page for OneTime request clients to view their requests.

**Suggested Implementation**:

```typescript
// New page: app/(noPopUp)/onetimerequest/page.tsx
// URL: /onetimerequest?reference=XXX&email=XXX
```

**Features Needed**:

- Reference and email validation
- Request status display
- Report download (if approved)
- Document access
- Status tracking

### 2. Fix Email Notifications

**Action Required**: Modify the approval process to handle OneTime requests properly.

**Current Code Issue**:

```typescript
if (isApproved && property?.user?.email) {
  await sendMail({
    to: property.user.email, // This fails for OneTime requests
    // ...
  });
}
```

**Suggested Fix**:

```typescript
if (isApproved) {
  const emailToNotify = property?.user?.email || property?.email;
  if (emailToNotify) {
    await sendMail({
      to: emailToNotify,
      // ...
    });
  }
}
```

### 3. Enhance Notification System

**Action Required**: Create specific notification handling for OneTime requests.

**Suggested Implementation**:

- Add OneTime request specific notification types
- Create email templates for OneTime users
- Implement SMS notifications for OneTime users (optional)

### 4. Improve Data Consistency

**Action Required**: Ensure consistent handling of OneTime vs regular requests throughout the system.

**Areas to Update**:

- Report upload components
- Approval workflows
- Status tracking
- Client access patterns

## Implementation Priority

### High Priority (Critical)

1. **Create OneTime request client view page**
2. **Fix email notifications for OneTime requests**
3. **Add proper client access URLs in notifications**

### Medium Priority (Important)

1. **Enhance notification system for OneTime requests**
2. **Improve data consistency across request types**
3. **Add status tracking for OneTime requests**

### Low Priority (Nice to Have)

1. **Add SMS notifications for OneTime users**
2. **Create OneTime request dashboard**
3. **Add request modification capabilities**

## Technical Implementation Notes

### Database Schema

The current `OneTimeUserProperty` schema is adequate but could benefit from:

- `clientAccessToken` field for secure access
- `notificationPreferences` field
- `lastViewedAt` timestamp

### Security Considerations

- OneTime request access should be validated by both reference and email
- Implement rate limiting for client access
- Add audit logging for report downloads

### User Experience

- Provide clear status indicators
- Add progress tracking
- Implement responsive design for mobile access

## Conclusion

The OneTime request flow has a solid foundation but suffers from incomplete client access implementation. The most critical issue is the lack of a client view page for OneTime requests, which prevents clients from accessing their reports after approval.

The system needs immediate attention to:

1. Create client access pages for OneTime requests
2. Fix email notification failures
3. Ensure consistent handling across request types

These changes will significantly improve the user experience and system reliability for OneTime requests.
