import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { TreePine, Globe, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Index() {
  const { user } = useAuth();

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
            Map Your Heritage with{" "}
            <span className="text-primary">Roots & Branches</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg text-muted-foreground">
            Build interactive family trees, preserve stories, and share your family history — publicly or privately.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/browse">Browse Trees</Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
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
                desc: "Visualize your family with zoomable, draggable tree diagrams powered by D3.js",
              },
              {
                icon: Shield,
                title: "Privacy Controls",
                desc: "Control who sees what. Public trees for sharing, private details for family only.",
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

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8">
        <div className="container flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <TreePine className="h-4 w-4 text-primary" />
            Roots & Branches
          </div>
          <p>© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
