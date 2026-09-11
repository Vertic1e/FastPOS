import { Flame } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Visual panel */}
      <div className="relative hidden overflow-hidden bg-coal lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/35 to-coal/10" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame text-white shadow-lg shadow-flame/30">
              <Flame size={19} strokeWidth={2.25} />
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold text-white">Bistro Lumen</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                Point of Sale
              </p>
            </div>
          </div>
          <div className="anim-rise">
            <h1 className="max-w-md font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white xl:text-5xl">
              Run the floor, the kitchen, and the books — from one place.
            </h1>
            <div className="mt-8 flex flex-wrap gap-6">
              {[
                ["2.4s", "avg. checkout time"],
                ["100%", "offline-print ready receipts"],
                ["Live", "stock counts on every sale"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl font-semibold text-white">{stat}</p>
                  <p className="mt-0.5 text-[12px] text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-cream px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame text-white">
              <Flame size={19} strokeWidth={2.25} />
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold">Bistro Lumen</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
                Point of Sale
              </p>
            </div>
          </div>
          <div className="anim-rise">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
