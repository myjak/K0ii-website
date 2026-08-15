/**
 * Member customisation (avatar frames, decorations, name/accent colours, medals)
 * is owned by the Discord bot, not the stats API — members set it through
 * `/customize` and the profile editor. The stats pipeline polls Big Games and
 * knows nothing about any of it, so the roster fetches it separately and joins
 * on Roblox id at render time.
 *
 * This is deliberately best-effort: if the bot is unreachable the roster still
 * renders, just without decoration.
 */

export type FrameStyle = "dashed" | "double" | "glow" | "pulse" | "crown";

const FRAME_STYLES: readonly FrameStyle[] = [
  "dashed",
  "double",
  "glow",
  "pulse",
  "crown",
];

export type MemberCustomization = {
  robloxId: string;
  frameStyle: FrameStyle | null;
  decoration: string | null;
  decorationCutout: boolean;
  backgroundGifUrl: string | null;
  accentColor: string | null;
  nameColor: string | null;
  customTitle: string | null;
  status: string | null;
  bestMedal: { tier: string; label: string; emoji: string } | null;
  careerBadge: { id: string; label: string; image: string } | null;
};

export type CustomizationMap = Record<string, MemberCustomization>;

/** Only `#rgb` / `#rrggbb` reach a style attribute — these come from user input. */
function safeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : null;
}

function safeFrameStyle(value: unknown): FrameStyle | null {
  return typeof value === "string" && FRAME_STYLES.includes(value as FrameStyle)
    ? (value as FrameStyle)
    : null;
}

/** Decorations are bot-hosted; anything else is ignored rather than rendered. */
function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value, "https://k0ii.com");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Row backgrounds are interpolated into a CSS `url('…')`, and React does not
 * sanitise custom-property values — a quote or paren in the URL would let it
 * break out of the declaration. Anything with those characters is dropped
 * rather than escaped, since a legitimate image URL never needs them.
 */
function safeCssUrl(value: unknown): string | null {
  const url = safeImageUrl(value);
  if (!url) return null;
  return /["'()\\\s]/.test(url) ? null : url;
}

function safeText(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function toCustomization(raw: Record<string, unknown>): MemberCustomization | null {
  const robloxId = raw.roblox_id != null ? String(raw.roblox_id) : null;
  if (!robloxId) return null;

  const medal = raw.bestMedal as Record<string, unknown> | null | undefined;
  const badge = raw.careerBadge as Record<string, unknown> | null | undefined;

  return {
    robloxId,
    frameStyle: safeFrameStyle(raw.frameStyle),
    decoration: safeImageUrl(raw.decoration),
    decorationCutout: raw.decorationCutout === true,
    backgroundGifUrl: safeCssUrl(raw.backgroundGifUrl),
    accentColor: safeColor(raw.accentColor),
    nameColor: safeColor(raw.nameColor),
    customTitle: safeText(raw.customTitle, 40),
    status: safeText(raw.status, 60),
    bestMedal:
      medal && typeof medal.tier === "string"
        ? {
            tier: String(medal.tier),
            label: String(medal.label ?? medal.tier),
            emoji: String(medal.emoji ?? ""),
          }
        : null,
    careerBadge:
      badge && typeof badge.image === "string"
        ? {
            id: String(badge.id ?? ""),
            label: String(badge.label ?? ""),
            image: String(badge.image),
          }
        : null,
  };
}

/** Empty map on any failure — the roster must not depend on the bot being up. */
export async function fetchCustomizations(): Promise<CustomizationMap> {
  let payload: unknown;
  try {
    const res = await fetch("/api/bot-members", { cache: "no-store" });
    if (!res.ok) return {};
    payload = await res.json();
  } catch {
    return {};
  }

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { members?: unknown })?.members)
      ? (payload as { members: unknown[] }).members
      : [];

  const map: CustomizationMap = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const entry = toCustomization(row as Record<string, unknown>);
    if (entry) map[entry.robloxId] = entry;
  }
  return map;
}
