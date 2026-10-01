# REVA Color Palette

A comprehensive color system for the REVA platform, designed to maintain consistency across all components and provide a professional, modern appearance.

## 📁 File Structure

```
reva-colors.ts          # Main color palette with TypeScript types
REVA-COLORS-README.md   # This documentation file
```

## 🎨 Color Categories

### Primary Colors
- **Main**: `#032740` - The core REVA brand color (dark blue)
- **Light**: `#008cff` - Light blue accent for highlights
- **Lighter**: `#00bfff` - Bright blue for special elements

### Secondary Colors
- **Main**: `#1e40af` - Secondary blue for supporting elements
- **Light**: `#3b82f6` - Light secondary blue
- **Dark**: `#1e3a8a` - Dark secondary blue

### Gray Scale
Complete gray scale from 50 (lightest) to 900 (darkest) for backgrounds, text, and borders.

### Slate Colors
Modern slate color palette for UI elements, providing a sophisticated alternative to pure grays.

### Status Colors
- **Success**: `#10b981` - Green for positive actions
- **Warning**: `#f59e0b` - Orange for warnings
- **Error**: `#ef4444` - Red for errors
- **Info**: `#3b82f6` - Blue for informational content

## 🚀 Usage Examples

### Import the Color Palette

```typescript
import { REVA_COLORS, REVA_GRADIENTS, getRevaColor } from './reva-colors';
```

### Using Colors Directly

```typescript
// Access specific colors
const primaryColor = REVA_COLORS.primary.main;        // '#032740'
const successColor = REVA_COLORS.status.success;      // '#10b981'
const gray100 = REVA_COLORS.gray[100];                // '#f3f4f6'
```

### Using Utility Functions

```typescript
// Get colors by path
const color = getRevaColor('primary.main');           // '#032740'
const statusColor = getRevaColor('status.success');   // '#10b981'
```

### Using Gradients

```typescript
// Pre-defined gradients
const headerGradient = REVA_GRADIENTS.header;
const sidebarGradient = REVA_GRADIENTS.sidebar;
const primaryGradient = REVA_GRADIENTS.primary;
```

### In React Components

```tsx
import { REVA_COLORS } from './reva-colors';

const MyComponent = () => {
  return (
    <div style={{ 
      backgroundColor: REVA_COLORS.background.primary,
      color: REVA_COLORS.text.primary,
      border: `1px solid ${REVA_COLORS.border.light}`
    }}>
      <h1 style={{ color: REVA_COLORS.primary.main }}>
        REVA Platform
      </h1>
      <button style={{ 
        background: REVA_GRADIENTS.primary,
        color: REVA_COLORS.text.light 
      }}>
        Click Me
      </button>
    </div>
  );
};
```

### In Tailwind CSS

```tsx
// Using the Tailwind-compatible colors
<div className="bg-reva-primary text-reva-text-light">
  <h1 className="text-reva-primary">REVA Platform</h1>
  <div className="bg-reva-success text-white">Success Message</div>
</div>
```

## 🎯 Common Use Cases

### Headers and Navigation
```typescript
// Header background
background: REVA_GRADIENTS.header

// Navigation text
color: REVA_COLORS.text.light
```

### Sidebars
```typescript
// Sidebar background
background: REVA_GRADIENTS.sidebar

// Active menu item
background: REVA_COLORS.interactive.active
color: REVA_COLORS.primary.main
```

### Buttons
```typescript
// Primary button
background: REVA_GRADIENTS.primary
color: REVA_COLORS.text.light

// Danger button
background: REVA_GRADIENTS.danger
color: REVA_COLORS.text.light
```

### Status Indicators
```typescript
// Success
color: REVA_COLORS.status.success

// Warning
color: REVA_COLORS.status.warning

// Error
color: REVA_COLORS.status.error
```

## 🔧 Integration with Tailwind CSS

To use REVA colors in your Tailwind configuration:

```javascript
// tailwind.config.js
import { REVA_TAILWIND_COLORS } from './reva-colors';

module.exports = {
  theme: {
    extend: {
      colors: REVA_TAILWIND_COLORS,
    },
  },
};
```

Then use in your components:
```tsx
<div className="bg-reva-primary text-reva-text-light">
  <span className="text-reva-success">Success!</span>
</div>
```

## 🎨 CSS Custom Properties

The palette also provides CSS custom properties for use in CSS files:

```css
/* In your CSS file */
.my-component {
  background-color: var(--reva-bg-primary);
  color: var(--reva-text-primary);
  border: 1px solid var(--reva-border-light);
}

.my-button {
  background: var(--reva-primary-gradient);
  color: var(--reva-text-light);
}
```

## 📋 Color Guidelines

### Text Colors
- **Primary Text**: Use `text.primary` for main content
- **Secondary Text**: Use `text.secondary` for supporting text
- **Muted Text**: Use `text.muted` for less important information
- **Light Text**: Use `text.light` on dark backgrounds

### Background Colors
- **Primary Background**: Use `background.primary` for main areas
- **Secondary Background**: Use `background.secondary` for cards/panels
- **Dark Background**: Use `background.dark` for headers/footers

### Interactive Elements
- **Hover States**: Use `interactive.hover` for hover backgrounds
- **Active States**: Use `interactive.active` for pressed states
- **Focus Rings**: Use `interactive.focus` for accessibility

## 🔄 Version History

- **v1.0.0**: Initial color palette based on existing REVA components
- Extracted from sidebar, headers, buttons, and other UI elements
- Organized into logical categories with TypeScript support

## 🤝 Contributing

When adding new colors to the palette:

1. Follow the existing naming conventions
2. Add TypeScript types for new colors
3. Update this documentation
4. Ensure colors meet accessibility contrast requirements
5. Test in both light and dark modes

## 📞 Support

For questions about the color palette or suggestions for improvements, please refer to the REVA design system documentation or contact the development team. 