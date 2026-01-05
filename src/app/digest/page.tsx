import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";


type DigestItem = {
  id: string;
  post_id: string;
  kind: "read" | "resonated" | "thank_you";
  created_at: string;
};

function label(kind: DigestItem["kind"]) {
  if (kind === "read") return "Someone read your post.";
  if (kind === "resonated") return "This resonated with someone.";
  return "Someone appreciated your sharing.";
}

export default async function DigestPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/");
  }

  // Call the SQL function you created earlier
  const { data, error } = await supabase.rpc("get_my_ack_digest");

  const items = (data ?? []) as DigestItem[];

  return (
    <main className="min-h-screen bg-white text-zinc-900">
        <AppNav />
      <div className="mx-auto max-w-xl px-6 py-10">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Your digest</h1>
          <Link
            href="/start"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Back
          </Link>
        </header>

        <p className="mt-2 text-sm text-zinc-600">
          Delivered quietly. No counts.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-700">
              Nothing yet today.
              <div className="mt-2 text-zinc-500">
                That’s okay. Stillvo stays quiet.
              </div>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="text-sm text-zinc-800">{label(it.kind)}</div>
                <div className="mt-2 text-xs text-zinc-500">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
