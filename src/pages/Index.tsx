import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { FamilyCard } from "@/components/FamilyCard";
import { usePublicFamilies } from "@/hooks/useFamily";
import { TreePine, Globe, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Index() {
  const { user } = useAuth();
  const { data: families, isLoading } = usePublicFamilies();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="container flex flex-col items-center px-4 py-12 text-center sm:py-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 sm:mb-6 sm:h-20 sm:w-20 sm:rounded-3xl">
            <TreePine className="h-8 w-8 text-primary-foreground sm:h-10 sm:w-10" />
          </div>
          <h1 className="mb-4 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            The Royal Family of{" "}
            <span className="text-primary">Clan of Madzedze</span>
          </h1>
          <p className="mb-2 max-w-xl text-lg text-muted-foreground">
            Preserving the heritage of Tchauya — from the banks of Namitembwe and Livulezi rivers to every branch of the family tree.
          </p>
          <p className="mb-8 max-w-xl text-sm text-muted-foreground/70">
            Rooted in <span className="font-medium text-foreground">Catherine Mkhalepati</span> &amp; <span className="font-medium text-foreground">Mateyu Keyala</span> · Ngoni tribe · Tchauya Village, Malawi
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/auth">Join the Tree</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/browse">Browse Family Trees</Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* Clan Background */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="mb-4 font-display text-2xl font-bold">Our Heritage</h2>
          <p className="mb-6 text-muted-foreground leading-relaxed">
            Madzedze was the former name of Tchauya before the ancestors emigrated to the western side of the Namitembwe River. The first to occupy this land, the Clan of Madzedze settled between Namitembwe and Livulezi rivers — surrounded by the villages of Zimenyana, Kalulu, Fuko, Kaludzu, Chatambalala, Likumbo, Kabuwaza, Mlodzanyama, and Nzangaya. By blood, Madzedze is the royal family of Tchauya.
          </p>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            The people are <span className="font-medium text-foreground">Ngoni</span> by tribe — some also known as <span className="font-medium text-foreground">Antumba</span>. The dynasty's story carries the weight of family conflict: a flight to Zimbabwe to escape the threat of Phiso, and the loss of Nelia's daughters — claimed by forces that sought to sever the line of royal heirs. Yet the roots endure.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">
            Everything You Need
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: TreePine,
                title: "Interactive Trees",
                desc: "Visualize the Madzedze lineage with zoomable, draggable tree diagrams powered by D3.js",
              },
              {
                icon: Shield,
                title: "Privacy Controls",
                desc: "Control who sees what. Public trees for sharing heritage, private details for family only.",
              },
              {
                icon: Users,
                title: "Collaborative",
                desc: "Invite family members to contribute. Admins, editors, and viewers — all managed.",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse / Public Trees */}
      <section className="border-t py-20">
        <div className="container">
          <h2 className="mb-8 text-center font-display text-2xl font-bold">
            Family Trees
          </h2>
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
              <p className="text-muted-foreground">
                Public family trees of the Clan of Madzedze will appear here
              </p>
              <Button className="mt-6" asChild>
                <Link to="/auth">Start Adding Your Branch</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8">
        <div className="container flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <TreePine className="h-4 w-4 text-primary" />
            Clan of Madzedze — Roots &amp; Branches
          </div>
          <p>© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
