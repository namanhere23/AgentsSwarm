import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { ShortcutsModal } from './ShortcutsModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Radio, CheckCircle2, Brain, Users, ClipboardList,
  Activity, LogOut, Bell, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/dashboard',          label: 'Swarm Launcher',  Icon: Zap,           end: true  },
  { path: '/dashboard/trace',    label: 'Live Trace',      Icon: Radio,          end: false },
  { path: '/dashboard/approvals',label: 'Approvals',       Icon: CheckCircle2,   end: false },
  { path: '/dashboard/memory',   label: 'Memory Explorer', Icon: Brain,          end: false },
  { path: '/dashboard/crews',    label: 'Crew Manager',    Icon: Users,          end: false },
  { path: '/dashboard/audit',    label: 'Audit Log',       Icon: ClipboardList,  end: false },
  { path: '/dashboard/system',   label: 'System Status',   Icon: Activity,       end: false },
];

export const DashboardLayout: React.FC = () => {
  const logout   = useAuthStore((s) => s.logout);
  const user     = getAuth().currentUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isShortcutsOpen, setShortcuts] = useState(false);

  const handleSignOut = async () => {
    try { await signOut(getAuth()); } catch (err) { console.error(err); }
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((c) => !c);
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen bg-black text-ink overflow-hidden font-sans">
      <ShortcutsModal open={isShortcutsOpen} onClose={() => setShortcuts(false)} />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-shrink-0 flex flex-col relative z-20 bg-[#040404] border-r border-white/[0.05] overflow-hidden"
      >
        {/* Logo / wordmark */}
        <div className="flex items-center justify-between px-4 py-6 flex-shrink-0">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="pl-2"
              >
                <Link to="/dashboard" className="block cursor-pointer z-50 flex items-center gap-3">
                  <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                  <div>
                    <div className="text-[16px] font-bold tracking-[0.05em] text-gradient-brand leading-none">
                      Nexus
                    </div>
                    <div className="text-[9px] tracking-[0.2em] uppercase text-ink-5 mt-1 leading-none">
                      AI Command Center
                    </div>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="mx-auto"
              >
                <Link to="/dashboard" className="cursor-pointer z-50 block">
                  <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement!.innerHTML='<span class="font-display font-black text-[18px] text-gradient-brand">N</span>'; }} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-ink-5 hover:text-ink hover:bg-white/[0.05] transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pb-4">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-lg text-ink-5 hover:text-ink hover:bg-white/[0.05] transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3">
          <ul className="space-y-1">
            {navItems.map(({ path, label, Icon, end }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `relative group flex items-center rounded-xl transition-all duration-200 text-[13px] font-medium ${
                      collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-ink-4 hover:bg-white/[0.03] hover:text-ink-2'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full shadow-glow-blue"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      <Icon
                        size={16}
                        strokeWidth={isActive ? 2.5 : 1.8}
                        className={collapsed ? '' : `mr-3 ${isActive ? 'text-primary' : ''}`}
                      />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className={`whitespace-nowrap transition-colors ${isActive ? 'translate-x-0.5' : ''}`}
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 px-3 py-6 border-t border-white/[0.05]">
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center text-[13px] text-ink-5 hover:text-ink-3 hover:bg-white/[0.03] rounded-xl transition-all duration-200 group ${
              collapsed ? 'justify-center py-3' : 'px-4 py-3 gap-3'
            }`}
          >
            <LogOut size={16} strokeWidth={1.8} className="transition-transform group-hover:-translate-x-0.5 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          
          {!collapsed && (
            <div className="mt-4 px-4 flex items-center justify-between text-[11px] text-ink-5 font-mono">
              <span>STATUS</span>
              <span className="flex items-center gap-1.5 text-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald shadow-glow-emerald"></span>
                OK
              </span>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Main content area ─────────────────────────────── */}
      <main className="flex-1 flex flex-col relative h-full bg-black overflow-hidden">
        
        {/* Top Header Row */}
        <div className="flex-shrink-0 w-full flex justify-end px-8 pt-6 pb-2 z-50 relative">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-[#0a0a0c] border border-white/5 rounded-2xl shadow-2xl">
            <button className="p-2 text-ink-4 hover:text-ink transition-colors">
              <Bell size={18} />
            </button>
            <button className="p-2 text-ink-4 hover:text-ink transition-colors">
              <Settings size={18} />
            </button>
            <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden ml-2 bg-canvas">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-[12px]">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
