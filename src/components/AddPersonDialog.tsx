import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PersonCombobox } from "@/components/PersonCombobox";
import { LocationCombobox } from "@/components/LocationCombobox";
import { useCreatePerson, useCreateRelationship, useUpdatePerson } from "@/hooks/useFamily";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Plus, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { PREFIX_OPTIONS, SUFFIX_OPTIONS } from "@/lib/personOptions";
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
  const [prefix, setPrefix] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState<string>("");
  const [gender, setGender] = useState<GenderType>("other");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [isLiving, setIsLiving] = useState(true);
  const [birthplace, setBirthplace] = useState("");
  const [residence, setResidence] = useState("");
  const [twinOfId, setTwinOfId] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [marriedIn, setMarriedIn] = useState(false);

  const createPerson = useCreatePerson();
  const createRelationship = useCreateRelationship();
  const updatePerson = useUpdatePerson();

  const reset = () => {
    setPrefix(""); setFirstName(""); setMiddleName(""); setLastName(""); setSuffix("");
    setGender("other"); setBirthDate(""); setDeathDate(""); setIsLiving(true);
    setBirthplace(""); setResidence(""); setTwinOfId("");
    setBio(""); setIsPrivate(false); setPhotoUrl(null); setRelationships([]); setMarriedIn(false);
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
      // Resolve twin_group_id: reuse sibling's group if any, else new uuid.
      let twinGroupId: string | null = null;
      if (twinOfId) {
        const sibling = existingPersons.find((p) => p.id === twinOfId);
        twinGroupId = sibling?.twin_group_id ?? crypto.randomUUID();
      }

      const person = await createPerson.mutateAsync({
        family_id: familyId,
        prefix: prefix || null,
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix: suffix || null,
        gender,
        birth_date: birthDate || null,
        death_date: isLiving ? null : (deathDate || null),
        is_living: isLiving,
        birthplace: birthplace || null,
        residence: residence || null,
        twin_group_id: twinGroupId,
        bio,
        is_private: isPrivate,
        photo_url: photoUrl,
        married_in: marriedIn,
      });

      // Backfill twin group on the linked sibling if it didn't have one.
      if (twinOfId && twinGroupId) {
        const sibling = existingPersons.find((p) => p.id === twinOfId);
        if (sibling && !sibling.twin_group_id) {
          await updatePerson.mutateAsync({ id: sibling.id, twin_group_id: twinGroupId });
        }
      }

      // Track parent person IDs whose active spouses we should also link as parents.
      const parentIdsForChild = new Map<string, string[]>(); // childId -> [parentIds added directly]

      const addParentLink = (parentId: string, childId: string) => {
        const arr = parentIdsForChild.get(childId) ?? [];
        if (!arr.includes(parentId)) arr.push(parentId);
        parentIdsForChild.set(childId, arr);
      };

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
          addParentLink(rel.personId, person.id);
        } else if (rel.type === "parent") {
          // new person is parent of selected
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "parent",
          });
          addParentLink(person.id, rel.personId);
        } else if (rel.type === "spouse") {
          await createRelationship.mutateAsync({
            family_id: familyId,
            person_id: person.id,
            related_person_id: rel.personId,
            relationship_type: "spouse",
            status: "active",
          });
        }
      }

      // Auto-link the active spouse of each new parent as a co-parent.
      if (parentIdsForChild.size > 0) {
        const parentIds = Array.from(new Set(Array.from(parentIdsForChild.values()).flat()));
        const { data: spouseRows } = await supabase
          .from("relationships")
          .select("person_id, related_person_id, status")
          .eq("family_id", familyId)
          .eq("relationship_type", "spouse")
          .eq("status", "active")
          .or(`person_id.in.(${parentIds.join(",")}),related_person_id.in.(${parentIds.join(",")})`);

        const activeSpousesOf = new Map<string, string[]>();
        (spouseRows ?? []).forEach((r: { person_id: string; related_person_id: string }) => {
          const a = r.person_id as string;
          const b = r.related_person_id as string;
          [[a, b], [b, a]].forEach(([x, y]) => {
            const arr = activeSpousesOf.get(x) ?? [];
            if (!arr.includes(y)) arr.push(y);
            activeSpousesOf.set(x, arr);
          });
        });

        // Existing parent links so we don't duplicate
        const childIds = Array.from(parentIdsForChild.keys());
        const { data: existingParents } = await supabase
          .from("relationships")
          .select("person_id, related_person_id")
          .eq("family_id", familyId)
          .eq("relationship_type", "parent")
          .in("related_person_id", childIds);

        const hasParentLink = (parentId: string, childId: string) =>
          (existingParents ?? []).some(
            (r: { person_id: string; related_person_id: string }) => r.person_id === parentId && r.related_person_id === childId
          );

        for (const [childId, directParents] of parentIdsForChild.entries()) {
          for (const directParent of directParents) {
            const spouses = activeSpousesOf.get(directParent) ?? [];
            for (const spouseId of spouses) {
              if (directParents.includes(spouseId)) continue; // already added directly
              if (hasParentLink(spouseId, childId)) continue;
              await createRelationship.mutateAsync({
                family_id: familyId,
                person_id: spouseId,
                related_person_id: childId,
                relationship_type: "parent",
              });
            }
          }
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Select value={prefix || "__none__"} onValueChange={(v) => setPrefix(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {PREFIX_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Suffix</Label>
              <Select value={suffix || "__none__"} onValueChange={(v) => setSuffix(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {SUFFIX_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="isLivingAdd" className="text-sm">Is this person living?</Label>
            <Switch id="isLivingAdd" checked={isLiving} onCheckedChange={(v) => { setIsLiving(v); if (v) setDeathDate(""); }} />
          </div>
          <div className={`grid gap-3 ${isLiving ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-2">
              <Label>Birth Date</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            {!isLiving && (
              <div className="space-y-2">
                <Label>Death Date</Label>
                <Input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Place of birth</Label>
            <LocationCombobox value={birthplace} onChange={setBirthplace} placeholder="City, state, country" />
          </div>
          <div className="space-y-2">
            <Label>Current residence</Label>
            <LocationCombobox value={residence} onChange={setResidence} placeholder="City, state, country" />
          </div>
          {existingPersons.length > 0 && (
            <div className="space-y-2">
              <Label>Twin / multiple-birth of</Label>
              <PersonCombobox
                persons={existingPersons}
                value={twinOfId}
                onChange={setTwinOfId}
                allowClear
                placeholder="Select sibling (optional)"
              />
            </div>
          )}
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
                  <div className="flex-1 space-y-2 min-w-0">
                    <Label className="text-xs">Person</Label>
                    <PersonCombobox
                      persons={existingPersons}
                      value={rel.personId}
                      onChange={(v) => updateRelationship(index, "personId", v)}
                    />
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
