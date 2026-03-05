import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BrowseBooks from "./pages/BrowseBooks";
import BookDetail from "./pages/BookDetail";
import CustomerDashboard from "./pages/CustomerDashboard";
import StoreDashboard from "./pages/StoreDashboard";
import StoreMenu from "./pages/StoreMenu";
import ShopPage from "./pages/ShopPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import ForgotPasswordPage from "./pages/ForgotPassword";
import VerifyAccountPage from "./pages/VerifyAccount";
import Settings from "./pages/Settings";
import WalletPage from "./pages/Wallet";
import WalletTopupPage from "./pages/WalletTopup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/browse" element={<BrowseBooks />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/shop/:shopId" element={<ShopPage />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/store" element={<StoreMenu />} />
          <Route path="/store/dashboard" element={<StoreDashboard />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/verify" element={<VerifyAccountPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/topup" element={<WalletTopupPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
