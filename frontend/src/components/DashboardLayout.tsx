import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';

const navItems = [
  { path: '/dashboard', label: '⚡ Swarm Launcher', end: true },
  { path: '/dashboard/trace', label: '📡 Live Trace', end: false },
  { path: '/dashboard/approvals', label: '✅ Approvals', end: false },
  { path: '/dashboard/memory', label: '🧠 Memory Explorer', end: false },
  { path: '/dashboard/crews', label: '🤖 Crew Manager', end: false },
  { path: '/dashboard/audit', label: '📋 Audit Log', end: false },
  { path: '/dashboard/system', label: '🔧 System Status', end: false },
];

export const DashboardLayout: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      logout();
      navigate('/login');
    } catch {
      // Force logout even if Firebase signOut fails
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-edge-default bg-surface-elevated flex flex-col">
        <div className="p-6 border-b border-edge-default">
          <h1 className="text-lg font-bold tracking-wider text-cobalt">AGENT SWARMS</h1>
          <p className="text-xs text-ink-mute mt-1 uppercase tracking-widest">Command Center</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                      isActive
                        ? 'bg-cobalt/10 text-cobalt border border-cobalt/20'
                        : 'text-ink-mute hover:bg-surface hover:text-ink'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-edge-default">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-ink-mute hover:text-ink hover:bg-surface rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-canvas">
        <Outlet />
      </main>
    </div>
  );
};
