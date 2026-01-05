import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AckRow = {
  receiver_id: string;
  kind: "read" | "resonated" | "thank_you";
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  email: string | null;
};

function line(kind: AckRow["kind"]) {
  if (kind === "read") return "Someone read your writing.";
  if (kind === "resonated") return "Something you wrote resonated with someone.";
  return "Someone appreciated that you shared.";
}

function todayRangeUtc() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayDateUtc() {
  // YYYY-MM-DD in UTC
  return new Date().toISOString().slice(0, 10);
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  return token === secret;
}

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !from) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL" },
      { status: 500 }
    );
  }

  const admin = createSupabaseAdminClient();
  const resend = new Resend(resendKey);

  // 1) Get today's acknowledgement items (service role bypasses RLS)
  const { start, end } = todayRangeUtc();

  const { data: acks, error: ackErr } = await admin
    .from("ack_digest_items")
    .select("receiver_id, kind, created_at")
    .gte("created_at", start)
    .lt("created_at", end);

  if (ackErr) {
    return NextResponse.json({ error: ackErr.message }, { status: 500 });
  }

  const rows = (acks ?? []) as AckRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "No digest items today" });
  }

  // 2) Group by receiver
  const byUser = new Map<string, AckRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.receiver_id) ?? [];
    list.push(r);
    byUser.set(r.receiver_id, list);
  }

  // 3) Look up emails in profiles
  const receiverIds = Array.from(byUser.keys());

  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("user_id, email")
    .in("user_id", receiverIds);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const emailById = new Map<string, string>();
  for (const p of (profiles ?? []) as ProfileRow[]) {
    if (p.email) emailById.set(p.user_id, p.email);
  }

  // 4) Idempotency: send at most once per user per UTC day
  const digestDate = todayDateUtc();

  let sent = 0;
  let skippedAlreadySent = 0;
  let skippedNoEmail = 0;

  for (const [userId, items] of byUser.entries()) {
    const to = emailById.get(userId);
    if (!to) {
      skippedNoEmail++;
      continue;
    }

    // Try to reserve sending slot for this user today.
    // If unique constraint fails => already sent today => skip.
    const { error: reserveErr } = await admin.from("digest_sends").insert({
      receiver_id: userId,
      digest_date: digestDate,
    });

    if (reserveErr) {
      // Most likely unique violation (already sent today)
      skippedAlreadySent++;
      continue;
    }

    // 5) Deduplicate lines: only one line per kind (quiet + avoids repeats)
    const seen = new Set<AckRow["kind"]>();
    const uniqueKinds: AckRow["kind"][] = [];
    for (const it of items) {
      if (!seen.has(it.kind)) {
        seen.add(it.kind);
        uniqueKinds.push(it.kind);
      }
    }

    const lines = uniqueKinds.slice(0, 10).map((k) => `• ${line(k)}`);
    const extra =
      items.length > 10 ? "\n• A few more acknowledgements arrived quietly." : "";

    const subject = "Your Stillvo digest";
    const text = `A quiet note from Stillvo.\n\n${lines.join(
      "\n"
    )}${extra}\n\nNo counts. No names. No pressure.\n\n— Stillvo`;

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5; color:#111;">
        <h2 style="margin:0 0 12px 0;">Your Stillvo digest</h2>
        <p style="margin:0 0 16px 0; color:#444;">A quiet note from Stillvo.</p>
        <div style="padding:14px; border:1px solid #eee; border-radius:14px;">
          ${lines
            .map((l) => `<div style="margin:6px 0; color:#222;">${l}</div>`)
            .join("")}
          ${
            items.length > 10
              ? `<div style="margin:6px 0; color:#222;">• A few more acknowledgements arrived quietly.</div>`
              : ""
          }
        </div>
        <p style="margin:16px 0 0 0; color:#666; font-size: 13px;">No counts. No names. No pressure.</p>
        <p style="margin:10px 0 0 0; color:#666; font-size: 13px;">— Stillvo</p>
      </div>
    `;

    try {
      await resend.emails.send({ from, to, subject, text, html });
      sent++;
    } catch (e: any) {
      // If sending fails, free the reservation so cron can retry later
      await admin
        .from("digest_sends")
        .delete()
        .eq("receiver_id", userId)
        .eq("digest_date", digestDate);

      return NextResponse.json(
        { error: e?.message ?? "Failed to send email." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skippedAlreadySent,
    skippedNoEmail,
  });
}

export async function POST(req: Request) {
  return handler(req);
}

export async function GET(req: Request) {
  return handler(req);
}
