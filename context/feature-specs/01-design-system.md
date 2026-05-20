Read `AGENTS.md` before starting.

We are establishing the shared design system foundations for the Field Project Management System.

This application is a bilingual operational management platform used daily by project managers and center managers for planning, scheduling, execution tracking, approvals, and reporting.

The UI must feel:

- professional
- operational
- data-oriented
- clean
- scalable
- enterprise-ready

Avoid marketing-style visuals entirely.

## Install and Configure

Install and configure `shadcn/ui`.

Add these shadcn components:

- Button
- Card
- Dialog
- Input
- Label
- Select
- Tabs
- Textarea
- ScrollArea
- DropdownMenu
- Sheet
- Badge
- Table
- Tooltip
- Calendar
- Popover
- Checkbox
- Separator
- AlertDialog
- Skeleton
- Avatar
- Command

Install:

- lucide-react
- next-themes
- class-variance-authority
- tailwind-merge
- clsx

## Utilities

Create:

- `lib/utils.ts`

Add reusable `cn()` helper using:

- clsx
- tailwind-merge

## Theme System

Support:

- dark mode
- light mode

Theme switching must use:

- `next-themes`

Use CSS variables only.

Do not hardcode colors anywhere in app components.

## Global Design Tokens

Define semantic tokens in `globals.css` for:

### Surfaces

- background
- foreground
- card
- elevated surface
- muted surface

### Borders

- default border
- subtle border
- strong border

### Text

- primary text
- secondary text
- muted text
- disabled text

### Brand

- primary accent
- secondary accent

### Status Colors

Create semantic status tokens for:

- pending
- in-progress
- completed
- delayed
- approved
- rejected
- warning
- info

These tokens will later power:

- timelines
- gantt states
- approval states
- reports
- analytics

## Typography

The app supports:

- Arabic
- English

Configure proper font loading using `next/font`.

Requirements:

- Arabic typography must render cleanly
- English typography must remain compact and readable
- line heights must work in both RTL and LTR

Prepare font variables globally.

## RTL Support

RTL support is required globally.

Requirements:

- layout direction switching
- spacing compatibility
- sidebar compatibility
- dropdown alignment compatibility
- table rendering compatibility

Do not implement translations yet.

Only prepare the design system and layout foundations.

## Layout Standards

Prepare reusable spacing and sizing conventions for:

- dashboard cards
- data tables
- dialogs
- sidebars
- forms
- timeline containers

The application is data-dense.

Prioritize:

- readability
- hierarchy
- spacing consistency

Avoid oversized padding and oversized typography.

## Accessibility

Ensure:

- keyboard focus visibility
- proper contrast ratios
- semantic HTML usage
- accessible dialog behavior

## Constraints

Do not:

- modify generated `components/ui/*`
- introduce custom component libraries
- use hardcoded hex colors in components
- use inline styles for theming

## Check When Done

- all shadcn components import correctly
- dark/light theme switching works
- RTL works globally
- no hardcoded colors exist in app components
- `cn()` helper works correctly
- `npm run build` passes