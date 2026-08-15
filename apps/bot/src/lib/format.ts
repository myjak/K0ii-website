/** Compact game-style numbers: 13.51m, 105.03k */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${trimZeros(v >= 100 ? v.toFixed(0) : v.toFixed(2))}m`;
  }
  if (abs >= 10_000) {
    const v = abs / 1_000;
    return `${sign}${trimZeros(v >= 100 ? v.toFixed(0) : v.toFixed(2))}k`;
  }
  if (abs >= 1_000) {
    return `${sign}${trimZeros((abs / 1_000).toFixed(2))}k`;
  }
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

/** Rate values — keep one decimal under 1k. */
export function fmtPph(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000) return fmtCompact(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}${trimZeros(abs.toFixed(1))}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, "");
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  if (hr < 48) return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function fmtSignedCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n > 0) return `+${fmtCompact(n)}`;
  if (n < 0) return `-${fmtCompact(Math.abs(n))}`;
  return "0";
}

/** Escape Discord markdown metacharacters in user-controlled strings. */
export function escapeMd(text: string): string {
  return text.replace(/([\\_*`~|])/g, "\\$1");
}
