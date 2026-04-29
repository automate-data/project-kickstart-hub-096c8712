import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading, mustChangePassword, isPasswordRecovery, signOut } = useAuth();

  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Acesso pendente</h1>
            <p className="text-muted-foreground">
              Sua conta ainda não tem permissão de acesso. Entre em contato com o administrador do sistema.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole === 'superadmin' && role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (role !== 'superadmin' && !allowedRoles.includes(role as AppRole)) {
      return <Navigate to="/" replace />;
    }
  } else if (requiredRole && requiredRole !== 'superadmin' && role !== requiredRole && role !== 'admin' && role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
