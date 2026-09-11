"use client";

import { BadgeCheck, Building2, LayoutGrid, Percent, Printer, RotateCcw, Save, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettingsAction, type SettingsInput } from "@/app/actions/settings";
import { useFontSize, type FontSize } from "@/components/font-provider";
import { Field, PrimaryButton, TextArea, TextInput, Toggle } from "@/components/ui";
import { ACCENTS, getAccent, type AccentKey } from "@/lib/accents";

export function SettingsClient({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const { setFontSize: setRuntimeFontSize } = useFontSize();
  const [form, setForm] = useState<SettingsInput>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSettingsAction(form);
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2600);
      } else {
        setError(res.error ?? "Could not save settings.");
      }
    });
  }

  const accent = getAccent(form.accent);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            Store profile, taxes, receipts, and register layout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="anim-pop flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
              <BadgeCheck size={13} />
              Saved
            </span>
          )}
          {error && (
            <span className="anim-pop rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-600">
              {error}
            </span>
          )}
          <PrimaryButton onClick={save} busy={pending}>
            <Save size={15} />
            Save settings
          </PrimaryButton>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Store profile */}
        <section className="anim-rise rounded-2xl border border-line bg-paper p-5" style={{ animationDelay: "0.08s" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
              <Building2 size={16} />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Store profile</h2>
              <p className="text-[12px] text-ink/45">Shown on receipts and the dashboard.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Store name">
              <TextInput value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </Field>
            <Field label="Address">
              <TextInput value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Financial & Dual Currency */}
        <section className="anim-rise rounded-2xl border border-line bg-paper p-5" style={{ animationDelay: "0.14s" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
              <Percent size={16} />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Financial & Currency</h2>
              <p className="text-[12px] text-ink/45">Tax rates and dual-currency (USD & KHR) configuration.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tax rate (%)" hint="0–30">
                <TextInput
                  value={String(form.taxRate)}
                  inputMode="decimal"
                  onChange={(e) => set("taxRate", parseFloat(e.target.value) || 0)}
                />
              </Field>
              <Field label="Primary symbol" hint="USD base">
                <TextInput
                  value={form.currency}
                  maxLength={3}
                  onChange={(e) => set("currency", e.target.value)}
                />
              </Field>
              <Field label="Secondary symbol" hint="KHR">
                <TextInput
                  value={form.secondaryCurrency}
                  maxLength={6}
                  onChange={(e) => set("secondaryCurrency", e.target.value)}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-line bg-cream/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold">Dual Currency Mode</p>
                  <p className="text-[12px] text-ink/50">Display prices and compute change in both {form.currency} (USD) and {form.secondaryCurrency} (KHR).</p>
                </div>
                <Toggle
                  checked={form.enableDualCurrency}
                  onChange={(v) => set("enableDualCurrency", v)}
                  label=""
                />
              </div>

              {form.enableDualCurrency && (
                <div className="mt-4 pt-3 border-t border-line/60">
                  <div className="grid gap-4 sm:grid-cols-2 items-center">
                    <Field label="Exchange rate" hint="1 USD = X KHR">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink/40">
                          1 {form.currency} =
                        </span>
                        <TextInput
                          className="!pl-20"
                          value={String(form.exchangeRate)}
                          inputMode="numeric"
                          onChange={(e) => set("exchangeRate", parseFloat(e.target.value) || 4000)}
                        />
                      </div>
                    </Field>
                    <div className="rounded-lg bg-white p-3 border border-line text-[12px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink/60">Sample item ($12.50):</span>
                        <span className="font-bold text-ink">
                          {form.currency}12.50 · {Math.round(12.5 * (form.exchangeRate || 4000)).toLocaleString()} {form.secondaryCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">Total with {form.taxRate}% tax:</span>
                        <span className="font-bold text-emerald-600">
                          {form.currency}{(12.5 * (1 + form.taxRate / 100)).toFixed(2)} · {Math.round(12.5 * (1 + form.taxRate / 100) * (form.exchangeRate || 4000)).toLocaleString()} {form.secondaryCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Receipt */}
        <section className="anim-rise rounded-2xl border border-line bg-paper p-5" style={{ animationDelay: "0.2s" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
              <Printer size={16} />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Receipt</h2>
              <p className="text-[12px] text-ink/45">Printed on every receipt, any printer.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Header line" hint="below store info">
              <TextInput value={form.receiptHeader} onChange={(e) => set("receiptHeader", e.target.value)} />
            </Field>
            <Field label="Footer message" hint="bottom of receipt">
              <TextArea rows={2} value={form.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} />
            </Field>
          </div>
          {/* Mini preview */}
          <div className="receipt-paper mt-4 rounded-xl border border-line bg-white p-4 text-[10px] leading-relaxed text-black/70">
            <p className="text-center text-[12px] font-bold">{form.storeName || "Store name"}</p>
            <p className="text-center">{form.address}</p>
            <p className="text-center">{form.phone}</p>
            <p className="mt-1 text-center italic">{form.receiptHeader}</p>
            <p className="my-2 border-t border-dashed border-black/30" />
            <p className="text-center text-black/40">··· order lines ···</p>
            <p className="my-2 border-t border-dashed border-black/30" />
            <p className="text-center">{form.receiptFooter}</p>
          </div>
        </section>

        {/* POS layout */}
        <section className="anim-rise rounded-2xl border border-line bg-paper p-5" style={{ animationDelay: "0.26s" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
              <LayoutGrid size={16} />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Register layout</h2>
              <p className="text-[12px] text-ink/45">Tune the POS grid for your device and menu size.</p>
            </div>
          </div>

          <span className="mb-1.5 block text-[13px] font-semibold">Accent color</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
              const a = ACCENTS[key];
              const activeAcc = form.accent === key;
              return (
                <button
                  key={key}
                  onClick={() => set("accent", key)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3.5 transition-all hover:border-ink/25"
                  style={activeAcc ? { borderColor: "var(--ink)", boxShadow: "0 0 0 1px var(--ink)" } : undefined}
                >
                  <span className="h-6 w-6 rounded-full" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.deep})` }} />
                  <span className="text-[12px] font-semibold">{a.label}</span>
                </button>
              );
            })}
          </div>

          <span className="mb-1.5 mt-5 block text-[13px] font-semibold">Menu grid columns</span>
          <div className="flex gap-1 rounded-xl bg-ink/[0.05] p-1">
            {[2, 3, 4, 5].map((c) => (
              <button
                key={c}
                onClick={() => set("posColumns", c)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                  form.posColumns === c ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Toggle
              checked={form.categoryChips}
              onChange={(v) => set("categoryChips", v)}
              label="Show icons on category chips"
            />
          </div>

          <span className="mb-1.5 mt-5 block text-[13px] font-semibold">Display text size (enlarge font)</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "normal", label: "Standard", desc: "100% scale", icon: "A" },
              { key: "large", label: "Large", desc: "+15% scale", icon: "A+" },
              { key: "xl", label: "Extra Large", desc: "+30% scale", icon: "A++" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  set("fontSize", f.key);
                  setRuntimeFontSize(f.key as FontSize);
                }}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  form.fontSize === f.key
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-ink shadow-xs"
                    : "border-line bg-white hover:border-ink/20 text-ink/70"
                }`}
              >
                <span className="text-base font-bold">{f.icon}</span>
                <span className="mt-0.5 text-xs font-semibold">{f.label}</span>
                <span className="text-[10px] text-ink/45">{f.desc}</span>
              </button>
            ))}
          </div>

          {/* Live preview strip */}
          <div className="mt-5 overflow-hidden rounded-xl border border-line">
            <div className="border-b border-line bg-cream px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
              Live preview — {accent.label} accent
            </div>
            <div className="grid gap-1.5 bg-white p-3" style={{ gridTemplateColumns: `repeat(${form.posColumns}, 1fr)` }}>
              {Array.from({ length: form.posColumns }).map((_, i) => (
                <div key={i} className="rounded-lg border border-line bg-cream/60 p-2">
                  <div className="h-4 w-full rounded" style={{ background: `${accent.color}33` }} />
                  <div className="mt-1.5 h-2 w-3/4 rounded bg-ink/10" />
                  <div className="mt-1 h-2 w-1/3 rounded" style={{ background: `${accent.color}66` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-line bg-white p-3">
              <span className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: accent.color }}>
                Charge {form.currency}0.00
              </span>
            </div>
          </div>

          <button
            onClick={() => setForm(initial)}
            className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-ink/45 transition-colors hover:text-ink"
          >
            <RotateCcw size={12} />
            Reset to saved values
          </button>
        </section>
      </div>
      <div className="h-8" />
    </div>
  );
}
