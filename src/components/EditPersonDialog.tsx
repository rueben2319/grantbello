import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdatePerson } from "@/hooks/useFamily";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type GenderType = Database["public"]["Enums"]["gender_type"];

interface EditPersonDialogProps {
  person: Tables<"persons">;
  open: boolean;
  onClose: () => void;
}

export function EditPersonDialog({ person, open, onClose }: EditPersonDialogProps) {
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name || "");
  const [gender, setGender] = useState<GenderType>(person.gender || "other");
  const [birthDate, setBirthDate] = useState(person.birth_date || "");
  const [deathDate, setDeathDate] = useState(person.death_date || "");
  const [bio, setBio] = useState(person.bio || "");
  const [isPrivate, setIsPrivate] = useState(person.is_private);

  const updatePerson = useUpdatePerson();

  useEffect(() => {
    setFirstName(person.first_name);
    setLastName(person.last_name || "");
    setGender(person.gender || "other");
    setBirthDate(person.birth_date || "");
    setDeathDate(person.death_date || "");
    setBio(person.bio || "");
    setIsPrivate(person.is_private);
  }, [person]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePerson.mutateAsync({
        id: person.id,
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        bio,
        is_private: isPrivate,
      });
      toast.success("Person updated!");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as GenderType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Birth Date</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Death Date</Label>
              <Input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short biography..." />
          </div>
          <div className="flex items-center justify-between">
            <Label>Private (hidden from public view)</Label>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <Button type="submit" className="w-full" disabled={updatePerson.isPending}>
            {updatePerson.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
