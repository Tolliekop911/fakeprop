import { useState, useEffect, useRef } from "react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, FileText, CheckCircle, Clock, AlertCircle, Loader2, Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KycStatus {
  id: string;
  status: string;
  document_type: string;
  submitted_at: string;
  rejection_reason: string | null;
}

const PropKyc = () => {
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const addressProofInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single();

      setKycStatus(data);
    } catch (error) {
      // No KYC submission yet
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("kyc-documents")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentType) {
      toast({
        variant: "destructive",
        title: "Document Type Required",
        description: "Please select a document type before submitting",
      });
      return;
    }

    if (!documentFront || !selfie || !addressProof) {
      const missing = [];
      if (!documentFront) missing.push("front of your document");
      if (!selfie) missing.push("selfie with document");
      if (!addressProof) missing.push("proof of residency");
      toast({
        variant: "destructive",
        title: "Missing Documents",
        description: `Please upload: ${missing.join(", ")}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timestamp = Date.now();
      const basePath = `${user.id}/${timestamp}`;

      // Upload files with unique prefixed names to avoid collisions
      const frontUrl = await uploadFile(documentFront, `${basePath}/id_front_${timestamp}.${documentFront.name.split('.').pop()}`);
      const backUrl = documentBack 
        ? await uploadFile(documentBack, `${basePath}/id_back_${timestamp}.${documentBack.name.split('.').pop()}`) 
        : null;
      const selfieUrl = await uploadFile(selfie, `${basePath}/selfie_${timestamp}.${selfie.name.split('.').pop()}`);
      const addressProofUrl = await uploadFile(addressProof!, `${basePath}/address_proof_${timestamp}.${addressProof!.name.split('.').pop()}`);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", user.id)
        .single();

      // Create KYC submission
      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user.id,
        user_email: profile?.email || user.email,
        user_name: profile?.full_name,
        document_type: documentType,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        selfie_url: selfieUrl,
        address_proof_url: addressProofUrl,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "KYC Submitted",
        description: "Your verification documents have been submitted for review",
      });

      setDocumentFront(null);
      setDocumentBack(null);
      setSelfie(null);
      setAddressProof(null);
      setDocumentType("");
      fetchKycStatus();
    } catch (error) {
      console.error("Error submitting KYC:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit KYC documents",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-yellow-500">
            <Clock className="w-5 h-5" />
            <span>Pending Review</span>
          </div>
        );
      case "under_review":
        return (
          <div className="flex items-center gap-2 text-blue-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Under Review</span>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span>Verified</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  const FileUploadBox = ({
    label,
    file,
    setFile,
    inputRef,
    icon: Icon,
  }: {
    label: string;
    file: File | null;
    setFile: (file: File | null) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    icon: typeof FileText;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Icon className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <PropDashboardLayout title="KYC Verification">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PropDashboardLayout>
    );
  }

  return (
    <PropDashboardLayout title="KYC Verification">
      <div className="space-y-6">
        {/* Current Status */}
        {kycStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Submitted on {new Date(kycStatus.submitted_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Document: {kycStatus.document_type.replace("_", " ")}
                  </p>
                </div>
                {getStatusBadge(kycStatus.status)}
              </div>
              {kycStatus.status === "rejected" && kycStatus.rejection_reason && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">
                    <strong>Rejection reason:</strong> {kycStatus.rejection_reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submission Form */}
        {(!kycStatus || kycStatus.status === "rejected") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Submit Verification Documents
              </CardTitle>
              <CardDescription>
                Please upload clear photos of your government-issued ID and a selfie for verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Document Type <span className="text-destructive">*</span></Label>
                  <Select value={documentType} onValueChange={setDocumentType} required>
                    <SelectTrigger className={!documentType ? "border-destructive/50" : ""}>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="id_card">National ID Card</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                  {!documentType && (
                    <p className="text-xs text-destructive">You must select a document type before uploading</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUploadBox
                    label="Document Front *"
                    file={documentFront}
                    setFile={setDocumentFront}
                    inputRef={frontInputRef}
                    icon={FileText}
                  />
                  <FileUploadBox
                    label="Document Back (if applicable)"
                    file={documentBack}
                    setFile={setDocumentBack}
                    inputRef={backInputRef}
                    icon={FileText}
                  />
                </div>

                <FileUploadBox
                  label="Selfie with Document *"
                  file={selfie}
                  setFile={setSelfie}
                  inputRef={selfieInputRef}
                  icon={Camera}
                />

                <div className="space-y-2">
                  <FileUploadBox
                    label="Proof of Residency *"
                    file={addressProof}
                    setFile={setAddressProof}
                    inputRef={addressProofInputRef}
                    icon={FileText}
                  />
                  <p className="text-xs text-muted-foreground">
                    Utility bill, bank statement, or government letter. <strong>Must not be older than 3 months.</strong>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  * Required fields. Accepted formats: JPG, PNG, PDF. Max file size: 5MB.
                </p>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Submit for Verification
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {kycStatus?.status === "approved" && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Account Verified</h3>
                <p className="text-muted-foreground mt-2">
                  Your identity has been verified. You have full access to all features.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {kycStatus?.status === "pending" || kycStatus?.status === "under_review" ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Verification In Progress</h3>
                <p className="text-muted-foreground mt-2">
                  Our compliance team is reviewing your documents. This usually takes 1-2 business days.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PropDashboardLayout>
  );
};

export default PropKyc;
