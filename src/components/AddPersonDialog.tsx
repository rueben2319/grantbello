import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useCreatePerson, useCreateRelationship } from "@/hooks/useFamily";
import { UserPlus, Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type GenderType = Database["public"]["Enums"]["gender_type"];
type RelKind = "parent" | "child" | "spouse";

interface RelationshipEntry {
  personId: string;
  type: RelKind;
}

interface AddPersonDialogProps {
  familyId: string;
  existingPersons: Tables<"persons">[];
  onAdded?: () => void;
}

export function AddPersonDialog({ familyId, existingPersons, onAdded }: AddPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<GenderType>("other");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [marriedIn, setMarriedIn] = useState(false);

  const createPerson = useCreatePerson();
  const createRelationship = useCreateRelationship();

  const reset = () => {
    setFirstName(""); setMiddleName(""); setLastName(""); setGender("other");
    setBirthDate(""); setDeathDate(""); setBio("");
    setIsPrivate(false); setPhotoUrl(null); setRelationships([]); setMarriedIn(false);
  };

  const addRelationship = () => {
    setRelationships([...relationships, { personId: "", type: "parent" }]);
  };

  const updateRelationship = (index: number, field: keyof RelationshipEntry, value: string) => {
    const updated = [...relationships];
    if (field === "type") {
      updated[index] = { ...updated[index], type: value as RelKind };
    } else {
      updated[index] = { ...updated[index], personId: value };
    }
    setRelationships(updated);
  };

  const removeRelationship = (index: number) => {
    setRelationships(relationships.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const person = await createPerson.mutateAsync({
        family_id: familyId,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        gender,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        bio,
        is_private: isPrivate,
        photo_url: photoUrl,
        married_in: marriedIn,
      });

      for (const rel of relationships) {
        if (!rel.personId) continue;

        if (rel.type === "child") {
          // new person is child of selected → selected is parent of new person
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: rel.personId,
            related_person_id: person.id,
            relationship_type: "parent",
          });
        } else if (rel.type === "parent") {
          // new person is parent of selected
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "parent",
          });
        } else if (rel.type === "spouse") {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "spouse",
          });
        }
      }

      toast.success(`${firstName} added!`);
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Person</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add a Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
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
          <PhotoUpload
            familyId={familyId}
            currentUrl={photoUrl}
            onUploaded={(url) => setPhotoUrl(url)}
            onRemoved={() => setPhotoUrl(null)}
          />
          <div className="flex items-center justify-between">
            <Label>Private (hidden from public view)</Label>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {relationships.some((r) => r.type === "spouse") && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="marriedIn"
                checked={marriedIn}
                onCheckedChange={(checked) => setMarriedIn(checked === true)}
              />
              <Label htmlFor="marriedIn" className="text-sm">
                This person is marrying into the family
              </Label>
            </div>
          )}

          {existingPersons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Relationships</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRelationship} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Relationship
                </Button>
              </div>
              {relationships.map((rel, index) => (
                <div key={index} className="flex items-end gap-2 rounded-md border p-3">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">This person is...</Label>
                    <Select value={rel.type} onValueChange={(v) => updateRelationship(index, "type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent of</SelectItem>
                        <SelectItem value="child">Child of</SelectItem>
                        <SelectItem value="spouse">Spouse of</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Person</Label>
                    <Select value={rel.personId} onValueChange={(v) => updateRelationship(index, "personId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                      <SelectContent>
                        {existingPersons.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRelationship(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createPerson.isPending}>
            {createPerson.isPending ? "Adding..." : "Add Person"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
