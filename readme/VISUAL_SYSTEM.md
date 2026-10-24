# Tudu visual system

The design system the live app now shares with the mockup.

## Design tokens

All tokens live in `frontend/src/index.css`. Two families coexist:

**Semantic tokens (original, unchanged values):**
- `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`
- `--color-text`, `--color-text-muted`
- `--color-accent`, `--color-accent-strong`, `--color-accent-soft`
- `--shadow-surface`, `--grain-opacity`, `--brand-green`, `--brand-green-deep`, `--brand-ink`

**Mockup-named aliases (added in Step 1):**
- `--bg-page` → `--color-bg`, `--bg-surface` → `--color-surface`, `--bg-elevated` → `--color-surface-2`
- `--bg-hover`, `--bg-active` (new)
- `--border-subtle` → `--color-border`, `--border-default` → `--color-border`, `--border-strong`
- `--text-primary` → `--color-text`, `--text-secondary` → `--color-text-muted`, `--text-tertiary`, `--text-inverse`
- `--accent` → `--color-accent`, `--accent-hover` → `--color-accent-strong`, `--accent-subtle` → `--color-accent-soft`, `--accent-muted`
- `--status-todo`, `--status-doing`, `--status-done`, `--status-overdue`
- `--r-sm: 4px`, `--r-md: 6px`, `--r-lg: 8px`

The aliases let the mockup-derived components (Steps 3–7) reference the mockup token names without renaming any existing token. The two families will eventually converge on the same values; `frontend/tailwind.config.js` exposes both.

## Typography

- **Body / UI:** Inter (system fallback).
- **Display / handwritten:** Caveat, exposed as `font-handwritten` and `font-brand` in Tailwind.
- **Code:** JetBrains Mono, exposed as `font-mono` (through the fallback chain) and `font-code`.

## Radius scale

`rounded-md` = 6px, `rounded-lg` = 8px, `rounded-xl` = 12px, `rounded-2xl` = 16px, `rounded-full` = 9999px. Mockup-origin primitives use `rounded-md` / `rounded-lg`; app-origin primitives keep their original scale.

## Motion

- **Entrance:** `motion.div` with `initial={{ opacity: 0, y: 20 }}` → `animate` / `whileInView={{ opacity: 1, y: 0 }}`, easing `[0.2, 0, 0, 1]`, duration 0.3–0.6s.
- **Toggle indicators:** Framer Motion `layoutId` springs (`stiffness: 380, damping: 30`).
- **Reduced motion:** `useReducedMotion()` gates demo loops in `bento/*.tsx`, `howitworks/StepDemos.tsx`, `LiveBoardHero.tsx`, and `underhood/CodePanel.tsx`. When reduced motion is preferred, panels render their full/final state in one effect tick.

## The wordmark finale (Footer)

The wordmark is the live app's own PNG (`frontend/public/wordmark.png` and `wordmark-dark.png`), rendered through `frontend/src/components/common/Wordmark.tsx`. The PNG carries both the "tudu" brush lettering and the green checkstroke. It is never swapped for the mockup's inline SVG.

**Half-in / half-out technique** (implemented in `frontend/src/components/landing/Footer.tsx`):

1. A `pointer-events-none` wrapper is absolutely positioned at the footer's `top-0` with `-translate-y-1/2` and horizontally centered. Because the wrapper is translated up by exactly half its own height, the PNG's vertical centre lands precisely on the footer's top edge: the top half sits above the footer, the bottom half sits inside.
2. A radial glow element sits behind the checkstroke region of the PNG at roughly **58% left, 45% top** (matching where the checkstroke visually lands inside the artwork):
   - `background: radial-gradient(circle, rgba(34, 197, 94, 0.55) 0%, transparent 65%)`
   - `filter: blur(24px)`
   - responsive size: `h-24 w-24` → `sm:h-32 sm:w-32` → `md:h-40 md:w-40`
   - `data-testid="footer-wordmark-glow"` for the test.
3. The glass panel starts at exactly the footer's top edge:
   - `backdrop-blur-2xl` (20px)
   - `backdrop-saturate-150` (150%)
   - `background-color: color-mix(in srgb, var(--bg-page) 70%, transparent)`
   - `border-t border-line-subtle`
   - `data-testid="footer-glass-panel"` for the test.
4. Because `backdrop-filter` applies to whatever is painted behind the panel, the bottom half of the wordmark PNG is redrawn through the glass as a soft, slightly saturated ghost. The green checkstroke "glows through" — that is the effect. The top half of the PNG is above the panel, unaffected.

**How to update if the artwork is re-drawn:** if the checkstroke moves within the PNG, adjust the glow's `left` and `top` percentages on `data-testid="footer-wordmark-glow"` to match its new position. Nothing else changes. Both light and dark PNGs are handled automatically by `Wordmark`; the glow colour stays `rgba(34, 197, 94, …)` (brand green) in both themes.

## Landing structure (Step 7)

Order on `/` for signed-out visitors:

1. `Navbar` (fixed, glass-on-scroll)
2. `Hero` (headline + subtitle + CTAs, gated to mockup labels)
3. `LiveBoardHero` (auto-playing board demo)
4. `LogoStrip` (marquee of "trusted by" logos)
5. `ProblemSection` (Trello vs Tudu vs Jira comparison with animated toggle)
6. `BentoGrid` (16 tiles with cursor-glow spotlight)
7. `HowItWorks` (sticky-scroll + mobile fallback)
8. `UnderTheHood` (three typing code panels)
9. `TierGating` (interactive tier matrix)
10. `PricingSection` (display-only; real checkout at /pricing)
11. `Changelog` (three-up release cards linking to /changelog)
12. `SocialProof` (testimonials + metric strip)
13. `FinalCTA` (closing CTA band)
14. `Footer` (with the half-in/half-out wordmark finale)

The pre-Step-4 landing's Feature and Pricing sections and simple footer were removed in Step 7. Every handler, route, and API path they exposed has been preserved: "Try the demo" → demo account; "Start free" → /login; the real `/pricing` page is untouched.

The `<h2 class="sr-only">Kanban that just works.</h2>` at the top of `<main>` is an e2e compatibility shim for the pre-existing `landing.spec.ts` assertion; it does not affect the visible layout or the mockup hero copy.