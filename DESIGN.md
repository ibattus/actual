---
name: Actual Budget
description: Local-first personal finance, built around envelope budgeting
# All color values are the light-theme palette mapping; dark and midnight
# remap the same semantic roles via `theme.*` tokens (see The Semantic Token Rule).
colors:
  actual-purple: '#8719e0'
  actual-purple-hover: '#a368fc'
  navy-ink: '#102a43'
  navy-slate: '#627d98'
  navy-mist: '#e8ecf0'
  navy-frost: '#f7fafc'
  page-text: '#272630'
  surface-white: '#ffffff'
  positive-green: '#147d64'
  negative-red: '#e12d39'
  link-blue: '#1980d4'
  warning-gold: '#b88115'
typography:
  display:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '30px'
    fontWeight: 600
  headline:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '20px'
    fontWeight: 700
    letterSpacing: '0.5px'
  title:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '15px'
    fontWeight: 500
  body:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    fontFeature: 'tnum, ss01, ss04'
  mobile-amount:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    # Maximum; fitted to the formatted amount length and viewport (20–52px).
    fontSize: '52px'
    fontWeight: 600
    letterSpacing: '-0.03em'
  mobile-amount-summary:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '28px'
    fontWeight: 600
  privacy-redaction:
    fontFamily: 'Redacted Script'
  mobile-header:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '20px'
    fontWeight: 600
  mobile-navigation:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '12px'
    lineHeight: '16px'
  label:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '13px'
    fontWeight: 400
rounded:
  sm: '4px'
  md: '6px'
  mobile-control: '12px'
  mobile-action: '14px'
  mobile-surface: '16px'
  sheet: '18px'
spacing:
  xs: '5px'
  sm: '10px'
  md: '16px'
  lg: '20px'
  mobile-gap: '12px'
  mobile-section: '24px'
components:
  button-primary:
    backgroundColor: '{colors.actual-purple}'
    textColor: '{colors.surface-white}'
    rounded: '{rounded.sm}'
    padding: '5px 10px'
  button-primary-hover:
    backgroundColor: '{colors.actual-purple-hover}'
    textColor: '{colors.surface-white}'
  button-normal:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.navy-ink}'
    rounded: '{rounded.sm}'
    padding: '5px 10px'
  input:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.page-text}'
    rounded: '{rounded.sm}'
    padding: '5px'
  mobile-field:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.page-text}'
    rounded: '{rounded.mobile-control}'
    height: '52px'
  mobile-entry-row:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.page-text}'
    padding: '12px 16px'
    height: '68px'
  mobile-save:
    backgroundColor: '{colors.actual-purple}'
    textColor: '{colors.surface-white}'
    rounded: '{rounded.mobile-action}'
    height: '52px'
  mobile-header:
    backgroundColor: '{colors.navy-frost}'
    textColor: '{colors.page-text}'
    typography: '{typography.mobile-header}'
    height: '56px'
  mobile-navigation:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.page-text}'
    typography: '{typography.mobile-navigation}'
    height: 'calc(72px + env(safe-area-inset-bottom, 0px))'
---

# Design System: Actual Budget

## Overview

**Creative North Star: "The Home Office"**

Actual feels like a tidy personal desk: familiar, unpretentious, everything within reach. It is a tool people open weekly for years to reconcile accounts and move envelope money around, so the interface optimizes for routine, not first impressions. Density is moderate-to-high (this is a table-driven app), feedback is instant, and decoration is close to zero. The financial numbers are the interface; everything else exists to keep them legible and trustworthy.

The system explicitly rejects fintech-startup gloss (gradient heroes, glassmorphism, crypto-dashboard neon) and corporate banking UI (navy-and-gold enterprise-portal density). It is calm, trustworthy, and practical, and it must render identically well in three themes: light, dark, and midnight.

Mobile extends this world as a **daily money journal**: neutral headers, touch-sized forms, rounded groups, and a prominent amount make everyday money tasks easy to scan on a phone. This approved mobile language shares Inter, semantic colors, real icons, and tabular figures with the desktop system; it does not replace the desktop's compact table geometry.

**Key Characteristics:**

