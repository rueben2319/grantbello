import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePerson, useCreateRelationship } from "@/hooks/useFamily";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type GenderType = Database["public"]["Enums"]["gender_type"];
type RelationshipType = Database["public"]["Enums"]["relationship_type"];

interface AddPersonDialogProps {
  familyId: string;
  existingPersons: Tables<"persons">[];
  onAdded?: () => void;
}

export function AddPersonDialog({ familyId, existingPersons, onAdded }: AddPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<GenderType>("other");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [relatedTo, setRelatedTo] = useState("");
  const [relType, setRelType] = useState<RelationshipType | "child">("parent");

  const createPerson = useCreatePerson();
  const createRelationship = useCreateRelationship();

  const reset = () => {
    setFirstName(""); setLastName(""); setGender("other");
    setBirthDate(""); setDeathDate(""); setBio("");
    setIsPrivate(false); setRelatedTo(""); setRelType("parent");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const person = await createPerson.mutateAsync({
        family_id: familyId,
        first_name: firstName,
        last_name: lastName,
        gender,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        bio,
        is_private: isPrivate,
      });

      if (relatedTo && relType) {
        if (relType === "child") {
          // "child of relatedTo" = relatedTo is parent of new person
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: relatedTo,
            related_person_id: person.id,
            relationship_type: "parent",
          });
        } else if (relType === "parent") {
          // new person is parent of relatedTo
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: relatedTo,
            relationship_type: "parent",
          });
        } else {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: relatedTo,
            relationship_type: relType,
          });
        }
      }

      toast.success(`${firstName} added!`);
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add a Person</DialogTitle>
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

          {existingPersons.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Related To</Label>
                <Select value={relatedTo} onValueChange={setRelatedTo}>
                  <SelectTrigger><SelectValue placeholder="Select a person (optional)" /></SelectTrigger>
                  <SelectContent>
                    {existingPersons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {relatedTo && (
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={relType} onValueChange={(v) => setRelType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent of selected</SelectItem>
                      <SelectItem value="child">Child of selected</SelectItem>
                      <SelectItem value="spouse">Spouse of selected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <Button type="submit" className="w-full" disabled={createPerson.isPending}>
            {createPerson.isPending ? "Adding..." : "Add Person"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
