import { useMyFamilies } from "@/hooks/useFamily";
import { CreateFamilyDialog } from "@/components/CreateFamilyDialog";
import { FamilyCard } from "@/components/FamilyCard";
import { Navbar } from "@/components/Navbar";
import { TreePine } from "lucide-react";

export default function Dashboard() {
  const { data: families, isLoading } = useMyFamilies();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">My Family Trees</h1>
            <p className="text-muted-foreground">Manage and explore your family histories</p>
          </div>
          <CreateFamilyDialog />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : families?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((f) => (
              <FamilyCard key={f.id} family={f} showRole />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TreePine className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="font-display text-xl font-semibold">No family trees yet</h2>
            <p className="mb-6 text-muted-foreground">Create your first family tree to get started</p>
            <CreateFamilyDialog />
          </div>
        )}
      </main>
    </div>
  );
}
