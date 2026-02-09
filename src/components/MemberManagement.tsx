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
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type FamilyRole = Database["public"]["Enums"]["family_role"];

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
      // Look up user by email in profiles - need to find by auth
      // For now, we'll show a message that the user needs to be registered
      toast.info("To invite members, they need to register first. Share the sign-up link with them, then add them by their user ID.");
      setInviteEmail("");
    } catch (err: any) {
      toast.error(err.message);
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
          {members?.map((m: any) => (
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
            <p className="text-sm text-muted-foreground mb-2">
              Members are added when they sign up and you grant them access.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
