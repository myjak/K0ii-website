import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Member customisation, proxied from the bot.
 *
 * This is a route handler rather than a plain rewrite for two reasons. The bot
 * sends every field it holds — including per-member point series — when the
 * roster only paints ten of them, and it marks the response `no-store`, which
 * defeats the ETag it also sets. Trimming here and revalidating properly turns a
 * ~100KB full download on every poll into a few KB once, then 304s.
 */
const FIELDS = [
  "roblox_id",
  "frameStyle",
  "decoration",
  "decorationCutout",
  "backgroundGifUrl",
  "accentColor",
  "nameColor",
  "customTitle",
  "status",
  "bestMedal",
  "careerBadge",
] as const;

/** Length + FNV-1a — enough to spot a changed payload. */
function weakEtag(body: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `W/"${body.length.toString(36)}-${hash.toString(36)}"`;
}

function trim(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = row[f];
    // Skip empties so unstyled members cost almost nothing on the wire.
    if (v == null || v === "" || v === false) continue;
    out[f] = v;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const base = process.env.BOT_UPSTREAM_URL?.trim().replace(/\/$/, "");
  if (!base) {
    return NextResponse.json(
      { error: "BOT_UPSTREAM_URL is not set" },
      { status: 502 },
    );
  }

  let payload: unknown;
  try {
    const upstream = await fetch(`${base}/api/members`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json([], {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }
    payload = await upstream.json();
  } catch {
    // The roster must render with or without the bot, so an outage degrades to
    // "no customisation" rather than a failed request.
    return NextResponse.json([], {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  }

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { members?: unknown })?.members)
      ? (payload as { members: unknown[] }).members
      : [];

  const trimmed = rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map(trim)
    .filter((r) => r.roblox_id != null && Object.keys(r).length > 1);

  const body = JSON.stringify(trimmed);
  const etag = weakEtag(body);

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { etag, "cache-control": "no-cache, must-revalidate" },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache, must-revalidate",
      etag,
    },
  });
}
