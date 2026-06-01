"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  startEmailSignupAction,
  verifySignupEmailAction,
  completeEmailSignupAction,
  type AuthState,
} from "@/app/actions/auth";
import { PasswordInput } from "./PasswordInput";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

const signupRules: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none transition focus:border-zinc-400";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.4 4.5 9.8 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.4-4.4 2.4-6.9 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.6l6 4.9c-.4.4 6.6-4.8 6.6-14.5 0-1.2-.1-2.4-.3-3.5z" />
    </svg>
  );
}

type Branding = {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  selfService?: boolean;
  contactEmail?: string | null;
} | null;

export function LoginCard({ action, branding }: { action: Action; branding?: Branding }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const accent = branding?.brandColor ?? undefined;
  // Self-service account links (forgot password/username, create account). Off
  // for clients that handle issues elsewhere (e.g. a support ticket system).
  const showSelfService = branding?.selfService !== false;
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 shadow-2xl backdrop-blur">
      {branding?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt={branding.name} className="mb-4 h-9 w-auto" />
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Sign in to {branding?.name ? <span className="text-zinc-200">{branding.name}</span> : "your QuickAuth account"}.
      </p>

      {showSelfService ? (
        <>
          <a
            href="/api/auth/google/start"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900"
          >
            <GoogleIcon />
            Google
          </a>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="h-px flex-1 bg-zinc-800" />
            Or continue with
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
        </>
      ) : null}

      <form action={formAction} className={`${showSelfService ? "" : "mt-6"} flex flex-col gap-4`}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="identifier" className="text-xs font-medium text-zinc-300">
            Email or username
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-zinc-300">
              Password
            </label>
            {showSelfService ? (
              <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline">
                Forgot password?
              </Link>
            ) : null}
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" minLength={8} />
        </div>

        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          style={accent ? { backgroundColor: accent, color: "#fff" } : undefined}
          className="mt-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {showSelfService ? (
        <div className="mt-5 flex items-center justify-between text-xs text-zinc-400">
          <Link href="/forgot-username" className="hover:text-zinc-200 hover:underline">
            Forgot username?
          </Link>
          <Link href="/signup" className="hover:text-zinc-200 hover:underline">
            Create account
          </Link>
        </div>
      ) : null}

      {branding?.contactEmail ? (
        <>
          <div className="mt-6 h-px w-full bg-zinc-800" />
          <p className="mt-4 text-center text-xs text-zinc-400">
            Forgot your username or password?{" "}
            <a
              href={`mailto:${branding.contactEmail}`}
              style={accent ? { color: accent } : undefined}
              className="font-medium text-zinc-200 hover:underline"
            ><br />
              Email us at {branding.contactEmail}
            </a>
          </p>
        </>
      ) : null}
    </div>
  );
}

type Step = "email" | "code" | "details";

export function SignupCard() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 shadow-2xl backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight">Create a QuickAuth Account</h1>
      <p className="mt-1 text-sm text-zinc-400">Welcome! Create an account to get started.</p>

      {step === "email" && (
        <EmailStep
          onSent={(e) => {
            setEmail(e);
            setStep("code");
          }}
        />
      )}

      {step === "code" && (
        <CodeStep
          email={email}
          onVerified={(c) => {
            setCode(c);
            setStep("details");
          }}
          onBack={() => setStep("email")}
        />
      )}

      {step === "details" && (
        <DetailsStep email={email} code={code} onBack={() => setStep("code")} />
      )}

      <div className="mt-5 text-center text-xs text-zinc-400">
        Have an account?{" "}
        <Link href="/login" className="text-zinc-200 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(startEmailSignupAction, {});
  const [email, setEmail] = useState("");

  // Advance only when server returned no error and was submitted.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !pending && !state.error) {
      submittedRef.current = false;
      onSent(email);
    }
  }, [pending, state, email, onSent]);

  return (
    <>
      <a
        href="/api/auth/google/start"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900"
      >
        <GoogleIcon />
        Google
      </a>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />
        Or continue with
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form
        action={formAction}
        onSubmit={() => {
          submittedRef.current = true;
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-zinc-300">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
          />
        </div>
        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Continue"}
        </button>
      </form>
    </>
  );
}

function CodeStep({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: (code: string) => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");

  useEffect(() => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) return;
    startTransition(async () => {
      setErr(null);
      const res = await verifySignupEmailAction(email, code);
      if (res.ok) onVerified(code);
      else setErr(res.error ?? "Invalid or expired code.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function handleChange(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (err) setErr(null);
    if (clean && i < 5) inputsRef.current[i + 1]?.focus();
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-sm text-zinc-300">
        We sent a 6-digit code to <span className="font-medium text-white">{email}</span>.
      </p>
      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`h-12 w-11 rounded-md border bg-zinc-950 text-center text-lg font-medium outline-none transition ${
              err ? "border-red-500" : "border-zinc-700 focus:border-zinc-400"
            }`}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {isPending && <p className="text-center text-sm text-zinc-400">Verifying…</p>}
      {err && <p className="text-center text-sm text-red-400">{err}</p>}
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-zinc-400 underline self-center"
      >
        Use a different email
      </button>
    </div>
  );
}

function DetailsStep({
  email,
  code,
  onBack,
}: {
  email: string;
  code: string;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(completeEmailSignupAction, {});
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="code" value={code} />
      <p className="text-sm text-zinc-400">
        Verifying as <span className="font-medium text-white">{email}</span>.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-xs font-medium text-zinc-300">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-zinc-300">Password</label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={setPassword}
        />
      </div>

      <ul className="grid grid-cols-2 gap-y-1.5 text-[11px] text-zinc-400">
        {signupRules.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 ${ok ? "text-green-400" : ""}`}>
              <span className={`inline-flex h-3 w-3 items-center justify-center rounded-full border text-[10px] leading-none ${ok ? "border-green-500" : "border-zinc-600"}`}>
                {ok ? "✓" : "·"}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>

      <button type="button" onClick={onBack} className="text-xs text-zinc-400 underline self-center">
        Back
      </button>
    </form>
  );
}
