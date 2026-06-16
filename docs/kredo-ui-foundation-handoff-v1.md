# KREDO UI Foundation Handoff v1

## Status Legend

- `Confirmed` = explicitly visible in selected Doctrine Cobalt references and/or already implemented in the codebase.
- `Recommendation` = strong system recommendation inferred consistently from the selected direction and current screens.
- `Future` = rule intentionally left extensible for later product expansion.

---

## A. Executive Summary

KREDO should feel like a **decision cockpit** rather than a generic CRM, BI tool, or AI assistant. The selected direction, `Doctrine Cobalt`, creates a product personality based on **clarity, operational authority, premium sobriety, and structured action**.

The system already shows two complementary usage modes:

- `Desktop` = dense analysis, monitoring, drill-down, filtering, forecasting, planning, and detailed business control.
- `Mobile` = insight-first action, weekly prioritization, meeting prep, validation, assignment, and thumb-friendly execution.

The most important visual rules are:

1. `Confirmed` Structural UI is built on cobalt + warm mineral neutrals + dark ink.
2. `Confirmed` Navigation is a strong branded moment; content surfaces stay light and restrained.
3. `Confirmed` Cards, tables, and drawers rely more on border, spacing, and hierarchy than on shadow or decoration.
4. `Confirmed` Desktop supports density, but density is always organized through clear zones.
5. `Confirmed` Mobile must not be a compressed desktop; it must be redesigned around insight and action.
6. `Recommendation` Brass/gold is a brand accent, not a structural UI color.
7. `Recommendation` AI should appear as synthesized guidance, recommendations, and next actions, never as a chat-first gimmick.

Main implementation priorities:

1. lock design tokens
2. align light theme and branded accent decisions
3. implement primitives and shell
4. implement card, table, badge, button, input, and drawer foundations
5. implement desktop and mobile page templates
6. refactor feature screens progressively onto these primitives

---

## B. Brand-to-UI Translation

### Product feeling

`Confirmed` Doctrine Cobalt translates the brand into a product that feels:

- controlled
- legible
- premium without luxury signaling
- calm under information load
- directional and decisive

It does not feel:

- playful
- futuristic
- consumer AI
- glossy fintech
- developer tooling dark-mode first

### Trust, control, clarity, premium feel

`Confirmed`

- Trust comes from stable structure, visible borders, calm surfaces, and conservative use of color.
- Control comes from strong page heads, explicit filters, clear entity states, and right-side detailed drawers.
- Clarity comes from whitespace, typography hierarchy, and restrained surface treatment.
- Premium feel comes from polish in spacing, proportions, type, icon restraint, and reduction of visual noise.

### What should remain restrained

`Confirmed`

- shadows
- gradients
- status saturation
- chart color count
- AI visual treatment
- roundedness
- decorative icons

### Where stronger branded moments are allowed

`Confirmed`

- desktop sidebar
- mobile bottom navigation
- hero metric or hero insight blocks
- primary CTA
- app icon / favicon
- active tabs and page emphasis lines

### How identity appears in a dashboard product

`Recommendation`

Brand should appear mostly through:

- shell contrast
- cobalt navigation
- heading rhythm
- gold/brass accent restraint
- consistent action hierarchy

Brand should not rely on:

- oversized logos in product areas
- decorative illustration on every page
- repeated gradients
- promotional language inside product surfaces

---

## C. Design Principles

1. `Confirmed` **Clarity over decoration**  
   If a treatment does not improve scan speed, hierarchy, or confidence, remove it.

2. `Confirmed` **Hierarchy before color**  
   Structure with layout, typography, grouping, and borders first. Color is secondary.

3. `Confirmed` **Premium sobriety**  
   Premium means disciplined alignment, restrained accents, and low noise, not visual richness.

4. `Confirmed` **Dense but breathable desktop**  
   Desktop may be information-rich, but every page must have identifiable zones: orientation, filters, KPI summary, primary work area, secondary rail.

5. `Confirmed` **Action-first mobile**  
   Mobile surfaces should prioritize one insight and a handful of next actions. Never port desktop grids directly.

6. `Confirmed` **Restraint in accents**  
   Cobalt is structural. Brass/gold and ember are accent moments. They must not compete with the content.

7. `Confirmed` **Status semantics are stable**  
   A status color must mean the same thing everywhere. Never change color semantics page by page.

8. `Recommendation` **AI is guidance, not personality**  
   AI components should summarize, prioritize, recommend, and frame decisions. They should not visually dominate the application.

