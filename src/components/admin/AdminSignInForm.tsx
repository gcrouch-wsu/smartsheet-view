"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";


interface AdminSignInFormProps {
  nextPath: string;
  disabled?: boolean;
}

export function AdminSignInForm({ nextPath, disabled = false }: AdminSignInFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "Unable to sign in.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Username</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          required
          disabled={disabled || isPending}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 text-base text-[color:var(--wsu-ink)] outline-none transition focus:border-[color:var(--wsu-crimson)] focus:ring-2 focus:ring-[color:rgba(166,15,45,0.12)] disabled:cursor-not-allowed disabled:bg-stone-100"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Password</span>
        <div className="flex overflow-hidden rounded-2xl border border-[color:var(--wsu-border)] bg-white focus-within:border-[color:var(--wsu-crimson)] focus-within:ring-2 focus-within:ring-[color:rgba(166,15,45,0.12)]">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            disabled={disabled || isPending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-3 text-base text-[color:var(--wsu-ink)] outline-none disabled:cursor-not-allowed disabled:bg-stone-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            disabled={disabled || isPending}
            className="border-l border-[color:var(--wsu-border)] px-4 text-sm font-medium text-[color:var(--wsu-crimson)] transition hover:bg-[color:rgba(166,15,45,0.05)] disabled:cursor-not-allowed disabled:text-[color:var(--wsu-muted)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

      </label>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full rounded-full bg-[color:var(--wsu-crimson)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--wsu-crimson-dark)] disabled:cursor-not-allowed disabled:bg-[color:rgba(166,15,45,0.45)]"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}