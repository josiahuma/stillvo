import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: any) {
    console.error("❌ webhook signature error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const kind = session.metadata?.kind;

      console.log("✅ checkout.session.completed", { kind, userId });

      if (kind === "stillvo_plus" && userId) {
        const admin = createSupabaseAdminClient();

        const { error } = await admin
          .from("profiles")
          .update({ subscription_tier: "plus" })
          .eq("user_id", userId);

        if (error) {
          console.error("❌ supabase update error:", error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("✅ upgraded user to plus:", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("❌ webhook handler error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