9. `Confirmed` **Edges define the system**  
   Cards, tables, drawers, and sections are separated by light outlines and spacing, not heavy elevation.

10. `Recommendation` **One strong action per block**  
   Each card, rail block, or mobile module should make the next action obvious.

11. `Recommendation` **Scalable component language**  
   New screens should be composed from repeatable patterns, not custom layouts.

12. `Future` **Controlled specialization**  
   Domain pages may add specialized modules, but only after aligning to core tokens and patterns.

---

## D. Visual Foundations

### D1. Color System

#### Decision note

`Confirmed` The visual references use a brass accent around `#C89A2B`.  
`Confirmed` The current codebase mixes `#FFB812` and `#FFC233` for secondary/gold behavior.  
`Recommendation` Lock product accent to the brass/gold family around `#C89A2B` for consistency, then define lighter accessibility-safe variants around it.

#### Core palette

| Token | HEX | Status | Role | Usage rules | Contrast notes |
| --- | --- | --- | --- | --- | --- |
| `color.brand.primary` | `#2554B8` | Confirmed | Core brand cobalt | sidebar, primary CTA, active nav, active tabs, focus moments | White text is safe; avoid long body text on cobalt without testing |
| `color.brand.primary.deep` | `#1E4596` | Confirmed | Darker cobalt | shell depth, pressed states, branded panels | Use for depth, not as dominant page background |
| `color.brand.accent.brass` | `#C89A2B` | Confirmed | Premium accent | KPI emphasis, section marker, selective chart series, icon highlight | Do not use for long text on white; low contrast |
| `color.brand.accent.ember` | `#D97020` | Confirmed | Action accent | urgent CTA variants, AI action moments, elevated warning emphasis | Rare usage only |
| `color.bg.canvas` | `#F4F2ED` | Confirmed | App background | primary light canvas | Large surfaces only |
| `color.bg.surface` | `#FCFBF7` | Confirmed | Card surface | default cards, drawers, overlays | Use with subtle border |
| `color.bg.surface.alt` | `#F8F6F0` | Recommendation | Secondary surface | grouped sections, alt panels | Keep close to canvas |
| `color.bg.sidebar` | `#0F274B` | Recommendation | Dark shell | sidebar, dark nav blocks | Derived from reference navy/ink behavior |
| `color.border.default` | `#D8DEEA` | Confirmed | Default border | cards, inputs, table rows, section outlines | Structural, should remain subtle |
| `color.border.strong` | `#C6CFDF` | Recommendation | Stronger border | active containers, selected cards, drawer section split | Use sparingly |
| `color.text.primary` | `#1A2540` | Confirmed | Main text | headings, KPI values, dense labels | High contrast on light surfaces |
| `color.text.secondary` | `#556277` | Confirmed | Body text | supporting copy, metadata with importance | Safe for body text |
| `color.text.muted` | `#97A3B3` | Confirmed | Muted/support | placeholders, helper text, low-priority metadata | Do not use for small critical text |
| `color.text.inverse` | `#F2F5FB` | Confirmed | Text on dark shell | sidebar, dark CTA text | Use on cobalt/deep surfaces |
| `color.status.success` | `#2F7D61` | Confirmed | Positive state | success text, pills, trend up | Prefer soft backgrounds for surfaces |
| `color.status.warning` | `#B98522` | Recommendation | Warning state | warning pill, pending attention | Prefer text + border + soft tint |
| `color.status.danger` | `#BE4A42` | Recommendation | Negative state | overdue, risk, blocked | Avoid full-width danger surfaces |
| `color.status.info` | `#2E7D8C` | Confirmed | Informational state | neutral assistive states | Keep lower emphasis than cobalt |
| `color.status.neutral` | `#6E7A8A` | Recommendation | Neutral state | inactive, archived, draft | Useful for table tags |

#### Neutral scale

| Token | HEX | Status | Role |
| --- | --- | --- | --- |
| `color.neutral.0` | `#FFFFFF` | Confirmed | pure white |
| `color.neutral.25` | `#FCFBF7` | Confirmed | warm white surface |
| `color.neutral.50` | `#F4F2ED` | Confirmed | app canvas |
| `color.neutral.100` | `#EDF0F7` | Confirmed | hover / light background shift |
| `color.neutral.200` | `#D8DEEA` | Confirmed | border |
| `color.neutral.300` | `#C6CFDF` | Recommendation | stronger separators |
| `color.neutral.500` | `#97A3B3` | Confirmed | muted text |
| `color.neutral.700` | `#556277` | Confirmed | secondary text |
| `color.neutral.900` | `#1A2540` | Confirmed | primary text |

