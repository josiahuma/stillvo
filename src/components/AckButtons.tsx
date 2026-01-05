"use client";

import { useState } from "react";

type Kind = "read" | "resonated" | "thank_you";

export default function AckButtons({ postId }: { postId: string }) {
  const [sent, setSent] = useState<Kind | null>(null);
  const [loading, setLoading] = useState<Kind | null>(null);

  async function send(kind: Kind) {
    setLoading(kind);

    try {
      const res = await fetch("/api/acknowledgements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, kind }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Ack error:", data);
        alert(data?.error ?? `Request failed (${res.status})`);
        setLoading(null);
        return;
      }


      setSent(kind);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const base =
    "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60";

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className={base}
        onClick={() => send("read")}
        disabled={!!sent || loading !== null}
      >
        {sent === "read" ? "Sent" : loading === "read" ? "Sending…" : "I read this"}
      </button>

      <button
        className={base}
        onClick={() => send("resonated")}
        disabled={!!sent || loading !== null}
      >
        {sent === "resonated"
          ? "Sent"
          : loading === "resonated"
          ? "Sending…"
          : "This resonated"}
      </button>

      <button
        className={base}
        onClick={() => send("thank_you")}
        disabled={!!sent || loading !== null}
      >
        {sent === "thank_you"
          ? "Sent"
          : loading === "thank_you"
          ? "Sending…"
          : "Thank you for sharing"}
      </button>

      {sent && (
        <div className="ml-1 flex items-center text-xs text-zinc-500">
          Delivered quietly later.
        </div>
      )}
    </div>
  );
}
