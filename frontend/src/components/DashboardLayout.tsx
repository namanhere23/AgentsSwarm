import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { useSwarmStore } from '../stores/useSwarmStore';

export const DashboardLayout: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const activeSwarmId = useSwarmStore((state) => state.activeSwarmId);
  const navigate = useNavigate();
  const navItems = [
    { path: '/dashboard', label: 'Swarm Launcher', end: true },
    {
      path: activeSwarmId ? `/dashboard/trace/${activeSwarmId}` : '/dashboard/trace',
      label: 'Live Trace',
      end: false,
    },
    { path: '/dashboard/approvals', label: 'Approvals', end: false },
    { path: '/dashboard/memory', label: 'Memory Explorer', end: false },
    { path: '/dashboard/crews', label: 'Crew Manager', end: false },
    { path: '/dashboard/audit', label: 'Audit Log', end: false },
    { path: '/dashboard/system', label: 'System Status', end: false },
  ];

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      logout();
      navigate('/login');
    } catch {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden">
      <div className="absolute inset-0 bg-dark-bg z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-magenta/10 blur-[120px] mix-blend-screen"></div>
      </div>

      <aside className="w-64 z-10 flex-shrink-0 border-r border-edge-default bg-surface-elevated/80 backdrop-blur-xl flex flex-col shadow-2xl">
        <div className="p-6 border-b border-edge-default">
          <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-magenta drop-shadow-md">AGENT SWARMS</h1>
          <p className="text-[11px] text-ink-mute mt-1 uppercase tracking-[0.2em] font-semibold">Command Center</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 px-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-xl transition-all duration-300 text-[15px] font-medium tracking-wide ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,229,255,0.1)] translate-x-1'
                        : 'text-ink-mute hover:bg-surface hover:text-ink hover:translate-x-1 border border-transparent'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-edge-default bg-surface/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-ink-mute hover:text-ink hover:bg-surface rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
        <Outlet />
      </main>
    </div>
  );
};
