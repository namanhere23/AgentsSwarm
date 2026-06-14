import React, { useEffect } from 'react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'Ctrl + B', label: 'Toggle Sidebar', desc: 'Expand or collapse the navigation sidebar' },
  { key: '?', label: 'Show Shortcuts', desc: 'Display this keyboard shortcuts menu' },
  { key: 'Esc', label: 'Close Modal', desc: 'Close open modals or sidebars' },
  { key: 'Ctrl + L', label: 'Clear Logs', desc: 'Clear terminal or trace logs (where applicable)' }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: '#0f1115' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/5 flex justify-between items-center relative bg-white/[0.02]">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-fuchsia-500 to-rose-500 opacity-90"></div>
          
          <h2 className="text-lg font-bold text-white flex items-center tracking-wide">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-all hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <ul className="space-y-1">
            {shortcuts.map((s, i) => (
              <li key={i} className="flex justify-between items-center px-4 py-3 hover:bg-white/[0.04] transition-colors rounded-lg group">
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-gray-200 group-hover:text-white transition-colors">{s.label}</span>
                  <span className="text-[13px] text-gray-500 mt-0.5">{s.desc}</span>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <kbd className="px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-md text-[13px] font-mono text-blue-400 shadow-sm font-bold tracking-wider">
                    {s.key}
                  </kbd>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-white/5 text-center bg-white/[0.01]">
          <p className="text-[13px] text-gray-500 font-medium">Pro tip: Use these to speed up your workflow.</p>
        </div>
      </div>
    </div>
  );
};