#### Data visualization palette

| Token | HEX | Status | Role | Rule |
| --- | --- | --- | --- | --- |
| `color.dataviz.series.1` | `#2554B8` | Confirmed | primary series | default primary series |
| `color.dataviz.series.2` | `#C89A2B` | Confirmed | comparison/target | best for benchmark or target |
| `color.dataviz.series.3` | `#63A6E8` | Recommendation | secondary trend | cool secondary data |
| `color.dataviz.series.4` | `#719A5A` | Recommendation | positive/support series | use in staffing/capacity |
| `color.dataviz.series.5` | `#7B6BB2` | Recommendation | tertiary analytical | reserve for low-frequency extra grouping |
| `color.dataviz.series.6` | `#D4B26A` | Recommendation | muted comparison | use lightly |

#### Structural vs accent-only

`Structural`

- `brand.primary`
- `brand.primary.deep`
- `bg.canvas`
- `bg.surface`
- `border.default`
- `text.primary`
- `text.secondary`
- `text.muted`

`Accent-only`

- `brand.accent.brass`
- `brand.accent.ember`
- most dataviz series beyond 1 and 2

`Must remain rare`

- ember
- brass as filled backgrounds
- danger fills
- warning fills

#### What not to do with color

- `Confirmed` Do not use brass as body text on white backgrounds.
- `Confirmed` Do not use saturated category colors as card backgrounds.
- `Recommendation` Do not use cobalt for every chart series.
- `Recommendation` Do not mix structural UI accent and data accent without semantic purpose.
- `Recommendation` Do not build page hierarchy from color alone.

---

### D2. Typography

#### Typefaces

| Usage | Typeface | Status | Notes |
| --- | --- | --- | --- |
| Interface body | `Lato` | Confirmed | Already wired in `layout.tsx` |
| Headings | `Manrope` | Confirmed | Already wired in `layout.tsx` |
| Tabular / KPI / codes | `JetBrains Mono` | Confirmed | Already wired in `layout.tsx` |

#### Type scale

| Token | Size / Line | Weight | Status | Usage |
| --- | --- | --- | --- | --- |
| `font.display.lg` | `48 / 52` | 700 | Recommendation | mobile hero titles only |
| `font.display.md` | `40 / 44` | 700 | Recommendation | rare, landing-like product moments |
| `font.heading.xl` | `32 / 38` | 700 | Confirmed | major desktop page titles |
| `font.heading.lg` | `24 / 30` | 700 | Confirmed | section heads, large card titles |
| `font.heading.md` | `20 / 26` | 700 | Recommendation | modal/drawer/entity section heads |
| `font.heading.sm` | `16 / 22` | 600 | Confirmed | card heads, module heads |
| `font.body.lg` | `16 / 24` | 400 | Recommendation | short editorial guidance |
| `font.body.md` | `14 / 22` | 400 | Confirmed | standard body |
| `font.body.sm` | `12 / 18` | 400 | Confirmed | metadata, table support text |
| `font.label.md` | `12 / 16` | 700 | Confirmed | labels, pills, filters |
| `font.label.sm` | `11 / 14` | 700 | Recommendation | table headings, subtle overlines |
| `font.caption` | `10 / 14` | 600 | Recommendation | micro supporting text |
| `font.kpi.lg` | `36 / 40` | 700 | Recommendation | hero KPI |
| `font.kpi.md` | `28 / 32` | 700 | Confirmed | desktop KPI cards |
| `font.kpi.sm` | `22 / 28` | 700 | Recommendation | compact KPI |
| `font.mono.md` | `14 / 20` | 500 | Confirmed | financial values, table numbers |

#### Letter spacing

- `Confirmed` Overlines and section labels use slight positive tracking.
- `Recommendation` Use `0.08em` to `0.14em` for uppercase micro-labels.
- `Recommendation` Keep body and heading tracking neutral.

#### Density rules

`Dense typography acceptable`

- tables
- KPI cards
- filter bars
- sidebar labels
- drawer metadata

`Dense typography forbidden`

- mobile hero sections
- mobile action cards
- empty states
- primary CTA blocks

#### Mobile text sizing rules

`Confirmed`

