import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X, Store, Plus, CheckCircle2, MapPin, Phone } from "lucide-react";
import { db } from "@/db";
import type { Shop } from "@/types";

interface ShopSwitchModalProps {
  activeShopId: number;
  onClose: () => void;
  onSelectShop: (shopId: number) => void;
}

export const ShopSwitchModal: React.FC<ShopSwitchModalProps> = ({
  activeShopId,
  onClose,
  onSelectShop,
}) => {
  const shops = useLiveQuery(() => db.shops.toArray()) || [];
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopAddress, setNewShopAddress] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");

  const handleCreateShop = async () => {
    if (!newShopName.trim()) return;

    const newId = (await db.shops.add({
      name: newShopName.trim(),
      address: newShopAddress.trim() || "Branch Address",
      phone: newShopPhone.trim() || "+855 12 000 000",
      isDefault: false,
    })) as number;

    onSelectShop(newId);
    setIsAddingShop(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-400" />
            <h3 className="font-extrabold text-sm text-white">Select Shop / Branch</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {!isAddingShop ? (
            <>
              <div className="space-y-2">
                {shops.map((shop) => {
                  const isActive = shop.id === activeShopId;
                  return (
                    <button
                      key={shop.id}
                      onClick={() => {
                        onSelectShop(shop.id!);
                        onClose();
                      }}
                      className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                        isActive
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-white">{shop.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {shop.address}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setIsAddingShop(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Shop / Branch</span>
              </button>
            </>
          ) : (
            /* Add Shop Form */
            <div className="space-y-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <h4 className="font-bold text-slate-200">Register New Shop Branch</h4>
              <div className="space-y-1">
                <label className="text-slate-400">Shop Name *</label>
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Bistro Express — Airport"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Address</label>
                <input
                  type="text"
                  value={newShopAddress}
                  onChange={(e) => setNewShopAddress(e.target.value)}
                  placeholder="e.g. Terminal 2, Gate 14"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Phone</label>
                <input
                  type="text"
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                  placeholder="e.g. +855 12 888 999"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingShop(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateShop}
                  disabled={!newShopName.trim()}
                  className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold"
                >
                  Create Branch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
