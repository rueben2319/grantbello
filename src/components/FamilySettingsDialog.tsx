import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useUpdateFamily } from "@/hooks/useFamily";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface FamilySettingsDialogProps {
  family: Tables<"families">;
}

export function FamilySettingsDialog({ family }: FamilySettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.name);
  const [description, setDescription] = useState(family.description || "");
  const [isPublic, setIsPublic] = useState(family.is_public);
  const updateFamily = useUpdateFamily();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateFamily.mutateAsync({ id: family.id, name, description, is_public: isPublic });
      toast.success("Family settings updated!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Family Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Family Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button type="submit" className="w-full" disabled={updateFamily.isPending}>
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
