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
import SelectCondominium from "./pages/SelectCondominium";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Reports from "./pages/Reports";
import AdvancedSettings from "./pages/AdvancedSettings";
import SuperAdmin from "./pages/SuperAdmin";
import TowerDashboard from "./pages/TowerDashboard";
import TowerCollect from "./pages/TowerCollect";
import TowerAdminDashboard from "./pages/TowerAdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading: authLoading, role, isPasswordRecovery } = useAuth();
  const { needsSetup, isLoading: condLoading } = useCondominium();

  if (authLoading || (user && !isPasswordRecovery && condLoading)) {
    return null;
  }

  // If admin and needs setup, redirect to /setup
  const shouldRedirectToSetup = user && role === 'admin' && needsSetup;
  const shouldRedirectToTower = user && role === 'tower_doorman';
  const shouldRedirectToTowerAdmin = user && role === 'tower_admin';

  return (
    <Routes>
      <Route path="/auth" element={user && !isPasswordRecovery ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/auth" replace />} />
      <Route
        path="/setup"
        element={
          <ProtectedRoute requiredRole="admin">
            <Setup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/select-condominium"
        element={
          <ProtectedRoute>
            <SelectCondominium />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : 
             shouldRedirectToTower ? <Navigate to="/tower-dashboard" replace /> :
             shouldRedirectToTowerAdmin ? <Navigate to="/tower-admin-dashboard" replace /> : (
              <AppLayout><Dashboard /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/tower-dashboard"
        element={
          <ProtectedRoute>
            <TowerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tower-collect"
        element={
          <ProtectedRoute>
            <TowerCollect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tower-admin-dashboard"
        element={
          <ProtectedRoute>
            <TowerAdminDashboard />
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
          <ProtectedRoute allowedRoles={['admin', 'tower_admin']}>
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
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><Reports /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/advanced-settings"
        element={
          <ProtectedRoute requiredRole="admin">
            {shouldRedirectToSetup ? <Navigate to="/setup" replace /> : (
              <AppLayout><AdvancedSettings /></AppLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <SuperAdmin />
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
