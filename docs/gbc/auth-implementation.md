# GBC Authentication Implementation Summary

## Overview

Added Kinde authentication for GBC2 (Global Business Conference) platform, following the same pattern as REVA and Surfboard implementations.

## Files Created

### 1. Authentication Utilities

- **`/utils/gbcAuth.ts`**: Server-side authentication utilities for GBC
  - `getUserFromGBCDB()`: Fetch user from database
  - `getAuthenticatedGBCUser()`: Get authenticated user from Kinde
  - `getAuthenticatedGBCUserFromCookie()`: Get user from encrypted cookie (cached)
  - `verifyGBCAdminAccess()`: Verify admin panel access
  - `verifyGBCUserAccess()`: Verify user panel access

### 2. Client Hooks

- **`/hooks/useGBCUserAccess.ts`**: Client hook for user authentication checks
- **`/hooks/useGBCAdminAccess.ts`**: Client hook for admin authentication checks

### 3. UI Components

- **`/components/pageNotFound/GBCPageNotFound.tsx`**: 404 page component
- **`/components/layouts/gbcUserPanelLayout.tsx`**: User dashboard layout with sidebar
- **`/components/layouts/gbcAdminPanelLayout.tsx`**: Admin dashboard layout with sidebar

### 4. Color Palette

- **`/gbc-colors.ts`**: Purple/violet themed color palette for GBC branding

### 5. API Routes

- **`/app/api/auth/success/gbc/route.ts`**: User login success handler
- **`/app/api/auth/success/gbc-restricted/route.ts`**: Admin login success handler

## Files Modified

### 1. Platform Configuration

- **`/utils/platform.ts`**: Added `Platform.GBC` and `GBCRole` enum

### 2. Permissions

- **`/permissions.ts`**: Added GBC permission functions:
  - `canAccessGBCAdminPanel()`
  - `canAccessGBCUserPanel()`
  - `canAccessGBCSuperAdminPanel()`
  - `isGBCAdmin()`, `isGBCSuperAdmin()`, `isGBCRegularUser()`

### 3. Encrypted Cookies

- **`/utils/encryptedCookies.ts`**: Added `GBCRole` to type unions

### 4. Proxy Middleware

- **`/proxy.ts`**: Added GBC routes to protected routes and authentication flow
  - Routes: `/gbc/restricted/*`
  - Login pages: `/gbc/login`, `/gbc/restricted/login`
  - Platform checks and role-based access control

### 5. Authentication Flow Routes

- **`/app/api/auth/homepage/route.ts`**: Added GBC routing
- **`/app/api/auth/login_redirect/route.ts`**: Added GBC login redirects
- **`/app/api/auth/logout_redirect/route.ts`**: Added GBC logout redirects

### 6. Layout

- **`/app/(projects)/(GBC)/layout.tsx`**: Updated with ToastProvider and GBC metadata (ToastProvider/`react-toastify` has since been removed; the root `ToasterComponent` serves every product)

## Route Structure

### User Routes (Public)

- `/gbc` - Main landing page
- `/gbc/login` - User login page
- `/gbc/tickets` - View tickets
- `/gbc/gallery` - Event gallery
- `/gbc/sponsors` - Sponsors page
- `/gbc/contact` - Contact page
- `/gbc/settings` - User settings

### Admin Routes (Protected)

- `/gbc/restricted` - Admin dashboard
- `/gbc/restricted/login` - Admin login
- `/gbc/restricted/tickets` - Manage tickets
- `/gbc/restricted/check-in` - Check-in attendees
- `/gbc/restricted/qr-code` - QR code management
- `/gbc/restricted/attendees` - Attendee management
- `/gbc/restricted/settings` - Admin settings
- `/gbc/restricted/superadmin` - Superadmin panel (SUPERADMIN only)

## Authentication Flow

1. **Login**: User clicks login → Redirected to Kinde
2. **Callback**: Kinde redirects to `/api/auth/success/gbc` or `/api/auth/success/gbc-restricted`
3. **User Creation/Update**: User record created/updated in database
4. **Session Creation**: Encrypted cookie set with user data (platform, role, userId, etc.)
5. **Redirect**: User redirected to appropriate dashboard based on role

## Authorization Levels

### USER

- Access to main dashboard and user features
- View tickets, gallery, sponsors
- Update personal settings

### ADMIN

- All USER permissions
- Access to admin panel (`/gbc/restricted`)
- Manage tickets, check-in, QR codes
- View attendee list

### SUPERADMIN

- All ADMIN permissions
- Access to superadmin panel (`/gbc/restricted/superadmin`)
- Full system control

## Database Schema

The implementation expects a `GBCUser` model in Prisma with the following fields:

- `id`: String (primary key)
- `kindeId`: String (unique, from Kinde auth)
- `email`: String (unique)
- `name`: String (full name)
- `phone`: String (optional)
- `role`: GBCRole enum (USER, ADMIN, SUPERADMIN)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Color Theme

The GBC platform uses a purple/violet color palette:

- **Primary**: #7C3AED (Purple)
- **Secondary**: #EC4899 (Pink)
- **Accent**: #8B5CF6 (Violet)
- **Background**: #FAF5FF (Very light purple)

## Next Steps

To complete the implementation:

1. **Create Login Pages**:
   - `/app/(projects)/(GBC)/gbc/login/page.tsx`
   - `/app/(projects)/(GBC)/gbc/restricted/login/page.tsx`

2. **Create Dashboard Pages**:
   - User dashboard at `/app/(projects)/(GBC)/gbc/page.tsx`
   - Admin dashboard at `/app/(projects)/(GBC)/gbc/restricted/page.tsx`

3. **Configure Kinde**:
   - Add GBC callback URLs in Kinde dashboard
   - Set up roles and permissions in Kinde

4. **Environment Variables**:
   Ensure these are set:
   ```
   KINDE_CLIENT_ID=your_client_id
   KINDE_CLIENT_SECRET=your_client_secret
   KINDE_ISSUER_URL=https://yourdomain.kinde.com
   KINDE_SITE_URL=http://localhost:3000 (or your domain)
   KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
   KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/api/auth/login_redirect
   COOKIE_ENCRYPTION_KEY=your_64_char_hex_key
   ```

## Testing Checklist

- [ ] User can register and login
- [ ] User is redirected to appropriate dashboard based on role
- [ ] Admin cannot access user features they shouldn't
- [ ] User cannot access admin panel
- [ ] Logout clears session and redirects correctly
- [ ] Session persists on page refresh
- [ ] Middleware protects routes correctly
- [ ] Superadmin menu only visible to SUPERADMIN users
