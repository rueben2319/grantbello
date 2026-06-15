import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";
import { AttendeePicker } from "./AttendeePicker";
import { EventPhotoUploader } from "./EventPhotoUploader";
import { useCreateEvent, useUpdateEvent, type EventType, type TimelineEvent } from "@/hooks/useEvents";

const EVENT_TYPES: EventType[] = ["wedding", "funeral", "meeting", "birth", "graduation", "reunion", "other"];

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  event_type: z.enum(["wedding", "funeral", "meeting", "birth", "graduation", "reunion", "other"]),
  event_date: z.string().min(1, "Date required"),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

interface Props {
  familyId: string;
  persons: Tables<"persons">[];
  event?: TimelineEvent;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EventDialog({ familyId, persons, event, trigger, open: openProp, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("other");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const isEditing = !!event;

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setEventType((event?.event_type as EventType) ?? "other");
      setEventDate(event?.event_date ?? "");
      setLocation(event?.location ?? "");
      setDescription(event?.description ?? "");
      setAttendeeIds(event?.attendees?.map((a) => a.person_id) ?? []);
    }
  }, [open, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, event_type: eventType, event_date: eventDate, location, description });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    try {
      if (isEditing && event) {
        await updateEvent.mutateAsync({
          id: event.id,
          title: parsed.data.title,
          event_type: parsed.data.event_type,
          event_date: parsed.data.event_date,
          location: parsed.data.location || null,
          description: parsed.data.description || null,
          attendee_ids: attendeeIds,
        });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync({
          family_id: familyId,
          title: parsed.data.title,
          event_type: parsed.data.event_type,
          event_date: parsed.data.event_date,
          location: parsed.data.location || null,
          description: parsed.data.description || null,
          attendee_ids: attendeeIds,
        });
        toast.success("Event created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitting = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !openProp && (
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add event</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit event" : "Add event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Attendees ({attendeeIds.length})</Label>
            <AttendeePicker persons={persons} selectedIds={attendeeIds} onChange={setAttendeeIds} />
          </div>
          {isEditing && event && (
            <div className="border-t pt-4">
              <EventPhotoUploader eventId={event.id} familyId={familyId} photos={event.photos} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
