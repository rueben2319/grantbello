import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Database } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";

type FamilyRole = Database["public"]["Enums"]["family_role"];

type FamilyRoleWithProfile = {
  id: string;
  user_id: string;
  role: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

interface MemberManagementProps {
  familyId: string;
  isAdmin: boolean;
}

export function MemberManagement({ familyId, isAdmin }: MemberManagementProps) {
  const [open, setOpen] = useState(false);
  const { data: members, refetch } = useFamilyMembers(familyId);
  const { user } = useAuth();

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FamilyRole>("viewer");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setInviting(true);

    try {
      if (!user) throw new Error("You must be signed in to invite members");
      const email = inviteEmail.trim();
      if (!email) throw new Error("Please enter an email");

      const { data: foundRows, error: findError } = await supabase.rpc("find_profile_by_email", {
        _family_id: familyId,
        _email: email,
      });
      if (findError) throw new Error(findError.message);
      const found = foundRows?.[0];
      if (!found?.user_id) throw new Error("No user found with that email. Ask them to sign up first.");

      const { error: insertError } = await supabase
        .from("family_roles")
        .insert({
          family_id: familyId,
          user_id: found.user_id,
          role: inviteRole,
          invited_by: user.id,
        });
      if (insertError) throw new Error(insertError.message);

      toast.success("Member invited");
      setInviteEmail("");
      setInviteRole("viewer");
      await refetch();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setInviting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon"><Users className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Family Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {members?.map((m: FamilyRoleWithProfile) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {m.profiles?.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{m.profiles?.display_name || "Unknown"}</p>
                  <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                </div>
              </div>
              {m.user_id === user?.id && <Badge className="text-xs">You</Badge>}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="border-t pt-4">
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Invite by email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={inviting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as FamilyRole)} disabled={inviting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={inviting}>
                {inviting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
