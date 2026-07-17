# Massic UI Style Guide

This is the canonical UI style guide for `massic-shadcn` coding agents. It combines:

- `massic-app-style-guide.docx`
- `massic-website-style-guide.md`

## Agent Usage Rule

Before implementing or changing any UI in `massic-shadcn`, read this file and apply the relevant rules. Preserve existing app patterns first, then use this guide for visual hierarchy, copy, spacing, colors, typography, states, and interaction details.

---

# Part 1: Massic App Style Guide

Massic

UI Style Guide & Design System

For PMs and Engineers — Prototype Reference

Light Mode Only  •  Version 1.0  •  April 2025

Purpose

This document is the single source of truth for anyone building or prototyping new features inside the Massic product. It defines the exact visual language — colors, typography, spacing, components, and page patterns — extracted directly from the live Figma designs. Prototypes built using this guide will closely match the production app.

Sections covered: Layout System, Color Tokens, Typography, Spacing & Radii, Component Library, Page Patterns, and Interaction States.

# 1. Layout System

Every page uses a fixed two-column layout at a canvas width of 1440px.

### 1.1 Chrome Structure

| Canvas width | 1440 px |
| --- | --- |
| Left sidebar | 216 px — fixed, full viewport height |
| Content area | 1224 px — fills remaining width |
| Top bar height | 52 px — breadcrumb strip |
| Content padding | 20–28 px — left/right inset inside content area |
| Content inner pad | 16 px — inset inside card/panel containers |

### 1.2 Content Area Patterns

Three main inner layouts appear across the product:

Full-width table — search bar toolbar on top, data table below, pagination at the bottom

Three-column kanban — equal-width columns separated by 1px vertical dividers

Split layout (billing/settings) — left content panel (~752 px) + right sidebar panel (~392 px)

### 1.3 Page Anatomy

| Sidebar (Navbar) | 216 × 900 px — workspace switcher, nav items, user section |
| --- | --- |
| Breadcrumb strip | Full width, 52 px tall — "Home / … / Page" path |
| Page toolbar | 36–52 px — tabs, search, action buttons |
| Primary content | Remaining height — table, kanban, or form area |
| Pagination footer | 40 px — rows-per-page selector + page controls |

# 2. Color System

All colors are defined as CSS variables in the token system. The palette is a neutral near-black/white scale with a single brand green used for primary actions. Always use tokens — never hardcode hex values.

### 2.1 Core Tokens — Light Mode

| Swatch | Token | Hex | Usage |
| --- | --- | --- | --- |
|  | general/primary-foreground | #FAFAFA | App background, sidebar background |
|  | general/input | #FFFFFF | Input fields, card backgrounds |
|  | general/secondary | #F5F5F5 | Secondary button fill, code bg, icon button bg |
|  | general/border / sidebar/sidebar-accent | #E5E5E5 | Borders, dividers, active nav item bg |
|  | general/unofficial/border-3 | #D4D4D4 | Input borders, select borders |
|  | general/foreground | #0A0A0A | Primary text color |
|  | general/secondary-foreground | #171717 | Secondary text, headings |
|  | general/muted-foreground | #737373 | Placeholder text, labels, muted content |
|  | general/unofficial/mid-alt | #525252 | Mid-tone text elements |
|  | sidebar/sidebar-foreground | #404040 | Sidebar nav item text |
|  | sidebar/unofficial/sidebar-muted | #737373 | Sidebar sub-item text, logout |
|  | sidebar/sidebar-border | #E5E5E5 | Sidebar tree connector lines |

### 2.2 Brand & Semantic Colors

The brand primary is a dark forest green used exclusively on the primary CTA button. Status badges use semantic color pairs (background + foreground).

| Swatch | Token | Hex | Usage |
| --- | --- | --- | --- |
|  | brand/primary-action | #1A6B4A | Primary CTA button background (e.g. "+ Create New", "Generate Report") |
|  | brand/primary-action-fg | #FFFFFF | Text/icons on primary CTA button |
|  | status/active-icon | #22C55E | Active status indicator |
|  | status/active-bg | #DCFCE7 | Active badge background |
|  | status/trial-icon | #F59E0B | Trial / warning status |
|  | status/trial-bg | #FEF3C7 | Trial badge background |
|  | status/cancel-icon | #EF4444 | Cancelling / destructive status |
|  | status/cancel-bg | #FEE2E2 | Cancelling badge background |
|  | status/inactive-fg | #6B7280 | Inactive / muted badge text |
|  | status/inactive-bg | #F3F4F6 | Inactive badge background |

### 2.3 Shadow

| shadow-xs | box-shadow: 0px 1px 2px rgba(0,0,0,0.05) — used on select/combobox, inputs |
| --- | --- |

# 3. Typography

The sole typeface is Geist (by Vercel). Use the Regular (400) and Medium (500) weights only — no Bold or Semibold in the type system. All body copy defaults to 14px.

Import: https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap

### 3.1 Type Scale

| Name | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| Para default / regular | 14px | 400 | 1.5 (21px) | Body text, table cells, nav items, inputs |
| Para default / medium | 14px | 500 | 1.5 (21px) | Nav item labels (active), button labels, section headings |
| Para mini / medium | 10px | 500 | 1.5 (15px) | Section group labels in sidebar (uppercase, 1.5px letter-spacing) |
| Display / numeric | 29px | 500 | 1.0 | Large KPI numbers in billing stats |
| Body large | 18px | 400 | 1.5 | Page/review titles, column headings |
| Label / small | 12px | 400 | 1.5 | Metadata, badge text, pagination, breadcrumb |

### 3.2 Letter Spacing

| Default | 0.07px (approx. 0.5 tracking unit) — all 14px body text |
| --- | --- |
| Mini labels | 0.15px (approx. 1.5 tracking unit) — 10px uppercase sidebar group labels |
| Headings / KPI | 0px — no extra letter spacing |

### 3.3 Text Color Rules

Primary text: #0A0A0A — main content, table rows, headings

Secondary text: #404040 — sidebar nav items, most UI labels

Muted text: #737373 — placeholders, captions, disabled states, sidebar sub-items

