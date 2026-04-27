import { useState, useEffect, ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu, User, Shield, ShieldCheck, FileText, ChevronDown, Award, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PropSidebar from "./PropSidebar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PropDashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const PropDashboardLayout = ({ children, title }: PropDashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/prop/login", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/prop/login", { replace: true });
      } else {
        // Load profile and check completeness
        supabase
          .from("profiles")
          .select("full_name, first_name, last_name, phone, address, city, country, zip_code")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error("Profile check failed", error);
              navigate("/prop/complete-profile", { replace: true });
              return;
            }

            if (data?.full_name) setFullName(data.full_name);
            // Redirect to complete-profile if essential fields are missing
            if (!data?.first_name || !data?.last_name || !data?.phone || !data?.address || !data?.city || !data?.country || !data?.zip_code) {
              navigate("/prop/complete-profile", { replace: true });
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  const displayName = fullName || user?.email || "User";
  const initials = fullName 
    ? fullName.split(" ").map(n => n[0]).join("")?.toUpperCase().slice(0, 2)
    : user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex">
      <PropSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-secondary/30 border-b border-border/20 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && <h1 className="text-xl font-heading font-bold">{title}</h1>}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors">
              <span className="text-sm text-muted-foreground hidden md:block">Welcome, {displayName}</span>
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">{initials}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/prop/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/prop/kyc" className="flex items-center gap-2 cursor-pointer">
                  <ShieldCheck className="w-4 h-4" />
                  KYC Verification
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/prop/security" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="w-4 h-4" />
                  Security
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/prop/contract" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Contract
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/prop/certificates" className="flex items-center gap-2 cursor-pointer">
                  <Award className="w-4 h-4" />
                  Certificates
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/prop/support" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Messages
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/prop/login");
                }}
                className="text-destructive cursor-pointer"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PropDashboardLayout;
