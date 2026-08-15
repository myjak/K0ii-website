import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Clan bank balance proxied from the Discord bot (same contract as
 * maplewick/k0ii-website join page). Missing upstream → soft empty so the
 * join panel can hide the bank tile instead of erroring.
 */
export async function GET() {
  const base = process.env.BOT_UPSTREAM_URL?.trim().replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { balance: null },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const upstream = await fetch(`${base}/api/bank`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { balance: null },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
    const data: unknown = await upstream.json();
    const balance = (data as { balance?: unknown })?.balance;
    return NextResponse.json(
      {
        balance:
          typeof balance === "number" && Number.isFinite(balance)
            ? balance
            : null,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { balance: null },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