- Titles should be significantly larger than desktop proportional rhythm when used as primary mobile orientation.

`Recommendation`

- Mobile page title: `40/44` or `32/38`
- Mobile action card label: `22/28` or `18/24`
- Mobile support line: `14/20`
- Never stack more than three text hierarchies inside one mobile action card

---

### D3. Radius / Borders / Elevation

#### Radius scale

| Token | Value | Status | Usage |
| --- | --- | --- | --- |
| `radius.sm` | `8px` | Confirmed | inputs, pills, compact chips |
| `radius.md` | `10px` | Recommendation | default buttons |
| `radius.lg` | `12px` | Confirmed | cards, drawers, large filters |
| `radius.xl` | `16px` | Recommendation | hero cards, mobile highlight blocks |
| `radius.round` | `999px` | Confirmed | status dots, avatar pills |

#### Border rules

- `Confirmed` Default card/input/table border = `1px` subtle line.
- `Recommendation` Strong emphasis border = `1px` only; do not increase thickness before increasing contrast.
- `Recommendation` Use border color changes before shadow changes for state expression.

#### Modal and drawer edges

- `Confirmed` Drawers use a single side border and flat/light surface.
- `Recommendation` Drawer corners should be square against the viewport edge and rounded only on the free edge if needed.
- `Recommendation` Modals use `radius.lg` with a stronger outer separation than cards.

#### Shadow philosophy

- `Confirmed` Product should remain flat/minimal/premium.
- `Recommendation` Use only 2 shadow families:
  - `shadow.soft`: subtle card hover / raised CTA
  - `shadow.overlay`: drawer/modal elevation
- `Recommendation` Do not use ambient large diffuse shadows on cards.

#### Suggested shadow aliases

| Token | Value intent | Status |
| --- | --- | --- |
| `shadow.none` | no shadow | Confirmed |
| `shadow.soft` | `0 2px 8px rgba(16, 31, 61, 0.06)` | Recommendation |
| `shadow.overlay` | `0 20px 40px rgba(16, 31, 61, 0.14)` | Recommendation |

---

### D4. Spacing

#### Core spacing scale

| Token | Value | Status |
| --- | --- | --- |
| `space.1` | `4px` | Recommendation |
| `space.2` | `8px` | Confirmed |
| `space.3` | `12px` | Confirmed |
| `space.4` | `16px` | Confirmed |
| `space.5` | `20px` | Recommendation |
| `space.6` | `24px` | Confirmed |
| `space.8` | `32px` | Confirmed |
| `space.10` | `40px` | Recommendation |
| `space.12` | `48px` | Recommendation |

#### Usage guidance

- card padding: `16px` compact, `20px` default, `24px` hero
- section spacing desktop: `24px` between major blocks
- section spacing mobile: `16px` or `20px`
- filter/toolbars: `12px` vertical rhythm
- table row height: `44px` compact minimum, `52px` default
- form row height: `40px` compact, `44px` default
- mobile tap target: absolute minimum `44px`, preferred `48px`

#### Density rules

`Desktop analytical`

- high content density inside cards is acceptable if padding remains stable
- do not compress vertical spacing under `12px` within cards

`Mobile compact`

- reduce object count, not only padding
- preserve large outer margins and clear action zones

---

## E. Layout System

### Desktop

#### App shell

- `Confirmed` Persistent left sidebar
- `Confirmed` Light content area on warm canvas
- `Recommendation` Header row may be global or page-scoped depending on module

#### Sidebar

- width collapsed: `64px`
- width expanded: `256px`
- grouped modules with overline labels
- active item uses high-contrast fill
- footer carries identity/session

#### Header

- left = page context or breadcrumb
- center = search optional
- right = utilities, shortcuts, alerts, user

#### Content width

- `Recommendation` Default max width `1440px` for analytics pages
- `Recommendation` Use centered content container with full-height app shell
- `Recommendation` Extra-wide tables may spill within their card, not the whole page

#### Dashboard grid logic

- KPI strip first
- primary panel second
- supportive rail third
- use 12-column grid with `20px` gaps
- right rail standard width: `280px` to `360px`

#### Dense content organization

Preferred desktop pattern:

1. page title / actions
2. filters
3. KPI summary
4. main analytical area
5. secondary rail or recommendation rail
6. table / details / drawer interactions

#### Drawer layering

