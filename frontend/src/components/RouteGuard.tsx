import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { AuthLoadingSpinner } from './AuthLoadingSpinner';

export const RouteGuard: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        login(idToken, user.uid);
      } else {
        logout();
      }
      setChecking(false);
    });

    return () => unsubscribe();
  }, [login, logout]);

  if (checking) {
    return <AuthLoadingSpinner />;
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};
