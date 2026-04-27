import { ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface DropdownProps {
  label: string;
  children: React.ReactNode;
}

const NavDropdown = ({ label, children }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors py-2 px-3">
        {label} <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Determine logo destination based on current route
  const logoDestination = location.pathname.startsWith("/prop") || 
                          location.pathname.startsWith("/faq") || 
                          location.pathname.startsWith("/affiliates") 
                          ? "/" : "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="text-2xl font-heading font-bold tracking-tight">
                <span className="text-foreground">KUBERA</span>{" "}
                <span className="text-primary">MARKETS</span>
              </div>
            </Link>
          </div>
          
          {/* Center: Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Resources - direct link */}
            <Link 
              to="/faq" 
              className="text-sm text-foreground hover:text-primary transition-colors py-2 px-3"
            >
              Resources
            </Link>

            {/* Partners */}
            <NavDropdown label="Partners">
              <div className="w-48 p-2">
                <Link 
                  to="/affiliates" 
                  className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors"
                >
                  Affiliates
                </Link>
              </div>
            </NavDropdown>

            {/* About */}
            <NavDropdown label="About">
              <div className="w-48 p-2">
                <Link 
                  to="/prop/about" 
                  className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors"
                >
                  About Us
                </Link>
                <Link 
                  to="/contact" 
                  className="block px-4 py-2 text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors"
                >
                  Contact
                </Link>
              </div>
            </NavDropdown>
          </div>
          
          {/* Right: Theme toggle and login */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <Link to="/prop/login" className="hidden sm:block">
              <Button className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 rounded-full">
                Login
              </Button>
            </Link>
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-foreground"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden mt-4 pb-4 space-y-3">
            <Link 
              to="/faq" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              FAQs
            </Link>
            <Link
              to="/affiliates" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Affiliates
            </Link>
            <Link 
              to="/prop/about" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              About Us
            </Link>
            <Link 
              to="/contact" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </Link>
            <Link 
              to="/prop/login" 
              className="block py-2 text-foreground hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;