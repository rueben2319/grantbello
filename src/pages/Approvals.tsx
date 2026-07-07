import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFamily, useFamilyPersons, useUserFamilyRole } from "@/hooks/useFamily";
import {
  usePendingChanges,
  useApprovePendingChange,
  useRejectPendingChange,
  type PendingChange,
} from "@/hooks/usePendingChanges";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { format } from "date-fns";

function actionLabel(a: PendingChange["action"]) {
  switch (a) {
    case "add_person": return "Add person";
    case "update_person": return "Update person";
    case "delete_person": return "Delete person";
    case "add_relationship": return "Add relationship";
    case "delete_relationship": return "Delete relationship";
  }
}

function actionColor(a: PendingChange["action"]) {
  if (a.startsWith("delete")) return "destructive" as const;
  if (a.startsWith("add")) return "default" as const;
  return "secondary" as const;
}

export default function Approvals() {
  const { familyId } = useParams<{ familyId: string }>();
  const { data: family } = useFamily(familyId);
  const { data: role } = useUserFamilyRole(familyId);
  const { data: persons = [] } = useFamilyPersons(familyId);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { data: items = [], isLoading } = usePendingChanges(familyId, { statusFilter: tab });
  const approve = useApprovePendingChange();
  const reject = useRejectPendingChange();

  const nameOf = (id?: string | null) => {
    if (!id) return "—";
    const p = persons.find((p) => p.id === id);
    return p ? `${p.first_name} ${p.last_name ?? ""}`.trim() : id.slice(0, 8);
  };

  const isAdmin = role === "admin";

  const doApprove = async (id: string) => {
    try {
      await approve.mutateAsync({ id });
      toast.success("Approved & applied");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };
  const doReject = async (id: string) => {
    try {
      await reject.mutateAsync({ id });
      toast.success("Rejected");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/family/${familyId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Approvals</h1>
            <p className="text-sm text-muted-foreground">{family?.name}</p>
          </div>
        </div>

        {!isAdmin ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
            Only family super admins can review approvals.
          </CardContent></Card>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : items.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing here.</CardContent></Card>
              ) : items.map((pc) => (
                <Card key={pc.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant={actionColor(pc.action)}>{actionLabel(pc.action)}</Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          on <strong>{nameOf(pc.target_id)}</strong>
                        </span>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(pc.created_at), "MMM d, yyyy p")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                      {JSON.stringify(pc.payload, null, 2)}
                    </pre>
                    {pc.review_note && (
                      <p className="text-xs italic text-muted-foreground">Note: {pc.review_note}</p>
                    )}
                    {tab === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => doReject(pc.id)}
                          disabled={reject.isPending || approve.isPending}
                          className="gap-1"
                        >
                          <X className="h-3 w-3" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => doApprove(pc.id)}
                          disabled={approve.isPending || reject.isPending}
                          className="gap-1"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
