
## Overview
Extend the Add/Edit Person forms with four enhancements. Requires schema additions on `persons` plus UI work in `AddPersonDialog` and `EditPersonDialog`.

## 1. Schema changes (single migration)
Add to `public.persons`:
- `prefix text` — e.g. Mr., Mrs., Dr., Rev.
- `suffix text` — e.g. Jr., Sr., III, PhD
- `birthplace text`
- `residence text`
- `is_living boolean not null default true`
- `twin_group_id uuid` — shared id across siblings born together; nullable

No new tables, no policy changes (existing person policies cover new columns). Backfill: any existing row with a `death_date` gets `is_living = false`.

## 2. Location autocomplete (free provider)
New reusable component `src/components/LocationCombobox.tsx`:
- Wraps `Popover` + `Command` (same pattern as `PersonCombobox`).
- On input (debounced 300ms, min 2 chars), calls OpenStreetMap Nominatim:
  `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=<query>`
- Sends required `User-Agent`/`Referer`-style identification via a descriptive `Accept-Language` header; requests are client-side.
- Normalizes each hit to `"City, State, Country"` using `address.city || town || village || municipality`, `address.state`, `address.country`. Falls back gracefully when fields are missing.
- Stores the formatted string (plain text) on the person — no coordinates persisted.
- Used for **Birthplace** and **Current residence** fields in both dialogs.

Note on Nominatim: free, no API key, but has a 1 req/sec fair-use limit. Debounce + abort in-flight requests to stay well under it. If the user later wants Google Places quality, we can swap the provider without changing the field API.

## 3. Living status toggle
- Add a `Switch` labeled "Is this person living?" (default on).
- When ON: hide the Death Date input entirely and clear its value.
- When OFF: reveal Death Date (optional).
- On save: persist `is_living`; if living, force `death_date = null`.
- Applies to both Add and Edit dialogs. In Edit, initial state derives from `is_living` (fallback: `!death_date`).

## 4. Twin / multiple-birth linking
- Add a "Twin / multiple-birth of…" `PersonCombobox` in both dialogs (filtered to existing family members; in Edit, excludes self).
- On save:
  - If a sibling is picked and that sibling already has `twin_group_id`, reuse it.
  - Otherwise generate a new uuid, set it on both the sibling and this person.
  - Clearing the picker in Edit sets this person's `twin_group_id` to null (does not touch others).
- Display: on the person's card / edit dialog, show a small "Twin of X, Y" chip listing other members of the same `twin_group_id` in the family. (Full tree-visualization changes are out of scope for this plan.)

## 5. Prefix & Suffix dropdowns
Fixed `Select` lists in both dialogs, above/below the name row:
- **Prefix**: —, Mr., Mrs., Ms., Miss, Dr., Rev., Fr., Hon., Prof.
- **Suffix**: —, Jr., Sr., II, III, IV, PhD, MD, Esq.

Update the display-name helper (`fullName`) used by `PersonCombobox` and cards to render as `Prefix First Middle Last, Suffix` when present.

## Files touched
- `supabase/migrations/<new>.sql` — schema + backfill
- `src/components/LocationCombobox.tsx` — new
- `src/components/AddPersonDialog.tsx` — new fields + logic
- `src/components/EditPersonDialog.tsx` — new fields + logic
- `src/components/PersonCombobox.tsx` — include prefix/suffix in display
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

## Out of scope
- Rendering twin links visually in the D3 tree (can be a follow-up).
- Migrating the free geocoder to Google Maps (easy swap later).
- Editing timeline event locations (this plan targets persons only; say the word to extend it to events).
