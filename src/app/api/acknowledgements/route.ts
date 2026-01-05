import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED = new Set(["read", "resonated", "thank_you"]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const kind = typeof body?.kind === "string" ? body.kind.trim() : "";

  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  if (!ALLOWED.has(kind)) {
    return NextResponse.json(
      { error: "Invalid acknowledgement" },
      { status: 400 }
    );
  }

  // Prevent acknowledging your own post
  const { data: postRow, error: postErr } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (postErr || !postRow) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (postRow.author_id === user.id) {
    return NextResponse.json(
      { error: "You can’t acknowledge your own post." },
      { status: 400 }
    );
  }

  // Insert acknowledgement (DB unique constraint prevents duplicates)
  const { error } = await supabase.from("acknowledgements").insert({
    post_id: postId,
    sender_id: user.id,
    kind,
  });

  if (error) {
    // Postgres unique violation
    // This happens when user already acknowledged this post with this kind.
    if ((error as any).code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
