# REVA Shared Components

This folder contains shared components that can be used across both REVA user and admin dashboards. These components are designed to be configurable and reusable while maintaining consistent styling and behavior.

## Components Overview

### 1. Welcome

The panel at the top of a dashboard: an avatar with the person's initials (or their picture), a role chip and today's date, a time-of-day greeting by first name ("Good evening, Ada"), a one-line description, two shortcut buttons and a "Contact support" link.

The name, picture and role come from the app's own session (`revaApi.session.get()`, the same source as the sidebar's user menu), so it works for email-and-password accounts as well as Kinde ones. The greeting and date are worked out in the browser after mount, so the server and client markup match on first render — until then (and until the session answers) the heading is a skeleton of the same height. If the session can't be read, the panel still shows the time greeting without a name.

**Props:**

- `dashboardType?: 'user' | 'admin'` - Picks the default description and shortcuts
- `customGreeting?: string` - Replaces the personalised greeting with fixed text
- `customDescription?: string` - Replaces the one-line description
- `customInstructions?: string[]` - Tips shown in the strip under the panel (none by default)
- `actions?: { label; href; icon }[]` - Replaces the two default shortcuts; the first is drawn as the primary button

**Defaults:**

- `user` → "New request" and "All requests"
- `admin` → "Review requests" and "Verify payments"

**Usage:**

```tsx
import { Welcome } from "@/reva/components/shared";

// User dashboard
<Welcome />

// Admin dashboard
<Welcome dashboardType="admin" />
```

The pure helpers (`timeGreeting`, `getInitials`, `roleLabel`) live in `reva/utils/welcome.ts`.

### 2. RevaHeroSection

A hero section component with logo, title, description, and call-to-action button.

**Props:**

- `showRequestButton?: boolean` - Show/hide the CTA button
- `smallLogo?: boolean` - Use smaller logo variant
- `showTitle?: boolean` - Show/hide the title
- `dashboardType?: 'user' | 'admin'` - Determines default links and behavior
- `customTitle?: string` - Custom title text
- `customDescription?: string` - Custom description text
- `customButtonText?: string` - Custom button text
- `customButtonLink?: string` - Custom button link
- `showAuthLinks?: boolean` - Show/hide authentication links

**Usage:**

```tsx
// User Dashboard
import { RevaHeroSection } from "@/reva/components/shared";
<RevaHeroSection />

// Admin Dashboard
<RevaHeroSection
  dashboardType="admin"
  customButtonText="Go to Dashboard"
  customButtonLink="/reva-restricted/dashboard"
/>
```

### 3. AuthLinks

Authentication links component with sign-in and register buttons.

**Props:**

- `dashboardType?: 'user' | 'admin'` - Determines default redirect URLs
- `customLoginRedirect?: string` - Custom login redirect URL
- `customRegisterRedirect?: string` - Custom register redirect URL
- `showRegister?: boolean` - Show/hide register button

**Usage:**

```tsx
// User Dashboard
import { AuthLinks } from "@/reva/components/shared";
<AuthLinks />

// Admin Dashboard
<AuthLinks
  dashboardType="admin"
  customLoginRedirect="/api/auth/success/reva-restricted"
  customRegisterRedirect="/api/auth/success/reva-restricted"
/>
```

### 4. RevaFooterSection

Footer section component with logo and copyright information.

**Props:**

- `dashboardType?: 'user' | 'admin'` - Determines default logo link
- `customLogoLink?: string` - Custom logo link
- `customCopyrightText?: string` - Custom copyright text
- `showLogo?: boolean` - Show/hide logo

**Usage:**

```tsx
// User Dashboard
import { RevaFooterSection } from "@/reva/components/shared";
<RevaFooterSection />

// Admin Dashboard
<RevaFooterSection
  dashboardType="admin"
  customLogoLink="/reva-restricted"
/>
```

### 5. ComingSoon

A coming soon page component with customizable content and navigation.

**Props:**

- `dashboardType?: 'user' | 'admin'` - Determines default button link
- `customTitle?: string` - Custom title text
- `customDescription?: string` - Custom description text
- `customButtonText?: string` - Custom button text
- `customButtonLink?: string` - Custom button link

**Usage:**

```tsx
// User Dashboard
import { ComingSoon } from "@/reva/components/shared";
<ComingSoon />

// Admin Dashboard
<ComingSoon
  dashboardType="admin"
  customButtonLink="/reva-restricted/dashboard"
/>
```

## Color System

All components use the REVA color palette defined in `@/reva/colors`:

- `REVA_COLORS` - Color constants
- `REVA_GRADIENTS` - Gradient definitions

## Styling

Components are styled using:

- Tailwind CSS classes
- REVA color palette
- Consistent spacing and typography
- Responsive design patterns
- Hover and focus states

## Migration Guide

To migrate from individual components to shared ones:

1. **Replace imports:**

   ```tsx
   // Old
   import { Welcome } from "./components/Welcome";

   // New
   import { Welcome } from "@/reva/components/shared";
   ```

2. **Update component usage:**

   ```tsx
   // Old
   <Welcome />

   // New (with customization)
   <Welcome dashboardType="admin" />
   ```

3. **Remove old component files** after confirming the new ones work correctly.

## Benefits

- **Consistency:** All REVA components share the same design language
- **Maintainability:** Single source of truth for component logic
- **Reusability:** Easy to use across different contexts
- **Customization:** Flexible props for different use cases
- **Type Safety:** Full TypeScript support with proper interfaces