- `Confirmed` Right-side drawer overlays content, does not shift whole layout
- `Recommendation` Keep primary page legible behind drawer for context retention
- `Recommendation` Drawer width: `420px` to `520px` depending on entity complexity

#### Table and filter behavior

- filter bar stays above table, not mixed into rows
- table toolbar owns search, sort, export, view toggle, count
- row actions should remain secondary until hover/selection

### Mobile

#### Top area

- large orientation title
- one contextual selector or account scope max
- one or two utility icons max

#### Bottom navigation

- `Confirmed` Brand-colored bottom nav works for Doctrine Cobalt
- `Recommendation` 4 to 5 items max
- `Recommendation` active state should rely on icon + label + stronger fill, not only color

#### Quick action areas

- major CTA at bottom or inside thumb zone
- one primary action per module
- modules should be vertically stacked, not side-by-side dense grids unless truly binary

#### Compact content rhythm

- large title
- one hero insight
- 2 to 4 action blocks
- one bottom CTA or nav

#### Card stacking logic

- stacked cards are preferred over multi-column dense compositions
- two-column mini-grid acceptable only for action modules, not analytics

#### Tap target rules

- min `44x44`
- preferred `48x48`
- destructive or primary actions need larger visual mass than icon-only actions

#### Information prioritization

- show the most important decision first
- collapse analytical detail into later steps, drawers, or follow-up screens

### Desktop-to-mobile adaptation rules

`Confirmed`

- mobile is not a CSS shrink of desktop

`Recommendation`

- redesign these as distinct mobile components:
  - KPI strip
  - planning/timeline
  - AI assistant rail
  - table views
  - filter systems
  - detail drawers

- what should never simply be hidden with CSS:
  - table columns without redefining the data model
  - entire analytical context needed for action
  - multi-step actions that depend on hidden metadata

---

## F. Component Inventory and Specification

### F1. Core Actions

#### Primary Button

- `Purpose`: main action for the current container or screen
- `Anatomy`: filled background, medium radius, 40-44px height desktop, 48-56px mobile
- `States`: default, hover, active, disabled, loading
- `Hierarchy`: exactly one primary action per local zone when possible
- `Desktop`: default fill = cobalt
- `Mobile`: larger, thumb-first, often full-width
- `Do`: reserve for submit, save, launch, validate, open critical flow
- `Don't`: place multiple primary buttons in one small card

#### Secondary Button

- bordered light surface button
- supports adjacent actions to primary
- same height as primary
- never visually equal to primary in density

#### Tertiary / Ghost Button

- text-first or outline-light
- use for low-risk actions, view details, optional drill-down
- on mobile, avoid when the action matters; convert to stronger block

#### Destructive Button

- outline or filled danger depending context
- reserve for delete/cancel/close workflows
- require confirmation if irreversible

#### AI Action Button

- `Confirmed` should not look magical
- `Recommendation` use cobalt or neutral outline + small brass or ember cue
- labels should be explicit: `Voir l'analyse`, `Générer le brief`, `Prioriser`

#### Icon Button

- use for utility actions only: close, more, help, refresh
- minimum 36px desktop, 44px mobile
- provide tooltip on desktop when icon is non-obvious

### F2. Inputs

#### Text Input

- 40px height desktop, 44px mobile
- light surface, visible border, low shadow or none
- placeholder in muted text
- focus ring uses cobalt, not glow

#### Textarea

- same surface treatment as input
- auto-resize where possible
- keep helper/error below, never inline placeholder as instruction-only

#### Select

- same shell as text input
- chevron right-aligned
- option list uses flat light surface and clear hover

#### Combobox / Searchable Select

- critical for dense CRM/staffing flows
- must support keyboard selection desktop
- mobile version becomes full-screen selection surface or bottom sheet

#### Date Input

- compact for desktop filter bars
- explicit calendar trigger
- mobile should often become a dedicated picker surface

#### Filters

- chips or controls grouped above content
- default to restrained visual treatment
- active filter uses cobalt emphasis

#### Form Groups

- label above field
- helper or error below
- spacing between fields `12px` to `16px`

#### Helper / Error Text

- helper in muted
- error in danger
- never rely on border color alone for validation state

### F3. Information

#### Badge

- small semantic marker
- low-saturation background + readable text
- best for status snapshots

#### Tag

- taxonomy label
- even lighter than badge
- used in resources, entities, filters

#### Status Pill

- stable semantic mapping required
- recommended variants: success, warning, danger, neutral, draft, in-progress

#### KPI Card

