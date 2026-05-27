"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction, verifyResetCodeAction } from "@/app/actions/auth";

type VerifyState = "idle" | "checking" | "verified" | "error";

const rules: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

export function ResetPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const verified = verifyState === "verified";
  const allRulesPass = rules.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = verified && allRulesPass && passwordsMatch && !isPending;

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) return;
    if (verifyState === "checking" || verifyState === "verified") return;
    setVerifyState("checking");
    setVerifyError(null);
    startTransition(async () => {
      const res = await verifyResetCodeAction(initialEmail, code);
      if (res.ok) {
        setVerifyState("verified");
      } else {
        setVerifyState("error");
        setVerifyError(res.error ?? "Invalid or expired code.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function handleChange(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (verifyState === "error") {
      setVerifyState("idle");
      setVerifyError(null);
    }
    if (clean && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIndex = Math.min(text.length, 5);
    inputsRef.current[focusIndex]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    const fd = new FormData();
    fd.set("email", initialEmail);
    fd.set("code", code);
    fd.set("password", password);
    fd.set("confirmPassword", confirm);
    startTransition(async () => {
      const res = await resetPasswordAction({}, fd);
      if (res?.error) setSubmitError(res.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl"
    >
      <h2 className="text-xl font-semibold">Reset Password</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Enter the code sent to <span className="font-semibold text-zinc-200">{initialEmail || "your email"}</span>{" "}
        to reset your password.
      </p>

      <div className="mt-5 flex justify-center gap-2">
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
            disabled={verified}
            className={`h-12 w-12 rounded-md border bg-zinc-950 text-center text-lg font-medium outline-none transition ${
              verifyState === "error"
                ? "border-red-500"
                : verified
                ? "border-green-600/60"
                : "border-zinc-700 focus:border-zinc-400"
            } disabled:opacity-90`}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {verifyState === "checking" && (
        <p className="mt-3 text-center text-sm text-zinc-400">Verifying…</p>
      )}
      {verifyState === "error" && verifyError && (
        <p className="mt-3 text-center text-sm text-red-400">{verifyError}</p>
      )}
      {verified && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-green-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Code verified
        </p>
      )}

      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          verified ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="h-px bg-zinc-800" />
          <div className="pt-4">
            <label className="block text-sm font-semibold">New password</label>
            <div className="relative mt-1.5">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 pr-9 text-sm outline-none focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center bg-transparent text-white opacity-70 hover:opacity-100"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
              {rules.map((r) => {
                const ok = r.test(password);
                return (
                  <li
                    key={r.label}
                    className={`flex items-center gap-1.5 ${ok ? "text-green-400" : "text-zinc-500"}`}
                  >
                    <span
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        ok ? "border-green-500" : "border-zinc-600"
                      }`}
                    >
                      {ok ? "✓" : "×"}
                    </span>
                    {r.label}
                  </li>
                );
              })}
            </ul>

            <label className="mt-4 block text-sm font-semibold">Confirm password</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            {confirm && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
            )}
            {submitError && <p className="mt-2 text-sm text-red-400">{submitError}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 border border-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
        >
          {isPending ? "…" : "Reset password"}
        </button>
      </div>
    </form>
  );
}
