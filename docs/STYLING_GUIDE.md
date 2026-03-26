# Styling Guide

How styling works in EzRCM360.

---

## Overview

The project uses **Tailwind CSS** as the foundation with:
- **shadcn/ui** component conventions (CSS variables for theming)
- **Radix UI** primitives under the hood
- **Custom design tokens** in `tailwind.config.ts`
- **CSS variables** in `app/globals.css` (HSL color system)

---

## Font

**Aileron** is the only font used:

```css
/* app/globals.css */
@import url('https://fonts.cdnfonts.com/css/aileron');

body {
  font-family: 'Aileron', sans-serif;
}
```

**Tailwind class:** `font-['Aileron']`

Use this class explicitly when you need to ensure the font:
```tsx
<h1 className="font-['Aileron'] font-bold text-2xl">Page Title</h1>
```

---

## Color System

Colors are defined as CSS variables in `app/globals.css` using **HSL format** and referenced in `tailwind.config.ts`:

### Core palette

| Token | HSL | Usage |
|-------|-----|-------|
| `--primary` | `207 90% 54%` | Microsoft Blue (#0078d4) — buttons, active states |
| `--background` | `0 0% 100%` | Page background (white) |
| `--foreground` | `222 47% 11%` | Body text (dark navy) |
| `--muted` | `210 40% 96%` | Subtle backgrounds |
| `--muted-foreground` | `215 16% 47%` | Secondary labels, placeholders |
| `--border` | `214 32% 91%` | Dividers, input borders |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--destructive` | `0 84% 60%` | Error red — delete buttons, error states |

### Sidebar palette

| Token | Usage |
|-------|-------|
| `--sidebar-background` | Sidebar bg |
| `--sidebar-foreground` | Nav label text |
| `--sidebar-accent` | Hover/active background |
| `--sidebar-accent-foreground` | Active label text |
| `--sidebar-border` | Sidebar right border |

### Usage in code

```tsx
// Use via Tailwind utilities (preferred):
<p className="text-muted-foreground">Secondary text</p>
<div className="bg-card border border-border">Card</div>
<button className="bg-primary text-primary-foreground">Button</button>

// Use via CSS variable (when Tailwind class doesn't exist):
style={{ color: 'hsl(var(--primary))' }}
```

---

## Typography

| Use case | Classes |
|----------|---------|
| Page title | `text-2xl font-bold font-['Aileron'] text-[#202830]` |
| Section header | `text-sm font-semibold font-['Aileron'] text-muted-foreground uppercase tracking-wide` |
| Body text | `text-sm text-foreground` |
| Secondary label | `text-xs text-muted-foreground` |
| Table header | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Badge/chip | `text-xs font-medium` |

---

## Spacing Conventions

| Area | Classes |
|------|---------|
| Page horizontal padding | `px-6` |
| Page vertical padding | `py-4` or `py-6` |
| Section gap | `gap-4` or `gap-6` |
| Card inner padding | `p-4` or `p-6` |
| Form field gap | `gap-4` |
| Modal padding | `p-6` |

---

## Layout Dimensions

| Element | Value |
|---------|-------|
| Sidebar (expanded) | `w-64` (256px) |
| Sidebar (collapsed) | `w-12` (48px) |
| Header height | `h-14` (56px) |
| Footer height | `h-12` (48px) |
| Max content width | `max-w-7xl mx-auto` |

---

## Custom Animations

Defined in `tailwind.config.ts`, available as `animate-*` classes:

| Class | Effect | Duration |
|-------|--------|---------|
| `animate-fade-in` | Opacity 0 → 1 | 350ms ease-out |
| `animate-fade-in-up` | Fade + rise 12px | 400ms |
| `animate-slide-in-right` | Slide from 8px right | 300ms |
| `animate-scale-in` | Scale from 0.96 to 1 | 250ms |
| `animate-pulse-soft` | Soft opacity pulse | 2s |
| `animate-shimmer` | Loading skeleton | Continuous |

**Usage:**
```tsx
<div className="animate-fade-in">Page content</div>
<div className="animate-fade-in-up">Card</div>
```

---

## Shadows

Custom shadow tokens for card elevation:

| Class | Elevation |
|-------|-----------|
| `shadow-card` | Subtle — `0 1px 2px rgba(0,0,0,0.06)` |
| `shadow-card-hover` | Elevated — `0 4px 6px -1px rgba(0,0,0,0.08)` |
| `shadow-card-elevated` | Strong — `0 4px 16px rgba(0,0,0,0.10)` |
| `shadow-ms-card` | Microsoft-style card shadow |

---

## Border Radius

| Token | Value |
|-------|-------|
| Default `rounded` | `calc(var(--radius) - 2px)` ≈ `0.25rem` |
| `rounded-lg` | `0.5rem` |
| `rounded-xl` | `0.75rem` (custom) |
| `rounded-2xl` | `1rem` (custom) |

---

## `cn()` Utility

**File:** `lib/utils.ts`

Always use `cn()` for conditional class merging:

```typescript
import { cn } from '@/lib/utils';

// Conditional classes:
<div className={cn('base-classes', isActive && 'active-classes', className)}>

// Override classes safely (tailwind-merge):
<Button className={cn('px-4', props.className)} />  // props.className wins
```

`cn()` combines `clsx` (conditional logic) + `tailwind-merge` (removes conflicts).

---

## Dark Mode

Dark mode is **class-based** (`darkMode: 'class'` in tailwind config). Apply the `dark` class to `<html>` to activate. Currently **not implemented** in the app — CSS variables define a light-mode palette only. The infrastructure is in place for future dark mode.

---

## Component Styling Patterns

### Status badges

```tsx
// Map status → variant
const statusVariant: Record<string, BadgeVariant> = {
  Active: 'success',
  Inactive: 'outline',
  Failed: 'destructive',
  Processing: 'warning',
};

<Badge variant={statusVariant[item.status] ?? 'outline'}>
  {item.status}
</Badge>
```

### Table rows

```tsx
<TableRow className="hover:bg-muted/50 transition-colors">
  <TableCell className="font-medium">{item.name}</TableCell>
  <TableCell className="text-muted-foreground text-sm">{item.email}</TableCell>
</TableRow>
```

### Form fields

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1">
    <Label htmlFor="name">Name</Label>
    <Input id="name" value={form.name} onChange={...} />
  </div>
</div>
```

### Section dividers

```tsx
<div className="border-t border-border my-6" />
// or
<Separator className="my-6" />
```

---

## Do's and Don'ts

| Do | Don't |
|----|-------|
| Use `cn()` for conditional classes | String-concatenate classes with `+` |
| Use design tokens (`text-primary`, `bg-muted`) | Hardcode colors in className |
| Use `font-['Aileron']` for headings | Use other fonts |
| Use `animate-fade-in` for page entrances | Add CSS animations manually |
| Use `shadow-card` for cards | Use `shadow-md` or other generic shadows |
| Use `text-muted-foreground` for secondary text | Hardcode `text-gray-500` |
