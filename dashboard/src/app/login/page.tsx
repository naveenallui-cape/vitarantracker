"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "Invalid email or password");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Cannot reach the admin server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-md rounded-2xl bg-[var(--panel)] p-8 shadow-[0_16px_60px_rgba(20,35,28,0.08)]"
      >
        <p className="text-xs tracking-[0.22em] uppercase text-[#1f6f4a]">
          Vitarantracker
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#14231c]">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-[#5d6b63]">
          Single-admin access for company-owned Windows laptop activity.
        </p>
        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 outline-none focus:border-[#1f6f4a]"
        />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 outline-none focus:border-[#1f6f4a]"
        />
        {error ? <p className="mt-3 text-sm text-[#9a3b32]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#1f6f4a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
