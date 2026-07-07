import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useUpdateSubTree, type SubTree } from "@/hooks/useSubTrees";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { UserCog } from "lucide-react";

interface Props {
  subTree: SubTree;
  familyId: string;
}

export function AssignSubAdminDialog({ subTree, familyId }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(subTree.admin_user_id ?? "__none__");
  const { data: members = [] } = useFamilyMembers(familyId);
  const updateSubTree = useUpdateSubTree();

  const save = async () => {
    try {
      await updateSubTree.mutateAsync({
        id: subTree.id,
        admin_user_id: selected === "__none__" ? null : selected,
      });
      toast.success("Sub-admin updated");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Assign sub-admin">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Assign Sub-Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Family member</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None</SelectItem>
              {members.map((m: { user_id: string; profiles: { display_name: string | null } | null }) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profiles?.display_name ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Sub-admin's edits, adds, and deletes on this sub-tree will need super-admin approval.
          </p>
          <Button onClick={save} className="w-full" disabled={updateSubTree.isPending}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
