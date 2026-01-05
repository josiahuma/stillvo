import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";


export default async function StartPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // If not logged in, send them back to homepage
  if (!data.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <AppNav />
      <div className="mx-auto flex max-w-xl flex-col px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          What would you like to do right now?
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          There’s no rush.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/read"
            className="block rounded-2xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
          >
            <div className="font-medium">Read quietly</div>
            <div className="mt-1 text-sm text-zinc-600">
              Browse posts without pressure to respond.
            </div>
          </Link>

          <Link
            href="/write"
            className="block rounded-2xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
          >
            <div className="font-medium">Write something</div>
            <div className="mt-1 text-sm text-zinc-600">
              Write plainly. You don’t need to be polished.
            </div>
          </Link>

          <Link
            href="/read?soft=1"
            className="block rounded-2xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
          >
            <div className="font-medium">I’ll come back later</div>
            <div className="mt-1 text-sm text-zinc-600">
              That’s okay. Stillvo will be here.
            </div>
          </Link>

          <Link
            href="/digest"
            className="block rounded-2xl border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
          >
            <div className="font-medium">View your digest</div>
            <div className="mt-1 text-sm text-zinc-600">
              See acknowledgments delivered quietly.
            </div>
          </Link>

        </div>

        <div className="mt-10 text-xs text-zinc-500">
          No likes. No comments. No direct messages.
        </div>
      </div>
    </main>
  );
}