Never use pure black (#000000) — always use the token colors above

# 4. Spacing & Border Radii

### 4.1 Spacing Scale

Spacing is defined with a 4px base unit. Token names map directly to multiplier values.

| --0 (0px) | 0 — zero gap, flush layouts |
| --- | --- |
| --1 (4px) | 4 — tight internal padding (icon button inset, badge vertical padding) |
| --2 (8px) | 8 — standard gap between inline elements, sidebar item padding |
| --3 (12px) | 12 — input horizontal padding, sidebar item horizontal padding |
| --4 (16px) | 16 — card internal padding, section padding |
| --5 (20px) | 20 — page content left/right inset |
| --6 (24px) | 24 — icon size in larger contexts |
| --7 (28px) | 28 — page content inset (some views) |

### 4.2 Border Radii

| rounded-4 (4px) | Icon button hover states, small badges, pill labels, badge counters |
| --- | --- |
| rounded-6 (6px) | Sidebar nav items (all states), tab items, most small interactive elements |
| rounded-8 (8px) | Input fields, select/combobox dropdowns, card containers, table containers |
| rounded-full | Avatar circles, circular status dots |

# 5. Component Library

All components are built from the Geist typeface + neutral token palette. Icons are Lucide React (size 16px default, stroke-width 1.5). The component library has been built with shadcn/ui primitives.

## 5.1 Sidebar (Navbar)

The sidebar is 216px wide, full viewport height, with a #FAFAFA background and a 1px right border (#E5E5E5). It is divided into three zones stacked with a flex-col layout:

Top zone: Workspace switcher (combobox with avatar)

Middle zone: Primary nav items + scrollable Businesses section

Bottom zone: User name label + Settings / Notifications / Logout items

WORKSPACE SWITCHER (TOP)

| Width | Full sidebar width — 16px horizontal padding |
| --- | --- |
| Height | 36px |
| Background | #FFFFFF |
| Border | 1px solid #D4D4D4, border-radius: 8px, shadow-xs |
| Content | 20px avatar (circle) + text label + chevron-down icon (right) |
| Font | 14px / Regular / #0A0A0A |

NAV ITEM STATES

| Default | No background, 32px height, 12px horizontal padding, 8px icon gap, icon 13.25px |
| --- | --- |
| Active / Selected | Background: #E5E5E5, border-radius: 6px, same dimensions, chevron-right icon on right |
| Sub-item (2nd level) | 32px height, 8px h-padding, no icon — left edge has a 1px #E5E5E5 connector line |
| Group label | 10px medium / #737373 / uppercase / 1.5px letter spacing — not clickable |
| Separator | 1px horizontal line #E5E5E5, full width |

BOTTOM USER SECTION

| Username | 14px / Regular / #737373 — used as a non-clickable section label |
| --- | --- |
| Settings | 14px / Regular / #404040 — with settings icon |
| Notifications | 14px / Regular / #404040 — with bell-dot icon |
| Logout | 14px / Regular / #737373 (muted) — with log-out icon |

## 5.2 Breadcrumb

Appears in the 52px top bar. Items are 14px / Regular with 12px horizontal padding, separated by "/" dividers. The ellipsis icon replaces middle path segments when truncated.

| Height | 36px (within 52px bar) |
| --- | --- |
| Font | 14px / Regular / #0A0A0A |
| Active page | Last item — 14px / Medium / #0A0A0A (or bold) |
| Separator | " / " character, #737373 |
| Truncation | Ellipsis icon (•••) replaces middle segments |

## 5.3 Tabs

Horizontal tab bar, 40px total height, 4px inset padding. Can include leading icons (16px Lucide). Two tab variants appear: standalone icon+label tabs, and filter tabs with badge counters.

| Container | 40px height, no background, no border — floats above content |
| --- | --- |
| Tab item height | 32px (within 40px container, 4px inset) |
| Active state | White bg, border-radius: 6px, box-shadow: shadow-xs, text #0A0A0A Medium |
| Inactive state | No background, text #737373 Regular |
| Icon size | 16px Lucide icon, left of label, 10px gap |
| Counter badge | Small pill right of label — font 12px, bg #E5E5E5, border-radius 4px |
| Spacing | 10px horizontal padding inside each tab item |

## 5.4 Buttons

Four button variants used across the product. All have border-radius: 6–8px.

PRIMARY (CTA)

| Background | #1A6B4A (dark forest green) |
| --- | --- |
| Text | #FFFFFF, 14px / Medium |
| Height | 36px standard, 24px compact |
| Padding | 12px horizontal |
| Icon | 16px Lucide icon, left-aligned, 8px gap — used for "+ Create New" |

SECONDARY (DEFAULT)

| Background | #FFFFFF with 1px #D4D4D4 border |
| --- | --- |
| Text | #171717, 14px / Medium |
| Height | 36px standard, 24px compact |
| Hover | #F5F5F5 background |

GHOST / OUTLINE

| Background | Transparent / no border in some uses |
| --- | --- |
| Text | #404040, 14px / Regular |
| Usage | "Review/Edit", "Approve & push to dev" paired with primary |

ICON BUTTON

| Size | 36px × 36px (standard), 32px × 32px (compact), 24px × 24px (inline) |
| --- | --- |
| Background | #F5F5F5 default, #E5E5E5 hover |
| Border | Optional 1px #E5E5E5 |
| Border radius | 6px |
| Icon | 13.25–16px Lucide, centered |

## 5.5 Input & Search

| Height | 36px |
| --- | --- |
| Background | #FFFFFF |
| Border | 1px solid #D4D4D4, border-radius: 8px, shadow-xs |
| Padding | 12px left (with 16px icon), 8px right |
| Placeholder | 14px / Regular / #737373 |
| Value text | 14px / Regular / #0A0A0A |
| Search icon | 16px Lucide "search", left inside input, #737373 |
| Width | 320px standard width — can be fluid in some contexts |

## 5.6 Data Table

The primary data display component. Used in list views, billing, and other record management screens.

TABLE HEADER ROW

| Height | 36px |
| --- | --- |
| Background | #FAFAFA or #F5F5F5 |
| Border | 1px bottom #E5E5E5 |
| Font | 14px / Medium / #737373 |
| Sort icon | 16px Lucide "chevrons-up-down", right of label, appears on sortable columns |

TABLE DATA ROW

| Height | 44px standard, 61px when multi-line (e.g. billing with sub-label) |
| --- | --- |
| Border | 1px bottom #E5E5E5 (last row has no bottom border) |
| Hover | #F5F5F5 row background |
| Font | 14px / Regular / #0A0A0A for primary cell, #737373 for secondary/meta |
| Cell padding | 8px vertical, 12px horizontal |
| Actions col | Icon button (arrow-right or ellipsis) right-aligned, 67px wide |

TABLE FOOTER / PAGINATION

| Height | 40px |
| --- | --- |
| Rows per page | "Rows per page" label + Select dropdown (e.g. "24") — left side |
| Pagination | Previous / numbered pages / Next — right side, 576px wide |
| Font | 14px / Regular |

## 5.7 Cards

Cards are rectangular containers used to group related content. They appear in the "Understand the data" section, the "Current Plan" strip, and in the billing plan list.

| Background | #FFFFFF (or #FAFAFA for nested cards) |
| --- | --- |
| Border | 1px solid #E5E5E5, border-radius: 8px |
| Shadow | shadow-xs — 0px 1px 2px rgba(0,0,0,0.05) |
| Padding | 16px all sides (standard) |
| Header row | Icon (24px) + label (14px Medium) + action icon button — horizontal flex, space-between |
| Body text | 14px / Regular / #737373 — descriptive text, 2–3 lines |
| CTA row | Small text + arrow icon button — bottom right |

## 5.8 Badges & Status Tags

Used for content type labels ("Web Page", "Socials", "Technical") and subscription status indicators.

CONTENT TYPE BADGES — SMALL, INLINE

| Height | 24px standard, 19px compact |
| --- | --- |
| Padding | 8px horizontal, 4px vertical |
| Border-radius | 4px |
| Font | 12px / Medium / token foreground |
| Variants | Web Page (blue tint), Socials (purple tint), Technical (orange tint), Content (default) |

SUBSCRIPTION STATUS BADGES

| Active | Background #DCFCE7, text #166534, border-radius 4px, 12px font |
| --- | --- |
| Trial | Background #FEF3C7, text #92400E — "Trial · N day(s) left" |
| Cancelling | Background #FEE2E2, text #991B1B |
| Inactive | Background #F3F4F6, text #6B7280 |

FILTER TAB COUNTERS

| Background | #E5E5E5 on inactive tab, #0A0A0A on active tab |
| --- | --- |
| Text color | #0A0A0A on inactive, #FFFFFF on active |
| Size | 16–22px wide × 16px tall, border-radius 4px, font 12px Medium |

## 5.9 Kanban / Action Items

Used on the "Actions" page. Three columns: "Needs Approval", "In Dev", "Done this month". Each column is ~357px wide, separated by 1px vertical dividers.

COLUMN HEADER

| Height | 24px |
| --- | --- |
| Font | 18px / Medium / #0A0A0A for column title |
| Counter | 24px circle with centered count number — #0A0A0A text, #F5F5F5 background |

TASK ITEM (COLLAPSED)

| Height | 40px (collapsed), expands to ~139+px when expanded |
| --- | --- |
| Padding | 8px all sides |
| Left | Content-type badge + task title (14px / Regular / #0A0A0A) |
| Right | Volume metric (bar chart icon + number) + Rel score (bar chart icon + number) |
| Divider | 1px #E5E5E5 line between items |

TASK ITEM (EXPANDED — NEEDS APPROVAL ONLY)

| Keyword row | Target keyword in 14px Medium + Vol / Rel meta — with separator below |
| --- | --- |
| Description text | 14px Regular #737373 — 3–4 lines of strategy copy |
| Action buttons | "Approve & push to dev" (primary green) + "Review/Edit" (secondary) + swap icon button |

DONE COLUMN ITEMS

| Indicator | Green checkmark icon (✓) right side — confirms completion |
| --- | --- |
| No actions | Read-only items — no action buttons |

## 5.10 Review Items

Used on the Reviews page. Each review item is a card-like structure with a title row, review text, and an AI-generated response area below.

| Review title | 18px / Medium / #0A0A0A — full width, left-aligned |
| --- | --- |
| Reviewer info | Right side of title row — 24px avatar circle + rating score + 5 star icons (12px each) |
| Review body | 14px / Regular / #737373 — multi-line paragraph, 3 lines shown |
| Response card | #F5F5F5 background, 8px radius, 1px border — "Generated Response" label in muted text |
| Response text | 14px / Regular / #0A0A0A |
| Action row | "Ignore" button (secondary, white bg) + "Send" button (primary green) — right-aligned |
| Divider | 1px #E5E5E5 between each review item, 16px vertical spacing |

# 6. Page Patterns

These are the recurring full-page layout patterns. New feature screens should map onto one of these archetypes.

## 6.1 List View (Table Page)

Used for: Pitches, Businesses, any searchable record list.

Breadcrumb strip (52px)

Toolbar row: Search input (320px) + Filter icon button + Sort icon button — left side; View toggle + "+ Create New" button — right side

Data table: Full content width, sortable column headers, 44px rows, action arrow in last column

Pagination footer: 40px, bottom of table

## 6.2 Kanban / Workflow Page

Used for: Actions page.

"Current Plan" banner: full width card with plan icon + plan title + description + edit icon button — top of content area

Filter tabs (All / Web / Social / Technical) — top right, 240px wide

Three-column board: Needs Approval | In Dev | Done — separated by 1px dividers

"Understand the data" footer row: 4 link-cards (Web / Social / Technical Audit / Analytics) — 280px each, horizontal scroll

## 6.3 Detail / Sub-page with Tabs

Used for: Reviews, Settings (Profile/Billing/Teams).

Breadcrumb strip

Tab bar (40px): icon + label tabs — top left; action buttons (e.g. "Connect Location") — top right

Search bar / filter controls below tabs — optional

Content area: list of cards or table, full width, 16px inner padding

## 6.4 Split Settings Page

Used for: Billing page with plan sidebar.

Left panel (~752px): section title + stats summary strip + filterable data table

Right sidebar (~392px): Plans section (list of plan cards with icon + name + badges) + Add-ons section (same pattern)

Stats strip: 4 stat tiles (ACTIVE / TRIAL / CANCELLING / INACTIVE) with large number + sub-label — horizontal row, no borders, 4-column grid

Plan card: 100px height, icon (30px) + plan name (29px Medium) + optional "Recommended!" badge + details badge row + arrow icon button

# 7. Interaction States

Apply these consistently across all components. States are communicated through background color shifts and opacity — never through color hue changes.

| Component | Default | Hover | Active / Selected |
| --- | --- | --- | --- |
| Nav item | Transparent bg | #E5E5E5 bg | #E5E5E5 bg + chevron-right visible |
| Button (primary) | #1A6B4A bg, white text | Darken 5–8% | #1A6B4A + shadow-xs |
| Button (secondary) | #FFFFFF + border | #F5F5F5 bg | #E5E5E5 bg |
| Icon button | #F5F5F5 bg | #E5E5E5 bg | #E5E5E5 bg |
| Table row | Transparent bg | #F5F5F5 bg | #F5F5F5 bg (if selectable) |
| Tab item | Transparent, muted text | Slight bg tint | White bg + shadow-xs + dark text |
| Input | #FFFFFF + D4D4D4 border | #FFFFFF + border darkens | Focus ring: 2px brand green offset |

# 8. Icon System

All icons are from Lucide React. Default size is 16px with a stroke-width of 1.5. Icons are colored using the same token system as text — never styled independently.

### 8.1 Standard Sizes

| 12px | Star ratings, inline metadata icons |
| --- | --- |
| 13.25px | Sidebar nav item icons (left icon) |
| 16px | Standard — toolbar buttons, tab icons, breadcrumb ellipsis |
| 24px | Card header icons, reviewer avatars placeholder |
| 30px | Plan name icons (billing panel) |

### 8.2 Icon Reference

Commonly used icons mapped to their Lucide names:

| house | Home nav item |
| --- | --- |
| chart-spline | Pitches / analytics |
| chevron-right | Sidebar active item indicator, nav expand |
| chevron-down | Select/combobox dropdown indicator |
| plus | Create New button |
| search | Search input prefix |
| settings | Settings nav item, Profile tab |
| bell-dot | Notifications nav item |
| log-out | Logout nav item |
| ellipsis | Breadcrumb truncation |
| star | Review rating, Reviews tab |
| message-square-text | Campaigns tab |
| users | Customers tab, Teams tab |
| receipt-text | Billing tab |
| pencil-ruler | Current Plan indicator icon |
| chart-no-axes-column | Volume metric icon in kanban items |
| crosshair | Massic Opportunities add-on icon |
| gem | Execution Credits add-on icon |
| puzzle | Core plan icon |
| zap | Growth plan icon |
| arrow-right | Table row action, card CTA arrow |
| arrows-up-down | Table column sort |
| filter | Filter icon button |

# 9. Quick Reference Cheatsheet

Copy-paste tokens for building prototypes. Always prefer tokens over raw hex values.

### CSS Custom Properties

--general-foreground: #0A0A0A;

--general-muted-foreground: #737373;

--general-border: #E5E5E5;

--general-input: #FFFFFF;

--general-secondary: #F5F5F5;

--general-primary-foreground: #FAFAFA;

--general-unofficial-border-3: #D4D4D4;

--sidebar-foreground: #404040;

--sidebar-accent: #E5E5E5;

--brand-primary-action: #1A6B4A;

--shadow-xs: 0px 1px 2px rgba(0,0,0,0.05);

--font-sans: 'Geist', sans-serif;

### Key Numbers

| Sidebar width | 216px |
| --- | --- |
| Content area | 1224px |
| Canvas | 1440 × 900px |
| Base font | 14px / Geist Regular / #0A0A0A |
| Base radius | 6–8px (6 for UI elements, 8 for inputs/cards) |
| Base spacing | 4px unit (tokens: 0 / 4 / 8 / 12 / 16 / 20 / 28px) |
| Row height | 44px (table), 32px (nav), 40px (kanban), 36px (inputs/buttons) |
| Icon size | 16px standard (Lucide, stroke 1.5) |

### Do / Don't

✅ DO — Use Geist font only. Stick to Regular (400) and Medium (500) weights.

✅ DO — Use the 4px spacing scale. All gaps should be divisible by 4.

✅ DO — Use CSS variables/tokens — never hardcode hex colors in prototypes.

✅ DO — Match interaction states: hover → lighter bg, active → #E5E5E5.

✅ DO — Use Lucide icons at 16px with 1.5 stroke-width for all iconography.

✅ DO — Apply shadow-xs (0 1 2 rgba) to inputs, selects, and cards.

❌ DON'T — Use bold (700) or semibold (600) font weights.

❌ DON'T — Use pure black (#000000) or pure white text on colored backgrounds.

❌ DON'T — Add extra colors outside the defined palette without design review.

❌ DON'T — Use border-radius values other than 4, 6, or 8px.

❌ DON'T — Add drop shadows heavier than shadow-xs on UI components.

Massic UI Style Guide  •  Generated from Figma  •  Light Mode v1.0

---

# Part 2: Massic Website Style Guide

# Massic Website — Frontend Style Guide
> For founder/PM use. Prototype new pages or modify existing ones using this reference.  
> Source: Figma file `lBmramVkYiT3KTHIizSswO`, Section V2 (node 704-1865) + Style Guide (node 623-4573).  
> **Do not add anything not listed here without design review.**

---

## Table of Contents
1. [Fonts](#1-fonts)
2. [Color Tokens](#2-color-tokens)
3. [Typography Styles](#3-typography-styles)
4. [Layout & Grid](#4-layout--grid)
5. [Buttons](#5-buttons)
6. [Icons](#6-icons)
7. [Section Patterns](#7-section-patterns)
8. [Components](#8-components)
9. [Page Shell (Navbar + Footer)](#9-page-shell-navbar--footer)
10. [Do / Don't](#10-do--dont)

---

## 1. Fonts

Two typefaces. Nothing else.

### Zalando Sans (primary)
A variable font. **Always include `font-variation-settings: 'wdth' 100`** when using it.

```html
<!-- In <head> — self-hosted or via your font service -->
<link rel="stylesheet" href="/fonts/zalando-sans.css" />
```

```css
body {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
}
```

Weights used: **Regular (400)** and **Medium (500)** only.  
Bold (700) and SemiBold (600) are not used anywhere on the website.

### Azeret Mono (secondary)
Used exclusively for `h4` and `tag` styles. Always uppercase. Weight: Regular (400).

```css
.tag, h4 {
  font-family: 'Azeret Mono', monospace;
  text-transform: uppercase;
}
```

---

## 2. Color Tokens

All colors come from the Figma style guide. Define these as CSS custom properties.

```css
:root {
  /* Border */
  --color-border: #BABABA;               /* General borders, dividers, separators */

  /* Backgrounds */
  --color-bg-default:     #FFFEFA;       /* Primary page background — slightly warm white */
  --color-bg-light:       #FFFEFC;       /* Subtle section variant */
  --color-bg-dark:        #FCFAF5;       /* Alternate section background */
  --color-bg-translucent: rgba(201, 199, 193, 0.20); /* Frosted/overlay panels */
  --color-bg-contrast:    #2E2E2E;       /* Dark inverse sections */

  /* Text */
  --color-text-primary:   #161616;       /* Default body and heading text */
  --color-text-secondary: #6E6C67;       /* Supporting text, descriptions */

  /* Brand */
  --color-brand-default:  #2FA87E;       /* Primary green — CTA buttons, highlights */
  --color-brand-light:    rgba(47, 168, 126, 0.10); /* Soft green tints */
  --color-brand-dark:     #213D3C;       /* Deep green — hover states, dark accents */
  --color-brand-gradient: linear-gradient(135deg, #1D7657 0%, #288F6B 50%, #44BA91 100%);
}
```

### Background Usage Guide

| Token | When to use |
|---|---|
| `--color-bg-default` `#FFFEFA` | Default page background. Most sections sit on this. |
| `--color-bg-light` `#FFFEFC` | Subtle alternating section. Barely visible difference — use sparingly. |
| `--color-bg-dark` `#FCFAF5` | Slightly warmer alternate. Used for bento feature panels, problem/solution. |
| `--color-bg-contrast` `#2E2E2E` | Dark sections: CTA block, dark header variants. White text on top. |
| `--color-brand-gradient` | Decorative use only — hero backgrounds, gradient text effects, not for buttons. |

---

## 3. Typography Styles

### Desktop Type Scale

| Style token | Font | Weight | Size | Line-height | Letter-spacing | Transform |
|---|---|---|---|---|---|---|
| `Desktop/h1` | Zalando Sans | Medium 500 | 56px | 100% (1.0) | −3% (−1.68px) | As typed |
| `Desktop/h2` | Zalando Sans | Medium 500 | 42px | auto | −3% (−1.26px) | As typed |
| `Desktop/h3` | Zalando Sans | Medium 500 | 26px | 130% (1.3) | −2% (−0.52px) | As typed |
| `Desktop/h4` | Azeret Mono | Regular 400 | 22px | auto | 0 | **UPPERCASE** |
| `Desktop/tag` | Azeret Mono | Regular 400 | 16px | auto | 0 | **UPPERCASE** |
| `Desktop/stats` | Zalando Sans | Medium 500 | 68px | auto | 0 | As typed |
| `Desktop/button` | Zalando Sans | Regular 400 | 17px | 140% (1.4) | −1% (−0.17px) | As typed |
| `Desktop/paragraph/big` | Zalando Sans | Regular 400 | 16px | 140% (1.4) | 0 | As typed |
| `Desktop/paragraph/regular` | Zalando Sans | Regular 400 | 14px | 140% (1.4) | 0 | As typed |
| `Desktop/paragraph/small` | Zalando Sans | Regular 400 | 11px | 140% (1.4) | 0 | As typed |

### Mobile Type Scale

| Style token | Font | Weight | Size | Line-height | Letter-spacing | Transform |
|---|---|---|---|---|---|---|
| `Mobile/h1` | Zalando Sans | Medium 500 | 42px | 120% (1.2) | −3% (−1.26px) | As typed |
| `Mobile/h2` | Zalando Sans | Medium 500 | 36px | auto | −3% (−1.08px) | **Title Case** |
| `Mobile/h3` | Zalando Sans | Medium 500 | 24px | auto | 0 | As typed |
| `Mobile/h4` | Azeret Mono | Regular 400 | 20px | auto | 0 | **UPPERCASE** |
| `Mobile/tag` | Azeret Mono | Regular 400 | 14px | auto | 0 | **UPPERCASE** |
| `Mobile/stats` | Zalando Sans | Medium 500 | 68px | auto | 0 | As typed |
| `Mobile/button` | Zalando Sans | **Medium 500** | 14px | auto | 0 | As typed |
| `Mobile/paragraph/big` | Zalando Sans | Regular 400 | 16px | 130% (1.3) | 0 | As typed |
| `Mobile/paragraph/regular` | Zalando Sans | Regular 400 | 12px | 22px | 0 | As typed |

> **Key difference:** Desktop button text is Regular (400); Mobile button text is Medium (500).

### CSS Classes

```css
/* ─── Desktop headings ─── */
.text-h1 {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 500;
  font-size: 56px;
  line-height: 1;
  letter-spacing: -1.68px;
}
.text-h2 {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 500;
  font-size: 42px;
  line-height: normal;
  letter-spacing: -1.26px;
}
.text-h3 {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 500;
  font-size: 26px;
  line-height: 1.3;
  letter-spacing: -0.52px;
}
.text-h4 {
  font-family: 'Azeret Mono', monospace;
  font-weight: 400;
  font-size: 22px;
  line-height: normal;
  letter-spacing: 0;
  text-transform: uppercase;
}

/* ─── Labels & tags ─── */
.text-tag {
  font-family: 'Azeret Mono', monospace;
  font-weight: 400;
  font-size: 16px;
  line-height: normal;
  letter-spacing: 0;
  text-transform: uppercase;
}
.text-stats {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 500;
  font-size: 68px;
  line-height: normal;
  letter-spacing: 0;
}

/* ─── Body copy ─── */
.text-body-lg {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 400;
  font-size: 16px;
  line-height: 1.4;
}
.text-body {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
}
.text-body-sm {
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 400;
  font-size: 11px;
  line-height: 1.4;
}

/* ─── Mobile overrides (inside @media) ─── */
@media (max-width: 430px) {
  .text-h1 { font-size: 42px; line-height: 1.2; letter-spacing: -1.26px; }
  .text-h2 { font-size: 36px; line-height: normal; letter-spacing: -1.08px; text-transform: capitalize; }
  .text-h3 { font-size: 24px; line-height: normal; letter-spacing: 0; }
  .text-h4 { font-size: 20px; }
  .text-tag { font-size: 14px; }
  .text-body-lg { font-size: 16px; line-height: 1.3; }
  .text-body { font-size: 12px; line-height: 22px; }
}
```

---

## 4. Layout & Grid

### Canvas & Content Widths

```
Desktop (1440px canvas)
├── Page edge:          0px
├── Outer padding:      32px each side
├── Outer content:      1376px  (1440 - 64px)
├── Section inset:      64px each side (within 1376px)
└── Inner content:      1248px  (1376 - 128px)  ← most content lives here

Mobile (430px canvas)
├── Page edge:          0px
├── Outer padding:      16px each side
└── Content:            398px
```

```css
/* Page wrapper */
.page-wrapper {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;          /* gives 1376px inner */
}

/* Most section content */
.section-inner {
  max-width: 1248px;
  margin: 0 auto;
  padding: 0 64px;          /* 64px from each page edge */
}

/* Section vertical padding */
.section {
  padding-top: 86px;        /* confirmed from all section frames */
  padding-bottom: 86px;
}

@media (max-width: 430px) {
  .page-wrapper { padding: 0 16px; }
  .section-inner { padding: 0; }
  .section { padding-top: 32px; padding-bottom: 32px; }
}
```

### Column Grids

```css
/* 2-column equal (e.g. Problem/Solution, Audience cards) */
.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 42px;                /* confirmed 645px gap on 1248px content */
}

/* 2-column 60/40 split (e.g. How it works, feature sections) */
.grid-2col-60-40 {
  display: grid;
  grid-template-columns: 592px 592px;  /* equal within 1248 with 64px gap */
  gap: 64px;
}

/* 3-column (e.g. Blog cards, Integration tiles) */
.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 405.33px);
  gap: 16px;                /* 421.33px stride */
}

/* 3-column equal (integrations) */
.grid-3col-equal {
  display: grid;
  grid-template-columns: repeat(3, 394.67px);
  gap: 29px;
}

@media (max-width: 430px) {
  .grid-2col,
  .grid-2col-60-40,
  .grid-3col,
  .grid-3col-equal {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

---

## 5. Buttons

Two confirmed button variants seen across all pages.

### Primary Button (Green)

```css
.btn-primary {
  /* Desktop */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  min-width: 250px;
  padding: 0 24px;
  background-color: var(--color-brand-default);     /* #2FA87E */
  color: #FFFFFF;
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 400;
  font-size: 17px;
  line-height: 1.4;
  letter-spacing: -0.17px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
.btn-primary:hover {
  background-color: var(--color-brand-dark);        /* #213D3C */
}

@media (max-width: 430px) {
  .btn-primary {
    height: 47px;
    width: 100%;             /* full width on mobile */
    font-weight: 500;
    font-size: 14px;
    letter-spacing: 0;
  }
}
```

### Secondary / Ghost Button (Outlined)

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  min-width: 250px;
  padding: 0 24px;
  background-color: transparent;
  color: var(--color-text-primary);
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 400;
  font-size: 17px;
  line-height: 1.4;
  letter-spacing: -0.17px;
  border: 1px solid var(--color-border);            /* #BABABA */
  cursor: pointer;
  text-decoration: none;
}
.btn-secondary:hover {
  border-color: var(--color-text-primary);
}

@media (max-width: 430px) {
  .btn-secondary {
    height: 47px;
    width: 100%;
    font-weight: 500;
    font-size: 14px;
    letter-spacing: 0;
  }
}
```

### Button Pair (Hero CTAs)

```html
<!-- Desktop: side by side, 16px gap -->
<div class="btn-group">
  <a href="/get-started" class="btn-primary">Get started free</a>
  <a href="/demo" class="btn-secondary">See how it works</a>
</div>
```

```css
.btn-group {
  display: flex;
  gap: 16px;
  align-items: center;
}

@media (max-width: 430px) {
  .btn-group {
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
}
```

### Small Inline Button (e.g. "See all posts")

```css
.btn-sm {
  height: 54px;
  min-width: 115px;
  padding: 0 16px;
  /* same font rules as btn-secondary */
}
```

---

## 6. Icons

**Library:** Streamline Pixel — https://www.streamlinehq.com/icons/pixel  
**Naming convention:** `{Category}-{Subcategory}-{Name}--Streamline-Pixel`  
**Colour:** inherits `currentColor` (use CSS `color` to tint). In most contexts: `var(--color-text-primary)` or `var(--color-brand-default)`.

### Size Scale

| Size | Context |
|---|---|
| 16px | Inline checklist rows in feature panels (Streamline Sharp variant) |
| 20px | FAQ accordion toggle (`User-Add-Plus--Streamline-Sharp`) |
| 22px | Standard list item icons (problem/solution rows, feature lists) |
| 24px | Mid-size inline (tag icons, secondary content) |
| 32px | Section/step icons (How it works steps, How we work values) |
| 48px | Cycle diagram nodes (research/strategy/execution/reporting) |
| 60px | Security & Data page section icons |
| 68px | Target audience cards |
| 107px–187px | Decorative hero icons (blogs, pricing) |
| 160px | Full decorative (blogs page book icon) |

### Icon Reference (confirmed from screens)

**Navigation / UI controls**
- `Interface-Essential-Link--Streamline-Pixel` — "Connect your business" step
- `User-Add-Plus--Streamline-Sharp` — FAQ accordion open/close toggle (20px)
- `Check--Streamline-Sharp` — Feature panel checklist rows (16px)

**Problem / Solution rows**
- `Interface-Essential-Search-Remove--Streamline-Pixel` — ✗ Problem items
- `Interface-Essential-Search-Check--Streamline-Pixel` — ✓ Solution items

**How it works steps**
- `Interface-Essential-Link--Streamline-Pixel` — Connect your business (32px)
- `Entertainment-Events-Hobbies-Chess-Rook--Streamline-Pixel` — Build the strategy (32px)
- `Coding-Apps-Websites-Conference--Streamline-Pixel` — Generate the work (32px)
- `Business-Product-Report-Present-Grahp--Streamline-Pixel` — Report with confidence (32px)

**Feature / Platform cycle**
- `Interface-Essential-Search-Check--Streamline-Pixel` — research (48px)
- `Entertainment-Events-Hobbies-Chess-Rook--Streamline-Pixel` — strategy (48px)
- `Interface-Essential-Wrench-2--Streamline-Pixel` — execution (48px)
- `Interface-Essential-Pie-Chart-Poll-Report-2--Streamline-Pixel` — reporting (48px)

**Platform section feature pills (22px inline)**
- `Content-Files-Note--Streamline-Pixel` — Pages
- `Hand-Like--Streamline-Pixel` — Posts
- `Interface-Essential-Shrink-4--Streamline-Pixel` — Ads
- `Interface-Essential-Speaker-Announce--Streamline-Pixel` — Campaigns
- `Content-Files-Newspaper--Streamline-Pixel` — Content
- `Social-Rewards-Rating-Star-1--Streamline-Pixel` — Reviews/Ratings
- `Business-Products-Performance-Money-Increase--Streamline-Pixel` — Performance

**Audience / Solutions pages**
- `Interface-Essential-Skull-1--Streamline-Pixel` — "The problem" section (107–187px)
- `Business-Product-Startup-2--Streamline-Pixel` — Agencies card (68px)
- `Business-Products-Bag--Streamline-Pixel` — Businesses card (68px)
- `Computers-Devices-Electronics-Board--Streamline-Pixel` — "What's changed" section (129px)

**Integrations page**
- Uses Google product logo images (not icons) — do not replace with icons.

**About / How we work**
- `Interface-Essential-Wrench-1--Streamline-Pixel` — Bias for action (32px)
- `Coding-Apps-Websites-Solves--Streamline-Pixel` — Own it (32px)
- `Email-Mail-Chat--Streamline-Pixel` — Direct by default (32px)
- `Hand-Cross-Finger-Heart--Streamline-Pixel` — Care deeply (32px)
- `Business-Products-Deal-Handshake--Streamline-Pixel` — Build together (32px)

**Contact page**
- `Email-Envelope-Open--Streamline-Pixel` — Email link (48px)
- `Logo-Linkedin--Streamline-Pixel` — LinkedIn link (48px)

**Security & Data page (60px)**
- `Computers-Devices-Electronics-Desktop--Streamline-Pixel`
- `Business-Products-Data-File-Bars--Streamline-Pixel`
- `Interface-Essential-Clound-Download--Streamline-Pixel`

**Blogs / Learning hub (decorative)**
- `Content-Files-Open-Book--Streamline-Pixel` — Learning Hub hero icon (160px)
- `Multiple-User--Streamline-Pixel` — Pricing agency section (207px)

---

## 7. Section Patterns

### Hero Section

```html
<!-- Desktop: centred headline, two buttons -->
<section class="section hero-section">
  <div class="section-inner">
    <div class="hero-content">
      <!-- Optional eyebrow tag (Azeret Mono, e.g. "for marketing agencies") -->
      <p class="text-tag hero-eyebrow">for marketing agencies</p>

      <h1 class="text-h1 hero-headline">Your headline goes here.</h1>
      <p class="text-body-lg hero-sub">
        One or two sentences of supporting description.
      </p>
      <div class="btn-group hero-buttons">
        <a href="/get-started" class="btn-primary">Get started free</a>
        <a href="/how-it-works" class="btn-secondary">See how it works</a>
      </div>
    </div>
  </div>
</section>
```

```css
.hero-section { padding-top: 86px; padding-bottom: 0; }

.hero-content {
  max-width: 936px;
  margin: 0 auto;
  text-align: center;
}

/* Eyebrow on solution pages only */
.hero-eyebrow {
  margin-bottom: 32px;      /* 58px gap to headline */
  color: var(--color-text-secondary);
}

.hero-headline {
  max-width: 842px;         /* confirmed from homepage */
  margin: 0 auto 32px;
  color: var(--color-text-primary);
}

.hero-sub {
  max-width: 796px;
  margin: 0 auto 56px;
  color: var(--color-text-secondary);
}

.hero-buttons {
  justify-content: center;
}

@media (max-width: 430px) {
  .hero-content { text-align: left; }
  .hero-buttons { justify-content: flex-start; }
}
```

---

### Problem / Solution Two-Column Section

```html
<section class="section">
  <div class="section-inner grid-2col">

    <!-- Left: The Problem -->
    <div class="problem-col">
      <div class="section-heading">
        <h2 class="text-h2">The Problem</h2>
        <p class="text-body-lg">Most businesses are doing organic growth the hard way.</p>
      </div>
      <ul class="item-list item-list--bad">
        <li class="item-row">
          <img src="[Interface-Essential-Search-Remove--Streamline-Pixel]" width="22" height="22" alt="" />
          <span class="text-body-lg">Research eats time that should go toward execution</span>
        </li>
        <!-- repeat for each item -->
      </ul>
    </div>

    <!-- Right: The Solution -->
    <div class="solution-col">
      <div class="section-heading">
        <h2 class="text-h2">The Solution</h2>
        <p class="text-body-lg">Massic runs the work that shouldn't be manual.</p>
      </div>
      <ul class="item-list item-list--good">
        <li class="item-row">
          <img src="[Interface-Essential-Search-Check--Streamline-Pixel]" width="22" height="22" alt="" />
          <span class="text-body-lg">Connects market intelligence to strategy to execution</span>
        </li>
        <!-- repeat -->
      </ul>
    </div>

  </div>
</section>
```

```css
.section-heading {
  margin-bottom: 40px;
}
.section-heading h2 { margin-bottom: 12px; }
.section-heading p { color: var(--color-text-secondary); }

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 16px;               /* 58px - 22px icon - 20px right of icon */
  height: 54px;
  border-bottom: 1px solid var(--color-border);
}
.item-row:first-child { border-top: 1px solid var(--color-border); }
.item-row img { flex-shrink: 0; }
```

---

### How It Works — Timeline Section

```html
<section class="section">
  <div class="section-inner">

    <div class="hiw-header">
      <h2 class="text-h2">How it works</h2>
      <p class="text-body-lg">Research. Strategise. Execute. Report. Every day, without being asked.</p>
      <a href="/how-it-works" class="btn-secondary btn-sm">Learn more</a>
    </div>

    <div class="hiw-steps">
      <!-- Timeline spine -->
      <div class="hiw-spine">
        <div class="hiw-dot"></div>
        <div class="hiw-connector"></div>
        <div class="hiw-dot"></div>
        <div class="hiw-connector"></div>
        <div class="hiw-dot"></div>
        <div class="hiw-connector"></div>
        <div class="hiw-dot"></div>
      </div>

      <div class="hiw-content">
        <div class="hiw-step">
          <div class="hiw-step-label">
            <img src="[Interface-Essential-Link--Streamline-Pixel]" width="32" height="32" alt="" />
            <span class="text-h4">Connect your business</span>
          </div>
          <p class="text-body-lg hiw-step-desc">Description of this step goes here.</p>
        </div>
        <!-- repeat for Build the strategy, Generate the work, Report with confidence -->
      </div>
    </div>

  </div>
</section>
```

```css
.hiw-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 117px;    /* gap before steps */
}

.hiw-steps {
  display: grid;
  grid-template-columns: 22px 1fr;   /* dot spine + content */
  gap: 0 54px;
}

.hiw-spine {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 35px;       /* align first dot to step label */
}
.hiw-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--color-text-primary);
  background: var(--color-bg-default);
  flex-shrink: 0;
}
.hiw-connector {
  width: 1px;
  height: 45px;            /* confirmed from desktop frame */
  background: var(--color-border);
}

.hiw-step {
  height: 88px;            /* confirmed step height */
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}
.hiw-step-label {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hiw-step-label .text-h4 { color: var(--color-text-primary); }
.hiw-step-desc {
  color: var(--color-text-secondary);
  max-width: 550px;
}

@media (max-width: 430px) {
  .hiw-header { flex-direction: column; gap: 24px; align-items: flex-start; }
  .hiw-steps { grid-template-columns: 16px 1fr; gap: 0 24px; }
  .hiw-dot { width: 16px; height: 16px; }
  .hiw-connector { height: 118px; }
  .hiw-step { grid-template-columns: 1fr; height: auto; padding: 24px 0; gap: 12px; }
}
```

---

### Feature Bento Grid

Used on platform pages and homepage "everything you need" section. Cards with borders and inner padding.

```html
<section class="section">
  <div class="section-inner">
    <div class="section-header">
      <h2 class="text-h2">Heading here</h2>
      <p class="text-body-lg">Everything you need to grow organically, in one system.</p>
    </div>

    <div class="bento-grid">
      <!-- Wide card (spans full width or 2 cols) -->
      <div class="bento-card bento-card--wide">
        <div class="bento-card-content">
          <h3 class="text-h3">Card headline</h3>
          <!-- Feature pills -->
          <div class="feature-pills">
            <span class="feature-pill">
              <img src="[Content-Files-Note--Streamline-Pixel]" width="22" height="22" alt="" />
              Pages
            </span>
            <div class="pill-divider"></div>
            <span class="feature-pill">
              <img src="[Hand-Like--Streamline-Pixel]" width="22" height="22" alt="" />
              Posts
            </span>
          </div>
        </div>
      </div>

      <!-- Half-width card -->
      <div class="bento-card bento-card--half">
        <div class="bento-card-content">
          <h3 class="text-h3">Card headline</h3>
          <p class="text-body-lg">Supporting description text.</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 64px;
}
.bento-card {
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
}
.bento-card--wide { grid-column: 1 / -1; }      /* full width */
.bento-card--half { grid-column: span 1; }

.bento-card-content {
  padding: 18px;
}
.bento-card-content .text-h3 { margin-bottom: 16px; }

/* Feature pills inside bento cards */
.feature-pills {
  display: flex;
  align-items: center;
  gap: 0;
}
.feature-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 22px;
  font-size: 14px;
  color: var(--color-text-secondary);
}
.pill-divider {
  width: 75px;
  height: 1px;
  background: var(--color-border);
  margin: 0 12.5px;
}

@media (max-width: 430px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-card--wide { grid-column: span 1; }
}
```

---

### Comparison Table

Three columns: feature label | competitor/others | Massic.

```html
<section class="section">
  <div class="section-inner">
    <h2 class="text-h2" style="text-align:center">How Massic compares</h2>

    <div class="compare-table">
      <!-- Header row -->
      <div class="compare-header">
        <div class="compare-col compare-col--label"><!-- empty --></div>
        <div class="compare-col compare-col--other">Others</div>
        <div class="compare-col compare-col--massic">
          <img src="/images/massic-wordmark.svg" height="31" alt="Massic" />
        </div>
      </div>

      <!-- Data row -->
      <div class="compare-row">
        <div class="compare-col compare-col--label text-body-lg">Multi-client management</div>
        <div class="compare-col compare-col--other text-body-lg">Single business only</div>
        <div class="compare-col compare-col--massic text-body-lg">100+ businesses from one view</div>
      </div>
      <!-- repeat rows -->
    </div>
  </div>
</section>
```

```css
.compare-table {
  width: 1248px;
  margin-top: 99px;
  border: 1px solid var(--color-border);
}
.compare-header,
.compare-row {
  display: grid;
  grid-template-columns: 253px 497.5px 497.5px;
  border-bottom: 1px solid var(--color-border);
}
.compare-header:last-child,
.compare-row:last-child { border-bottom: none; }

.compare-col {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  text-align: center;
  border-right: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}
.compare-col:last-child { border-right: none; }
.compare-col--label {
  text-align: left;
  justify-content: flex-start;
  color: var(--color-text-secondary);
}
.compare-header .compare-col { height: 66px; }

@media (max-width: 430px) {
  .compare-table { width: 100%; overflow-x: auto; }
  .compare-header,
  .compare-row { grid-template-columns: 120px 160px 160px; min-width: 440px; }
}
```

---

### Stats / Results Block

```html
<section class="section">
  <div class="section-inner">
    <div class="results-header">
      <div>
        <h2 class="text-h2">Results</h2>
        <p class="text-body-lg">Real results for real businesses.</p>
      </div>
      <div class="results-metrics">
        <div class="metric">
          <p class="text-body-sm metric-client">Vertaccount</p>
          <p class="text-stats metric-number">95%</p>
          <p class="text-body-sm metric-desc">increase in weekly visits in 3 months</p>
        </div>
        <!-- repeat for each metric — 3 columns, 273px each -->
      </div>
    </div>
  </div>
</section>
```

```css
.results-header {
  display: grid;
  grid-template-columns: 141px 883px;
  gap: 224px;
  align-items: start;
}
.results-metrics {
  display: grid;
  grid-template-columns: repeat(3, 273px);
  gap: 32px;
}
.metric { height: 122px; }
.metric-client {
  height: 19px;
  color: var(--color-text-secondary);
}
.metric-number {
  height: 83px;
  line-height: 1;
  color: var(--color-text-primary);
}
.metric-desc {
  height: 20px;
  color: var(--color-text-secondary);
}
```

---

### Testimonial Carousel

```html
<div class="testimonial-carousel">
  <div class="testimonial-card">
    <!-- 5 stars -->
    <div class="star-row">
      ★★★★★
    </div>
    <blockquote class="text-h3 testimonial-quote">
      "Quote text here."
    </blockquote>
    <footer class="testimonial-attribution">
      <p class="text-body-lg attribution-name">First Name</p>
      <p class="text-body attribution-role">Role, Company</p>
    </footer>
  </div>

  <!-- Carousel dots -->
  <div class="carousel-dots">
    <span class="dot dot--active"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</div>
```

```css
.testimonial-card {
  width: 528px;
  padding: 0;
}
.star-row {
  font-size: 20px;
  color: var(--color-brand-default);
  letter-spacing: 4px;              /* ~32px gap between stars */
  margin-bottom: 32px;
  width: 153px;
}
.testimonial-quote {
  margin-bottom: 32px;
  color: var(--color-text-primary);
}
.testimonial-attribution {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
}
.attribution-name { font-weight: 500; }
.attribution-role { color: var(--color-text-secondary); }

.carousel-dots {
  display: flex;
  gap: 22px;
  margin-top: 32px;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-border);
}
.dot--active { background: var(--color-text-primary); }
```

---

### Audience Cards (For Agencies / For Businesses)

```html
<section class="section">
  <div class="section-inner">
    <div class="audience-header">
      <h2 class="text-h2">Who it's built for</h2>
      <p class="text-body-lg">Built for anyone serious about organic growth.</p>
    </div>

    <div class="audience-grid">
      <div class="audience-card">
        <p class="text-body-lg audience-desc">
          Agencies that want to deliver consistent results across every client without burning out their team.
        </p>
        <div class="audience-card-footer">
          <img src="[Business-Product-Startup-2--Streamline-Pixel]" width="68" height="68" alt="" />
          <a href="/solutions/agencies" class="btn-primary">Built for agencies</a>
        </div>
      </div>

      <div class="audience-card">
        <p class="text-body-lg audience-desc">
          Local businesses that want to be found without hiring a full marketing team.
        </p>
        <div class="audience-card-footer">
          <img src="[Business-Products-Bag--Streamline-Pixel]" width="68" height="68" alt="" />
          <a href="/solutions/businesses" class="btn-primary">Built for businesses</a>
        </div>
      </div>
    </div>
  </div>
</section>
```

```css
.audience-grid {
  display: grid;
  grid-template-columns: 608px 608px;
  gap: 32px;
  margin-top: 43px;
}
.audience-card {
  border: 1px solid var(--color-border);
  padding: 32px;
  height: 266px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.audience-desc {
  max-width: 544px;
}
.audience-card-footer {
  display: flex;
  align-items: center;
  gap: 32px;
}

@media (max-width: 430px) {
  .audience-grid { grid-template-columns: 1fr; }
  .audience-card { height: auto; }
}
```

---

### Blog Cards

```html
<div class="blog-grid">
  <a href="/blog/[slug]" class="blog-card">
    <div class="blog-card-image">
      <!-- 405 × ~160px image placeholder -->
    </div>
    <div class="blog-card-body">
      <span class="text-tag blog-card-tag">category</span>
      <h3 class="text-h3 blog-card-title">Post headline goes here</h3>
    </div>
  </a>
  <!-- repeat × 3 -->
</div>
```

```css
.blog-grid {
  display: grid;
  grid-template-columns: repeat(3, 405.33px);
  gap: 16px;
}
.blog-card {
  width: 405.33px;
  height: 294px;
  text-decoration: none;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}
.blog-card-image {
  flex: 1;
  background: var(--color-bg-dark);
}
.blog-card-body {
  padding: 16px;
}
.blog-card-tag {
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  display: block;
}
.blog-card-title {
  font-size: 22px;           /* uses h3 style within card context */
}
.blog-card:hover { border-color: var(--color-text-primary); }

@media (max-width: 430px) {
  .blog-grid { grid-template-columns: 1fr; }
  .blog-card { width: 100%; height: 284px; }
}
```

---

### FAQ / Accordion

```html
<div class="faq-block">
  <h2 class="text-h2 faq-title" style="text-align:center">Frequently asked</h2>

  <div class="faq-list">
    <!-- Open item -->
    <div class="faq-item faq-item--open">
      <div class="faq-trigger">
        <span class="text-body-lg">Does Massic work for any type of business?</span>
        <img src="[User-Add-Plus--Streamline-Sharp]" width="20" height="20" alt="" class="faq-icon faq-icon--open" />
      </div>
      <div class="faq-body">
        <p class="text-body-lg">Answer text goes here.</p>
      </div>
    </div>

    <!-- Closed item -->
    <div class="faq-item">
      <div class="faq-trigger">
        <span class="text-body-lg">How is this different from hiring an SEO agency?</span>
        <img src="[User-Add-Plus--Streamline-Sharp]" width="20" height="20" alt="" class="faq-icon" />
      </div>
    </div>
  </div>
</div>
```

```css
.faq-block { max-width: 638px; margin: 0 auto; }
.faq-title { margin-bottom: 64px; }

.faq-list { display: flex; flex-direction: column; }
.faq-item {
  border-top: 1px solid var(--color-border);
  padding: 16px 0;
}
.faq-item:last-child { border-bottom: 1px solid var(--color-border); }

.faq-trigger {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  gap: 16px;
}
.faq-trigger span { flex: 1; }
.faq-icon { flex-shrink: 0; margin-top: 2px; }
.faq-icon--open { transform: rotate(45deg); }

.faq-body {
  padding-top: 16px;
  color: var(--color-text-secondary);
}
```

---

### CTA Section (Reusable, Full-Width)

Used on every page, always the same instance. Treat as a template block.

```html
<section class="cta-section">
  <div class="section-inner">
    <div class="cta-content">
      <h2 class="text-h2 cta-headline">Get started today</h2>
      <p class="text-body-lg cta-sub">Supporting sentence here.</p>
    </div>
    <div class="btn-group cta-buttons">
      <a href="/get-started" class="btn-primary">Get started free</a>
      <a href="/contact" class="btn-secondary">Talk to us</a>
    </div>
  </div>
</section>
```

```css
.cta-section {
  height: 410px;
  background: var(--color-bg-contrast);       /* #2E2E2E */
  display: flex;
  align-items: center;
}
.cta-content {
  max-width: 1248px;
  padding: 0 48px;
}
.cta-headline {
  color: #FFFFFF;
  margin-bottom: 16px;
}
.cta-sub {
  color: rgba(255,255,255,0.7);
  margin-bottom: 40px;
}
.cta-buttons { justify-content: flex-start; }
.cta-section .btn-primary { background: var(--color-brand-default); }
.cta-section .btn-secondary { border-color: rgba(255,255,255,0.3); color: #FFFFFF; }
```

---

### Contact Form

```html
<div class="contact-form">
  <div class="form-field">
    <input type="text" placeholder="*name" class="text-h3" />
  </div>
  <div class="form-field">
    <input type="email" placeholder="*email" class="text-h3" />
  </div>
  <div class="form-field">
    <input type="text" placeholder="company name" class="text-h3" />
  </div>
  <div class="form-field">
    <input type="url" placeholder="website URL" class="text-h3" />
  </div>
  <div class="form-field form-field--tall">
    <textarea placeholder="message" class="text-h3"></textarea>
  </div>
  <button type="submit" class="btn-primary" style="width:100%">Send message</button>
</div>
```

```css
.contact-form {
  width: 599px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.form-field {
  height: 58px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
}
.form-field--tall {
  height: 219px;
  align-items: flex-start;
  padding-top: 16px;
}
.form-field input,
.form-field textarea {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 24px;
  font-family: 'Zalando Sans', sans-serif;
  font-variation-settings: 'wdth' 100;
  font-weight: 500;
  font-size: 26px;
  line-height: 1.3;
  color: var(--color-text-primary);
  outline: none;
  resize: none;
}
.form-field input::placeholder,
.form-field textarea::placeholder {
  color: var(--color-text-secondary);
}
```

---

### Feature Detail — Two-Column (Text + Screenshot)

Used on Platform Features, How it Works, and Integrations pages.

```html
<section class="section">
  <div class="section-inner feature-detail">
    <div class="feature-detail-text">
      <span class="text-tag feature-tag">strategy</span>
      <h2 class="text-h2">Headline up to two lines.</h2>
      <p class="text-body-lg">Supporting description here.</p>
    </div>
    <div class="feature-detail-media">
      <!-- Screenshot or rounded rectangle placeholder -->
      <div class="screenshot-placeholder" style="width:592px; height:338px;"></div>
    </div>
  </div>
</section>
```

```css
.feature-detail {
  display: grid;
  grid-template-columns: 592px 592px;
  gap: 64px;
  align-items: center;
  padding-top: 108.92px;    /* confirmed from features page section */
  padding-bottom: 108.92px;
}
.feature-detail-text {}
.feature-tag {
  display: block;
  color: var(--color-text-secondary);
  margin-bottom: 43px;
}
.feature-detail-text .text-h2 {
  margin-bottom: 24px;
}
.feature-detail-media {
  border-radius: 4px;
  overflow: hidden;
}
.screenshot-placeholder {
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

/* Alternate: image on left */
.feature-detail--reversed {
  direction: rtl;
}
.feature-detail--reversed > * { direction: ltr; }
```

---

### Security / Data — Label + Body Row

```html
<div class="security-row">
  <div class="security-label">
    <img src="[Computers-Devices-Electronics-Desktop--Streamline-Pixel]" width="60" height="60" alt="" />
    <h3 class="text-h3">Data ownership</h3>
  </div>
  <div class="security-body">
    <p class="text-body-lg security-subhead">You own your data. Full stop.</p>
    <p class="text-body-lg">Supporting explanation here.</p>
  </div>
</div>
```

```css
.security-row {
  display: grid;
  grid-template-columns: 460px 740px;
  gap: 112px;               /* 572 - 460 = 112px gap */
  padding: 48px 0;
  border-bottom: 1px solid var(--color-border);
}
.security-label {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.security-subhead {
  font-weight: 500;
  margin-bottom: 12px;
}
```

---

### About Page — Values Grid

```html
<section class="section">
  <div class="section-inner values-layout">
    <h2 class="text-h2 values-label">How we work</h2>
    <div class="values-grid">
      <div class="value-item">
        <img src="[Interface-Essential-Wrench-1--Streamline-Pixel]" width="32" height="32" alt="" />
        <h3 class="text-h3 value-title">Bias for action</h3>
        <p class="text-body-lg value-desc">We build things, try them, learn fast, and move forward.</p>
      </div>
      <!-- repeat for each value — max 2 per row -->
    </div>
  </div>
</section>
```

```css
.values-layout {
  display: grid;
  grid-template-columns: 450px 750px;
  gap: 62px;
  align-items: start;
}
.values-label {
  padding-top: 48px;
}
.values-grid {
  display: grid;
  grid-template-columns: 351px 351px;
  gap: 48px 48px;
}
.value-item { height: 156px; }
.value-item img { margin-bottom: 12px; }
.value-title {
  height: 34px;
  margin-bottom: 12px;
}
.value-desc {
  color: var(--color-text-secondary);
  height: 66px;
}
```

---

### Platform Tabs (App Screenshot Viewer)

```html
<div class="platform-tabs-block">
  <div class="platform-tabs-layout">
    <div class="tab-preview">
      <!-- 937×642px app screenshot area -->
      <div class="tab-nav">
        <button class="tab-btn tab-btn--active">Analytics</button>
        <button class="tab-btn">Strategy</button>
        <button class="tab-btn">Content</button>
        <button class="tab-btn">Reviews</button>
      </div>
      <div class="tab-screenshot">
        <!-- Insert 937×586px screenshot here -->
      </div>
    </div>

    <div class="tab-sidebar">
      <!-- Checklist items -->
      <ul class="tab-features">
        <li class="tab-feature-row">
          <img src="[Check--Streamline-Sharp]" width="16" height="16" alt="" />
          <span class="text-body-lg">Feature label here</span>
        </li>
      </ul>
      <p class="text-h3 tab-sidebar-summary">Clarity, not more dashboards.</p>
    </div>
  </div>
</div>
```

```css
.platform-tabs-layout {
  display: grid;
  grid-template-columns: 937px 311px;
  gap: 0;
  width: 1248px;
}
.tab-nav {
  display: grid;
  grid-template-columns: repeat(4, 234.25px);
  height: 56px;
  border: 1px solid var(--color-border);
  border-bottom: none;
}
.tab-btn {
  background: transparent;
  border: none;
  border-right: 1px solid var(--color-border);
  font-family: 'Zalando Sans', sans-serif;
  font-size: 16px;
  cursor: pointer;
  color: var(--color-text-secondary);
}
.tab-btn:last-child { border-right: none; }
.tab-btn--active { color: var(--color-text-primary); }
.tab-screenshot {
  width: 937px;
  height: 586px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.tab-sidebar {
  border: 1px solid var(--color-border);
  border-left: none;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.tab-features { list-style: none; padding: 0; }
.tab-feature-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-height: 40px;
  padding: 8px 0;
}
.tab-sidebar-summary {
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
```

---

## 8. Components

### "The Problem" Hero Block (solution/use-case pages)

```html
<!-- Full-width problem statement with large icon -->
<div class="problem-hero">
  <div class="problem-hero-inner">
    <img src="[Interface-Essential-Skull-1--Streamline-Pixel]" width="107" height="107" alt="" />
    <div class="problem-hero-text">
      <h2 class="text-h2">The problem</h2>
      <p class="text-body-lg">One or two sentence problem statement.</p>
    </div>
  </div>
</div>
```

```css
.problem-hero {
  padding: 0 120px;
}
.problem-hero-inner {
  display: grid;
  grid-template-columns: 107px 913px;
  gap: 74px;
  align-items: start;
  padding: 42px 0;
}
```

### Pricing Table Header Tag

```html
<div class="pricing-badge">
  <span class="text-body-sm">Recommended!</span>
</div>
```

```css
.pricing-badge {
  background: var(--color-brand-default);
  color: #FFFFFF;
  padding: 6px 12px;
  width: 125px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Inline Tag Pill (Feature pages)

```html
<div class="inline-tag">
  <span class="text-tag">strategy</span>
</div>
```

```css
.inline-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 19px;
  border: 1px solid var(--color-border);
}
```

---

## 9. Page Shell (Navbar + Footer)

The Navbar and Footer are shared components instantiated from the design system. Do not rebuild them — use the existing component.

### Navbar

- **Desktop:** 1376 × 78px, positioned at x=32, y=32 within the 1440px canvas.
- **Mobile:** 398 × 56px, positioned at x=16, y=16.
- Background: `var(--color-bg-default)`.
- Contains the Massic wordmark (left), navigation links (centre/right), and a CTA.

### Footer

- **Desktop:** 1376 × 402px.
- **Mobile:** 398 × 426px.
- Background: `var(--color-bg-default)`.
- Structure: centred link column (154px wide, 33px row height, 17px Zalando Sans), address row with Google Maps icon (30×30px), legal links row (16px height), copyright line.
- Footer links centred over the 398px mobile width.

### Page Document Flow

```html
<!DOCTYPE html>
<html>
<head>
  <!-- fonts, tokens, global CSS -->
</head>
<body style="background: var(--color-bg-default);">

  <!-- Navbar: floats in 32px from each edge, 32px from top -->
  <nav class="navbar">...</nav>

  <!-- Content starts at y = 32 (nav top) + 78 (nav height) + 24 (gap) = ~134px from top -->
  <main>
    <section class="section hero-section">...</section>
    <section class="section">...</section>
    <!-- ... -->

    <!-- CTA always second-to-last -->
    <section class="cta-section">...</section>
  </main>

  <footer class="footer">...</footer>

</body>
</html>
```

---

## 10. Do / Don't

### Typography

| ✅ DO | ❌ DON'T |
|---|---|
| Use Zalando Sans for all headings and body | Use any other typeface |
| Use Azeret Mono only for `h4` and `tag` styles | Use Azeret Mono for body copy or paragraphs |
| Always include `font-variation-settings: 'wdth' 100` | Omit the variation setting (font will look wrong) |
| Use Medium (500) for headings | Use Bold (700) or SemiBold (600) — not in the system |
| Apply negative letter-spacing to h1/h2/h3 | Forget letter-spacing (headings look wrong without it) |
| `text-transform: uppercase` on all h4 and tag elements | Write h4/tag text in mixed case |

### Colours

| ✅ DO | ❌ DON'T |
|---|---|
| Use `#FFFEFA` as the default page background | Use pure white `#FFFFFF` as the page background |
| Use `#2FA87E` for primary CTAs only | Apply the green to borders, background fills, or decorative shapes |
| Use `#161616` for primary text | Use `#000000` for text — it's too harsh |
| Use `#6E6C67` for supporting text | Use grey values outside the defined palette |
| Use the gradient (`#1D7657 → #44BA91`) decoratively | Use the gradient as a button background |

### Layout

| ✅ DO | ❌ DON'T |
|---|---|
| Use `1248px` as the max content width within sections | Let content run to the full 1440px viewport width |
| Add `86px` top padding to section content | Use inconsistent vertical spacing between sections |
| Use `16px` gap for blog card grids | Change card gap without checking the column stride |
| Use full-width buttons on mobile (`width: 100%`) | Keep fixed-width buttons on mobile |

### Icons

| ✅ DO | ❌ DON'T |
|---|---|
| Use Streamline **Pixel** for all content icons | Mix Streamline Pixel with Streamline Outline or other styles |
| Use Streamline **Sharp** for small UI controls (`Check`, `User-Add-Plus`) | Use Pixel icons at 16px where Sharp variants are specified |
| Colour icons with `currentColor` / CSS `color` | Hard-code fill colours inside SVG |
| Size icons from the defined scale (16 / 22 / 24 / 32 / 48 / 60 / 68px+) | Use arbitrary icon sizes |

### Sections

| ✅ DO | ❌ DON'T |
|---|---|
| Use the CTA section as-is on every page before the footer | Build a custom CTA for each page |
| Use the same FAQ component with `User-Add-Plus--Streamline-Sharp` toggle | Use chevrons or different toggles for accordion |
| Alternate bg between `--color-bg-default` and `--color-bg-dark` across sections | Create new background colours |
| Use `border: 1px solid var(--color-border)` for all card outlines | Use shadows on cards — the website uses borders, not shadows |

---

*Last updated from Figma: April 2025. File: `lBmramVkYiT3KTHIizSswO`.*

