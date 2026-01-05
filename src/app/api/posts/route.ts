import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EXP_ALLOWED = new Set(["7", "14", "30", "none"]);
const MEDIA_ALLOWED = new Set(["image", "video"]);

function maxCharsForTier(tier: string | null | undefined) {
  return tier === "plus" ? 2000 : 600;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await req.json();

  const text: string = String(payload?.body ?? "").trim();
  const topic: string | null = payload?.topic ? String(payload.topic).trim() : null;

  const expiresAt: string =
    typeof payload?.expiresAt === "string" ? payload.expiresAt : "none";

  const mediaUrl: string | null = payload?.mediaUrl ? String(payload.mediaUrl) : null;
  const mediaType: string | null = payload?.mediaType ? String(payload.mediaType) : null;

  // 1) Load user tier (RLS-safe: profile is owned by user)
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .single();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const tier = profile?.subscription_tier ?? "free";
  const maxChars = maxCharsForTier(tier);

  // 2) Text constraints (tier-based)
  if (text.length < 1 || text.length > maxChars) {
    return NextResponse.json(
      { error: `Post must be between 1 and ${maxChars} characters.` },
      { status: 400 }
    );
  }

  // 3) Topic constraint
  if (topic && topic.length > 32) {
    return NextResponse.json(
      { error: "Topic must be 32 characters or less." },
      { status: 400 }
    );
  }

  // 4) Expiration constraint
  if (!EXP_ALLOWED.has(expiresAt)) {
    return NextResponse.json({ error: "Invalid expiration." }, { status: 400 });
  }

  let expires_at: string | null = null;
  if (expiresAt !== "none") {
    const days = Number(expiresAt);
    const d = new Date();
    d.setDate(d.getDate() + days);
    expires_at = d.toISOString();
  }

  // 5) Media constraints
  // Stillvo rule: if mediaUrl exists -> mediaType must be image/video
  // If no mediaUrl -> mediaType must be null
  if (mediaUrl) {
    if (!mediaType || !MEDIA_ALLOWED.has(mediaType)) {
      return NextResponse.json({ error: "Invalid media type." }, { status: 400 });
    }
  } else {
    // prevent bogus mediaType without a URL
    if (mediaType) {
      return NextResponse.json({ error: "Media type without media url." }, { status: 400 });
    }
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    body: text,
    topic: topic || null,
    expires_at,
    media_url: mediaUrl,
    media_type: mediaType,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier, maxChars });
}
