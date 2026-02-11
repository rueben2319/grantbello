

# Modern Profile Card Redesign

## Overview
Redesign the PersonProfileCard from its current plain dialog layout into a visually striking, modern card with a hero-style header, better visual hierarchy, and polished details.

## Design Concept

**Header Section (Hero Banner)**
- A colored gradient banner at the top based on gender (blue for male, pink for female, teal for other) that spans the full width of the dialog
- Large centered avatar overlapping the banner edge
- Full name displayed prominently below the avatar in Space Grotesk
- Gender badge and life dates (born/died) displayed as subtle pill indicators beneath the name
- Edit and delete action buttons positioned as icon buttons in the top-right corner of the banner

**Bio Section**
- Clean card-style section with a subtle background and an italic quote-style presentation
- Only shown if a bio exists and user is authenticated

**Relationships Section**
- Three distinct sections (Parents, Spouse(s), Children) displayed as mini profile chips rather than plain badges
- Each chip shows initials in a small colored circle + full name
- Clickable chips with hover animation to navigate to that person's node
- Section headers use icons (Users for parents, Heart for spouse, Baby for children) alongside text labels
- If a section has no data, it's hidden entirely

**Footer**
- Subtle "married into family" indicator if applicable
- Muted timestamp showing when the record was last updated

## Technical Details

### File Changes

**`src/components/PersonProfileCard.tsx`** -- Full rewrite of the JSX layout:
- Import additional Lucide icons: `Users`, `Heart`, `Baby`, `Calendar`, `ChevronRight`
- Import `Separator` component for visual dividers
- Restructure the dialog content with:
  - Remove default `DialogHeader`; use a custom gradient banner `div` with `rounded-t-lg` and gender-based gradient classes
  - Avatar centered with negative margin to overlap the banner
  - Name + metadata centered below avatar
  - Bio in a rounded muted-background container
  - Relationship sections as clickable row items with icon, name, and chevron
- Keep all existing logic (delete, edit, navigate) intact -- only the presentation layer changes
- Mobile-friendly: the dialog remains scrollable with `max-h-[90vh]`

No new files, no database changes, no new dependencies needed. Uses existing Tailwind classes, Lucide icons, and shadcn/ui components already in the project.

