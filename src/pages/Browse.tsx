import { usePublicFamilies } from "@/hooks/useFamily";
import { FamilyCard } from "@/components/FamilyCard";
import { Navbar } from "@/components/Navbar";
import { Globe } from "lucide-react";

export default function Browse() {
  const { data: families, isLoading } = usePublicFamilies();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Browse Family Trees</h1>
          <p className="text-muted-foreground">Explore publicly shared family histories</p>
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
              <FamilyCard key={f.id} family={f} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="font-display text-xl font-semibold">No public trees yet</h2>
            <p className="text-muted-foreground">Public family trees will appear here</p>
          </div>
        )}
      </main>
    </div>
  );
}