- `Purpose`: summarize one metric with comparison or target
- `Anatomy`: title, value, secondary comparison line, optional mini bar/sparkline
- `Do`: keep one main number only
- `Don't`: overload with multiple legends and actions

#### Standard Card

- default content container
- clear heading + body + optional footer action

#### Insight Card

- AI or editorial synthesis block
- 1 key message + 1 implication + 1 action
- should feel calmer and more selective than an alert block

#### Alert / Warning Block

- explicit severity
- short description
- optional next step
- avoid long paragraphs

#### Empty State

- title
- one-line explanation
- one primary action
- optional secondary learning/help action

#### Tooltip

- for clarifying terse desktop elements
- never store critical flow info exclusively in tooltip

### F4. Navigation

#### Desktop Sidebar

- branded, dark, high-recognition shell
- supports groups and module-level navigation
- active item must be obvious
- sub-page navigation should not bloat the sidebar

#### Top Header Actions

- search
- shortcuts
- alerts
- help
- user

#### Tabs

- underline or subtle active fill
- use for page-level sections
- keep count low

#### Sub-tabs

- allowed inside detail views and drawers
- visually lighter than primary tabs

#### Mobile Bottom Nav

- 4 to 5 destinations max
- persistent across major mobile destinations
- use stronger touch affordance than web-tab style

#### Mobile Contextual Tab Row

- permitted when a screen has 2 to 4 local modes
- should scroll horizontally if needed

#### Breadcrumbs

- desktop only
- optional for deep business detail views
- not required on all pages

### F5. Data Display

#### Table

- `Purpose`: dense business records
- `Anatomy`: toolbar, header row, data rows, pagination/footer
- `States`: default, hover, selected, loading, empty
- `Density`: compact but never below 44px row height
- `Mobile`: redesign as action cards or compressed list, not full table

#### Table Toolbar

- search, filter summary, sort, export, view mode
- count and page size visible

#### Sortable Columns

- indicate sortability clearly
- active sorted column should show icon + stronger text

#### Row States

- hover
- selected
- needs attention
- linked to drawer open

#### Inline Status Indicators

- dot + label or pill
- never color-only

#### Metric Blocks

- useful inside drawers and detail panels
- can be 2-up or 3-up on desktop
- stacked vertically on mobile

#### Progress Bars

- use for target attainment or completion only
- not as decoration

#### Charts

- desktop charts are structured analytical tools
- mobile charts should be compressed insight visuals only

#### Legends

- lightweight
- directly tied to chart encoding
- avoid large detached legend blocks

#### Timeline / Planning Visuals

- desktop may use full timeline/grid
- mobile should show prioritized events or daily/weekly strip, not full planner complexity

### F6. Overlays

#### Drawer

- `Confirmed` right-side drawer is a core KREDO pattern
- `Anatomy`: header, summary block, quick facts, sub-navigation, body, sticky footer
- `States`: open, closing, loading, edited, blocked, error
- `Desktop`: main deep-detail surface
- `Mobile`: becomes bottom sheet or dedicated detail screen

#### Modal

- reserve for confirmation, focused creation, destructive actions, short forms
- do not use as a substitute for detail exploration

#### Dropdown Menu

- utility actions only
- avoid storing core navigation inside menus

#### Command / Quick Action Surface

- `Recommendation` add later as command palette / action launcher
- useful for fast navigation and AI-assisted shortcuts

---

## G. Data Visualization Rules

### KPI Cards

- one core value per card
- one context line
- optional target/progress line
- optional micro trend

### Comparison metrics

- use secondary text or muted helper line
- trend color should reinforce, not replace, numeric comparison

### Progress indicators

- cobalt = progress
- brass = target or benchmark
- success = achieved/healthy
- danger = deficit/overdue only

### Alerts

- alerts belong in rail blocks, list modules, or action cards
- do not paint whole dashboards in warning colors

### Status color usage

- structural UI color and status color must remain separate
- cobalt does not equal success
- brass does not equal warning by default

### Charts on desktop

- max 2 to 4 series in standard dashboards
- one dominant series per chart
- gridlines subtle
- labels direct and sparse
- use chart titles that explain business meaning, not chart type

### Compact chart / sparkline style on mobile

- only for directional support
- no dense axes
- no stacked legend blocks
- should support one insight sentence

### Tables with business-critical information

- freeze core identifiers first visually: account, mission, owner, stage, status
- money, margin, dates, and risk should remain scannable
- actions should not break row readability

