import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AdminAuthGuardProps {
  children: ReactNode;
  /** Which roles are allowed. Defaults to ["admin"] */
  allowedRoles?: ("root" | "admin" | "moderator")[];
}

const AdminAuthGuard = ({ children, allowedRoles = ["root", "admin"] }: AdminAuthGuardProps) => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/prop/login");
        return;
      }

      // Check if user has any of the allowed roles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error || !roles || roles.length === 0) {
        navigate("/prop/dashboard");
        return;
      }

      const userRoleValue = roles[0].role;
      const hasAccess = roles.some(r => allowedRoles.includes(r.role as "root" | "admin" | "moderator"));

      if (!hasAccess) {
        navigate("/prop/dashboard");
        return;
      }

      setUserRole(userRoleValue);
      setAuthorized(true);
    };

    checkAccess();
  }, [navigate, allowedRoles]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export { AdminAuthGuard };
export type { AdminAuthGuardProps };

// Hook to get the current admin's role AND allowed pages
export const useAdminRole = () => {
  const [role, setRole] = useState<"root" | "admin" | "moderator" | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null); // null = unrestricted (full admin)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (roles && roles.length > 0) {
        const hasRoot = roles.some(r => r.role === "root");
        const hasAdmin = roles.some(r => r.role === "admin");
        const resolvedRole = hasRoot ? "root" : hasAdmin ? "admin" : (roles[0].role as "root" | "admin" | "moderator");
        setRole(resolvedRole);

        // Load page permissions from admin_page_permissions
        const { data: perms } = await supabase
          .from("admin_page_permissions" as any)
          .select("page_key")
          .eq("user_id", session.user.id);

        if (perms && (perms as any[]).length > 0) {
          setAllowedPages((perms as any[]).map((p: any) => p.page_key));
        } else {
          // No explicit permissions set — show nothing (empty access)
          setAllowedPages([]);
        }
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  const canAccessPage = (pageKey: string) => {
    // Root and Admin users can access all pages
    if (role === "root" || role === "admin") return true;
    if (!allowedPages) return false;
    return allowedPages.includes(pageKey);
  };

  return {
    role,
    loading,
    allowedPages,
    canAccessPage,
    isRoot: role === "root",
    isAdmin: role === "admin" || role === "root",
    isModerator: role === "moderator",
  };
};
