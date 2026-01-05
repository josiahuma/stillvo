"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PostMenu({ postId }: { postId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function onDelete() {
    const ok = confirm("Delete this post? This can’t be undone.");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Could not delete.");
        setBusy(false);
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      alert("Network error.");
      setBusy(false);
    }
  }

  function onEdit() {
    // Edit mode handled in /write
    router.push(`/write?edit=${postId}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
        aria-label="Post options"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-4 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