- Table-first desktop layouts and grouped mobile forms, with tabular numerals everywhere money appears
- One accent (Actual Purple) used sparingly for primary actions and selection
- Semantic color tokens only; components never hardcode hex values
- Compact desktop components and roomier mobile controls built for daily repetition
- Flat-first surfaces; mobile groups use borders, while existing shared cards retain their small resting shadow

## Colors

A calm navy-neutral base with one confident purple accent and strict semantic roles for money.

All hex values in this file (frontmatter included) are the light-theme palette mapping. The dark and midnight themes remap the same semantic roles to different palette values, so never use these hexes directly in components — route every color through the `theme.*` semantic tokens (see The Semantic Token Rule below).

### Primary

- **Actual Purple:** The single brand accent. Primary buttons, selected rows and borders, and active navigation. Hover uses **Lifted Purple**. The shared mobile page header is neutral in light, dark, and midnight themes.

### Tertiary (semantic money and status colors)

- **Positive Green:** Positive amounts and funded budgets.
- **Negative Red:** Negative amounts, overspending, failures.
- **Link Blue:** Links and informational highlights.
- **Warning Gold:** Underfunded templates, pending states.

### Neutral

- **Navy Ink:** Sidebar background, darkest text. The app's anchor dark.
- **Page Ink:** Default body text on light surfaces.
- **Navy Slate:** Secondary and subdued text, table headers.
- **Navy Mist:** Page background, table borders, dividers.
- **Navy Frost:** Hover rows, raised header rows.
- **Surface White:** Tables, cards, menus, modals.

### Named Rules

**The Semantic Token Rule.** Components never use raw palette values or hex codes. Every color goes through the `theme.*` semantic layer (`--color-*` custom properties) so all three themes (light, dark, midnight) stay correct. A hardcoded hex in a component is a bug.

**The One Accent Rule.** Reserve Actual Purple for primary action, current selection, and active navigation. Mobile page headers use `mobileHeaderBackground`, which resolves to `mobilePageBackground`; header text uses the normal page text role. Do not turn the shared mobile header into an accent banner.

**The Never-Color-Alone Rule.** Positive/negative money state is conveyed by sign and context as well as color; green/red are reinforcement, never the only signal.

## Typography

**Body Font:** Inter Variable (with system-ui fallback stack)
**Label/Mono behavior:** Same family; financial figures switch on tabular OpenType features
**Privacy Font:** Redacted Script, the existing purpose-built redaction face for hidden financial values. It preserves the visual footprint of money while privacy mode is enabled; it is not a display or body face.

**Character:** One workhorse sans at compact sizes. No display serif, no font pairing games: hierarchy comes from weight and size, and the typographic star is the number column.

### Hierarchy

- **Mobile amount** (600, fitted 20–52px, −0.03em tracking): The centered editable amount on the first transaction step, using tabular figures and page text color. Fit its size to the formatted amount length and viewport width, capped at the form width, so long localized values remain within the phone.
- **Mobile amount summary** (600, 28px): Compact amount on Details; its labeled Edit amount action returns to the first step.
- **Privacy redaction** (Redacted Script): Hidden financial values at rest retain their existing type size and geometry. Focused editable financial inputs remain readable.
- **Mobile header** (600, 20px): Centered shared page heading.
- **Mobile navigation** (12px / 16px line height): Bottom navigation labels; active items use weight 600, inactive items 400.
- **Display** (600, 30px): Page-level headings and large balances. Rare.
- **Headline** (700, 20px, 0.5px letter-spacing): Section titles.
- **Title** (500, 15px): Emphasized in-table and card text.
- **Sheet title** (600, 18px): Centred title of a mobile bottom sheet. Mobile only.
- **Body** (400, 16px): Default text.
- **Label** (400, 13px): Table meta, menus, dense secondary text; 12px and 10px steps exist for the tightest spots.

### Standard Component Sizes

