import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";
import { useAdminRole } from "@/components/admin/AdminAuthGuard";
import {
  Users,
  Shield,
  Loader2,
  Plus,
  Trash2,
  UserCog,
  ChevronDown,
  ChevronUp,
  Settings2,
  Lock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// All available pages/tabs in the admin dashboard
export const ALL_ADMIN_PAGES = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "accounts", label: "Accounts" },
  { key: "challenges", label: "Challenges" },
  { key: "strategies", label: "Strategy Reviews" },
  { key: "payments", label: "Payment Orders" },
  { key: "finance", label: "Finance" },
  { key: "compliance", label: "Compliance" },
  { key: "trades", label: "Trades Monitor" },
  { key: "logins", label: "Login History" },
  { key: "coupons", label: "Coupons" },
  { key: "faq", label: "FAQ Manager" },
  { key: "import", label: "Data Import" },
  { key: "chat", label: "Live Chat" },
  { key: "support", label: "Support Tickets" },
  { key: "contact", label: "Contact Inbox" },
  { key: "progression", label: "Progression" },
  { key: "settings", label: "Settings" },
  { key: "root", label: "Root" },
];

interface RoleUser {
  id: string;
  user_id: string;
  role: "root" | "admin" | "moderator";
  email: string | null;
  full_name: string | null;
  allowedPages: string[];
}

interface PagePermissionsEditorProps {
  userId: string;
  currentPages: string[];
  onSaved: () => void;
}

const PagePermissionsEditor = ({ userId, currentPages, onSaved }: PagePermissionsEditorProps) => {
  const [selected, setSelected] = useState<string[]>(currentPages);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelected(ALL_ADMIN_PAGES.map(p => p.key));
  const clearAll = () => setSelected([]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing permissions for this user
      await supabase
        .from("admin_page_permissions" as any)
        .delete()
        .eq("user_id", userId);

      // Insert new permissions
      if (selected.length > 0) {
        const rows = selected.map(page_key => ({ user_id: userId, page_key }));
        const { error } = await supabase
          .from("admin_page_permissions" as any)
          .insert(rows);
        if (error) throw error;
      }

      toast({ title: "Permissions saved", description: `${selected.length} pages granted.` });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save permissions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border border-border/60 rounded-lg p-4 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Page Access</p>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-xs text-primary hover:underline">All</button>
          <span className="text-xs text-muted-foreground">|</span>
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">None</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALL_ADMIN_PAGES.map(page => (
          <label
            key={page.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
              selected.includes(page.key)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
            }`}
          >
            <input
              type="checkbox"
              className="hidden"
              checked={selected.includes(page.key)}
              onChange={() => toggle(page.key)}
            />
            <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
              selected.includes(page.key) ? "bg-primary border-primary" : "border-muted-foreground"
            }`}>
              {selected.includes(page.key) && (
                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {page.label}
          </label>
        ))}
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Permissions
      </Button>
    </div>
  );
};

const ReadOnlyPermissionsView = ({ currentPages }: { currentPages: string[] }) => (
  <div className="mt-3 border border-border/60 rounded-lg p-4 bg-muted/10 space-y-3">
    <p className="text-sm font-medium text-muted-foreground">Page Access (View Only)</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALL_ADMIN_PAGES.map(page => (
        <div
          key={page.key}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            currentPages.includes(page.key)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/20 text-muted-foreground opacity-50"
          }`}
        >
          <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
            currentPages.includes(page.key) ? "bg-primary border-primary" : "border-muted-foreground"
          }`}>
            {currentPages.includes(page.key) && (
              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {page.label}
        </div>
      ))}
    </div>
  </div>
);

