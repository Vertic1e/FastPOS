"use client";

import { AlertCircle, ArrowRight, KeyRound, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/actions/auth";
import { PrimaryButton, TextInput } from "@/components/ui";

const initial: AuthState = { error: null };

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loginState, loginSubmit, loginPending] = useActionState(loginAction, initial);
  const [regState, regSubmit, regPending] = useActionState(registerAction, initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const state = mode === "signin" ? loginState : regState;

  return (
    <div>
      <h2 className="font-display text-3xl font-semibold tracking-tight">
        {mode === "signin" ? "Welcome back." : "Open your register."}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">
        {mode === "signin"
          ? "Sign in to take orders and watch tonight's numbers roll in."
          : "Create an owner account — it takes less than a minute."}
      </p>

      {/* Mode switch */}
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-ink/[0.05] p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-[13px] font-semibold transition-all ${
              mode === m ? "bg-white text-ink shadow-sm" : "text-ink/45 hover:text-ink/70"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {state.error && (
        <div className="anim-pop mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {state.error}
        </div>
      )}

      {mode === "signin" ? (
        <form action={loginSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Email</label>
            <TextInput
              name="email"
              type="email"
              placeholder="you@restaurant.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Password</label>
            <TextInput
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <PrimaryButton className="w-full !py-3" busy={loginPending}>
            Sign in to POS
            <ArrowRight size={16} />
          </PrimaryButton>

          <button
            type="button"
            onClick={() => {
              setEmail("owner@bistrolumen.com");
              setPassword("demo1234");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-white/60 px-4 py-2.5 text-[13px] font-medium text-ink/60 transition-colors hover:border-flame/50 hover:text-ink"
          >
            <KeyRound size={14} />
            Use demo account — owner@bistrolumen.com / demo1234
          </button>
        </form>
      ) : (
        <form action={regSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Your name</label>
            <TextInput name="name" placeholder="Maya Chen" autoComplete="name" required minLength={2} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Email</label>
            <TextInput name="email" type="email" placeholder="you@restaurant.com" autoComplete="email" required />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold">Password</label>
            <TextInput name="password" type="password" placeholder="6+ characters" autoComplete="new-password" required minLength={6} />
          </div>
          <PrimaryButton className="w-full !py-3" busy={regPending}>
            Create account
            <ArrowRight size={16} />
          </PrimaryButton>
        </form>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12px] text-ink/40">
        <Sparkles size={13} className="text-flame" />
        Seeded with a full demo restaurant — try every feature.
      </p>
    </div>
  );
}