`Button`, `Text` and `Input` accept a `size` prop: `small` | `medium` | `large` | `extra-large` (the `ComponentSize` vocabulary in `packages/component-library/src/tokens.ts`). Omitting the prop renders exactly as before — fully backward compatible. Sizes are responsive: they step up one notch on mobile/narrow for readability and touch targets, and collapse to the compact desktop scale from 512px/730px up. Breakpoint groups mirror the `useResponsive` view modes: narrow <512, small 512–729, medium 730–1099, wide ≥1100.

Text values (fontSize / lineHeight, px):

| Size        | narrow  | small   | medium  | wide    |
| ----------- | ------- | ------- | ------- | ------- |
| small       | 12 / 16 | 12 / 16 | 12 / 16 | 12 / 16 |
| medium      | 13 / 18 | 13 / 18 | 13 / 18 | 13 / 18 |
| large       | 16 / 22 | 15 / 20 | 15 / 20 | 15 / 20 |
| extra-large | 17 / 24 | 17 / 24 | 16 / 22 | 16 / 22 |

Control values for Button/Input (paddingY / paddingX / min-height, px):

| Size        | narrow       | small       | medium      | wide        |
| ----------- | ------------ | ----------- | ----------- | ----------- |
| small       | 3 / 8 / 24   | 3 / 8 / 24  | 3 / 8 / 24  | 3 / 8 / 24  |
| medium      | 5 / 10 / —   | 5 / 10 / —  | 5 / 10 / —  | 5 / 10 / —  |
| large       | 8 / 12 / 36  | 6 / 12 / 32 | 6 / 12 / 32 | 6 / 12 / 32 |
| extra-large | 10 / 14 / 40 | 8 / 12 / 36 | 8 / 12 / 36 | 8 / 12 / 36 |

`size="medium"` reproduces today's default control look exactly (5px/10px padding, 13px text, no min-height) and, on controls, inherits line-height like the default; the other sizes apply their scale line-height. `Text` always applies its size's line-height, while the omitted prop forces no line-height at all. `extra-large` narrow hits the 40px mobile touch target. The touch-target guarantee applies to touch-primary controls: at narrow, use `extra-large` or an explicit minimum height of at least 40px for controls the user taps; `small` stays the compact 24px desktop-density choice at every breakpoint and is not meant for touch-primary controls.

### Named Rules

**The Tabular Number Rule.** Every standalone financial figure renders with `font-feature-settings: "tnum", "ss01", "ss04"` (via `FinancialText` or `styles.tnum`) so digits align in columns and disambiguate. A proportional-figure money column is a bug.

## Layout

Desktop retains compact table layouts and the existing responsive size vocabulary above. Breakpoints are small (512px), medium (730px), and wide (1100px); the phone shell and bottom navigation apply below the small breakpoint.

Mobile pages use a persistent header (56px plus the top safe area), a vertically scrolling main region, and a bottom navigation bar (72px plus the bottom safe area). Reserve the same bottom space in scrolling account and budget surfaces so the last row remains reachable. Header side controls have minimum touch boxes (44px square).

New transaction entry keeps the fitted amount and Expense/Income selector above grouped account/payee/category rows, date and cleared status, and optional notes on one scrollable page. An untouched zero amount uses subdued text; tapping or typing switches it to the standard page text color, while entered amounts stay fully legible. The save action stays in a 52px footer outside the scrolling body with bottom safe-area padding. On narrow mobile screens, the page rises from below when Add opens and respects reduced-motion settings. Editing an existing transaction retains the Amount/Details controls. Account groups retain side margins (12px), and mobile budget rows retain a height (56px).

Spacing remains contextual: compact shared controls retain their 5px/10px padding; mobile composition repeatedly uses gaps (8px, 12px, 20px) and section spacing (24px). These are observed layout values, not replacements for the shared `spacing` token scale (2px, 4px, 8px, 12px, 16px, 24px).

## Elevation & Depth

Flat-first with ambient shadows. Structure comes from 1px borders (Navy Mist) and background shifts (White on Mist, Frost on hover), not depth. Transient menus, tooltips, popovers, and modals use shadows to lift above the page. Existing shared cards also carry a small resting shadow; the renovated mobile account groups, budget cards, and transaction groups explicitly stay flat.

### Shadow Vocabulary

