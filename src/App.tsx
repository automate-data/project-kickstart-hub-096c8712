import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CondominiumProvider, useCondominium } from "@/hooks/useCondominium";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ReceivePackage from "./pages/ReceivePackage";
import Packages from "./pages/Packages";
import Residents from "./pages/Residents";
import Staff from "./pages/Staff";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading: authLoading, role } = useAuth();
  const { needsSetup, isLoading: condLoading } = useCondominium();

  if (authLoading || (user && condLoading)) {
    return null;
  }

  // If admin and needs setup, redirect to /setup
  const shouldRedirectToSetup = user && role === 'admin' && needsSetup;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route
        path="/setup"
        element={
          <ProtectedRoute requiredRole="admin">
            <Setup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><Dashboard /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/receive"
        element={
          <ProtectedRoute>
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><ReceivePackage /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/packages"
        element={
          <ProtectedRoute>
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><Packages /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/residents"
        element={
          <ProtectedRoute requiredRole="admin">
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><Residents /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute requiredRole="admin">
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><Staff /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CondominiumProvider>
            <AppRoutes />
          </CondominiumProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
