import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateFamily } from "@/hooks/useFamily";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function CreateFamilyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const createFamily = useCreateFamily();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const family = await createFamily.mutateAsync({ name, description, is_public: isPublic });
      toast.success("Family tree created!");
      setOpen(false);
      setName("");
      setDescription("");
      setIsPublic(false);
      navigate(`/family/${family.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" /> New Family Tree
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Create a Family Tree</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">Family Name</Label>
            <Input id="familyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Smiths" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="familyDesc">Description</Label>
            <Textarea id="familyDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of this family..." />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isPublic">Make Public</Label>
            <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button type="submit" className="w-full" disabled={createFamily.isPending}>
            {createFamily.isPending ? "Creating..." : "Create Family Tree"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
