# Sub-Trees & Approval Workflow

Turn the Dashboard into a hub of **sub-trees** (couples with descendants), each with its own mini D3 preview and an optional sub-admin whose edits require super-admin approval.

## 1. Data model

New tables:

- `sub_trees` — one row per official sub-tree of a family.
  - `family_id`, `root_person_a_id`, `root_person_b_id` (nullable for singles), `label`, `admin_user_id` (nullable), `created_by`.
- `pending_changes` — proposals from sub-admins.
  - `family_id`, `sub_tree_id`, `submitted_by`, `action` (`add_person` / `update_person` / `delete_person` / `add_relationship` / `delete_relationship`), `target_id` (nullable), `payload` (jsonb), `status` (`pending` / `approved` / `rejected`), `reviewed_by`, `reviewed_at`, `review_note`.

Helper: `is_sub_tree_admin(_user_id, _sub_tree_id)` security-definer function.

RLS:
- `sub_trees`: family members read, family admins insert/update/delete.
- `pending_changes`: submitter reads own; family admins read all + update status; sub-tree admin inserts scoped to their sub-tree.

## 2. Auto-suggest + confirm sub-trees

- New "Suggested sub-trees" section on the family tree page (admin only). Client-side scans persons/relationships for couples (and singles) with ≥1 child, filters out already-confirmed roots, and shows a list with **Confirm as sub-tree** button.
- Confirming inserts a `sub_trees` row. Super admin can also assign a sub-tree admin from existing family members (`family_roles` viewer/editor).

## 3. Dashboard mini-trees

- Rewrite `Dashboard.tsx`: for each family, load `sub_trees` + their descendant subsets and render one card per sub-tree.
- Card shows: couple names, sub-admin badge, and a **mini D3 preview** (compact non-interactive rendering derived from `TreeVisualization` layout — new `MiniTreePreview.tsx` component that reuses the layout math but strips zoom/pan and shrinks nodes).
- Click card → navigate to `/family/:familyId?focus=<subTreeId>` (existing tree focuses on the root).

## 4. Sub-admin edit flow (approval-gated)

- `AddPersonDialog`, `EditPersonDialog`, delete actions: check `is_family_admin`. If user is only a sub-tree admin, submit to `pending_changes` instead of writing directly; show toast "Sent for approval".
- Guard on the DB with RLS so sub-admins cannot write to `persons` / `relationships` directly.

## 5. Approval Inbox

- New page `/family/:familyId/approvals` (super admin only), linked from tree page header.
- Lists pending changes with human-readable diff (before/after for updates, full payload for adds/deletes) and **Approve** / **Reject** buttons.
- Approve → applies the payload via a Postgres function `apply_pending_change(_id)` (SECURITY DEFINER) and marks approved. Reject → status=rejected with optional note.
- Badge with pending count on the tree-page header.

## 6. Files

Migration:
- new `supabase/migrations/<ts>_sub_trees_and_approvals.sql` — enums, tables, GRANTs, RLS, helpers, `apply_pending_change` function.

New components / pages:
- `src/components/MiniTreePreview.tsx`
- `src/components/SubTreeCard.tsx`
- `src/components/SuggestedSubTrees.tsx`
- `src/components/AssignSubAdminDialog.tsx`
- `src/pages/Approvals.tsx`
- `src/hooks/useSubTrees.ts`, `src/hooks/usePendingChanges.ts`

Edited:
- `src/pages/Dashboard.tsx` — sub-tree cards grouped per family.
- `src/pages/FamilyTree.tsx` — "Suggested sub-trees" panel + Approvals link + pending badge.
- `src/components/AddPersonDialog.tsx`, `EditPersonDialog.tsx`, delete call sites — approval-gated writes for sub-admins.
- `src/App.tsx` — `/family/:familyId/approvals` route.
- `src/integrations/supabase/types.ts` — regenerated.

## Out of scope

- Notifications/email on approvals.
- Nested sub-trees (a sub-tree inside another sub-tree).
- Historical audit beyond `pending_changes` rows.
- Editing timeline events through approval flow (persons/relationships only for now).
