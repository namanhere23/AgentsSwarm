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
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden relative">
      {/* Background ambient light mesh */}
      <div className="absolute inset-0 gradient-mesh-backdrop"></div>

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-canvas-soft/40 backdrop-blur-2xl border-r border-hairline flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-6 border-b border-hairline/50 relative overflow-hidden">
          {/* Subtle neon accent */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-magenta to-ruby opacity-70"></div>
          
          <h1 className="text-[20px] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-magenta mb-1">
            AGENT SWARMS
          </h1>
          <p className="text-[11px] text-ink-mute uppercase tracking-[0.2em] font-medium">Command Center</p>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 px-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center px-4 py-3 rounded-xl transition-all duration-300 text-[14px] font-medium relative overflow-hidden ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'text-ink-mute hover:bg-canvas-soft/80 hover:text-ink hover:border hover:border-hairline-input border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-primary rounded-r-full shadow-[0_0_8px_#3b82f6]"></div>
                      )}
                      <span className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-5 border-t border-hairline/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm text-ink-mute/80 hover:text-ruby hover:bg-ruby/10 border border-transparent hover:border-ruby/20 rounded-xl transition-all duration-300 group"
          >
            <svg className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative z-0">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-canvas-soft/80 to-transparent pointer-events-none -z-10"></div>
        <Outlet />
      </main>
    </div>
  );
};
