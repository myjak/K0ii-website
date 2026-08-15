import type { SeriesPoint } from "@k0ii/schemas";

const HOUR_MS = 3_600_000;
const MIN_RATE_WINDOW_MS = 4 * 60 * 1000;

function sampleAt(series: SeriesPoint[], target: number): SeriesPoint | null {
  if (series.length === 0) return null;
  let previous: SeriesPoint | null = null;
  for (const point of series) {
    if (point.timestamp === target) return point;
    if (point.timestamp > target) {
      if (!previous) return point;
      const span = point.timestamp - previous.timestamp;
      if (span <= 0) return previous;
      const ratio = (target - previous.timestamp) / span;
      return {
        timestamp: target,
        value:
          previous.value +
          (point.value - previous.value) * Math.min(1, Math.max(0, ratio)),
      };
    }
    previous = point;
  }
  return previous;
}

/** Rolling 1h PPH samples from cumulative point series. */
export function derivePphSeries(series: SeriesPoint[]): SeriesPoint[] {
  if (series.length < 2) return [];
  const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);
  const out: SeriesPoint[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const slice = sorted.slice(0, i + 1);
    const latest = slice[slice.length - 1]!;
    const base = sampleAt(slice, latest.timestamp - HOUR_MS);
    if (!base) continue;
    const deltaMs = latest.timestamp - base.timestamp;
    if (deltaMs < MIN_RATE_WINDOW_MS) continue;
    const delta = latest.value - base.value;
    if (delta < 0) continue;
    out.push({
      timestamp: latest.timestamp,
      value: delta / (deltaMs / HOUR_MS),
    });
  }

  return out;
}

export function pphStats(pphSeries: SeriesPoint[]): {
  avg: number | null;
  best: number | null;
  latest: number | null;
} {
  if (pphSeries.length === 0) {
    return { avg: null, best: null, latest: null };
  }
  const values = pphSeries.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: sum / values.length,
    best: Math.max(...values),
    latest: values[values.length - 1]!,
  };
}
