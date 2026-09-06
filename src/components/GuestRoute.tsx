import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoadingSkeleton } from './Skeletons';

interface GuestRouteProps {
  children: React.ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If the user was trying to go somewhere before login, redirect there
      // Otherwise default to the dashboard
      const from = (location.state as { from?: string } | null)?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return <AppLoadingSkeleton />;
  }

  // If authenticated, don't render auth screens
  if (isAuthenticated) return null;
  return <>{children}</>;
}
