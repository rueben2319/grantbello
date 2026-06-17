import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useUpdatePerson, useCreateRelationship, useDeleteRelationship, useUpdateRelationship } from "@/hooks/useFamily";
import { Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type GenderType = Database["public"]["Enums"]["gender_type"];

interface EditPersonDialogProps {
  person: Tables<"persons">;
  open: boolean;
  onClose: () => void;
  existingPersons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  familyId: string;
}

interface NewRelEntry {
  personId: string;
  type: "parent" | "child" | "spouse";
  isDivorced?: boolean;
}

export function EditPersonDialog({ person, open, onClose, existingPersons, relationships, familyId }: EditPersonDialogProps) {
  const [firstName, setFirstName] = useState(person.first_name);
  const [middleName, setMiddleName] = useState(person.middle_name || "");
  const [lastName, setLastName] = useState(person.last_name || "");
  const [gender, setGender] = useState<GenderType>(person.gender || "other");
  const [birthDate, setBirthDate] = useState(person.birth_date || "");
  const [deathDate, setDeathDate] = useState(person.death_date || "");
  const [bio, setBio] = useState(person.bio || "");
  const [isPrivate, setIsPrivate] = useState(person.is_private);
  const [photoUrl, setPhotoUrl] = useState<string | null>(person.photo_url || null);
  const [marriedIn, setMarriedIn] = useState(person.married_in || false);
  const [newRels, setNewRels] = useState<NewRelEntry[]>([]);

  const updatePerson = useUpdatePerson();
  const createRelationship = useCreateRelationship();
  const deleteRelationship = useDeleteRelationship();
  const updateRelationship = useUpdateRelationship();

  useEffect(() => {
    setFirstName(person.first_name);
    setMiddleName(person.middle_name || "");
    setLastName(person.last_name || "");
    setGender(person.gender || "other");
    setBirthDate(person.birth_date || "");
    setDeathDate(person.death_date || "");
    setBio(person.bio || "");
    setIsPrivate(person.is_private);
    setPhotoUrl(person.photo_url || null);
    setMarriedIn(person.married_in || false);
    setNewRels([]);
  }, [person]);

  const existingRels = relationships
    .filter((r) => r.person_id === person.id || r.related_person_id === person.id)
    .map((r) => {
      if (r.relationship_type === "parent" && r.person_id === person.id) {
        return { rel: r, label: "Parent of", otherPersonId: r.related_person_id };
      } else if (r.relationship_type === "parent" && r.related_person_id === person.id) {
        return { rel: r, label: "Child of", otherPersonId: r.person_id };
      } else if (r.relationship_type === "spouse") {
        const otherId = r.person_id === person.id ? r.related_person_id : r.person_id;
        return { rel: r, label: "Spouse of", otherPersonId: otherId };
      }
      return null;
    })
    .filter(Boolean) as { rel: Tables<"relationships">; label: string; otherPersonId: string }[];

  const getPersonName = (id: string) => {
    const p = existingPersons.find((ep) => ep.id === id);
    return p ? `${p.first_name} ${p.last_name || ""}`.trim() : "Unknown";
  };

  const handleRemoveRelationship = async (relId: string) => {
    try {
      await deleteRelationship.mutateAsync({ id: relId, familyId });
      toast.success("Relationship removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleToggleDivorce = async (relId: string, isDivorced: boolean) => {
    try {
      await updateRelationship.mutateAsync({ id: relId, is_divorced: isDivorced });
      toast.success("Relationship updated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePerson.mutateAsync({
        id: person.id,
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

      for (const rel of newRels) {
        if (!rel.personId) continue;
        if (rel.type === "child") {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: rel.personId,
            related_person_id: person.id,
            relationship_type: "parent",
          });
        } else if (rel.type === "parent") {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "parent",
          });
        } else {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "spouse",
            is_divorced: !!rel.isDivorced,
          });
        }
      }

      toast.success("Person updated!");
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const otherPersons = existingPersons.filter((p) => p.id !== person.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Person</DialogTitle>
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

          {existingRels.some((r) => r.label === "Spouse of") && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="marriedInEdit"
                checked={marriedIn}
                onCheckedChange={(checked) => setMarriedIn(checked === true)}
              />
              <Label htmlFor="marriedInEdit" className="text-sm">
                This person married into the family
              </Label>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Relationships</Label>
            {existingRels.map(({ rel, label, otherPersonId }) => (
              <div key={rel.id} className="flex flex-col gap-2 rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{label} <strong>{getPersonName(otherPersonId)}</strong></span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRelationship(rel.id)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {rel.relationship_type === "spouse" && (
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id={`divorced-${rel.id}`}
                      checked={rel.is_divorced || false}
                      onCheckedChange={(checked) => handleToggleDivorce(rel.id, checked === true)}
                    />
                    <Label htmlFor={`divorced-${rel.id}`} className="text-xs text-muted-foreground">
                      Divorced / Separated
                    </Label>
                  </div>
                )}
              </div>
            ))}

            {newRels.map((rel, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">This person is...</Label>
                    <Select value={rel.type} onValueChange={(v) => {
                      const updated = [...newRels];
                      updated[index] = { ...updated[index], type: v as "parent" | "child" | "spouse" };
                      setNewRels(updated);
                    }}>
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
                    <Select value={rel.personId} onValueChange={(v) => {
                      const updated = [...newRels];
                      updated[index] = { ...updated[index], personId: v };
                      setNewRels(updated);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                      <SelectContent>
                        {otherPersons.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setNewRels(newRels.filter((_, i) => i !== index))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {rel.type === "spouse" && (
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id={`divorced-new-${index}`}
                      checked={rel.isDivorced || false}
                      onCheckedChange={(checked) => {
                        const updated = [...newRels];
                        updated[index] = { ...updated[index], isDivorced: checked === true };
                        setNewRels(updated);
                      }}
                    />
                    <Label htmlFor={`divorced-new-${index}`} className="text-xs text-muted-foreground">
                      Divorced / Separated
                    </Label>
                  </div>
                )}
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => setNewRels([...newRels, { personId: "", type: "parent" }])} className="gap-1">
              <Plus className="h-3 w-3" /> Add Relationship
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={updatePerson.isPending}>
            {updatePerson.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
