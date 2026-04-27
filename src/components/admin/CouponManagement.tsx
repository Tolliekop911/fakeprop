import { useState, useEffect } from "react";
import AdminPagination, { paginate } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Ticket, Plus, Trash2, Loader2, Copy, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/adminLogger";

const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

interface CouponCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  applicable_account_sizes: number[] | null;
}

const normalizeAccountSizes = (value: unknown): number[] | null => {
  if (Array.isArray(value)) {
    const parsed = value
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    return parsed.length > 0 ? parsed : null;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsedJson = JSON.parse(value);
      if (Array.isArray(parsedJson)) {
        const parsed = parsedJson
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v));
        return parsed.length > 0 ? parsed : null;
      }
    } catch {
      const parsed = value
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
      return parsed.length > 0 ? parsed : null;
    }
  }

  return null;
};

const DEFAULT_FORM = {
  code: "",
  discountPercent: "10",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  accountSizes: [] as number[],
};

const CouponManagement = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedCoupons: CouponCode[] = (data || []).map((coupon) => ({
        ...coupon,
        discount_percent: Number(coupon.discount_percent ?? 0),
        current_uses: Number(coupon.current_uses ?? 0),
        max_uses: coupon.max_uses == null ? null : Number(coupon.max_uses),
        applicable_account_sizes: normalizeAccountSizes((coupon as any).applicable_account_sizes),
      }));

      setCoupons(normalizedCoupons);
    } catch (e) {
      console.error("Error loading coupons:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "KM-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: CouponCode) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountPercent: String(coupon.discount_percent),
      maxUses: coupon.max_uses ? String(coupon.max_uses) : "",
      validFrom: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : "",
      validUntil: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : "",
      accountSizes: coupon.applicable_account_sizes || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({ title: "Error", description: "Coupon code is required", variant: "destructive" });
      return;
    }

    const discountValue = parseInt(formData.discountPercent);
    if (isNaN(discountValue) || discountValue < 1 || discountValue > 100) {
      toast({ title: "Error", description: "Discount must be a number between 1 and 100", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        discount_percent: discountValue,
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        valid_from: formData.validFrom || null,
        valid_until: formData.validUntil || null,
        applicable_account_sizes: formData.accountSizes.length > 0 ? formData.accountSizes : null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupon_codes")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;

        await logAdminAction("coupon_updated", "coupon", editingCoupon.id, {
          code: payload.code,
          discount_percent: discountValue,
        });
        toast({ title: "Coupon updated", description: `Code ${payload.code} updated successfully` });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("coupon_codes").insert({
          ...payload,
          created_by: user?.id,
        });
        if (error) throw error;

        await logAdminAction("coupon_created", "coupon", undefined, {
          code: payload.code,
          discount_percent: discountValue,
        });
        toast({ title: "Coupon created", description: `Code ${payload.code} created successfully` });
      }

      setDialogOpen(false);
      setEditingCoupon(null);
      setFormData(DEFAULT_FORM);
      loadCoupons();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save coupon", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (couponId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("coupon_codes")
        .update({ is_active: !currentState })
        .eq("id", couponId);

      if (error) throw error;
      loadCoupons();
    } catch (e) {
      console.error("Error toggling coupon:", e);
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from("coupon_codes")
        .delete()
        .eq("id", couponId);

      if (error) throw error;
      await logAdminAction("coupon_deleted", "coupon", couponId);
      toast({ title: "Coupon deleted" });
      loadCoupons();
    } catch (e) {
      console.error("Error deleting coupon:", e);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            Coupon Codes
          </h2>
          <p className="text-muted-foreground">Manage discount codes for challenge purchases</p>
        </div>

        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingCoupon(null); setFormData(DEFAULT_FORM); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon Code" : "Create New Coupon Code"}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? "Update the coupon details" : "Create a discount code for challenge purchases"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="KM-XXXXX"
                  disabled={!!editingCoupon}
                />
                {!editingCoupon && (
                  <Button variant="outline" onClick={generateCode} type="button">
                    Generate
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Discount Percentage</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Uses (optional)</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                placeholder="Unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label>Valid From (optional)</Label>
              <Input
                type="datetime-local"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valid Until (optional)</Label>
              <Input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Applicable Account Sizes</Label>
              <p className="text-xs text-muted-foreground">Leave all unchecked to apply to all sizes</p>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.accountSizes.includes(size)}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          accountSizes: checked
                            ? [...formData.accountSizes, size]
                            : formData.accountSizes.filter((s) => s !== size),
                        });
                      }}
                    />
                    ${size >= 1000 ? `${size / 1000}K` : size}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingCoupon ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingCoupon ? "Update Coupon" : "Create Coupon"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Account Sizes</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No coupon codes yet
                </TableCell>
              </TableRow>
            ) : (
              paginate(coupons, page, PAGE_SIZE).map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded font-mono">{coupon.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(coupon.code)}
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{coupon.discount_percent}% off</Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.applicable_account_sizes && coupon.applicable_account_sizes.length > 0
                      ? coupon.applicable_account_sizes.map(s => `$${s >= 1000 ? `${s/1000}K` : s}`).join(", ")
                      : <span className="text-muted-foreground">All</span>}
                  </TableCell>
                  <TableCell>
                    {coupon.current_uses} / {coupon.max_uses || "∞"}
                  </TableCell>
                  <TableCell>
                    {coupon.valid_until
                      ? new Date(coupon.valid_until).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleActive(coupon.id, coupon.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(coupon)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPagination currentPage={page} totalItems={coupons.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
};

export default CouponManagement;