### Avoiding dashboard overload

- one hero chart per area
- secondary charts in support positions
- keep sidebar rail informative, not equivalent in priority to the core work area

---

## H. Screen Pattern Extraction

### Pattern 1: Cockpit / Dashboard Page

- `What`: top-level analytical monitoring page
- `Template`: title + filters + KPI strip + 1-2 main panels + right rail
- `Depends on`: KPI card, chart card, alert block, insight block, table snippet
- `Standardize now`: shell, KPI strip, two-column analytical layout, right recommendation rail

### Pattern 2: Dense List + Filters + Drawer

- `What`: CRM, resources, finance tables, opportunities
- `Template`: page head + filters + toolbar + data table + contextual right drawer
- `Depends on`: filters, table toolbar, table row states, drawer
- `Standardize now`: filter row, toolbar anatomy, row selection state, drawer trigger behavior

### Pattern 3: Entity Detail Panel / Drawer

- `What`: mission, account, consultant, opportunity
- `Template`: entity header + quick facts + tabs + timeline/activity + AI synthesis + related items + sticky actions
- `Depends on`: summary card, metric block, tabs, timeline, insight card
- `Standardize now`: drawer anatomy, summary section, sticky footer, tab rhythm

### Pattern 4: KPI Strip

- `What`: horizontal group of 4 to 6 KPI cards
- `Template`: compact cards with consistent internal rhythm
- `Depends on`: KPI card, comparison line, mini-progress bar/sparkline
- `Standardize now`: spacing, min/max count, internal text scale

### Pattern 5: Mobile Summary / Action Page

- `What`: action center, week planning, staffing match
- `Template`: large title + hero insight + 2-4 action modules + bottom action/nav
- `Depends on`: hero insight card, action module card, bottom nav
- `Standardize now`: mobile hero spacing, CTA sizing, action-card anatomy

### Pattern 6: AI Workspace Block

- `What`: recommendation, synthesis, prioritization module
- `Template`: title + 1 short synthesis + 2-3 recommended actions + optional confidence/source
- `Depends on`: insight card, list item, action button
- `Standardize now`: non-chat AI framing, label conventions, action placement

---

## I. Rules for Future Screen Extension

### New desktop analytical page

- start with shell + page title + filter row
- decide the page's primary analytical object
- add KPI strip only if it clarifies that object
- choose one main work area pattern: chart-first, table-first, or timeline-first
- add secondary rail only if recommendations/alerts materially support the decision flow

### New mobile action page

- define the single insight the page must expose
- define the 1 to 3 actions the user should take next
- build around large title, one hero block, and a small stack of action modules
- never begin from the desktop information architecture

### Add a new KPI card type

- preserve core anatomy: label, value, context
- add at most one extra layer: target, delta, or trend
- if a new KPI needs more than that, it should become a dedicated module

### Add a new table view

- reuse standard toolbar and row anatomy
- decide mandatory frozen business columns first
- map row click to drawer or detail action consistently
- mobile must use an alternate representation

### Add a new drawer

- keep fixed anatomy
- vary content modules, not shell structure
- every drawer should answer:
  - what is this?
  - what matters now?
  - what changed?
  - what can I do next?

### Add a new AI component

- classify it first:
  - synthesis
  - recommendation
  - risk detection
  - preparation
  - generation assist
- choose calm card styling
- make the action explicit
- expose provenance/confidence when useful

### Preserve consistency as product expands

- add domain-specific components only after token and primitive mapping
- avoid one-off colors
- avoid module-specific button styles
- do not let each team create its own drawer/table/card pattern

---

## J. Design Tokens Output

### Color

```text
color.brand.primary
color.brand.primaryDeep
color.brand.brass
color.brand.ember

color.bg.canvas
color.bg.surface
color.bg.surfaceAlt
color.bg.sidebar
color.bg.overlay

color.border.default
color.border.strong
color.border.inverse

color.text.primary
color.text.secondary
color.text.muted
color.text.inverse

color.status.success
color.status.warning
color.status.danger
color.status.info
color.status.neutral

color.data.series.1
color.data.series.2
color.data.series.3
color.data.series.4
color.data.series.5
color.data.series.6
```

### Typography

