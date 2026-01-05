import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureProfile() {
  const supabase = await createSupabaseServerClient();
  const { data, error: userErr } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = data.user;

  // Google OAuth should populate user.email; fallback to user_metadata.email
  const email =
    user.email ??
    (typeof user.user_metadata?.email === "string" ? user.user_metadata.email : null) ??
    null;

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (email ? email.split("@")[0] : null) ||
    "Someone";

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      display_name: displayName,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, emailSaved: !!email });
}

export async function POST() {
  return ensureProfile();
}

// Allow GET so you can trigger this in the browser
export async function GET() {
  return ensureProfile();
}
