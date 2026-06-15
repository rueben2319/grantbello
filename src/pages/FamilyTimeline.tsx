import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TreePine, Calendar, Plus } from "lucide-react";
import { useFamily, useFamilyPersons, useUserFamilyRole } from "@/hooks/useFamily";
import { useFamilyEvents, type EventType } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import { EventDialog } from "@/components/timeline/EventDialog";
import { EventTypeBadge, eventTypeMeta } from "@/components/timeline/EventTypeBadge";
import { cn } from "@/lib/utils";

const ALL_TYPES: EventType[] = ["wedding", "funeral", "meeting", "birth", "graduation", "reunion", "other"];

export default function FamilyTimeline() {
  const { familyId } = useParams<{ familyId: string }>();
  const { user } = useAuth();
  const { data: family, isLoading: loadingFamily } = useFamily(familyId);
  const { data: persons = [] } = useFamilyPersons(familyId);
  const { data: events = [], isLoading: loadingEvents } = useFamilyEvents(familyId);
  const { data: userRole } = useUserFamilyRole(familyId);

  const canEdit = userRole === "admin" || userRole === "editor";
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set());
  const [sortNewest, setSortNewest] = useState(true);

  const visibleTypes = useMemo(() => {
    const present = new Set<EventType>();
    events.forEach((e) => present.add(e.event_type as EventType));
    return ALL_TYPES.filter((t) => present.has(t));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (activeTypes.size > 0) {
      list = list.filter((e) => activeTypes.has(e.event_type as EventType));
    }
    return [...list].sort((a, b) =>
      sortNewest
        ? b.event_date.localeCompare(a.event_date)
        : a.event_date.localeCompare(b.event_date)
    );
  }, [events, activeTypes, sortNewest]);

  const toggleType = (t: EventType) => {
    const next = new Set(activeTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setActiveTypes(next);
  };

  if (loadingFamily) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center">
          <TreePine className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h2 className="font-display text-xl">Family not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/family/${familyId}`}
                className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to tree
              </Link>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{family.name} — Timeline</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {events.length} {events.length === 1 ? "event" : "events"} in the family's story
              </p>
            </div>
            {canEdit && (
              <EventDialog
                familyId={family.id}
                persons={persons}
                trigger={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add event</Button>}
              />
            )}
          </div>

          {/* Filters */}
          {visibleTypes.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Filter:</span>
              {visibleTypes.map((t) => {
                const meta = eventTypeMeta(t);
                const active = activeTypes.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      active ? meta.classes : "bg-background text-muted-foreground hover:bg-accent/30"
                    )}
                  >
                    <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
                  </button>
                );
              })}
              {activeTypes.size > 0 && (
                <button
                  onClick={() => setActiveTypes(new Set())}
                  className="ml-1 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={() => setSortNewest((s) => !s)}>
                  {sortNewest ? "Newest first" : "Oldest first"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {loadingEvents ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Calendar className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <h3 className="font-display text-lg">No events yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {canEdit
                ? "Start documenting your family's story by adding the first event."
                : "Check back soon — the timeline will appear here as events are added."}
            </p>
            {canEdit && (
              <div className="mt-4">
                <EventDialog
                  familyId={family.id}
                  persons={persons}
                  trigger={<Button><Plus className="mr-1 h-4 w-4" /> Add first event</Button>}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative space-y-5 md:pl-10">
            {/* spine */}
            <span className="absolute left-3 top-2 bottom-2 hidden w-px bg-border md:block" aria-hidden />
            {filteredEvents.map((ev) => (
              <TimelineEventCard
                key={ev.id}
                event={ev}
                persons={persons}
                familyId={family.id}
                canEdit={canEdit}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
