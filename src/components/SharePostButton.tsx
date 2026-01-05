"use client";

import { useState } from "react";

export default function SharePostButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      const url = `${window.location.origin}/posts/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback
      const url = `${window.location.origin}/posts/${postId}`;
      prompt("Copy this link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
