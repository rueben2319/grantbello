import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EventTypeBadge } from "./EventTypeBadge";
import { EventDialog } from "./EventDialog";
import type { Tables } from "@/integrations/supabase/types";
import type { EventType, TimelineEvent } from "@/hooks/useEvents";
import { useDeleteEvent } from "@/hooks/useEvents";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";

interface Props {
  event: TimelineEvent;
  persons: Tables<"persons">[];
  familyId: string;
  canEdit: boolean;
  isAuthenticated: boolean;
}

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return d;
  }
}

export function TimelineEventCard({ event, persons, familyId, canEdit, isAuthenticated }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const deleteEvent = useDeleteEvent();

  // event type meta handled inside EventTypeBadge
  const attendees = persons.filter((p) => event.attendees.some((a) => a.person_id === p.id));
  const year = event.event_date.slice(0, 4);

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync({ id: event.id, familyId });
      toast.success("Event deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <article className="relative rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <EventTypeBadge type={event.event_type as EventType} />
              <span className="text-xs text-muted-foreground">{isAuthenticated ? formatDate(event.event_date) : year}</span>
            </div>
            <h3 className="font-display text-lg font-semibold leading-tight">{event.title}</h3>
            {isAuthenticated && event.location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {event.location}
              </p>
            )}
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit event">
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete event">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove "{event.title}" and its photos. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {isAuthenticated && event.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{event.description}</p>
        )}

        {isAuthenticated && event.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {event.photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightbox(p.photo_url)}
                className="aspect-square overflow-hidden rounded-md border bg-muted"
              >
                <img src={p.photo_url} alt={p.caption ?? "Event photo"} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {isAuthenticated && attendees.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {attendees.length} attending
            </p>
            <div className="flex flex-wrap gap-1.5">
              {attendees.map((p) => (
                <Link
                  key={p.id}
                  to={`/family/${familyId}?focus=${p.id}`}
                  title={`View ${p.first_name} ${p.last_name ?? ""}'s profile`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 hover:border-accent/60"
                >
                  <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-[10px] font-bold ring-1 ring-accent/30">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      p.first_name.charAt(0)
                    )}
                  </span>
                  <span className="max-w-[10rem] truncate">
                    {p.first_name} {p.last_name ?? ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Sign in to see details, photos, and attendees.
          </p>
        )}
      </div>

      <EventDialog familyId={familyId} persons={persons} event={event} open={editOpen} onOpenChange={setEditOpen} />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </article>
  );
}
