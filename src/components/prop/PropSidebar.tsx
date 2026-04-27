import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard,
  TrendingUp,
  Target,
  Users,
  Banknote,
  Wallet,
  HelpCircle,
  MessageSquare,
  Award,
  FileText,
  BookOpen,
  Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PropSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const PropSidebar = ({ sidebarOpen, setSidebarOpen }: PropSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out", description: "See you next time!" });
    navigate("/prop/login");
  };

  // Special items that should not be highlighted
  const noHighlightPaths = ["/prop/challenges", "/prop/funded"];

  const isActive = (path: string) => {
    const basePath = path.split("?")[0];
    const currentPath = location.pathname;
    
    // Don't highlight Challenge Metrics and Funded Metrics
    if (noHighlightPaths.includes(basePath)) {
      return false;
    }
    
    return currentPath === basePath || currentPath.startsWith(basePath + "/");
  };

  const menuItems = [
    { path: "/prop/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/prop/challenges", label: "Challenge Metrics", icon: TrendingUp },
    { path: "/prop/funded", label: "Funded Metrics", icon: Award },
    { path: "/prop/choose-challenge", label: "Choose Challenge", icon: Target },
    { path: "/prop/demo", label: "Demo Account", icon: Monitor },
    { path: "/prop/affiliate", label: "Affiliate Metrics", icon: Users },
    { path: "/prop/strategy", label: "Strategy", icon: BookOpen },
    { path: "/prop/payments", label: "Payments", icon: Banknote },
    { path: "/prop/withdraw", label: "Withdrawals", icon: Wallet },
    { path: "/prop/support", label: "Helpdesk Tickets", icon: MessageSquare },
    { path: "/prop/certificates", label: "Certificates", icon: FileText },
    { path: "/prop/faq", label: "FAQ", icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`${sidebarOpen ? 'w-64 min-w-[256px] translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 md:min-w-[80px]'} bg-secondary border-r border-border transition-all duration-300 flex flex-col h-screen fixed md:sticky top-0 overflow-hidden z-30`}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-center">
          <Link to="/prop" className="flex items-center gap-2">
            {sidebarOpen ? (
              <span className="text-xl font-heading font-bold whitespace-nowrap">
                <span className="text-foreground">KUBERA</span>{" "}
                <span className="text-primary">PROP</span>
              </span>
            ) : (
              <span className="text-xl font-heading font-bold text-primary">KP</span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.path + item.label}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                      ${active 
                        ? 'bg-primary/15 text-primary border border-primary/30' 
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Balance Footer */}
        <div className="p-4 border-t border-primary/10">
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">$0.00</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PropSidebar;
