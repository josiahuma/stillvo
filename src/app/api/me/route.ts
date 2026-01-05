import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", data.user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user: { id: data.user.id },
    subscription_tier: profile?.subscription_tier ?? "free",
  });
}
