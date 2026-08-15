import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { SeriesPoint } from "@k0ii/schemas";

import { ensureChartFonts, font } from "./fonts";
import { fmtCompact, fmtPph } from "./format";

/** CW-Bot chart accent (sky blue glow). */
const LINE = "#4DB0F0";
const LINE_CORE = "#9AD4FF";
const BG = "#0c0e14";
const CARD = "#12161f";
const MUTED = "#6b7585";
const LABEL = "#9aa3b2";
const TEXT = "#f0f3f8";

export type PlayerChartInput = {
  displayName: string;
  clanName: string;
  eventTitle: string | null;
  /** Chart TOTAL = 24h points gained (null → —). */
  totalPoints: number | null;
  avgPph: number | null;
  bestPph: number | null;
  latestPph: number | null;
  pphSeries: SeriesPoint[];
  updatedAt: number;
  avatarUrl?: string | null;
};

type Pt = { x: number; y: number };

function hoursAgoLabel(ts: number, now: number): string {
  const h = Math.max(0, Math.round((now - ts) / 3_600_000));
  if (h <= 0) return "NOW";
  return `${h}H AGO`;
}

function truncateToWidth(
  ctx: { measureText: (t: string) => { width: number } },
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/** Catmull-Rom → cubic Bezier path (smooth CW-style curve). */
function strokeSmooth(ctx: Ctx2d, pts: Pt[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1]!.x, pts[1]!.y);
    return;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function fillSmoothToBaseline(ctx: Ctx2d, pts: Pt[], baselineY: number) {
  if (pts.length < 2) return;
  strokeSmooth(ctx, pts);
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  ctx.lineTo(last.x, baselineY);
  ctx.lineTo(first.x, baselineY);
  ctx.closePath();
}

type Ctx2d = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

/**
 * Dark CW-style rate chart — soft blue glow, locked 24h window.
 */
export async function renderPlayerPphChart(
  input: PlayerChartInput,
): Promise<Buffer> {
  ensureChartFonts();

  const W = 960;
  const H = 460;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Outer void
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Card with soft depth
  const cardX = 8;
  const cardY = 8;
  const cardW = W - 16;
  const cardH = H - 16;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  const cardGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  cardGrad.addColorStop(0, "#161b26");
  cardGrad.addColorStop(0.55, CARD);
  cardGrad.addColorStop(1, "#0e1219");
  ctx.fillStyle = cardGrad;
  ctx.fill();

  ctx.strokeStyle = "rgba(80, 100, 130, 0.28)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 16);
  ctx.stroke();

  // Soft top highlight
  const shine = ctx.createLinearGradient(0, cardY, 0, cardY + 90);
  shine.addColorStop(0, "rgba(91, 168, 232, 0.06)");
  shine.addColorStop(1, "rgba(91, 168, 232, 0)");
  roundRect(ctx, cardX, cardY, cardW, 90, 16);
  ctx.fillStyle = shine;
  ctx.fill();

  const padX = 36;
  const headerY = 46;

  // Avatar + ring
  const ax = padX + 18;
  const ay = headerY + 6;
  const ar = 18;
  ctx.beginPath();
  ctx.arc(ax, ay, ar + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(77, 176, 240, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.fillStyle = "#1a2230";
  ctx.fill();

  if (input.avatarUrl) {
    try {
      const img = await loadImage(input.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, ar, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, ax - ar, ay - ar, ar * 2, ar * 2);
      ctx.restore();
    } catch {
      drawInitial(ctx, ax, ay, input.displayName);
    }
  } else {
    drawInitial(ctx, ax, ay, input.displayName);
  }

  const metrics: [string, string][] = [
    ["TOTAL", fmtCompact(input.totalPoints)],
    ["AVG/H", fmtPph(input.avgPph)],
    ["BEST/H", fmtPph(input.bestPph)],
    ["LATEST/H", fmtPph(input.latestPph)],
  ];
  const metricW = 118;
  const metricsLeft = W - padX - metrics.length * metricW;

  let mx = metricsLeft;
  for (let i = 0; i < metrics.length; i++) {
    const [label, value] = metrics[i]!;
    if (i > 0) {
      ctx.strokeStyle = "rgba(120, 140, 170, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx - 6, headerY - 14);
      ctx.lineTo(mx - 6, headerY + 18);
      ctx.stroke();
    }
    ctx.fillStyle = LINE;
    ctx.font = font(600, 11);
    ctx.letterSpacing = "0.08em";
    ctx.textAlign = "right";
    ctx.fillText(label, mx + metricW - 4, headerY - 8);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = TEXT;
    ctx.font = font(700, 20);
    ctx.fillText(value, mx + metricW - 4, headerY + 16);
    mx += metricW;
  }
  ctx.textAlign = "left";

  const nameMax = Math.max(140, metricsLeft - (padX + 48) - 16);
  ctx.fillStyle = TEXT;
  ctx.font = font(700, 22);
  ctx.fillText(
    truncateToWidth(ctx, input.displayName, nameMax),
    padX + 46,
    headerY,
  );

  ctx.fillStyle = LABEL;
  ctx.font = font(500, 13);
  const clanBit = `Clan ${input.clanName}`;
  const sub = input.eventTitle
    ? `${clanBit} • ${input.eventTitle}`
    : clanBit;
  ctx.fillText(truncateToWidth(ctx, sub, nameMax), padX + 46, headerY + 22);

  const now = input.updatedAt;
  const windowStart = now - 24 * 3_600_000;
  const points = input.pphSeries
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((p) => p.timestamp >= windowStart && p.timestamp <= now);

  // Tab row
  const tabY = 96;
  ctx.font = font(700, 12);
  ctx.letterSpacing = "0.06em";
  ctx.fillStyle = LINE;
  const tabLabel = "POINTS / HOUR";
  ctx.fillText(tabLabel, padX, tabY);
  const tabW = ctx.measureText(tabLabel).width;
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 12);
  ctx.fillText("LAST 24 HOURS", padX + tabW + 16, tabY);
  ctx.letterSpacing = "0px";

  // Active tab underline
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(padX, tabY + 6);
  ctx.lineTo(padX + tabW, tabY + 6);
  ctx.stroke();

  const chartLeft = padX + 68;
  const chartRight = W - padX - 8;
  const chartTop = 118;
  const chartBottom = H - 62;
  const chartH = chartBottom - chartTop;

  const values = points.map((p) => p.value);
  const maxV = values.length > 0 ? Math.max(...values, 0) : 0;
  // Headroom so peaks don't kiss the top edge
  const spanV = Math.max(maxV * 1.08, 1);

  // Soft horizontal guides (very faint)
  ctx.font = font(500, 12);
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const gy = chartBottom - t * chartH;
    const val = spanV * t;
    ctx.strokeStyle =
      i === 0 ? "rgba(120, 140, 170, 0.22)" : "rgba(120, 140, 170, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, gy);
    ctx.lineTo(chartRight, gy);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.fillText(fmtPph(val), chartLeft - 12, gy + 4);
  }
  ctx.textAlign = "left";

  const xAt = (ts: number) =>
    chartLeft +
    ((ts - windowStart) / (24 * 3_600_000)) * (chartRight - chartLeft);
  const yAt = (v: number) => chartBottom - (v / spanV) * chartH;

  if (points.length >= 2) {
    const pts: Pt[] = points.map((p) => ({
      x: xAt(p.timestamp),
      y: yAt(p.value),
    }));

    // Area fill
    const area = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    area.addColorStop(0, "rgba(77, 176, 240, 0.38)");
    area.addColorStop(0.55, "rgba(77, 176, 240, 0.12)");
    area.addColorStop(1, "rgba(77, 176, 240, 0.01)");
    fillSmoothToBaseline(ctx, pts, chartBottom);
    ctx.fillStyle = area;
    ctx.fill();

    // Outer glow
    ctx.save();
    ctx.shadowColor = "rgba(77, 176, 240, 0.85)";
    ctx.shadowBlur = 18;
    strokeSmooth(ctx, pts);
    ctx.strokeStyle = "rgba(77, 176, 240, 0.35)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Mid glow
    strokeSmooth(ctx, pts);
    ctx.strokeStyle = "rgba(77, 176, 240, 0.55)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Core line
    strokeSmooth(ctx, pts);
    ctx.strokeStyle = LINE_CORE;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Endpoint halo + dot
    const last = pts[pts.length - 1]!;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(77, 176, 240, 0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = LINE_CORE;
    ctx.fill();
    ctx.strokeStyle = CARD;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 15);
    ctx.textAlign = "center";
    ctx.fillText(
      "Not enough rate samples in the last 24 hours",
      (chartLeft + chartRight) / 2,
      (chartTop + chartBottom) / 2,
    );
    ctx.textAlign = "left";
  }

  // X labels
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 11);
  ctx.letterSpacing = "0.04em";
  ctx.textAlign = "center";
  for (const h of [23, 17, 11, 6, 0]) {
    const ts = now - h * 3_600_000;
    ctx.fillText(hoursAgoLabel(ts, now), xAt(ts), chartBottom + 22);
  }
  ctx.textAlign = "left";

  const samples = points.length;
  const updated = new Date(input.updatedAt).toISOString().slice(11, 16);
  ctx.fillStyle = "rgba(100, 110, 126, 0.95)";
  ctx.font = font(500, 10);
  ctx.letterSpacing = "0.1em";
  ctx.fillText(
    `60 MIN CACHE  •  ${samples} RATE SAMPLES  •  UPDATED ${updated} UTC`,
    padX,
    H - 26,
  );
  ctx.letterSpacing = "0px";

  return canvas.toBuffer("image/png");
}

function drawInitial(ctx: Ctx2d, ax: number, ay: number, name: string) {
  ctx.fillStyle = LINE;
  ctx.font = font(700, 15);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.trim().slice(0, 1).toUpperCase() || "?", ax, ay + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function roundRect(
  ctx: Ctx2d,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
