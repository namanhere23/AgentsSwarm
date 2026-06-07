/// <reference types="vite/client" />
import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

// In production, these are injected via environment settings. 
// Firebase requires configuration to run OAuth popup flows
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const Login: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken(true);
      login(token, result.user.uid);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh-backdrop z-0 pointer-events-none"></div>
      <div className="w-full max-w-md card-feature-light z-10 relative">
        <div className="mb-8 text-center">
          <h1 className="display-md text-ink">Agent Swarms</h1>
          <p className="mt-2 caption text-ink-mute">Multi-Agent Operating System Coordinator</p>
        </div>
        
        {error && (
          <div className="mb-4 rounded-md bg-ruby/10 border border-ruby/20 p-3 text-xs text-ruby">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="button-primary-pill w-full mt-4 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-on-primary" />
          ) : (
            <>
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};
