import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, topic, created_at, media_url, media_type, expires_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();

  const text: string = String(body?.body ?? "").trim();
  const topic: string | null = body?.topic ? String(body.topic).trim() : null;
  const expiresAt: string | null = body?.expiresAt ?? null;

  const mediaUrl: string | null = body?.mediaUrl ?? null;
  const mediaType: "image" | "video" | null = body?.mediaType ?? null;

  // ownership check
  const { data: existing, error: exErr } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (exErr || !existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.author_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // basic constraints (keep aligned with your create route + DB constraint)
  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json({ error: "Post length is invalid." }, { status: 400 });
  }
  if (topic && topic.length > 32) {
    return NextResponse.json({ error: "Topic must be 32 characters or less." }, { status: 400 });
  }
  if (mediaUrl && mediaType !== "image" && mediaType !== "video") {
    return NextResponse.json({ error: "Invalid media type." }, { status: 400 });
  }

  // expiration mapping
  let expires_at: string | null = null;
  const allowed = new Set(["7", "14", "30", "none"]);
  const exp = typeof expiresAt === "string" ? expiresAt : "none";

  if (!allowed.has(exp)) {
    return NextResponse.json({ error: "Invalid expiration." }, { status: 400 });
  }

  if (exp !== "none") {
    const days = Number(exp);
    const d = new Date();
    d.setDate(d.getDate() + days);
    expires_at = d.toISOString();
  }

  const { error: upErr } = await supabase
    .from("posts")
    .update({
      body: text,
      topic: topic || null,
      expires_at,
      media_url: mediaUrl,
      media_type: mediaType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