- **Shared card** (`box-shadow: 0 1px 2px #9594A8`): Existing `Card` default; renovated mobile callers override it to none. Its literal shadow color is legacy drift, not a color token to copy into new components.
- **Card utility** (`box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`): Resting cards and small raised widgets.
- **Ambient** (`box-shadow: 0 2px 4px 0 rgba(0,0,0,0.1)`): Focused inputs, subtle lift.
- **Sheet** (`box-shadow: 0 -4px 24px rgba(0,0,0,0.2)`): Mobile sheets.
- **Large** (`box-shadow: 0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)`): Tooltips, popovers, floating panels.

### Named Rules

**The Flat Mobile Surface Rule.** Renovated mobile groups use semantic borders and surface colors without resting shadows. Preserve the established shared-card shadow where existing desktop components use it; overlays may use the shadow vocabulary above.

## Shapes

Desktop buttons, inputs, menus, and editor pills retain compact corners (4px); table containers retain top corners (6px), and the shared `Card` default remains 6px. The approved mobile form language uses larger corners: fields and secondary actions (12px), save actions (14px), grouped accounts, budget cards, transaction details, and split containers (16px). The transaction-type selector uses outer corners (12px) and selected segment corners (8px). Mobile sheets retain top corners (18px) with a flat bottom edge. Grouped rows remain square inside their clipped container; do not round every row independently.

**The Surface Scope Rule.** Apply the larger mobile geometry to mobile surfaces explicitly. Keep the shared compact defaults intact for desktop.

## Components

Utilitarian and quick: compact paddings, instant state feedback, built for daily repetition. All values below are the light theme; every color routes through the semantic token layer.

### Buttons

- **Shape:** Shared default gently rounded (4px radius), compact padding (5px 10px). Mobile transaction actions override corners (12–14px) and touch height (44–52px).
- **Primary:** Actual Purple background, white text; hover lifts to Lifted Purple with a soft shadow transition (`box-shadow .25s`)
- **Normal:** White background, Navy Ink text, 1px navy border
- **Bare:** Transparent, 5px padding; background tint on hover/press. The workhorse for in-table actions

### Inputs / Fields

- **Style:** White background, 1px border, 4px radius, 5px padding
- **Focus:** Border switches to the selected accent with a small semantic focus shadow; big inputs drop the border and take the ambient shadow instead
- **Big variant:** 10px padding for prominent forms.
- **Guided transaction rows:** Account, Payee, and Category are square, full-width buttons inside one clipped 16px group. Each uses a minimum height (68px), padding (12px 16px), a real 20px icon, a persistent label (12px/500), a value (15px/600) or placeholder (15px/400), and a chevron. Labels, placeholders, secondary text, and icons use `tableRowHeaderText` for contrast across all three themes. Tapping Account, Payee, or Category opens a searchable, field-anchored dropdown; Transfer opens the same account list with the source account omitted. Dropdowns stay on the page, use the existing semantic menu surfaces, and close on selection, outside tap, or Escape.
- **Mobile form fields:** Shared `InputField` / `TapField` use semantic table surfaces, 1px form borders, corners (12px), height (52px), and horizontal margins (8px). Labels sit above fields at 13px/600. Icon-bearing inputs keep the outer focus border and remove the nested input shadow.

### Cards / Containers

- **Corner Style:** Shared `Card` default and table-container top corners (6px); other compact surfaces (4px). Renovated mobile groups and budget cards use 16px; mobile bottom sheets use 18px top corners and a flat bottom edge
- **Background:** Surface White on Navy Mist page background
- **Shadow Strategy:** Existing shared cards retain their small resting shadow. Renovated mobile groups override it to none and use semantic 1px borders
- **Internal Padding:** 16-20px

### Navigation

