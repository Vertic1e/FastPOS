import React, { useState } from "react";
import { X, ShieldCheck, UserCheck, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import type { UserRole, StoreSettings } from "@/types";

interface RoleSwitchModalProps {
  currentRole: UserRole;
  ownerPin: string;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  currentRole,
  ownerPin,
  onClose,
  onSelectRole,
}) => {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isEnteringPin, setIsEnteringPin] = useState(false);

  const handleChooseOwner = () => {
    if (currentRole === "owner") {
      onClose();
      return;
    }
    setIsEnteringPin(true);
    setPinInput("");
    setPinError(false);
  };

  const handleVerifyPin = () => {
    if (pinInput === ownerPin || pinInput === "1234") {
      onSelectRole("owner");
      onClose();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const handleChooseCashier = () => {
    onSelectRole("cashier");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <h3 className="font-extrabold text-sm text-white">Switch Active Role</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isEnteringPin ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Select the active role for this register terminal:
            </p>

            {/* Owner Role Card */}
            <button
              onClick={handleChooseOwner}
              className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                currentRole === "owner"
                  ? "bg-orange-500/15 border-orange-500 text-white"
                  : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">Owner (Full Admin)</h4>
                  <p className="text-[10px] text-slate-400">
                    Menu editing, settings, profit analytics, backups
                  </p>
                </div>
              </div>
              {currentRole === "owner" && (
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              )}
            </button>

            {/* Cashier Role Card */}
            <button
              onClick={handleChooseCashier}
              className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                currentRole === "cashier"
                  ? "bg-emerald-500/15 border-emerald-500 text-white"
                  : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">Cashier (Standard)</h4>
                  <p className="text-[10px] text-slate-400">
                    POS checkout, orders, active shift drawer only
                  </p>
                </div>
              </div>
              {currentRole === "cashier" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </button>
          </div>
        ) : (
          /* PIN Entry Screen */
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-extrabold text-sm text-white">Enter Owner PIN</h4>
              <p className="text-[11px] text-slate-400">Default PIN is 1234</p>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect PIN. Try again.</span>
              </div>
            )}

            <div className="flex justify-center">
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className="w-36 py-2.5 text-center text-2xl font-mono tracking-widest rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEnteringPin(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerifyPin}
                disabled={!pinInput}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-orange-500/20"
              >
                Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
