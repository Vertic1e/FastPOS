"use client";

import { ArrowLeft, MonitorSmartphone, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function PrintBar({ auto, orderNumber }: { auto: boolean; orderNumber: number }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!auto || fired.current) return;
    fired.current = true;
    const t = setTimeout(() => window.print(), 450);
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <div className="no-print mx-auto mb-5 flex w-[320px] flex-col items-center gap-3">
      <button
        onClick={() => window.print()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1814] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
      >
        <Printer size={16} />
        Print receipt #{orderNumber}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-[#1c1814]/50">
        Works with any printer — thermal 80mm, A4, or save as PDF.
        <br />
        Uses your browser&apos;s native print dialog.
      </p>
      <div className="flex gap-4">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1c1814]/60 hover:text-[#1c1814]">
          <ArrowLeft size={13} />
          Orders
        </Link>
        <Link href="/pos" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1c1814]/60 hover:text-[#1c1814]">
          <MonitorSmartphone size={13} />
          Back to register
        </Link>
      </div>
    </div>
  );
}
