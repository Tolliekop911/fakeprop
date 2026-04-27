import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import Index from "./pages/Index";
import PropLogin from "./pages/PropLogin";
import PropDashboard from "./pages/PropDashboard";
import PropAccountDetail from "./pages/PropAccountDetail";
import PropProfile from "./pages/prop/PropProfile";
import PropCompleteProfile from "./pages/prop/PropCompleteProfile";
import PropSecurity from "./pages/prop/PropSecurity";
import PropSupport from "./pages/prop/PropSupport";
import PropChallenges from "./pages/prop/PropChallenges";
import PropReports from "./pages/prop/PropReports";
import PropKyc from "./pages/prop/PropKyc";
import PropWithdraw from "./pages/prop/PropWithdraw";
import PropFunded from "./pages/prop/PropFunded";
import PropChooseChallenge from "./pages/prop/PropChooseChallenge";
import PropContract from "./pages/prop/PropContract";
import PropAffiliate from "./pages/prop/PropAffiliate";
import PropPayments from "./pages/prop/PropPayments";
import PropPaymentMethod from "./pages/prop/PropPaymentMethod";
import PropCertificates from "./pages/prop/PropCertificates";
import PropFaq from "./pages/prop/PropFaq";
import PropStrategy from "./pages/prop/PropStrategy";
import PropContact from "./pages/prop/PropContact";
import PropDemo from "./pages/prop/PropDemo";
import AdminDashboard from "./pages/AdminDashboard";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminDataImport from "./pages/admin/AdminDataImport";
import Affiliates from "./pages/Affiliates";
import FAQ from "./pages/FAQ";
import FAQAccountSecurity from "./pages/FAQAccountSecurity";
import FAQPlatformTrading from "./pages/FAQPlatformTrading";
import FAQAccountManagement from "./pages/FAQAccountManagement";
import FAQChallenge from "./pages/FAQChallenge";
import CondorDownloads from "./pages/CondorDownloads";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/ChatWidget";
import VersionEasterEgg from "./components/VersionEasterEgg";

const queryClient = new QueryClient();

// Wrapper to conditionally show ChatWidget based on route
const ChatWidgetWrapper = () => {
  const location = useLocation();
  // Hide chat widget on admin pages
  const isHidden = location.pathname.startsWith("/roots");
  if (isHidden) {
    return null;
  }
  return <ChatWidget />;
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.key]);

  return null;
};

const AppRoutes = () => (
  <>
    <ScrollToTop />
    <ChatWidgetWrapper />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/prop" element={<Index />} />
      <Route path="/prop/login" element={<PropLogin />} />
      <Route path="/prop/signup" element={<PropLogin />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/prop/complete-profile" element={<PropCompleteProfile />} />
      <Route path="/prop/dashboard" element={<PropDashboard />} />
      <Route path="/prop/account/:accountId" element={<PropAccountDetail />} />
      <Route path="/prop/profile" element={<PropProfile />} />
      <Route path="/prop/kyc" element={<PropKyc />} />
      <Route path="/prop/withdraw" element={<PropWithdraw />} />
      <Route path="/prop/security" element={<PropSecurity />} />
      <Route path="/prop/support" element={<PropSupport />} />
      <Route path="/prop/challenges" element={<PropChallenges />} />
      <Route path="/prop/funded" element={<PropFunded />} />
      <Route path="/prop/choose-challenge" element={<PropChooseChallenge />} />
        <Route path="/prop/payments" element={<PropPayments />} />
        <Route path="/prop/payment-method" element={<PropPaymentMethod />} />
      <Route path="/prop/certificates" element={<PropCertificates />} />
      <Route path="/prop/reports/trades" element={<PropReports />} />
      <Route path="/prop/reports/summary" element={<PropReports />} />
      <Route path="/prop/contract" element={<PropContract />} />
      <Route path="/prop/affiliate" element={<PropAffiliate />} />
      <Route path="/prop/faq" element={<PropFaq />} />
      <Route path="/prop/strategy" element={<PropStrategy />} />
      <Route path="/prop/demo" element={<PropDemo />} />
      <Route path="/prop/about" element={<About />} />
      <Route path="/prop/contact" element={<PropContact />} />
      <Route path="/roots" element={<AdminAuthGuard allowedRoles={["root", "admin", "moderator"]}><AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary></AdminAuthGuard>} />
      <Route path="/roots/finance" element={<AdminAuthGuard allowedRoles={["root", "admin", "moderator"]}><AdminErrorBoundary><AdminFinance /></AdminErrorBoundary></AdminAuthGuard>} />
      <Route path="/roots/compliance" element={<AdminAuthGuard allowedRoles={["root", "admin", "moderator"]}><AdminErrorBoundary><AdminCompliance /></AdminErrorBoundary></AdminAuthGuard>} />
      <Route path="/roots/import" element={<AdminAuthGuard allowedRoles={["root", "admin"]}><AdminErrorBoundary><AdminDataImport /></AdminErrorBoundary></AdminAuthGuard>} />
      <Route path="/affiliates" element={<Affiliates />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/faq/account-security" element={<FAQAccountSecurity />} />
      <Route path="/faq/platform-trading" element={<FAQPlatformTrading />} />
      
      <Route path="/faq/challenge" element={<FAQChallenge />} />
      <Route path="/faq/downloads" element={<CondorDownloads />} />
      <Route path="/contact" element={<Contact />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VersionEasterEgg />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
