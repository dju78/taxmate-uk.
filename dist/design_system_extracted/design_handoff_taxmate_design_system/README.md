# Handoff: TaxMate UK Design System

## Overview
A professional design system for TaxMate UK, a personal tax-filing product. Covers color foundations, typography, core UI components, patterns, and a sample dashboard screen. Friendly/approachable tone, cool-neutral palette with a green "growth/money" accent.

## About the Design Files
The bundled file (`TaxMate Design System.dc.html`) is a **design reference built in HTML** — a high-fidelity prototype showing intended look, tokens, and component states, not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Swift, etc.) using its established component patterns and libraries — or, if no environment exists yet, choose the most appropriate framework and implement there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and component states are final. Recreate pixel-perfectly using the codebase's existing libraries/patterns.

## Screens / Views

### Dashboard (`#dashboard` section)
Purpose: logged-in home screen — user sees estimated tax owed, YTD income/expenses, income-vs-expense chart, and filing progress at a glance.

Layout: two-column grid, `220px` fixed dark sidebar + fluid main content, `20px` border-radius, `1px` border `oklch(90% 0.006 240)`, drop shadow `0 20px 50px -20px oklch(50% 0.02 240 / 0.2)`.

- **Sidebar** (`oklch(20% 0.015 240)` background, `26px 18px` padding): logo mark (22×22 rounded square, green) + wordmark "TaxMate", then 5 nav items (Dashboard active, Income, Expenses, Tax report, Settings) as rows with `10px` gap icon+label, `9px` border-radius, active row background `oklch(58% 0.13 150 / 0.18)` with light-green text, inactive text `oklch(75% 0.01 240)`.
- **Main** (`32px 36px` padding):
  - Header row: date label ("Tuesday, 11 July", 13px/600/`oklch(50% 0.015 240)`) + greeting H3 ("Morning, Priya 👋", Manrope 800/24px) on the left; 40×40 circular avatar placeholder on the right.
  - 3-column stat card row (16px gap): "Estimated tax owed" card is solid green (`oklch(58% 0.13 150)`) with white text — the hero stat; "Income YTD" and "Expenses YTD" are white cards with `1px` neutral border. Each: label 13px/600, value Manrope 800/30px, delta line 12px/700.
  - 2-column row (1.4fr/1fr, 16px gap): left = "Income vs expenses" bar chart, 6 months, paired bars (income solid green, expense pale green) on a 140px-tall baseline, month labels below; right = "Filing progress" donut (conic-gradient, green arc = 216deg/60%, white center showing "60%") with "3 of 5 steps complete" caption.

## Interactions & Behavior
- Buttons: primary (solid green, darker green on hover), secondary (green outline, light-green fill on hover), ghost (transparent, light-neutral fill on hover), destructive (solid red), disabled (flat neutral, no pointer).
- Inputs: default border `oklch(88% 0.006 240)`; focused/active state shown via green border + `3px` green glow (`box-shadow: 0 0 0 3px oklch(90% 0.06 150)`); error state shows red border + red helper text below field.
- Nav links in top bar and sidebar are simple anchor/row highlights — no transitions specified beyond hover background swaps (instant or ~150ms ease recommended).
- No modals, loading, or empty-network states beyond the "no receipts yet" empty state pattern shown (dashed border card with icon, message, and CTA button).

## State Management
- Dashboard needs: user name/greeting, current date, 3 stat values + deltas, 6-month income/expense series (for bar chart), filing-progress percentage + completed-step count, sidebar active-route.
- Form fields (income, tax year, expense category, business-expense checkbox, entity-type radio) are illustrative field patterns, not a bound form — wire to whatever entity the target app uses (income entry, expense entry, etc.).
- Transactions table is a static sample of a paginated/list-backed feed (description, category, date, signed amount).

## Design Tokens

**Color — neutrals** (cool, H=240): 0 `#FFFFFF` · 50 `#F7F8F9` · 100 `#EDEFF1` · 200 `#DCE0E3` · 300 `#C2C8CC` · 400 `#9AA2A8` · 500 `#75808A` · 600 `#565F68` · 700 `#3A4148` · 900 `#1A1F24`.

**Color — green (primary, H=150)**: 50 `#EAF6EE` · 100 `#D4EEDB` · 200 `#AEDFBB` · 300 `#82CC97` · 400 `#57B972` · 500 `#3AA25A` (primary/CTA) · 600 `#2E8C4B` (hover) · 700 `#23703C` · 800 `#1A552D` · 900 `#123B1F`.

**Semantic colors** (same L/C as primary green, hue varies): Success = green H150 `oklch(58% 0.13 150)`; Warning = amber `oklch(58% 0.13 80)`; Error = red `oklch(58% 0.13 25)`; Info = blue `oklch(58% 0.13 240)`. Each has a matching light background tint at `~95% L` and light border at `~85% L`, same hue.

**Typography**: Headings — Manrope, weights 500/700/800. Body/UI — Inter, weights 400/500/600/700. Display 44px/800, Heading 24px/700, Body 16px/400 (1.6 line-height), Caption 13px/600.

**Radius**: sm 8px, md 14px, lg 22px (cards generally 14–20px).

**Shadow — card**: `0 8px 24px -8px oklch(50% 0.02 240 / 0.25)`. Dashboard container shadow: `0 20px 50px -20px oklch(50% 0.02 240 / 0.2)`.

**Spacing**: component internal padding 18–32px depending on density; grid/flex `gap` 8–20px; section vertical rhythm ~80px between major page sections.

## Assets
No external image assets — all icons/avatars/logo marks in the prototype are simple geometric placeholders (rounded squares/circles in brand green or neutral tones). Replace with real iconography/logo and photography before shipping. Fonts are Google Fonts: Manrope and Inter (loaded via `fonts.googleapis.com`).

## Files
- `TaxMate Design System.dc.html` — full design reference: color/typography foundations, button/input/badge/card/table components, progress & empty-state patterns, and the dashboard screen mock. Open directly in a browser to view.
