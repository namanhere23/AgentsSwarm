import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'Ctrl + B',  label: 'Toggle Sidebar',  desc: 'Expand or collapse the navigation sidebar' },
  { key: '?',         label: 'Show Shortcuts',   desc: 'Display this keyboard shortcuts menu'      },
  { key: 'Esc',       label: 'Close Modal',      desc: 'Close any open modal or overlay'           },
  { key: 'Ctrl + L',  label: 'Clear Logs',       desc: 'Clear terminal or trace logs (where applicable)' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          <motion.div
            key="shortcuts-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            className="w-full max-w-md glass-md rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-brand w-full" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Zap size={16} className="text-primary" />
                <h2 className="text-[15px] font-bold text-ink tracking-wide">Keyboard Shortcuts</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-2 hover:text-ruby hover:bg-ruby/10 transition-all"
                whileTap={{ scale: 0.9 }}
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Shortcuts list */}
            <div className="p-2">
              <ul className="space-y-0.5">
                {shortcuts.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-ink-2 group-hover:text-ink transition-colors">{s.label}</p>
                      <p className="text-[12px] text-ink-5 mt-0.5">{s.desc}</p>
                    </div>
                    <kbd className="flex-shrink-0 ml-4 px-2.5 py-1.5 bg-canvas rounded-xl border border-border font-mono text-[12px] text-primary font-bold tracking-widest">
                      {s.key}
                    </kbd>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="px-5 py-3.5 border-t border-border bg-canvas-1 text-center">
              <p className="text-[12px] text-ink-5">Pro tip: These shortcuts speed up your command center workflow.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
