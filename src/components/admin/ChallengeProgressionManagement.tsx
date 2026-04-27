import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, RefreshCw, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProgressionRow {
  id: string;
  program_type: string;
  account_size: number;
  phase: string;
  condor_group_mapping: string | null;
  next_phase: string | null;
  next_account_size: number | null;
  profit_target_percent: number | null;
  is_active: boolean;
}

const ChallengeProgressionManagement = () => {
  const [rows, setRows] = useState<ProgressionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedFields, setEditedFields] = useState<Record<string, Partial<ProgressionRow>>>({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState({
    program_type: "1-step",
    account_size: "",
    phase: "phase1",
    profit_target_percent: "",
    condor_group_mapping: "",
  });
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const handleAddRow = async () => {
    const size = Number(newRow.account_size);
    if (!size || size <= 0) {
      toast({ title: "Validation", description: "Account size must be a positive number", variant: "destructive" });
      return;
    }
    const profitTarget = newRow.profit_target_percent ? Number(newRow.profit_target_percent) : null;
    if (profitTarget !== null && (isNaN(profitTarget) || profitTarget <= 0 || profitTarget > 100)) {
      toast({ title: "Validation", description: "Profit target must be between 1 and 100", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("challenge_progression").insert({
        program_type: newRow.program_type,
        account_size: size,
        phase: newRow.phase,
        profit_target_percent: profitTarget,
        condor_group_mapping: newRow.condor_group_mapping || null,
      });
      if (error) throw error;
      toast({ title: "Added", description: "New progression row created" });
      setAddOpen(false);
      setNewRow({ program_type: "1-step", account_size: "", phase: "phase1", profit_target_percent: "", condor_group_mapping: "" });
      loadData();
    } catch (e: any) {
      console.error("Failed to add row", e);
      toast({ title: "Error", description: e.message || "Failed to add row", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenge_progression")
        .select("*")
        .order("program_type")
        .order("account_size")
        .order("phase");

      if (error) throw error;
      setRows((data as ProgressionRow[]) || []);
      setEditedFields({});
    } catch (e) {
      console.error("Failed to load progression data", e);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFieldChange = (id: string, field: string, value: string | boolean) => {
    setEditedFields((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getEditedValue = <T,>(id: string, field: keyof ProgressionRow, original: T): T => {
    const edited = editedFields[id];
    if (edited && field in edited) return edited[field] as T;
    return original;
  };

  const saveAll = async () => {
    const entries = Object.entries(editedFields);
    if (entries.length === 0) return;

    setSaving(true);
    try {
      for (const [id, changes] of entries) {
        const updatePayload: Record<string, unknown> = {};
        if ("condor_group_mapping" in changes) {
          updatePayload.condor_group_mapping = changes.condor_group_mapping || null;
        }
        if ("next_phase" in changes) {
          updatePayload.next_phase = changes.next_phase === "__none__" ? null : changes.next_phase;
        }
        if ("is_active" in changes) {
          updatePayload.is_active = changes.is_active;
        }

        const { error } = await supabase
          .from("challenge_progression")
          .update(updatePayload)
          .eq("id", id);
        if (error) throw error;
      }
      toast({ title: "Saved", description: `${entries.length} row(s) updated` });
      setEditedFields({});
      loadData();
    } catch (e) {
      console.error("Failed to save", e);
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(editedFields).length > 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);

  const getPhaseBadge = (phase: string) => {
    const colors: Record<string, string> = {
      phase1: "bg-blue-500/10 text-blue-500",
      phase2: "bg-amber-500/10 text-amber-500",
      funded: "bg-green-500/10 text-green-500",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[phase] || "bg-muted text-muted-foreground"}`}>
        {phase}
      </span>
    );
  };

  // Build dropdown options: active progressions sorted by account size asc, labelled as "program - phase - $size"
  const activeProgressionOptions = rows
    .filter((r) => {
      const isActive = getEditedValue(r.id, "is_active", r.is_active);
      return isActive;
    })
    .sort((a, b) => a.account_size - b.account_size)
    .map((r) => ({
      value: r.id,
      label: `${r.program_type} — ${r.phase} — ${formatCurrency(r.account_size)}`,
    }));

  // Group by program type
  const groupedByProgram = rows.reduce<Record<string, ProgressionRow[]>>((acc, row) => {
    if (!acc[row.program_type]) acc[row.program_type] = [];
    acc[row.program_type].push(row);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-bold">Challenge Progression Mapping</h3>
          <p className="text-sm text-muted-foreground">{rows.length} rows — edit inline</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Row
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Progression Row</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Program Type</label>
                  <Select value={newRow.program_type} onValueChange={(v) => setNewRow((p) => ({ ...p, program_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-step">1-step</SelectItem>
                      <SelectItem value="2-step">2-step</SelectItem>
                      <SelectItem value="halfway-there">halfway-there</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Size ($)</label>
                  <Input type="number" value={newRow.account_size} onChange={(e) => setNewRow((p) => ({ ...p, account_size: e.target.value }))} placeholder="e.g. 10000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phase</label>
                  <Select value={newRow.phase} onValueChange={(v) => setNewRow((p) => ({ ...p, phase: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phase1">phase1</SelectItem>
                      <SelectItem value="phase2">phase2</SelectItem>
                      <SelectItem value="funded">funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profit Target (%)</label>
                  <Input type="number" value={newRow.profit_target_percent} onChange={(e) => setNewRow((p) => ({ ...p, profit_target_percent: e.target.value }))} placeholder="e.g. 8" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Condor Group Mapping</label>
                  <Input value={newRow.condor_group_mapping} onChange={(e) => setNewRow((p) => ({ ...p, condor_group_mapping: e.target.value }))} placeholder="e.g. condor-1" />
                </div>
                <Button onClick={handleAddRow} disabled={adding} className="w-full">
                  {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Row
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {hasChanges && (
            <Button onClick={saveAll} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save {Object.keys(editedFields).length} Change(s)
            </Button>
          )}
        </div>
      </div>

      {Object.entries(groupedByProgram).map(([program, programRows]) => (
        <div key={program} className="bg-card border border-border rounded-xl p-6">
          <h4 className="text-md font-heading font-bold mb-4 capitalize">{program}</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Active</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Account Size</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phase</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Profit Target</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Next Phase</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Condor Group Mapping</th>
                </tr>
              </thead>
              <tbody>
                {programRows.map((row) => {
                  const currentIsActive = getEditedValue(row.id, "is_active", row.is_active);
                  const currentNextPhase = getEditedValue(row.id, "next_phase", row.next_phase);

                  return (
                    <tr key={row.id} className={`border-b border-border/50 hover:bg-muted/20 ${!currentIsActive ? "opacity-50" : ""}`}>
                      <td className="py-3 px-4">
                        <Switch
                          checked={currentIsActive}
                          onCheckedChange={(checked) => handleFieldChange(row.id, "is_active", checked)}
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(row.account_size)}</td>
                      <td className="py-3 px-4">{getPhaseBadge(row.phase)}</td>
                      <td className="py-3 px-4">
                        {row.profit_target_percent != null ? `${row.profit_target_percent}%` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={currentNextPhase || "__none__"}
                          onValueChange={(val) => handleFieldChange(row.id, "next_phase", val)}
                        >
                          <SelectTrigger className="w-56 h-8 text-sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {activeProgressionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          value={getEditedValue(row.id, "condor_group_mapping", row.condor_group_mapping) ?? ""}
                          onChange={(e) => handleFieldChange(row.id, "condor_group_mapping", e.target.value)}
                          placeholder="e.g. condor-1"
                          className="w-40 h-8 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChallengeProgressionManagement;
