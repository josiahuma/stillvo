import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.redirect(new URL("/?auth=required", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  }

  const priceId = process.env.STRIPE_PLUS_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Missing STRIPE_PLUS_PRICE_ID" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/start?upgrade=success`,
    cancel_url: `${siteUrl}/upgrade?upgrade=cancel`,
    customer_email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
      kind: "stillvo_plus",
    },
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
