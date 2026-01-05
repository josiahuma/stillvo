"use client";

import { useMemo, useState } from "react";

export default function PostBody({
  text,
  truncate = true,
  limit = 320, // tweak
}: {
  text: string;
  truncate?: boolean;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);

  const shouldTruncate = truncate && text.length > limit;

  const shown = useMemo(() => {
    if (!shouldTruncate) return text;
    return open ? text : text.slice(0, limit).trimEnd() + "…";
  }, [text, limit, open, shouldTruncate]);

  return (
    <div className="mt-2">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
        {shown}
      </p>

      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
        >
          {open ? "View less" : "View more"}
        </button>
      )}
    </div>
  );
}
