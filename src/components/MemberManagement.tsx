import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { Users } from "lucide-react";

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

export function MemberManagement({ familyId }: MemberManagementProps) {
  const [open, setOpen] = useState(false);
  const { data: members } = useFamilyMembers(familyId);
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Family members">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Family Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}