```text
font.family.body
font.family.heading
font.family.mono

font.size.display.lg
font.size.display.md
font.size.heading.xl
font.size.heading.lg
font.size.heading.md
font.size.heading.sm
font.size.body.lg
font.size.body.md
font.size.body.sm
font.size.label.md
font.size.label.sm
font.size.caption
font.size.kpi.lg
font.size.kpi.md
font.size.kpi.sm

font.weight.regular
font.weight.medium
font.weight.semibold
font.weight.bold

font.line.display.lg
font.line.display.md
font.line.heading.xl
font.line.heading.lg
font.line.heading.md
font.line.body.lg
font.line.body.md
font.line.body.sm
```

### Radius

```text
radius.sm
radius.md
radius.lg
radius.xl
radius.round
```

### Spacing

```text
space.1
space.2
space.3
space.4
space.5
space.6
space.8
space.10
space.12
```

### Border

```text
border.width.default
border.width.strong
border.color.default
border.color.strong
```

### Shadow

```text
shadow.none
shadow.soft
shadow.overlay
```

### Layout

```text
layout.sidebar.width.collapsed
layout.sidebar.width.expanded
layout.content.maxWidth
layout.grid.desktop.columns
layout.grid.desktop.gap
layout.rail.width.default
layout.drawer.width.default
layout.drawer.width.wide
layout.mobile.nav.height
layout.mobile.tapTarget.min
```

### Component aliases

```text
component.button.primary.bg
component.button.primary.text
component.button.secondary.bg
component.button.secondary.border

component.card.bg
component.card.border
component.card.radius

component.input.bg
component.input.border
component.input.text
component.input.placeholder

component.sidebar.bg
component.sidebar.text
component.sidebar.active.bg
component.sidebar.active.text

component.drawer.bg
component.drawer.border
component.drawer.shadow

component.table.row.border
component.table.row.hoverBg
component.table.header.text

component.mobile.actionCard.bg
component.mobile.actionCard.radius
component.mobile.hero.bg
component.mobile.bottomNav.bg
component.mobile.bottomNav.active
```

---

## K. Implementation Priorities

### Phase 1: lock foundations

Implement first:

1. color tokens
2. typography tokens
3. spacing/radius/border/shadow tokens
4. shell layout primitives

This must happen before any screen refactor.

### Phase 2: shell and primitives

Implement:

1. desktop sidebar
2. mobile bottom nav
3. page header
4. buttons
5. inputs
6. badges/tags/status pills
7. card primitive

These are the base layer for every page.

### Phase 3: structural business components

Implement:

1. KPI card
2. insight card
3. alert block
4. table + toolbar + row states
5. drawer
6. tabs/sub-tabs

This is the core system value layer.

### Phase 4: analytical and planning modules

Implement:

1. chart container and chart theme
2. progress bars
3. timeline/planning patterns
4. rail modules for alerts and AI recommendations

### Phase 5: page templates

Implement templates for:

1. desktop cockpit page
2. desktop list + drawer page
3. desktop detail page
4. mobile action center
5. mobile brief/validation page
6. mobile week/action page

### What is already solid

- `Confirmed` brand palette core
- `Confirmed` shell contrast logic
- `Confirmed` heading/body/mono font trio
- `Confirmed` desktop analytical posture
- `Confirmed` mobile action-first posture
- `Confirmed` drawer as a key pattern

### What can wait

- command palette
- advanced data viz variants
- deep dark-theme or multi-theme support
- module-specific specialized card types

### What still depends on future screens

- full form system coverage
- recruitment-specific specialized workflows
- automation builders
- advanced knowledge authoring interfaces
- complex multi-step creation flows

### Foundation primitives before any refactor

1. theme token map
2. app shell
3. button family
4. input family
5. surface card
6. status semantics
7. table foundation
8. drawer foundation
9. mobile action-card pattern

---

## Appendix: Immediate Alignment Decisions

### Decision 1: Brass accent lock

`Recommendation` Consolidate all product accent tokens around the selected brass direction:

- current screens suggest `#C89A2B`
- current code uses `#FFB812` and `#FFC233`

Pick one canonical product accent set before further refactor.

### Decision 2: Sidebar navy token

`Recommendation` Keep the current cobalt-first shell, but introduce explicit sidebar aliases so future pages do not couple shell styling directly to raw brand tokens.

### Decision 3: Mobile-specific primitives

`Confirmed` Mobile cannot be implemented as responsive collapse only.  
`Recommendation` Create dedicated mobile primitives:

- mobile hero insight
- mobile action card
- mobile decision footer
- mobile compact entity summary

These should be considered first-class primitives, not exceptions.
