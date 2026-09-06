import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoadingSkeleton } from './Skeletons';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Pass the current location in state so we can redirect back after login
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return <AppLoadingSkeleton />;
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
