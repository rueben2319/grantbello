import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";
import { useAddEventPhoto, useDeleteEventPhoto } from "@/hooks/useEvents";

interface Props {
  eventId: string;
  familyId: string;
  photos: Tables<"event_photos">[];
}

export function EventPhotoUploader({ eventId, familyId, photos }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const addPhoto = useAddEventPhoto();
  const deletePhoto = useDeleteEventPhoto();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB`);
          continue;
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `events/${familyId}/${eventId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("photos").getPublicUrl(path);
        await addPhoto.mutateAsync({ event_id: eventId, photo_url: data.publicUrl });
      }
      toast.success("Photos uploaded");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Photos ({photos.length})</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading</> : <><Camera className="mr-1 h-3 w-3" /> Add photos</>}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square overflow-hidden rounded-md border">
              <img src={p.photo_url} alt={p.caption || "Event photo"} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => deletePhoto.mutate({ id: p.id, familyId })}
                className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