const AdminUserManagement = () => {
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"root" | "admin" | "moderator">("moderator");
  const [addPages, setAddPages] = useState<string[]>([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<string | null>(null);
  const { toast } = useToast();
  const { isRoot, isAdmin } = useAdminRole();

  const loadRoleUsers = async () => {
    setLoading(true);
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((roles || []).map((r) => r.user_id))];

      const [profilesRes, permissionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds),
        supabase.from("admin_page_permissions" as any).select("user_id, page_key").in("user_id", userIds),
      ]);

      const profileMap = (profilesRes.data || []).reduce(
        (acc: Record<string, { email: string | null; full_name: string | null }>, p) => {
          acc[p.user_id] = { email: p.email, full_name: p.full_name };
          return acc;
        },
        {}
      );

      const permMap = ((permissionsRes.data || []) as any[]).reduce(
        (acc: Record<string, string[]>, p) => {
          if (!acc[p.user_id]) acc[p.user_id] = [];
          acc[p.user_id].push(p.page_key);
          return acc;
        },
        {}
      );

      setRoleUsers(
        (roles || []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role as "root" | "admin" | "moderator",
          email: profileMap[r.user_id]?.email || null,
          full_name: profileMap[r.user_id]?.full_name || null,
          allowedPages: permMap[r.user_id] || [],
        }))
      );
    } catch (e) {
      console.error("Error loading role users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoleUsers();
  }, []);

  // When role changes, default page selection
  useEffect(() => {
    if (addRole === "admin" || addRole === "root") {
      setAddPages(ALL_ADMIN_PAGES.map(p => p.key));
    } else {
      setAddPages(["finance", "compliance"]);
    }
  }, [addRole]);

  const toggleAddPage = (key: string) => {
    setAddPages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddRole = async () => {
    if (!addEmail.trim() || !isRoot) return;
    setAdding(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", addEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast({
          title: "User not found",
          description: "No user with that email exists. They must sign up first.",
          variant: "destructive",
        });
        return;
      }

      const existing = roleUsers.find(
        (r) => r.user_id === profile.user_id && r.role === addRole
      );
      if (existing) {
        toast({
          title: "Already assigned",
          description: `${addEmail} already has the ${addRole} role.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: profile.user_id,
        role: addRole,
      });
      if (error) throw error;

      // Save page permissions
      if (addPages.length > 0) {
        const rows = addPages.map(page_key => ({ user_id: profile.user_id, page_key }));
        await supabase.from("admin_page_permissions" as any).insert(rows);
      }

      await logAdminAction("role_assigned", "user_role", profile.user_id, {
        email: addEmail,
        role: addRole,
        pages: addPages,
      });

      toast({ title: "Success", description: `${addRole} role assigned to ${addEmail} with ${addPages.length} page(s) access.` });
      setAddEmail("");
      setShowPageSelector(false);
      loadRoleUsers();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRole = async (roleUser: RoleUser) => {
    setRemovingId(roleUser.id);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleUser.id);
      if (error) throw error;

      // Clean up permissions
      await supabase
        .from("admin_page_permissions" as any)
        .delete()
        .eq("user_id", roleUser.user_id);

      await logAdminAction("role_removed", "user_role", roleUser.user_id, {
        email: roleUser.email,
        role: roleUser.role,
      });

      toast({ title: "Success", description: `${roleUser.role} role removed from ${roleUser.email}` });
      loadRoleUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to remove role", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  const roots = roleUsers.filter((r) => r.role === "root");
  const admins = roleUsers.filter((r) => r.role === "admin");
  const moderators = roleUsers.filter((r) => r.role === "moderator");

  const UserRow = ({ u }: { u: RoleUser }) => {
    const isExpanded = expandedPermissions === u.id;
    const roleColor = u.role === "root" ? "bg-destructive/20" : u.role === "admin" ? "bg-primary/20" : "bg-accent/20";
    const roleIcon = u.role === "root" ? <Lock className="w-5 h-5 text-destructive" /> : u.role === "admin" ? <Users className="w-5 h-5 text-primary" /> : <UserCog className="w-5 h-5 text-accent-foreground" />;
    const roleLabel = u.role === "root" ? "Root" : u.role === "admin" ? "Admin" : "Moderator";
    const badgeColor = u.role === "root" ? "bg-destructive/10 text-destructive" : u.role === "admin" ? "bg-primary/10 text-primary" : "bg-accent/50 text-accent-foreground";
    // Both root and admin can view permissions, only root can edit
    const canViewPermissions = isRoot || isAdmin;
    const canEditPermissions = isRoot;
    return (
      <div key={u.id} className="border border-border/40 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleColor}`}>
              {roleIcon}
            </div>
            <div>
              <p className="font-medium">{u.email || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {u.full_name || u.role} · {u.allowedPages.length} page{u.allowedPages.length !== 1 ? "s" : ""} access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>
              {roleLabel}
            </span>
            {canViewPermissions && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setExpandedPermissions(isExpanded ? null : u.id)}
                title={canEditPermissions ? "Edit permissions" : "View permissions"}
              >
                <Settings2 className="w-4 h-4 mr-1" />
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
            {canEditPermissions && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveRole(u)}
                disabled={removingId === u.id}
                title="Remove role"
              >
                {removingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
        {isExpanded && canViewPermissions && (
          <div className="px-4 pb-4">
            {canEditPermissions ? (
              <PagePermissionsEditor
                userId={u.user_id}
                currentPages={u.allowedPages}
                onSaved={() => { setExpandedPermissions(null); loadRoleUsers(); }}
              />
            ) : (
              <ReadOnlyPermissionsView currentPages={u.allowedPages} />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add New Role — Root only */}
      {isRoot ? (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Root / Admin / Moderator
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="User email address"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={addRole} onValueChange={(v) => setAddRole(v as "root" | "admin" | "moderator")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowPageSelector(!showPageSelector)}
              className="gap-1 border-primary/30 text-primary"
            >
              Rights ({addPages.length})
              {showPageSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={adding || !addEmail.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </div>

          {showPageSelector && (
            <div className="mt-4 border border-border/60 rounded-lg p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Select pages this user can access</p>
                <div className="flex gap-2">
                  <button onClick={() => setAddPages(ALL_ADMIN_PAGES.map(p => p.key))} className="text-xs text-primary hover:underline">All</button>
                  <span className="text-xs text-muted-foreground">|</span>
                  <button onClick={() => setAddPages([])} className="text-xs text-muted-foreground hover:underline">None</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_ADMIN_PAGES.map(page => (
                  <label
                    key={page.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${
                      addPages.includes(page.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={addPages.includes(page.key)} onChange={() => toggleAddPage(page.key)} />
                    <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
                      addPages.includes(page.key) ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {addPages.includes(page.key) && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {page.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            The user must have an existing account. You can customize exactly which pages they can see.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Only users with the <span className="font-semibold text-destructive">Root</span> role can add, edit, or remove user permissions.</p>
        </div>
      )}

      {/* Root Users */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-heading font-bold mb-1 flex items-center gap-2">
          <Lock className="w-5 h-5 text-destructive" />
          Root Users
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Root users have full control over all permissions.</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : roots.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No root users found.</p>
        ) : (
          <div className="space-y-2">{roots.map((u) => <UserRow key={u.id} u={u} />)}</div>
        )}
      </div>

      {/* Admin Users */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-heading font-bold mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Admin Users
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{isRoot ? "Click the settings icon to edit a user's page access." : "View admin users and their access levels."}</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : admins.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No admin users found.</p>
        ) : (
          <div className="space-y-2">{admins.map((u) => <UserRow key={u.id} u={u} />)}</div>
        )}
      </div>

      {/* Moderator Users */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-heading font-bold mb-1 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          Moderators
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{isRoot ? "Click the settings icon to edit a moderator's page access." : "View moderators and their access levels."}</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : moderators.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No moderators found.</p>
        ) : (
          <div className="space-y-2">{moderators.map((u) => <UserRow key={u.id} u={u} />)}</div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
