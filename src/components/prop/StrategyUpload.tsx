import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StrategyUploadProps {
  accountId: string;
  userId: string;
}

const StrategyUpload = ({ accountId, userId }: StrategyUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [strategy, setStrategy] = useState<{
    id: string;
    file_name: string;
    status: string;
    admin_notes?: string;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategy();
  }, [accountId]);

  const loadStrategy = async () => {
    try {
      const { data, error } = await supabase
        .from("trader_strategies")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setStrategy(data);
      }
    } catch (e) {
      // No strategy yet
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${userId}/${accountId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("strategies")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage path (not a public URL) since the bucket is private
      const { error: insertError } = await supabase
        .from("trader_strategies")
        .insert({
          user_id: userId,
          account_id: accountId,
          file_url: fileName,
          file_name: file.name,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast({
        title: "Strategy uploaded",
        description: "Your trading strategy has been submitted for review",
      });

      loadStrategy();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload strategy",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Trading Strategy Document
        </CardTitle>
        <CardDescription>
          As a funded trader, you are required to submit a PDF explaining your trading strategy. 
          Payouts may be denied if your actual trading deviates significantly from your stated strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Important Notice</p>
              <p className="text-muted-foreground mt-1">
                By submitting your strategy, you agree that Kubera Markets reserves the right to deny payouts 
                if your trading activity does not align with your stated strategy. All funded traders must 
                demonstrate consistent adherence to their declared trading methodology.
              </p>
            </div>
          </div>
        </div>

        {strategy ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{strategy.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(strategy.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {getStatusBadge(strategy.status)}
            </div>

            {strategy.status === "rejected" && strategy.admin_notes && (
              <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                <p className="font-medium text-destructive">Reason for rejection:</p>
                <p className="text-muted-foreground">{strategy.admin_notes}</p>
              </div>
            )}

            {strategy.status === "rejected" && (
              <div className="space-y-2">
                <Label htmlFor="reupload">Upload New Strategy</Label>
                <Input
                  id="reupload"
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="strategy-upload">Upload Strategy PDF</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Input
                id="strategy-upload"
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="strategy-upload" className="cursor-pointer">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload your strategy PDF</p>
                    <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrategyUpload;