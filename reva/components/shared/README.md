# REVA Shared Components

This folder contains shared components that can be used across both REVA user and admin dashboards. These components are designed to be configurable and reusable while maintaining consistent styling and behavior.

## Components Overview

### 1. Welcome
A beautiful welcome component with user avatar, personalized greeting, and customizable instructions.

**Props:**
- `dashboardType?: 'user' | 'admin'` - Determines default behavior and styling
- `customGreeting?: string` - Custom greeting text
- `customDescription?: string` - Custom description text
- `customInstructions?: string[]` - Array of custom instruction texts

**Usage:**
```tsx
// User Dashboard
import { Welcome } from "@/reva/components/shared";
<Welcome />

// Admin Dashboard
<Welcome 
  dashboardType="admin"
  customGreeting="Welcome, Admin"
  customInstructions={[
    "Start by reviewing user requests or managing the system.",
    "Have questions? Our team is here to help!"
  ]}
/>
```

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
   <Welcome dashboardType="admin" customGreeting="Welcome, Admin" />
   ```

3. **Remove old component files** after confirming the new ones work correctly.

## Benefits

- **Consistency:** All REVA components share the same design language
- **Maintainability:** Single source of truth for component logic
- **Reusability:** Easy to use across different contexts
- **Customization:** Flexible props for different use cases
- **Type Safety:** Full TypeScript support with proper interfaces 