# REVA Notification System

## Overview

A comprehensive notification system has been implemented for the REVA platform, providing real-time notifications for both users and administrators. The system includes beautiful UI components, database integration, and automatic notification triggers for various system events.

## Features

### 🎨 Beautiful UI Components
- **Admin Notification Page**: Advanced filtering, search, bulk actions, and real-time updates
- **User Notification Page**: Clean, responsive design with filtering and search capabilities
- **Notification Bell**: Real-time unread count with auto-refresh every 30 seconds
- **Color-coded Notifications**: Different colors and icons for different notification types

### 🔔 Notification Types
- **SUCCESS**: Green - Successful operations (payments, report completion)
- **INFO**: Blue - General information
- **WARNING**: Yellow - Warnings and alerts
- **ERROR**: Red - Error notifications
- **SYSTEM**: Gray - System-level notifications
- **PAYMENT**: Indigo - Payment-related notifications
- **PROPERTY**: Purple - Property-related notifications

### 📱 Interactive Features
- **Mark as Read**: Users can mark notifications as read
- **Dismiss**: Users can dismiss notifications
- **Bulk Actions**: Admins can perform bulk operations (mark as read, dismiss)
- **Search & Filter**: Advanced filtering by type, status, and search terms
- **Real-time Updates**: Automatic refresh of unread counts

## Database Schema

### Notification Table
```sql
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
```

## API Functions

### Core Notification Functions
- `createNotification()` - Create a new notification
- `getUserNotifications()` - Get notifications for a specific user
- `getAdminNotifications()` - Get all notifications for admins
- `markNotificationAsRead()` - Mark notification as read
- `dismissNotification()` - Dismiss a notification
- `getUnreadNotificationCount()` - Get unread count for a user

### Notification Triggers
- `notifyNewPropertyRequest()` - Triggered when new property requests are created
- `notifyPaymentReceived()` - Triggered when payments are completed
- `notifyReportReady()` - Triggered when reports are approved
- `notifySystemAlert()` - General system notifications

## Automatic Notification Triggers

### User Actions
1. **Property Request Creation**
   - Notifies admins about new requests
   - Confirms request submission to user

2. **Payment Completion**
   - Notifies admins about received payments
   - Confirms payment to user

### Admin Actions
1. **Report Upload**
   - Notifies all admins about uploaded reports

2. **Report Approval/Disapproval**
   - Notifies user when report is approved
   - Notifies admins about approval/disapproval decisions

3. **User Management**
   - Admin user creation
   - User role changes (promote/demote)
   - User activation/deactivation
   - User deletion

## Components

### NotificationBell Component
```tsx
<NotificationBell 
  href="/reva/dashboard/notifications"
  size={30}
  color="#fff"
/>
```

**Features:**
- Real-time unread count
- Auto-refresh every 30 seconds
- Responsive design
- Configurable size and color

### Admin Notifications Page
**Location:** `/reva-restricted/dashboard/notifications`

**Features:**
- Advanced filtering (type, status, dismissed)
- Search functionality
- Bulk actions (select all, mark as read, dismiss)
- Real-time data fetching
- Beautiful card-based design
- Metadata display (property references, amounts, addresses)

### User Notifications Page
**Location:** `/reva/dashboard/notifications`

**Features:**
- Clean, user-friendly interface
- Filtering and search
- Individual notification actions
- Responsive design
- Real-time updates

## Integration Points

### Headers
- **Admin Header**: Includes notification bell with unread count
- **User Header**: Includes notification bell with unread count

### Database Actions
Notifications are automatically triggered in:
- `saveToOneTimeProperty()` - New property requests
- `saveToPropertyTable()` - New authenticated property requests
- `checkPaymentSuccess()` - Payment completion (one-time users)
- `authPaymentSuccessful()` - Payment completion (authenticated users)
- `approveDueDiligenceReport()` - Report approval/disapproval
- `uploadDueDiligenceReport()` - Report upload
- `uploadDirectLinkReport()` - Direct link report upload
- `createAdminUser()` - New admin user creation
- `makeUserAdmin()` - User role promotion
- `removeAdminPrivileges()` - Admin privilege removal
- `deactivateUser()` - User deactivation
- `reactivateUser()` - User reactivation
- `deleteUser()` - User deletion

## Styling

### Color Scheme
- **Success**: Green (`#10b981`)
- **Info**: Blue (`#3b82f6`)
- **Warning**: Yellow (`#f59e0b`)
- **Error**: Red (`#ef4444`)
- **System**: Gray (`#6b7280`)
- **Payment**: Indigo (`#6366f1`)
- **Property**: Purple (`#8b5cf6`)

### REVA Brand Colors
The notification system uses REVA's brand colors and gradients for consistency:
- Primary gradients for headers
- Brand colors for icons and accents
- Consistent spacing and typography

## Usage Examples

### Creating a Notification
```typescript
await createNotification({
  type: "SUCCESS",
  title: "Payment Confirmed",
  message: "Your payment of ₦40,000 has been confirmed.",
  userIds: [userId],
  link: `/reva/dashboard/details?reference=${reference}`,
  metadata: {
    propertyReference: reference,
    amount: 40000
  }
});
```

### Getting User Notifications
```typescript
const result = await getUserNotifications(userId);
if (result.success) {
  const notifications = result.data;
  // Process notifications
}
```

### Marking as Read
```typescript
await markNotificationAsRead(notificationId, userId);
```

## Future Enhancements

1. **Email Notifications**: Send email notifications for important events
2. **Push Notifications**: Browser push notifications
3. **Notification Preferences**: User-configurable notification settings
4. **Notification Templates**: Reusable notification templates
5. **Analytics**: Notification engagement tracking
6. **Real-time Updates**: WebSocket integration for instant updates

## Technical Notes

- **Performance**: Notifications are paginated and cached for optimal performance
- **Security**: All notification actions are properly authenticated and authorized
- **Scalability**: Database queries are optimized with proper indexing
- **Accessibility**: Components follow WCAG guidelines for accessibility
- **Responsive**: All components work seamlessly on mobile and desktop

## File Structure

```
components/
├── NotificationBell.tsx          # Reusable notification bell component
├── headers/
│   ├── RevaAdminDashboardHeader.tsx
│   └── RevaUserDashboardHeader.tsx

app/(projects)/reva/
├── actions/
│   └── dbActions.ts              # Notification database functions
├── dashboard/notifications/
│   ├── page.tsx
│   └── NotificationsList.tsx     # User notifications page

app/(projects)/reva-restricted/
├── actions/
│   └── adminDbActions.ts         # Admin actions with notifications
├── dashboard/notifications/
│   ├── page.tsx
│   └── AdminNotificationsList.tsx # Admin notifications page
```

This notification system provides a comprehensive, scalable, and user-friendly way to keep users and administrators informed about important events in the REVA platform. 