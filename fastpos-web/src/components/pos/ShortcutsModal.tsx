import React from "react";
import { X, Command, Sparkles } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "/", desc: "Focus Search / Barcode input" },
    { key: "F2 or Ctrl+Enter", desc: "Open Checkout & Pay immediately" },
    { key: "Space", desc: "Hold Current Sale / Park Ticket" },
    { key: "Esc", desc: "Close Modals / Clear Search query" },
    { key: "?", desc: "Toggle this Keyboard Shortcuts Cheatsheet" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Speed Shortcuts</h3>
              <p className="text-[11px] text-slate-400">Lightning-fast cashier hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80"
            >
              <span className="text-xs text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold text-teal-300 bg-slate-800 border border-slate-700 rounded-lg shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Tip: Barcode scanners send an automatic Enter key to instantly add scanned items.</span>
        </div>
      </div>
    </div>
  );
};
