# Family Timeline Feature

A new chronological timeline page showing major family events (weddings, funerals, meetings, births, graduations, reunions, other) with photos, attendees linked to the tree, date, and location.

## User-facing scope

- New route `/family/:familyId/timeline` with a link from the family tree page header.
- Vertical timeline ordered by event date (newest or oldest first, toggleable).
- Each event card shows: event type icon, title, date, location, short description, photo gallery, and attendee avatars (clickable → jump back to that person on the tree).
- Filters at top: event type (multi-select chip filter) and year range.
- Admins & editors see "Add event", "Edit", and "Delete" controls. Viewers and public visitors only read.
- Hybrid privacy: public visitors see event titles, types, and the year only. Full dates, location, descriptions, photos, and attendee list require login (matches existing privacy model).

## Data model

New tables in `public`:

- `events`
  - `family_id` (fk families, cascade)
  - `title`
  - `event_type` (enum: wedding, funeral, meeting, birth, graduation, reunion, other)
  - `event_date` (date)
  - `location` (text, optional)
  - `description` (text, optional)
  - `created_by` (uuid)

- `event_attendees`
  - `event_id` (fk events, cascade)
  - `person_id` (fk persons, cascade)
  - unique(event_id, person_id)

- `event_photos`
  - `event_id` (fk events, cascade)
  - `photo_url`
  - `caption` (optional)
  - `sort_order` (int)

Reuse existing `photos` storage bucket under prefix `events/{family_id}/{event_id}/`.

## Access rules (RLS)

- Read events / attendees / photos: anyone (public) for families where `is_public=true`, plus family members. Sensitive fields are masked client-side based on auth state per the hybrid privacy memory.
- Insert / update / delete events, attendees, photos: only admins & editors of that family (`is_family_editor_or_admin`).
- Standard GRANTs: `SELECT` to `anon` and `authenticated`; full CRUD to `authenticated`; `ALL` to `service_role`.

## Code structure

- `src/hooks/useEvents.ts` — `useFamilyEvents`, `useEvent`, `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`, `useEventAttendees`, `useEventPhotos`, mutations for attendees/photos.
- `src/pages/FamilyTimeline.tsx` — page shell: header, filters, timeline list, empty state, skeleton loaders.
- `src/components/timeline/TimelineEventCard.tsx` — single event card with privacy-aware rendering.
- `src/components/timeline/EventDialog.tsx` — create/edit dialog (zod validation: title 1–120, location ≤200, description ≤2000, date required, at least 0 attendees, type required).
- `src/components/timeline/AttendeePicker.tsx` — multi-select from family persons with search and avatar chips.
- `src/components/timeline/EventPhotoUploader.tsx` — reuses existing `PhotoUpload` patterns for multi-photo upload to the `photos` bucket.
- `src/components/timeline/EventTypeBadge.tsx` — icon + color per event type using semantic tokens.
- Add route in `src/App.tsx`; add a "Timeline" button on `FamilyTree.tsx` header.
- Clicking an attendee navigates to `/family/:id?focus=:personId` and the tree centers on that person (extend existing focus param handling if missing).

## Visual style

- Vertical spine with alternating left/right cards on desktop, single column on mobile.
- Event type colors derived from existing orange/teal palette via new semantic tokens (`--event-wedding`, `--event-funeral`, etc.) added to `index.css` and `tailwind.config.ts`.
- Space Grotesk for event titles, Inter for body. Photo gallery uses an aspect-ratio grid with lightbox on click.

## Out of scope (can follow later)

- Comments / reactions on events.
- Recurring events.
- Calendar/month view.
- Video attachments.
- Notifications when a new event is added.

Confirm and I'll build it.
