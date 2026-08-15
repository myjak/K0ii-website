"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { LeagueEntry } from "@k0ii/schemas";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";

import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import {
  formatNumber,
  formatPoints,
  formatPph,
  formatSignedDelta,
} from "@/lib/format";
import { relativeToneClass, TONE_CLASS_MAP } from "@/lib/tones";
import { cn } from "@/lib/utils";

export type LeagueSortKey =
  | "rank"
  | "name"
  | "points"
  | "pph"
  | "delta5m"
  | "seats"
  | "contributors";

export type LeagueSortOrder = "asc" | "desc";

export type LeagueRow = LeagueEntry & {
  discordFilled: number | null;
  discordCapacity: number | null;
};

const SORT_KEYS: LeagueSortKey[] = [
  "rank",
  "name",
  "points",
  "pph",
  "delta5m",
  "seats",
  "contributors",
];

export const MOBILE_SORT_OPTIONS: { key: LeagueSortKey; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "rank", label: "Rank" },
  { key: "pph", label: "PPH" },
  { key: "delta5m", label: "5m" },
  { key: "seats", label: "Seats" },
  { key: "contributors", label: "Contributors" },
  { key: "name", label: "Name" },
];

export function normalizeLeagueSortKey(value: string | null): LeagueSortKey {
  if (value && SORT_KEYS.includes(value as LeagueSortKey)) {
    return value as LeagueSortKey;
  }
  return "points";
}

function seatScore(row: LeagueRow): number {
  if (row.discordFilled == null) return -1;
  return row.discordFilled;
}

function contributorScore(row: LeagueRow): number {
  if (row.contributions?.length) return row.contributions.length;
  if (row.contributorCount != null) return row.contributorCount;
  if (row.memberCount != null) return row.memberCount;
  return -1;
}

export function sortLeagues(
  rows: LeagueRow[],
  key: LeagueSortKey,
  order: LeagueSortOrder,
): LeagueRow[] {
  const sorted = [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (key) {
      case "name":
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        break;
      case "rank":
        av = a.rank ?? Number.POSITIVE_INFINITY;
        bv = b.rank ?? Number.POSITIVE_INFINITY;
        break;
      case "seats":
        av = seatScore(a);
        bv = seatScore(b);
        break;
      case "contributors":
        av = contributorScore(a);
        bv = contributorScore(b);
        break;
      case "points":
        av = a.points ?? -1;
        bv = b.points ?? -1;
        break;
      case "pph":
        av = a.pph ?? -1;
        bv = b.pph ?? -1;
        break;
      case "delta5m":
        av = a.delta5m ?? Number.NEGATIVE_INFINITY;
        bv = b.delta5m ?? Number.NEGATIVE_INFINITY;
        break;
      default:
        av = 0;
        bv = 0;
    }
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

function SortHead({
  label,
  active,
  order,
  onClick,
  align = "right",
}: {
  label: string;
  active: boolean;
  order: LeagueSortOrder;
  onClick: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        active && "text-koi",
      )}
    >
      {label}
      {active ? (
        order === "asc" ? (
          <ArrowUp className="size-3.5" aria-hidden />
        ) : (
          <ArrowDown className="size-3.5" aria-hidden />
        )
      ) : null}
    </button>
  );
}

function numCell(value: string, tone?: string, emphasize = false) {
  return (
    <span
      className={cn(
        "font-tabular text-sm",
        emphasize && "font-semibold text-ink",
        tone,
      )}
    >
      {value}
    </span>
  );
}

function MobileStat({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-tabular text-sm",
          emphasize && "font-semibold text-ink",
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function LeagueCell({ row }: { row: LeagueRow }) {
  return (
    <div className="flex min-w-0 max-w-[240px] items-center gap-2.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold",
          row.isOurs
            ? "bg-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)] text-koi"
            : "bg-card-surface-alt text-ink-soft",
        )}
        aria-hidden
      >
        {leagueInitials(row.name)}
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-display text-sm font-semibold leading-tight",
            row.isOurs ? "text-koi" : "text-ink",
          )}
        >
          {row.name}
        </div>
        <div className="truncate text-[11px] leading-snug text-ink-soft">
          {row.pending
            ? "Awaiting PS99 match"
            : row.source
              ? row.source
              : row.isOurs
                ? "tracked"
                : "ladder"}
        </div>
      </div>
    </div>
  );
}

