// stillvo/src/app/read/page.tsx
import Link from "next/link";
import AppNav from "@/components/AppNav";
import AckButtons from "@/components/AckButtons";
import PostMenu from "@/components/PostMenu";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PostBody from "@/components/PostBody";

type Post = {
  id: string;
  author_id: string;
  body: string;
  topic: string | null;
  created_at: string;
  updated_at: string; // NEW
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

function isEdited(p: Post) {
  // treat as edited if updated_at differs from created_at by > 60s
  const c = new Date(p.created_at).getTime();
  const u = new Date(p.updated_at).getTime();
  return Math.abs(u - c) > 60_000;
}

function isImage(p: Post) {
  return !!p.media_url && p.media_type === "image";
}

function isVideo(p: Post) {
  return !!p.media_url && p.media_type === "video";
}

function groupLabelLocal(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d >= startToday) return "Today";
  if (d >= startYesterday) return "Yesterday";
  return "Earlier";
}

export default async function ReadPage({
  searchParams,
}: {
  searchParams: Promise<{ soft?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;

  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, topic, created_at, updated_at, media_url, media_type") // NEW updated_at
    .order("created_at", { ascending: false })
    .limit(40);

  const posts = (data ?? []) as Post[];

  const sections: { label: string; posts: Post[] }[] = [];
  for (const p of posts) {
    const label = groupLabelLocal(p.created_at);
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.posts.push(p);
    else sections.push({ label, posts: [p] });
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <AppNav />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Read</h1>
          <Link href="/start" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back
          </Link>
        </header>

        {sp?.soft === "1" && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            That’s okay. You can just read for now.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="mt-8 space-y-10">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-700">
              No posts yet.
              <div className="mt-2 text-zinc-500">You can be the first — or come back later.</div>
              <Link
                href="/write"
                className="mt-4 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Write something
              </Link>
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.label}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {section.label}
                  </div>
                  <div className="h-px flex-1 bg-zinc-100" />
                </div>

                <div className="space-y-4">
                  {section.posts.map((p) => {
                    const isMine = !!viewerId && p.author_id === viewerId;

                    return (
                      <article
                        key={p.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-5"
                      >
                        {/* Top row: topic + you badge + menu */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {p.topic && (
                                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                  {p.topic}
                                </div>
                              )}

                              {isMine && (
                                <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700">
                                  You
                                </span>
                              )}

                              {isEdited(p) && (
                                <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500">
                                  Edited
                                </span>
                              )}
                            </div>
                          </div>

                          {isMine && <PostMenu postId={p.id} />}
                        </div>

                        <Link href={`/posts/${p.id}`} className="block">
                          <PostBody text={p.body} truncate={true} limit={320} />
                        </Link>



                        {isImage(p) && (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <Link href={`/posts/${p.id}`} className="block">
                            <img
                              src={p.media_url!}
                              alt="Post media"
                              className="h-auto w-full"
                              loading="lazy"
                            />
                            </Link>
                          </div>
                        )}

                        {isVideo(p) && (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                            <Link href={`/posts/${p.id}`} className="block">
                            <video
                              src={p.media_url!}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full"
                              autoPlay={false}
                              muted={false}
                              loop={false}
                            />
                            </Link>
                          </div>
                        )}

                        <div className="mt-4 text-xs text-zinc-500">
                          {formatWhen(p.created_at)}
                        </div>

                        {/* Ownership polish: no acknowledgements on your own post */}
                        {!isMine && <AckButtons postId={p.id} />}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <div className="mt-10 text-center text-xs text-zinc-500">You’ve reached the end.</div>
      </div>
    </main>
  );
}
