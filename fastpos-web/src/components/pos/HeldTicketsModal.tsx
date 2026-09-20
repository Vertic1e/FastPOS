import React from "react";
import { Play, Trash2, Clock, PauseCircle, Hash } from "lucide-react";
import type { HeldTicket, StoreSettings } from "@/types";
import { money, formatTime } from "@/lib/format";
import { Modal, Button, EmptyState } from "@/components/ui";

interface HeldTicketsModalProps {
  open: boolean;
  tickets: HeldTicket[];
  onClose: () => void;
  onResume: (ticket: HeldTicket) => void;
  onDelete: (id: number) => void;
  settings: StoreSettings;
}

function ageLabel(d: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export const HeldTicketsModal: React.FC<HeldTicketsModalProps> = ({ open, tickets, onClose, onResume, onDelete, settings }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Held tickets"
      description={`${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} waiting to be resumed`}
    >
      {tickets.length === 0 ? (
        <EmptyState icon={<PauseCircle />} title="No held tickets" description="Use Hold in the ticket panel to park an order and come back to it later." />
      ) : (
        <ul className="flex flex-col gap-2">
          {tickets.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2/50 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
                <Hash className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 basis-32">
                <p className="truncate text-sm font-bold text-fg">{t.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                  <span className="num">
                    {t.itemCount} {t.itemCount === 1 ? "item" : "items"} · {money(t.subtotal, settings.currency)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(t.createdAt)} · {ageLabel(t.createdAt)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="md" iconOnly aria-label={`Delete ${t.name}`} className="hover:bg-bad-soft hover:text-bad" onClick={() => t.id != null && onDelete(t.id)}>
                  <Trash2 className="h-4.5 w-4.5" />
                </Button>
                <Button variant="primary" size="md" leftIcon={<Play className="h-4 w-4 fill-current" />} onClick={() => onResume(t)}>
                  Resume
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