function seatsLabel(row: LeagueRow): string {
  if (row.discordFilled != null && row.discordCapacity != null) {
    return `${formatNumber(row.discordFilled)}/${formatNumber(row.discordCapacity)}`;
  }
  return "—";
}

function contributorsLabel(row: LeagueRow): string {
  const n = contributorScore(row);
  return n >= 0 ? formatNumber(n) : "—";
}

function rankTone(index: number): string | undefined {
  if (index === 0)
    return "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]";
  if (index === 1)
    return "bg-[color-mix(in_srgb,var(--pond-teal)_8%,transparent)]";
  if (index === 2)
    return "bg-[color-mix(in_srgb,var(--lily-green)_8%,transparent)]";
  return undefined;
}

export function LeaguesTable({
  rows,
  sortKey,
  sortOrder,
  onSort,
  onSortSelect,
  onSelect,
}: {
  rows: LeagueRow[];
  sortKey: LeagueSortKey;
  sortOrder: LeagueSortOrder;
  onSort: (key: LeagueSortKey) => void;
  onSortSelect?: (key: LeagueSortKey) => void;
  onSelect?: (row: LeagueRow) => void;
}) {
  const maxes = useMemo(
    () => ({
      delta5m: Math.max(
        ...rows.map((r) => Math.abs(Number(r.delta5m) || 0)),
        1,
      ),
      pph: Math.max(...rows.map((r) => Number(r.pph) || 0), 1),
    }),
    [rows],
  );

  const sortSelect = onSortSelect ?? onSort;

  const columns = useMemo<ColumnDef<LeagueRow>[]>(() => {
    const head = (
      key: LeagueSortKey,
      label: string,
      align: "left" | "right" | "center" = "right",
    ) => (
      <SortHead
        label={label}
        active={sortKey === key}
        order={sortOrder}
        onClick={() => onSort(key)}
        align={align}
      />
    );

    return [
      {
        id: "rank",
        header: () => head("rank", "Rank", "center"),
        cell: ({ row }) =>
          numCell(
            row.original.rank != null
              ? formatOrdinal(row.original.rank)
              : "—",
            undefined,
            true,
          ),
        meta: { align: "center" },
      },
      {
        id: "league",
        header: () => head("name", "League", "left"),
        cell: ({ row }) => <LeagueCell row={row.original} />,
        meta: { align: "left" },
      },
      {
        id: "points",
        header: () => head("points", "Points"),
        cell: ({ row }) =>
          numCell(formatPoints(row.original.points), undefined, true),
      },
      {
        id: "pph",
        header: () => head("pph", "PPH"),
        cell: ({ row }) =>
          numCell(
            formatPph(row.original.pph),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.pph, maxes.pph)
            ],
            true,
          ),
      },
      {
        id: "delta5m",
        header: () => head("delta5m", "5m"),
        cell: ({ row }) =>
          numCell(
            formatSignedDelta(row.original.delta5m),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.delta5m, maxes.delta5m)
            ],
          ),
      },
      {
        id: "seats",
        header: () => head("seats", "Seats"),
        cell: ({ row }) => numCell(seatsLabel(row.original)),
        meta: { showFrom: "lg" },
      },
      {
        id: "contributors",
        header: () => head("contributors", "PS99"),
        cell: ({ row }) => numCell(contributorsLabel(row.original)),
      },
    ];
  }, [maxes.delta5m, maxes.pph, onSort, sortKey, sortOrder]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const maxPts = useMemo(
    () => Math.max(...rows.map((r) => Number(r.points) || 0), 1),
    [rows],
  );

  return (
    <div className="pond-card overflow-hidden">
      <div className="md:hidden">
        <div className="flex gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] p-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Sort leagues by</span>
            <select
              className="h-11 w-full rounded-[var(--radius-input)] border border-border bg-card-surface px-3 font-display text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-pond-teal/40"
              value={sortKey}
              onChange={(e) =>
                sortSelect(normalizeLeagueSortKey(e.target.value))
              }
            >
              {MOBILE_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-border bg-card-surface px-3 font-display text-sm font-semibold text-ink transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pond-teal/40"
            onClick={() => onSort(sortKey)}
            aria-label={
              sortOrder === "asc" ? "Sort descending" : "Sort ascending"
            }
          >
            {sortOrder === "asc" ? (
              <ArrowUp className="size-4 text-koi" aria-hidden />
            ) : (
              <ArrowDown className="size-4 text-koi" aria-hidden />
            )}
            <span className="text-ink-soft">
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </span>
          </button>
        </div>

        <ul className="max-h-[min(70vh,52rem)] divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] overflow-y-auto overscroll-contain">
          {rows.map((row, i) => (
            <li key={row.name}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col gap-2.5 px-3 py-3 text-left outline-none",
                  "transition-[transform,background-color] duration-150 ease-[var(--ease-out)]",
                  "active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pond-teal/35",
                  rankTone(i) ??
                    (i % 2 === 1 ? "bg-card-surface-alt" : "bg-card-surface"),
                )}
                onClick={() => onSelect?.(row)}
                aria-label={`Open ${row.name}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-center font-tabular text-sm font-semibold text-koi">
                    {row.rank != null ? `#${formatNumber(row.rank)}` : "—"}
                  </span>
                  <LeagueCell row={row} />
                </div>
                <div className="space-y-2 pl-[3.25rem]">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        row.isOurs ? "bg-koi" : "bg-pond-teal",
                      )}
                      style={{
                        width: `${Math.min(100, ((Number(row.points) || 0) / maxPts) * 100).toFixed(2)}%`,
                      }}
                    />
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <MobileStat
                      label="Points"
                      value={formatPoints(row.points)}
                      emphasize
                    />
                    <MobileStat
                      label="PPH"
                      value={formatPph(row.pph)}
                      emphasize
                    />
                    <MobileStat
                      label="5m"
                      value={formatSignedDelta(row.delta5m)}
                      tone={
                        TONE_CLASS_MAP[
                          relativeToneClass(row.delta5m, maxes.delta5m)
                        ]
                      }
                    />
                    <MobileStat
                      label="Seats"
                      value={seatsLabel(row)}
                      emphasize={row.discordFilled != null}
                    />
                  </div>
                </div>
              </button>
            </li>
          ))}
          {!rows.length ? (
            <li className="px-6 py-14 text-center">
              <p className="font-display text-base font-semibold text-ink">
                No leagues match
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Clear search or switch scope.
              </p>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="hidden max-h-[min(70vh,52rem)] overflow-auto overscroll-contain md:block">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { align?: string; showFrom?: string }
                    | undefined;
                  const hide =
                    meta?.showFrom === "lg"
                      ? "hidden lg:table-cell"
                      : "";
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "sticky top-0 z-10 h-11 bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] px-3",
                        "border-b border-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
                        hide,
                        meta?.align === "left" && "text-left",
                        meta?.align === "center" && "text-center",
                        (!meta?.align || meta.align === "right") &&
                          "text-right",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => {
              const league = row.original;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors duration-150 ease-[var(--ease-out)]",
                    rankTone(i) ??
                      (i % 2 === 0
                        ? "bg-card-surface/70"
                        : "bg-card-surface-alt/60"),
                    onSelect &&
                      "cursor-pointer hover:bg-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] active:scale-[0.998]",
                    league.isOurs &&
                      "shadow-[inset_3px_0_0_var(--koi-orange)]",
                  )}
                  onClick={() => onSelect?.(league)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(league);
                    }
                  }}
                  tabIndex={onSelect ? 0 : undefined}
                  role={onSelect ? "button" : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { align?: string; showFrom?: string }
                      | undefined;
                    const hide =
                      meta?.showFrom === "lg"
                        ? "hidden lg:table-cell"
                        : "";
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "border-b border-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] px-3 py-2.5",
                          hide,
                          meta?.align === "left" && "text-left",
                          meta?.align === "center" && "text-center",
                          (!meta?.align || meta.align === "right") &&
                            "text-right",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
