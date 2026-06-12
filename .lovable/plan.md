# Codebase Audit — Fix Plan

The audit surfaced 26 issues across bugs, data integrity, type safety, a11y, and dead code. Below is a prioritized plan grouped by impact. P1/P2 are recommended; P3/P4/P5 are optional cleanups you can confirm or skip.

## P1 — Critical fixes

1. **AuthContext race & stale profile** (`src/contexts/AuthContext.tsx`)
   - Remove the redundant `getSession()` initialization path; rely on `onAuthStateChange` (which fires immediately with the current session).
   - Keep the `setTimeout(…, 0)` deferral for `fetchProfile` to avoid the Supabase deadlock, but split into: listener sets `user`/`session`/`loading`, and a separate `useEffect([user])` fetches the profile. This eliminates the “user set, profile null” flicker.

2. **Profile page input never syncs** (`src/pages/Profile.tsx`)
   - Add `useEffect(() => setDisplayName(profile?.display_name ?? ""), [profile])` so the input populates once the profile loads.

3. **MemberManagement invite form is a stub** (`src/components/MemberManagement.tsx`)
   - Since there is no working invite backend, remove the misleading invite form, the unused `inviteEmail` / `inviteRole` / `inviting` state, and the “invite” toast. Keep role management (promote/demote/remove) which actually works.
   - (If you want a real invite flow instead, say so and I’ll plan that as a separate feature.)

4. **Trigger crash if `created_by` is NULL** (migration)
   - Add a new migration that updates `public.handle_new_family()` to no-op when `NEW.created_by IS NULL`, preventing a NOT NULL violation on `family_roles.user_id`.

## P2 — Error handling & data integrity

5. **Surface Supabase errors in hooks** (`src/hooks/useFamily.ts`)
   - In every query hook (`useFamily`, `useFamilyPersons`, `useFamilyRelationships`, `useFamilyMembers`, `useUserFamilyRole`, `usePublicFamilies`, `useMyFamilies`), destructure `{ data, error }` and `throw error` so React Query can flag failures instead of silently returning empty.

6. **Cycle guard in generation computation** (`src/pages/FamilyTree.tsx`)
   - Add a `visiting` Set passed through `getGeneration`; if a node is revisited, return its current depth instead of recursing (prevents stack overflow on cyclic relationship data).

7. **Photo upload extension fallback** (`src/components/PhotoUpload.tsx`)
   - Derive extension safely: `const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.split("/")[1] ?? "jpg")`.

8. **Unique constraint on relationships** (new migration)
   - `CREATE UNIQUE INDEX IF NOT EXISTS relationships_unique ON public.relationships (person_id, related_person_id, relationship_type);` to prevent duplicate edges.

9. **Invalidate persons cache on relationship delete** (`src/hooks/useFamily.ts`)
   - `useDeleteRelationship` `onSuccess` should also invalidate `["family-persons", familyId]` so open cards refresh.

## P3 — Type safety

10. **Replace `catch (err: any)`** across `AddPersonDialog`, `EditPersonDialog`, `CreateFamilyDialog`, `FamilySettingsDialog`, `MemberManagement`, `PhotoUpload`
    - Use a small helper `getErrorMessage(err: unknown): string` (in `src/lib/utils.ts`) that handles `Error`, Supabase `PostgrestError`, and falls back to `String(err)`.

11. **Type the member row in MemberManagement** (`src/components/MemberManagement.tsx`)
    - Replace `m: any` with a proper type from `Tables<"family_roles"> & { profiles: Tables<"profiles"> | null }`.

12. **EditPersonDialog `type: v as any`**
    - Cast to the relationship type union (`"parent" | "child" | "spouse"`).

13. **Misc**: dedupe the double import in `AddPersonDialog`, add `useEffect([family])` reset in `FamilySettingsDialog`.

## P4 — Accessibility

14. Add `aria-label` to all icon-only buttons:
    - `FamilyTree.tsx` toolbar (Search, Branches, Settings, Members)
    - `BranchList.tsx` close button
    - `PhotoUpload.tsx` remove button
    - `PersonProfileCard.tsx` relationship chips

15. **Auth.tsx**: only enforce `minLength={6}` on the sign-up form, not sign-in.

## P5 — Dead code cleanup

16. Delete unused `src/components/NavLink.tsx`.
17. Consolidate the duplicated `src/hooks/use-toast.ts` / `src/components/ui/use-toast.ts` (keep the ui version, re-export from hooks for compatibility).
18. Leave `src/test/example.test.ts` alone (harmless placeholder) unless you want it removed.

## What I will NOT change

- The tree visualization, branch logic, dark mode, or any feature behavior beyond the bug fixes above.
- Database schema beyond the two small migrations in items 4 and 8.
- Auth flow logic (only the initialization race and Profile sync).

## Confirmation needed

- **Item 3**: remove the invite UI entirely, or do you want a real email-invite flow implemented instead?
- **Items P4 / P5**: include them in this pass, or defer?

Reply with what to include and I’ll implement.
