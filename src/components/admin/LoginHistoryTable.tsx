import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Monitor, Smartphone, Globe, RefreshCw } from "lucide-react";

interface LoginHistoryEntry {
  id: string;
  user_id: string;
  user_email?: string;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  status: string;
  created_at: string;
}

interface LoginHistoryTableProps {
  filterByUserId?: string;
  showUserColumn?: boolean;
}

const LoginHistoryTable = ({ filterByUserId, showUserColumn = true }: LoginHistoryTableProps) => {
  const [historyData, setHistoryData] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const loadLoginHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("login_history")
        .select("id, user_id, ip_address, browser, os, device_type, status, created_at")
        .order("created_at", { ascending: false });

      if (filterByUserId) {
        query = query.eq("user_id", filterByUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((data || []).map((h) => h.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const profileMap = (profiles || []).reduce((acc: Record<string, string>, p) => {
        acc[p.user_id] = p.email || "";
        return acc;
      }, {});

      setHistoryData(
        (data || []).map((h) => ({
          ...h,
          user_email: profileMap[h.user_id] || undefined,
        }))
      );
    } catch (error) {
      console.error("Failed to load login history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoginHistory();
  }, [filterByUserId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "Mobile") {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const filteredData = historyData.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.user_email?.toLowerCase().includes(query) ||
      entry.ip_address?.toLowerCase().includes(query) ||
      entry.browser?.toLowerCase().includes(query) ||
      entry.os?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, IP, browser..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadLoginHistory}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {showUserColumn && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
              )}
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">IP Address</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Device</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Browser</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">OS</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={showUserColumn ? 7 : 6} className="py-12 text-center text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No login history found</p>
                </td>
              </tr>
            ) : (
              paginate(filteredData, page, PAGE_SIZE).map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20">
                  {showUserColumn && (
                    <td className="py-4 px-4 text-sm">{entry.user_email || "—"}</td>
                  )}
                  <td className="py-4 px-4 font-mono text-sm">{entry.ip_address || "—"}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(entry.device_type)}
                      <span className="text-sm">{entry.device_type || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm">{entry.browser || "—"}</td>
                  <td className="py-4 px-4 text-sm">{entry.os || "—"}</td>
                  <td className="py-4 px-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      entry.status === "success" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(entry.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination currentPage={page} totalItems={filteredData.length} pageSize={PAGE_SIZE} onPageChange={setPage} loading={loading} />
    </div>
  );
};

export default LoginHistoryTable;
