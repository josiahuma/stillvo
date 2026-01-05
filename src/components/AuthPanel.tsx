"use client";
// stillvo/src/components/AuthPanel.tsx
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthPanel() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/start`,
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-semibold tracking-tight">Join Stillvo.</h2>
      <p className="mt-2 text-sm text-zinc-600">
        A quieter place to write. No likes. No comments. No DMs.
      </p>

      <div className="mt-6 space-y-3">
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>

        <Link
          href="/onboarding"
          className="block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          How Stillvo works
        </Link>

        <div className="pt-1 text-center text-sm text-zinc-600">
          Use Google to sign in for now.
        </div>

      </div>

      <p className="mt-6 text-xs text-zinc-500">
        No ads. Ever.{" "}
        <span className="text-zinc-400">
          You can read without posting, and leave anytime.
        </span>
      </p>
    </div>
  );
}
