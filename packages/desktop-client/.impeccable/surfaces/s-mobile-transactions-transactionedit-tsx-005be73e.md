---
version: 1
slug: "s-mobile-transactions-transactionedit-tsx-005be73e"
primary_target: "packages/desktop-client/src/components/mobile/transactions/TransactionEdit.tsx"
related_targets: ["packages/desktop-client/src/components/mobile/transactions/TransactionAmountSection.tsx","packages/desktop-client/src/components/mobile/MobileNavigationMenu.tsx"]
---

# Guided mobile transaction entry
Mode: Operate. Scope: transaction editor and mobile privacy access. User chose guided entry: amount first, details second; expenses, income, transfers and splits remain available.

## Direction contract
THESIS: Make a new transaction feel like one quick, focused task: keep amount and details together on one scrollable page, with the action always within reach.
OWN-WORLD: Existing semantic neutrals and restrained purple; tabular money, flat grouped rows, 16px surfaces, 44–52px actions. Privacy uses the existing preference and redaction language.
STORY: Enter an amount and expense/income type, select account/payee/category, add date/cleared status or notes, and save from the fixed footer. Account/payee/category remain searchable dropdowns. More offers the mobile privacy toggle. Existing transaction editing retains its amount and details controls.
FIRST VIEWPORT: New entry starts with a subdued empty amount and type above grouped fields; tapping or typing in the amount brings it to full text contrast. Date, cleared status, and notes follow in the scrollable page. The fixed footer stays visible while scrolling. The mobile page rises from below when Add opens, respecting reduced-motion settings. Field dropdowns open without focusing their search input; the keyboard waits for a tap.
FORM: Guided composer selected explicitly by the user; code-led Operate. seed: e728b855b032018a
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
