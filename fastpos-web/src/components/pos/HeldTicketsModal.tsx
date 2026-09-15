import React from "react";
import { X, Play, Trash2, Clock, ShoppingBag, Hash } from "lucide-react";
import type { HeldTicket, StoreSettings } from "@/types";
import { money, formatTime } from "@/lib/format";

interface HeldTicketsModalProps {
  tickets: HeldTicket[];
  onClose: () => void;
  onResume: (ticket: HeldTicket) => void;
  onDelete: (id: number) => void;
  settings: StoreSettings;
}

export const HeldTicketsModal: React.FC<HeldTicketsModalProps> = ({
  tickets,
  onClose,
  onResume,
  onDelete,
  settings,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h3 className="font-extrabold text-base text-white">Held / Parked Orders</h3>
            <p className="text-xs text-slate-400">
              {tickets.length} {tickets.length === 1 ? "order" : "orders"} waiting to be resumed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tickets List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-sm text-slate-400">No held orders</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Park an ongoing order by clicking "Hold" in the register ticket drawer
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-750 flex items-center justify-between gap-3 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">{t.name}</span>
                    {t.tableNumber && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {t.tableNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTime(t.createdAt)}
                    </span>
                    <span>•</span>
                    <span>{t.itemCount} items</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {money(t.subtotal, settings.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onDelete(t.id!)}
                    title="Delete Held Ticket"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onResume(t)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