- **Sidebar:** Navy Ink background, light navy text; hover darkens the row, selection marked with a purple accent and purple text. Status states (pending/positive/failed) tint the item background gold/green/red
- **Mobile header:** Neutral page-colored background in all three themes, centered 20px/600 title, normal page text, and 44px header buttons. The persistent header slot retains its background between routes.
- **Mobile navigation:** Three equal targets: Accounts, Add, More. The bar uses `mobileNavBackground`; inactive items use `pageText`, while the selected item uses `mobileNavItemSelected` and weight 600. Add has a purple 44px × 32px icon container with 12px corners. Icons come from the existing icon library. Hover/press underlines labels; keyboard focus adds an inset accent outline. More opens a sheet containing Budget, Reports, Schedules, and Settings.
- **Mobile sheets:** Menus open as bottom sheets on the modal surface (`modalBackground`) with a grab handle in `pageTextSubdued` and hairline row dividers in `tooltipBorder`. Rows are full-width bare buttons, destructive rows in `errorText`, section labels in sentence case only when a sheet has two or more groups. Dismiss by swipe down, tap outside or Escape; no close button

### Pills / Chips

- **Style:** Editor pills: tinted background, 4px radius, 3px 5px padding. Used for rule conditions and inline tokens

### Guided Mobile Transaction Entry

New entries show the editable amount above a paired Expense/Income control, followed by all transaction details on the same page. An untouched zero amount is subdued until tapped or typed into; nonzero values stay at normal contrast. Selection uses `pageTextPositive` on `pillBackgroundLight`, a semantic border, and a labeled pressed state.

Transaction details use a flat group of labeled account/payee/category rows, date and cleared status on one row, and an expandable optional note. Existing notes remain visible. Transfer and Split actions appear when editing an existing transaction; new entries keep the form focused on amount and details. Split children retain bordered 16px containers. The fixed footer carries the applicable save action and validation state. Existing transactions open on Details and can switch to Amount without losing fields. The Add page rises from the bottom on mobile, respecting reduced motion.

### Privacy Mode

The mobile page header exposes Enable privacy mode / Disable privacy mode with the existing eye icons and pressed state. It updates the same synced `isPrivacyEnabled` preference as desktop. Protected balances and amounts on mobile budget, account, and transaction surfaces use the existing Redacted Script overlay; hiding a figure must preserve its placement and row geometry. Mobile overlays do not reveal on hover. Desktop overlays retain their existing hover reveal, and financial inputs remain readable while focused for editing. Unfocused financial inputs use the redaction face when privacy is enabled; their hover reveal is limited to fine-pointer devices. The large Amount-step input follows the same readable-on-focus behavior.

### Signature Component: The Money Table

The core surface of the app. White rows on 1px Navy Mist borders, Frost hover, purple-bordered selection, sticky header with Slate 13px text, amounts right-aligned in tabular figures colored by the semantic money tokens. Alternate-row striping is theme-controlled, never hardcoded.

## Do's and Don'ts

### Do:

- **Do** route every color through `theme.*` semantic tokens so light, dark, and midnight themes all work. Test all three.
- **Do** wrap standalone financial numbers in `FinancialText` or apply `styles.tnum`.
- **Do** keep new mobile transaction amount and details together, with persistent field labels and a fixed save action.
- **Do** use the existing privacy preference and Redacted Script treatment; keep focused financial inputs readable.
- **Do** retain compact desktop defaults (4px controls, 5–10px padding) and apply the mobile geometry explicitly (12–16px grouped surfaces, 44–52px task controls).
- **Do** reuse the existing component library (`@actual-app/components`) before writing new UI.
- **Do** keep Actual Purple scarce: primary action and selection only.
- **Do** respect the breakpoints: 512px (small), 730px (medium), 1100px (wide); mobile touch targets are at least 40px tall.

### Don't:

- **Don't** use fintech-startup gloss: gradient heroes, glassmorphism, neon accents, crypto-dashboard styling (PRODUCT.md anti-reference).
- **Don't** use corporate banking UI patterns: navy-and-gold, enterprise-portal density, legalese energy (PRODUCT.md anti-reference).
- **Don't** hardcode hex values or raw `--palette-*` colors in components; the semantic layer is the only entry point.
- **Don't** rely on color alone for positive/negative amounts.
- **Don't** add resting shadows to renovated mobile groups; preserve the shared card's existing desktop treatment.
- **Don't** use `border-left`/`border-right` thicker than 1px as a colored accent stripe.
- **Don't** animate layout properties; transitions are for color, opacity, and shadow (like the button's `box-shadow .25s`).
