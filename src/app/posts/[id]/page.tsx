import Link from "next/link";
import AppNav from "@/components/AppNav";
import AckButtons from "@/components/AckButtons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PostBody from "@/components/PostBody";
import CopyLinkButton from "@/components/CopyLinkButton";

type Post = {
  id: string;
  body: string;
  topic: string | null;
  created_at: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, body, topic, created_at, media_url, media_type")
    .eq("id", id)
    .single();

  if (error || !post) {
    return (
      <main className="min-h-screen bg-white text-zinc-900">
        <AppNav />
        <div className="mx-auto max-w-2xl px-6 py-10">
          <header className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Post</h1>
            <Link href="/read" className="text-sm text-zinc-600 hover:text-zinc-900">
              Back
            </Link>
          </header>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            This post can’t be found.
          </div>
        </div>
      </main>
    );
  }

  const p = post as Post;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <AppNav />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Post</h1>
          <Link href="/read" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back
          </Link>
        </header>

        <article className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {p.topic && (
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {p.topic}
                </div>
              )}
            </div>

            <CopyLinkButton />
          </div>

          {/* Full text here */}
          <PostBody text={p.body} truncate={false} />

          {p.media_url && p.media_type === "image" && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.media_url} alt="Post media" className="h-auto w-full" />
            </div>
          )}

          {p.media_url && p.media_type === "video" && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              <video src={p.media_url} controls playsInline preload="metadata" className="w-full" />
            </div>
          )}

          <div className="mt-4 text-xs text-zinc-500">{formatWhen(p.created_at)}</div>

          <AckButtons postId={p.id} />
        </article>
      </div>
    </main>
  );
}
