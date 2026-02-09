import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Lock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface FamilyCardProps {
  family: Tables<"families"> & { role?: string };
  showRole?: boolean;
}

export function FamilyCard({ family, showRole }: FamilyCardProps) {
  return (
    <Link to={`/family/${family.id}`}>
      <Card className="group transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="font-display text-lg group-hover:text-primary transition-colors">
              {family.name}
            </CardTitle>
            <div className="flex gap-1.5">
              {family.is_public ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Globe className="h-3 w-3" /> Public
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              )}
              {showRole && family.role && (
                <Badge className="text-xs capitalize">{family.role}</Badge>
              )}
            </div>
          </div>
          {family.description && (
            <CardDescription className="line-clamp-2">{family.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>View tree →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
