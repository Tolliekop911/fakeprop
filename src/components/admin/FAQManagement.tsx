import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Search, Download } from "lucide-react";
import { logAdminAction } from "@/lib/adminLogger";
import jsPDF from "jspdf";

interface FAQ {
  id: string;
  category: string;
  sub_category: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "challenge", label: "Challenge / Funded" },
];

const SUB_CATEGORIES = [
  { value: "account-security", label: "Account/Security" },
  { value: "platform-trading", label: "Platform/Trading" },
  { value: "account-management", label: "Account Management" },
];

const FAQManagement = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("general");
  const [formSubCategory, setFormSubCategory] = useState<string>("");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("category")
      .order("sub_category")
      .order("sort_order");

    if (error) {
      console.error("Error fetching FAQs:", error);
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingFaq(null);
    setFormCategory("general");
    setFormSubCategory("");
    setFormQuestion("");
    setFormAnswer("");
    setFormSortOrder(0);
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormCategory(faq.category);
    setFormSubCategory(faq.sub_category || "");
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormSortOrder(faq.sort_order);
    setFormIsActive(faq.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Question and answer are required" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: formCategory,
        sub_category: formCategory === "general" ? (formSubCategory || null) : null,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        sort_order: formSortOrder,
        is_active: formIsActive,
      };

      if (editingFaq) {
        const { error } = await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
        if (error) throw error;
        await logAdminAction("faq_updated", "faq", editingFaq.id, { question: formQuestion.trim() });
        toast({ title: "FAQ Updated" });
      } else {
        const { error } = await supabase.from("faqs").insert(payload);
        if (error) throw error;
        await logAdminAction("faq_created", "faq", null, { question: formQuestion.trim(), category: formCategory });
        toast({ title: "FAQ Created" });
      }

      setDialogOpen(false);
      fetchFaqs();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save FAQ" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faq: FAQ) => {
    if (!confirm(`Delete "${faq.question}"?`)) return;
    setDeletingId(faq.id);
    try {
      const { error } = await supabase.from("faqs").delete().eq("id", faq.id);
      if (error) throw error;
      await logAdminAction("faq_deleted", "faq", faq.id, { question: faq.question });
      toast({ title: "FAQ Deleted" });
      fetchFaqs();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete FAQ" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkSpace = (needed: number) => { if (y + needed > 275) addPage(); };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Kubera Capital Markets — FAQ", margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Exported: ${new Date().toLocaleDateString()}`, margin, y);
    y += 12;

    // Group by category then sub_category
    const grouped: Record<string, FAQ[]> = {};
    const activeFaqs = faqs.filter(f => f.is_active);
    activeFaqs.forEach(faq => {
      const key = faq.category === "challenge"
        ? "Challenge / Funded"
        : faq.sub_category === "account-security"
          ? "Account / Security"
          : faq.sub_category === "platform-trading"
            ? "Platform / Trading"
            : faq.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(faq);
    });

    Object.entries(grouped).forEach(([section, items]) => {
      checkSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(200, 30, 30);
      doc.text(section, margin, y);
      y += 2;
      doc.setDrawColor(200, 30, 30);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      items.forEach((faq, i) => {
        checkSpace(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const qLines = doc.splitTextToSize(`${i + 1}. ${faq.question}`, maxWidth);
        doc.text(qLines, margin, y);
        y += qLines.length * 5 + 2;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const aLines = doc.splitTextToSize(faq.answer, maxWidth);
        aLines.forEach((line: string) => {
          checkSpace(6);
          doc.text(line, margin, y);
          y += 5;
        });
        y += 6;
      });
      y += 4;
    });

    doc.save("Kubera_FAQ.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "general", "challenge"].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
        <Button variant="outline" onClick={handleExportPdf}>
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </Button>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" /> Add FAQ
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No FAQs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Question</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Order</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaqs.map((faq) => (
                  <tr key={faq.id} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
                        {faq.category}
                      </span>
                      {faq.sub_category && (
                        <span className="text-xs text-muted-foreground ml-2">{faq.sub_category}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="font-medium text-sm truncate">{faq.question}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded ${faq.is_active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}
                      >
                        {faq.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{faq.sort_order}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(faq)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(faq)}
                          disabled={deletingId === faq.id}
                        >
                          {deletingId === faq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formCategory === "general" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sub-category</label>
                  <Select value={formSubCategory} onValueChange={setFormSubCategory}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {SUB_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Input value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Answer</label>
              <Textarea value={formAnswer} onChange={(e) => setFormAnswer(e.target.value)} rows={5} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={formIsActive ? "active" : "hidden"} onValueChange={(v) => setFormIsActive(v === "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingFaq ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FAQManagement;
