import React from "react";
import { Keyboard, Sparkles } from "lucide-react";
import { Modal, Kbd } from "@/components/ui";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ["/"], desc: "Focus search / barcode input" },
  { keys: ["Enter"], desc: "In search: add the exact SKU match or the only result" },
  { keys: ["F2", "Ctrl + Enter"], desc: "Open checkout" },
  { keys: ["F4"], desc: "Hold the current ticket" },
  { keys: ["F9"], desc: "Open held tickets" },
  { keys: ["Esc"], desc: "Close dialogs / clear search" },
  { keys: ["?"], desc: "Show this cheat-sheet" },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => (
  <Modal
    open={isOpen}
    onClose={onClose}
    size="sm"
    title={
      <span className="flex items-center gap-2">
        <Keyboard className="h-5 w-5 text-brand-text" />
        Keyboard shortcuts
      </span>
    }
    description="Speed keys for cashiers using a keyboard or barcode scanner."
  >
    <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface-2/40">
      {SHORTCUTS.map((s) => (
        <li key={s.desc} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="text-sm text-fg-muted">{s.desc}</span>
          <span className="flex shrink-0 flex-wrap justify-end gap-1">
            {s.keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </span>
        </li>
      ))}
    </ul>
    <p className="mt-3 flex items-start gap-2 text-xs text-fg-subtle">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
      Barcode scanners type the code and press Enter automatically — keep the search box focused to scan items straight into the ticket.
    </p>
  </Modal>
);
