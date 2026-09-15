import React, { useState } from "react";
import { X, Delete, Plus } from "lucide-react";
import { money } from "@/lib/format";

interface NumericKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomItem: (amount: number, name: string) => void;
  currency: string;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  onClose,
  onAddCustomItem,
  currency,
}) => {
  if (!isOpen) return null;

  const [inputVal, setInputVal] = useState("0");
  const [itemName, setItemName] = useState("Custom Item");

  const handleDigit = (digit: string) => {
    if (inputVal === "0" && digit !== ".") {
      setInputVal(digit);
    } else {
      if (digit === "." && inputVal.includes(".")) return;
      if (inputVal.includes(".") && inputVal.split(".")[1]?.length >= 2) return;
      if (inputVal.length >= 7) return;
      setInputVal((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (inputVal.length <= 1) {
      setInputVal("0");
    } else {
      setInputVal((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setInputVal("0");
  };

  const handleAddPreset = (amt: number) => {
    setInputVal(amt.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(inputVal);
    if (amount > 0) {
      onAddCustomItem(amount, itemName.trim() || "Custom Item");
      setInputVal("0");
      onClose();
    }
  };

  const numericValue = parseFloat(inputVal) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <h3 className="font-bold text-white text-base">Quick Custom Price</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 text-center">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Custom Item"
            className="w-full text-center bg-transparent text-xs text-slate-400 focus:text-white focus:outline-none mb-1 font-medium"
          />
          <div className="text-4xl font-extrabold text-white tracking-tight tabular-nums font-mono py-1">
            {money(numericValue, currency)}
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="grid grid-cols-5 gap-1.5 p-3 bg-slate-950/30 border-b border-slate-800">
          {[1, 2, 5, 10, 20].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleAddPreset(val)}
              className="py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xs font-bold text-teal-400 transition"
            >
              +${val}
            </button>
          ))}
        </div>

        {/* 12-key digit pad */}
        <div className="p-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleDigit(key)}
              className="h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-xl font-bold text-white transition flex items-center justify-center shadow-sm"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-800/90 hover:bg-rose-500/20 active:scale-95 text-rose-400 hover:text-rose-300 transition flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={numericValue <= 0}
            className="col-span-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-extrabold text-sm transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
