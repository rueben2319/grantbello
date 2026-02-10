import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  familyId: string;
}

export function PhotoUpload({ currentUrl, onUploaded, onRemoved, familyId }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${familyId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      setPreview(urlData.publicUrl);
      onUploaded(urlData.publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemoved?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>Photo</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Person" className="h-16 w-16 rounded-full object-cover border-2 border-border" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
            <Camera className="h-5 w-5" />
          </div>
        )}
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading...</> : "Upload Photo"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}
