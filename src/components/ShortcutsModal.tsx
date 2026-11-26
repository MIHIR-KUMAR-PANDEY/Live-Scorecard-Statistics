import { X } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'A', desc: 'Focus single-score input to add a score' },
  { key: 'R', desc: 'Insert a random 32-bit score or Unseen mix' },
  { key: 'Space', desc: 'Play or pause Live Event judge stream' },
  { key: 'P', desc: 'Toggle Presentation mode' },
  { key: 'T', desc: 'Run all 17 verification tests' },
  { key: '?', desc: 'Open or close this keyboard shortcuts dialog' },
  { key: 'Esc', desc: 'Close overlays or exit Presentation mode' },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="scoreboard-panel w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--panel-head)] border-b border-[var(--line)] px-4 py-3 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-sm font-bold m-0">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1.5 rounded-[4px] border border-[var(--line)] text-[var(--ink)] bg-transparent cursor-pointer hover:bg-[var(--bg)]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--line)] last:border-b-0 text-sm"
            >
              <span className="text-[var(--ink)]">{item.desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono-data font-bold rounded-[4px] border border-[var(--line)] bg-[var(--bg)] text-[var(--med)] shrink-0">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
