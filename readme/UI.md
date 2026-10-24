# Tudu UI

A short guide to the current visual system. The full spec lives in
[`VISUAL_SYSTEM.md`](./VISUAL_SYSTEM.md); this file is the at-a-glance map.

## Tokens

`frontend/src/index.css` exposes two parallel token families:
- The original semantic tokens (`--color-*`, `--shadow-surface`, `--brand-*`)
- The mockup-named aliases added in Step 1 (`--bg-*`, `--border-*`, `--text-*`, `--accent`, `--status-*`, `--r-*`)

The aliases resolve to the semantic tokens today; as components migrate to the mockup names over Steps 3–13 the aliases eventually become the canonical names.

## Tailwind

`frontend/tailwind.config.js` extends the palette with both families:

- **Surfaces:** `bg-canvas`, `bg-surface`, `bg-raised`, `bg-subtle`, `bg-active`
- **Lines:** `border-line`, `border-line-subtle`, `border-line-strong`
- **Ink:** `text-ink`, `text-ink-muted`, `text-ink-faint`, `text-ink-inverse`
- **Brand:** `bg-brand`, `bg-brand-hover`, `bg-brand-subtle`, `bg-brand-muted`
- **Status:** `bg-todo`, `bg-doing`, `bg-done`, `bg-overdue`
- **Radii:** `rounded-r-sm|md|lg` (4 / 6 / 8 px)
- **Fonts:** `font-handwritten` / `font-brand` (Caveat), `font-sans` (Inter), `font-mono` / `font-code` (JetBrains Mono)

## Utilities

`frontend/src/styles/brand.css` overrides:
- `.brush-stroke` — the green underline on primary CTAs
- `.glass` — the frosted panel used by the sticky navbar and toasts

`frontend/src/styles/density.css` provides `[data-density="compact"]` spacing hooks (the live app does not set `data-density` yet; it is a no-op until a future step wires it).

## The wordmark

The **PNG** in `frontend/public/wordmark.png` / `wordmark-dark.png` is the single source of truth for the wordmark. `Wordmark.tsx` swaps between them via `useThemeStore`, accepts an optional `size` prop (`sm | md | lg | xl`), and its `xl` variant powers the giant "half-in, half-out" wordmark in the landing footer.

That effect — including the exact `radial-gradient` spec, blur radius, and glass recipe — is documented in [VISUAL_SYSTEM.md](./VISUAL_SYSTEM.md#the-wordmark-finale-footer).

## Landing page

The signed-out landing at `/` is composed in `frontend/src/components/landing/Landing.tsx`:
<Navbar /> <main className="pt-14"> <Hero /> <LiveBoardHero /> <LogoStrip /> <ProblemSection /> <BentoGrid /> <HowItWorks /> <UnderTheHood /> <TierGating /> <PricingSection /> <Changelog /> <SocialProof /> <FinalCTA /> </main> <Footer /> ```
Each section lives in its own file under frontend/src/components/landing/. The bento/, howitworks/, and underhood/ subfolders hold the pieces that are not standalone sections (tile components, per-step demos, syntax highlighter, code panel).
App shell
The signed-in app (/, /board, /stats, /analytics, /settings/*) uses its own Header + Shell in frontend/src/components/layout/Header.tsx and frontend/src/App.tsx. Restyle of the app shell is a later step (Step 8); the landing page and app shell share the same design tokens but not the same component tree.

Tests
frontend/src/test/tokens.test.ts — snapshots the light + dark token sets so future steps cannot drift them silently.

frontend/src/test/footer.test.tsx — asserts the half-in/half-out wordmark effect is wired (PNG src, glass panel classes, radial glow inline style, -translate-y-1/2 on the wrapper).

frontend/src/test/landingFinale.test.tsx — smoke-renders the composed landing page and asserts the e2e-compat contract (Kanban that just works, Try the demo, Start free, Free/Pro/Enterprise pricing headings).

Existing per-component tests from Steps 2–6 continue to cover the primitives (Wordmark, BrushButton, LiveDot, Spinner, Navbar, MegaMenu, MobileMenu, Hero, LiveBoardHero, LogoStrip, ProblemSection, BentoGrid, HowItWorks, CodePanel).