import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TreePine, LogOut, User, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navTo = (path: string) => {
    setSheetOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between px-4 sm:h-16">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl">
          <TreePine className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <span>Grant Bello</span>
        </Link>

        {isMobile ? (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="font-display">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {user ? (
                  <>
                    <Button variant="ghost" className="justify-start gap-2" onClick={() => navTo("/profile")}>
                      <User className="h-4 w-4" /> Profile
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2 text-destructive" onClick={() => { setSheetOpen(false); handleSignOut(); }}>
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <Button className="mt-2" onClick={() => navTo("/auth")}>
                    Sign In
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
