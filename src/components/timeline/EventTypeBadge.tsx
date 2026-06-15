import { Heart, Flower2, Users, Baby, GraduationCap, PartyPopper, Calendar } from "lucide-react";
import type { EventType } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";

const META: Record<EventType, { label: string; Icon: typeof Calendar; classes: string }> = {
  wedding:    { label: "Wedding",    Icon: Heart,         classes: "bg-primary/15 text-primary border-primary/30" },
  funeral:    { label: "Funeral",    Icon: Flower2,       classes: "bg-muted text-muted-foreground border-border" },
  meeting:    { label: "Meeting",    Icon: Users,         classes: "bg-accent/15 text-accent border-accent/30" },
  birth:      { label: "Birth",      Icon: Baby,          classes: "bg-primary/15 text-primary border-primary/30" },
  graduation: { label: "Graduation", Icon: GraduationCap, classes: "bg-accent/15 text-accent border-accent/30" },
  reunion:    { label: "Reunion",    Icon: PartyPopper,   classes: "bg-primary/15 text-primary border-primary/30" },
  other:      { label: "Event",      Icon: Calendar,      classes: "bg-secondary text-secondary-foreground border-border" },
};

export function eventTypeMeta(type: EventType) {
  return META[type] ?? META.other;
}

export function EventTypeBadge({ type, className }: { type: EventType; className?: string }) {
  const { label, Icon, classes } = eventTypeMeta(type);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", classes, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
