

# Family Branches Sidebar

## Overview
Add a collapsible sidebar panel that lists all "branches" in the family tree -- where a branch is defined as a couple (or single parent) who have children together. Clicking a branch navigates the tree to that couple's position and optionally opens the primary person's profile.

## How Branches Are Identified
A branch is extracted from the existing `relationships` data:
1. Find all spouse pairs (from `relationship_type === "spouse"`)
2. For each spouse pair, check if they share children (both are parents of the same child)
3. Also include single parents who have children but no spouse
4. Each branch displays: couple names (or single parent name), number of children, and optionally a small photo/avatar for each partner

## UI Design

**Sidebar Panel (left side)**
- A toggle button in the toolbar (using a `GitBranch` or `Network` icon) opens/closes the sidebar
- The sidebar slides in from the left over the tree canvas, with a semi-transparent backdrop on mobile
- On desktop: a 280px-wide panel alongside the tree (using flex layout, no overlay)
- On mobile: a Sheet/drawer from the left side

**Branch List Item**
- Two small avatars side-by-side (or one for single parents) with initials/photo
- Couple names: "John & Jane Smith"
- Subtitle: "3 children" with birth year range
- Clicking the item calls `treeRef.current.focusPerson()` on the primary (blood-relative) person of that couple

**Empty State**
- If no branches exist yet, show a muted message: "No family branches yet"

## Technical Details

### File Changes

**`src/pages/FamilyTree.tsx`**
- Add state: `branchesOpen` (boolean)
- Add a `useMemo` hook to compute branches from `relationships` and `persons`:
  - Iterate spouse relationships, find shared children, create branch entries
  - Find single parents (have children but no spouse relationship), create branch entries
  - Sort branches by the primary person's birth date (oldest first)
- Add a toolbar button (GitBranch icon) to toggle `branchesOpen`
- Wrap the tree area in a flex container; when `branchesOpen` is true on desktop, render the sidebar alongside the tree
- On mobile, use the shadcn `Sheet` component (side="left") instead

**`src/components/BranchList.tsx`** (new file)
- Receives: branches array, `onSelectBranch` callback
- Each branch item renders:
  - Two `Avatar` components (with photo or initials fallback) in a slightly overlapping layout
  - Couple label: "{Person1 first name} & {Person2 first name} {shared last name}"
  - Children count as muted subtitle
  - Hover effect and click handler
- Uses `ScrollArea` for overflow
- Includes a header with title "Family Branches" and a close button

### Branch Data Structure
```text
interface Branch {
  id: string
  persons: [Tables<"persons">, Tables<"persons">?]  // couple or single
  childCount: number
  primaryPersonId: string  // the blood-relative to focus on
}
```

### Navigation Flow
1. User clicks a branch item
2. On mobile: the Sheet closes
3. `treeRef.current.focusPerson(branch.primaryPersonId)` is called
4. Tree zooms to that couple's position with the existing 600ms animation

No database changes or new dependencies required.

