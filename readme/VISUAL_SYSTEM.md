# Tudu — Visual System (Post-Port)

State: after Step 13. The port reused the mockup's token vocabulary, so
anything that reads `bg-surface`, `text-ink`, `border-hairline`, `bg-brand-subtle`,
`text-brand`, etc. resolves to the mockup's values.

## Design tokens

Defined in `frontend/src/index.css`.

### Light mode (`:root`)
--bg-page: #FAFAFA
--bg-surface: #FFFFFF
--bg-elevated: #FFFFFF
--bg-hover: #F4F4F5
--bg-active: #EBEBEE
--border-subtle: rgba(0, 0, 0, 0.04)
--border-default: rgba(0, 0, 0, 0.08)
--border-strong: rgba(0, 0, 0, 0.14)
--text-primary: #0E0E10
--text-secondary: #52525B
--text-tertiary: #8B8B94
--text-inverse: #FFFFFF
--accent: #22C55E
--accent-hover: #16A34A
--accent-subtle: rgba(34, 197, 94, 0.12)
--accent-muted: rgba(34, 197, 94, 0.25)

### Dark mode (`.dark`)
--bg-page: #0E0E10 (was #1a1a1a before Step 10)
--bg-surface: #16161A (was #242424)
--bg-elevated: #1C1C21 (was #2e2e2e)
--bg-hover: #222228
--bg-active: #2A2A32
--border-subtle: rgba(255, 255, 255, 0.06)
--border-default: rgba(255, 255, 255, 0.10) (was solid #3a3a3a)
--border-strong: rgba(255, 255, 255, 0.16)
--text-primary: #ECECEF
--text-secondary: #A0A0AB
--text-tertiary: #6B6B78
--text-inverse: #0E0E10
--accent: #22C55E
--accent-hover: #16A34A
--accent-subtle: rgba(34, 197, 94, 0.12)
--accent-muted: rgba(34, 197, 94, 0.25)

**The Step 10 pivot.** The old `.dark` block used a warm-grey palette
(#1a1a1a / #242424 / #3a3a3a). Step 10 swapped seven values for the mockup's
cool near-black family and switched borders from solid hex to translucent
white. Because every component reads from these tokens, no component needed
editing — the app repainted across the board.

`--color-accent-strong` stays `#4ade80` in dark mode. The mockup has no
equivalent token; the live app uses it for emphasis text on dark surfaces
where a darker green would fail contrast.

### Type

- Body: `Inter`
- Display / handwritten: `Caveat` — via `font-handwritten`
- Mono: `JetBrains Mono` — via `font-mono`

### Radius

- `--r-sm: 4px`, `--r-md: 6px`, `--r-lg: 8px`
- `rounded-2xl` (16px) for cards in most places.

### Spacing

Tailwind defaults.

## Component recipes

### Chips (categories, priorities, status)

Theme-agnostic translucent tints. The same class works in light and dark
because the tint is derived from the brand colour at 10% alpha — no
`dark:` variant needed.
Category — work: bg-blue-500/10 text-blue-400
Category — personal: bg-purple-500/10 text-purple-400
Category — study: bg-emerald-500/10 text-emerald-400

Priority — high: bg-red-500/10 text-red-400
Priority — medium: bg-amber-500/10 text-amber-400
Priority — low: bg-line-subtle text-ink-muted

Overdue: bg-red-500/10 text-red-400
Brand: bg-brand/15 text-brand

Priority labels are Title Case (`High` / `Medium` / `Low`); the DB stores
lowercase.

### Cards

`.card` (defined in `index.css`): `rounded-1rem`,
`border 1px solid var(--color-border)`, `background var(--color-surface)`.
Hover lifts by 1px and adds a subtle shadow.

### Buttons

- `.btn-accent` — brand green, white text, `rounded-0.75rem`, hover uses
  `--accent-strong`
- `.btn-ghost` — surface bg, hairline border, `--text-primary`
- `.brush-stroke` — the mockup's signature green underline (defined in
  `styles/brand.css`); applied to the primary CTA in the hero and a few
  other places

### Pro badge
rounded-sm bg-brand/15 px-1.5 py-0.5
text-[9px] font-semibold uppercase tracking-wider text-brand

Inline, small, green tint. Used on the Topbar Pro chip, on gated feature
cards, and in the `UpgradePrompt`.

### Upgrade card (`UpgradePrompt`, Step 13)
.card border-accent/30 bg-brand-subtle/10 p-6
flex items-start gap-3
green Lock icon (bg-brand-subtle text-brand rounded-lg)
title + ProBadge
description
brand-filled "See plans" CTA

Rendered by `FeatureGate` for every gated feature. Because it delegates,
one restyle covers: team analytics, HD AI breakdown, license issue, time
tracking, and the compact variant on the AI modal.

### Modals

- `.scrim` for the backdrop
- Centered: `fixed inset-0 z-50 flex items-center justify-center p-4`
  (or `items-end sm:items-center` for the mobile-friendly drawer shape)
- Panel: `rounded-2xl border border-hairline bg-surface p-5 shadow-xl`
- Rendered through `createPortal(..., document.body)` when they may
  appear inside a stacking context

### Sync indicator (pill)

- Connected: `bg-brand` dot, `aria-label="Live updates connected"`
- Connecting: `border-amber-400/50 bg-amber-400/10 text-amber-400`
- Disconnected: `border-red-400/50 bg-red-400/10 text-red-400` with
  `Offline` label

### Toast

Top-center, per-variant icons, `glass` background. Dismiss button on the
right.

### Login — two-column split (Step 12)
min-h-screen flex
left half (hidden lg:flex): marketing panel + wordmark
right half (lg:w-1/2): form panel, mobile brand block at top

Below `lg` it collapses to the single centered card.

## Where to look for the code

- Tokens: `frontend/src/index.css`
- Tailwind aliases: `frontend/tailwind.config.js`
- Brush stroke + glass: `frontend/src/styles/brand.css`
- Density (compact): `frontend/src/styles/density.css`

## What changed in the port (Steps 1–13)

1. Tokens added (aliases for the mockup's names, mapped to the live app's
   old values)
2. `Wordmark`, `BrushButton`, `LiveDot`, `Spinner`
3–7. Landing page ported section by section
8. Header restyled
9. List view restyled (chips, `EmptyState`)
10. **Dark palette swapped to the mockup's cool near-black family** — the
    visual pivot
11. Stats + Analytics restyled (icons, chart colours, chart chrome)
12. Settings + Auth restyled (login split, colour polish)
13. `UpgradePrompt` + `ProBadge` + AI modal polish
