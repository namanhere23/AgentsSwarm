/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

const TAGLINES = [
  'Multi-Agent Orchestration.',
  'Autonomous Intelligence.',
  'Coordinated Execution.',
  'Distributed Cognition.',
];

export const Login: React.FC = () => {
  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(false);
  const [taglineIdx, setTaglineIdx]   = useState(0);
  const [mousePos, setMousePos]       = useState({ x: 0, y: 0 });

  /* Cycle taglines */
  useEffect(() => {
    const id = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 3000);
    return () => clearInterval(id);
  }, []);

  /* Subtle parallax on left panel */
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = (currentTarget as HTMLElement).getBoundingClientRect();
    setMousePos({ x: (clientX / width - 0.5) * 20, y: (clientY / height - 0.5) * 20 });
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const token  = await result.user.getIdToken(true);
      login(token, result.user.uid);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen bg-canvas overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── Left Hero Panel ─────────────────────────────── */}
      <motion.div
        className="relative hidden lg:flex flex-col justify-between w-[55%] bg-black p-12 overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ambient glow blobs */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
            x: mousePos.x,
            y: mousePos.y,
          }}
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'spring', stiffness: 40, damping: 20 }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #d946ef, transparent 70%)' }}
          animate={{ x: -mousePos.x * 0.5, y: -mousePos.y * 0.5 }}
          transition={{ type: 'spring', stiffness: 30, damping: 20 }}
        />

        {/* Thin left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-primary to-transparent opacity-60" />

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-3">
            Agent Swarms
          </span>
        </motion.div>

        {/* Hero headline */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display font-black leading-[0.95] tracking-tight">
              <span
                className="block text-white"
                style={{ fontSize: 'clamp(52px, 6vw, 80px)' }}
              >
                INTELLIGENCE
              </span>
              <span
                className="block text-white italic font-normal"
                style={{ fontSize: 'clamp(52px, 6vw, 80px)' }}
              >
                IS
              </span>
              <span
                className="block text-gradient-blue"
                style={{ fontSize: 'clamp(52px, 6vw, 80px)' }}
              >
                CONTAGIOUS.
              </span>
            </h1>

            {/* Animated tagline */}
            <div className="mt-8 h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={taglineIdx}
                  className="text-[13px] font-medium tracking-[0.18em] uppercase text-ink-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {TAGLINES[taglineIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Bottom status row */}
        <motion.div
          className="flex items-center gap-6 relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          {[
            { color: 'bg-emerald', label: 'System Online' },
            { color: 'bg-primary', label: 'Agents Ready'  },
            { color: 'bg-ink-4',   label: 'Standby Mode'  },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
              </span>
              <span className="text-[11px] tracking-widest uppercase text-ink-4">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Thin vertical divider */}
      <div className="hidden lg:block w-px bg-border self-stretch" />

      {/* ── Right Auth Panel ─────────────────────────────── */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-center p-8 bg-canvas-soft relative"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '200px',
          }}
        />

        <motion.div
          className="w-full max-w-[380px] relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          {/* AS monogram */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <img 
              src="/logo.jpeg" 
              alt="Agent Swarms Logo" 
              className="w-16 h-16 rounded-2xl shadow-glow-blue object-cover"
              onError={(e) => { 
                e.currentTarget.style.display='none'; 
                e.currentTarget.parentElement!.insertAdjacentHTML('afterbegin', '<div class="w-16 h-16 rounded-2xl bg-gradient-blue flex items-center justify-center shadow-glow-blue"><span class="font-display font-black text-white text-2xl">AS</span></div>');
              }} 
            />
            <div className="text-center">
              <h2 className="font-display font-bold text-[26px] text-ink tracking-tight">
                Welcome back
              </h2>
              <p className="text-[13px] text-ink-4 mt-1">
                Sign in to access your command center
              </p>
            </div>
          </div>

          {/* Thin divider */}
          <div className="w-full h-px bg-border mb-8" />

          {/* Google Sign-In */}
          <motion.button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border py-3.5 px-5 text-[15px] font-medium text-ink transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            whileHover={{ borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.06)' }}
            whileTap={{ scale: 0.98 }}
          >
            {/* hover glow border */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.4)' }}
            />

            {loading ? (
              <svg className="animate-spin h-5 w-5 text-ink-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                {/* Google G icon */}
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </motion.button>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-ink-5 tracking-wide">
            Secured by Firebase Authentication
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
