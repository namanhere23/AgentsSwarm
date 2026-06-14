import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { ShortcutsModal } from './ShortcutsModal';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden relative">
      <ShortcutsModal open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      
      {/* Background ambient light mesh */}
      <div className="absolute inset-0 gradient-mesh-backdrop"></div>

      {/* Sidebar */}
      <aside 
        className={`flex-shrink-0 bg-canvas-soft/40 backdrop-blur-2xl border-r border-hairline flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-6 border-b border-hairline/50 relative overflow-hidden flex items-center justify-between">
          {/* Subtle neon accent */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-magenta to-ruby opacity-70"></div>
          
          <Link to="/dashboard" className={`block transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100 block'}`}>
            <h1 className="text-[20px] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-magenta mb-1 hover:opacity-80 transition-opacity">
              AGENT SWARMS
            </h1>
            <p className="text-[11px] text-ink-mute uppercase tracking-[0.2em] font-medium">Command Center</p>
          </Link>
          
          {isSidebarCollapsed && (
            <Link to="/dashboard" className="mx-auto block text-center">
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-magenta">AS</span>
            </Link>
          )}

          {/* Sidebar Toggle Button (Hidden on collapsed, shows on hover or uncollapsed if desired) */}
          {!isSidebarCollapsed && (
             <button 
                onClick={() => setIsSidebarCollapsed(true)} 
                className="text-ink-mute hover:text-primary transition-colors p-1"
                title="Collapse Sidebar (Ctrl+B)"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isSidebarCollapsed && (
           <div className="p-4 border-b border-hairline/50 flex justify-center">
             <button 
                onClick={() => setIsSidebarCollapsed(false)} 
                className="text-ink-mute hover:text-primary transition-colors p-2 rounded-lg bg-canvas-soft hover:bg-primary/10"
                title="Expand Sidebar (Ctrl+B)"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
           </div>
        )}

        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <ul className={`space-y-2 px-4 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-xl transition-all duration-300 text-[14px] font-medium relative overflow-hidden ${
                      isSidebarCollapsed ? 'justify-center py-3 px-0' : 'px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'text-ink-mute hover:bg-canvas-soft/80 hover:text-ink hover:border hover:border-hairline-input border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-primary rounded-r-full shadow-[0_0_8px_#3b82f6]`}></div>
                      )}
                      
                      {/* Extract the emoji from the label to use as icon when collapsed */}
                      {isSidebarCollapsed ? (
                        <span className="text-lg">{item.label.split(' ')[0]}</span>
                      ) : (
                        <span className={`transition-transform duration-300 whitespace-nowrap ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Global Shortcuts Hint */}
        {!isSidebarCollapsed && (
          <div className="px-6 py-4">
             <button 
               onClick={() => setIsShortcutsOpen(true)}
               className="w-full text-xs text-ink-mute/70 hover:text-primary transition-colors flex items-center justify-between p-2 rounded-lg hover:bg-canvas-soft border border-transparent hover:border-hairline"
             >
                <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Shortcuts</span>
                <kbd className="px-1.5 py-0.5 bg-canvas rounded border border-hairline/50 font-mono font-semibold">?</kbd>
             </button>
          </div>
        )}

        <div className={`p-5 border-t border-hairline/50 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={handleSignOut}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center justify-center py-2.5 text-sm text-ink-mute/80 hover:text-ruby hover:bg-ruby/10 border border-transparent hover:border-ruby/20 rounded-xl transition-all duration-300 group ${
              isSidebarCollapsed ? 'px-0' : 'px-4'
            }`}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1 ${!isSidebarCollapsed ? 'mr-2' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative z-0 transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-canvas-soft/80 to-transparent pointer-events-none -z-10"></div>
        <Outlet />
      </main>
    </div>
  );
};
