import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoadingSkeleton } from './Skeletons';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
      } else if (!allowedRoles.includes(role)) {
        // Redirect unauthorized users to the dashboard instead of just blocking them
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, role, allowedRoles, navigate]);

  if (isLoading) {
    return <AppLoadingSkeleton />;
  }

  // If not authenticated or role is not allowed, don't render children
  if (!isAuthenticated || !allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
