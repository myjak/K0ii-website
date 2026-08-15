"use client";

import type {
  DiscordLeague,
  LeagueEntry,
  LeaguesResponse,
} from "@k0ii/schemas";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo } from "react";

import { LeagueDetailDialog } from "@/components/leagues/league-detail-dialog";
import {
  LeaguesTable,
  normalizeLeagueSortKey,
  sortLeagues,
  type LeagueRow,
  type LeagueSortKey,
  type LeagueSortOrder,
} from "@/components/leagues/leagues-table";
import { HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { PanelErrorBoundary } from "@/components/layout/panel-error-boundary";
import { SegmentedControl } from "@/components/roster/dialog-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatNumber,
  formatPoints,
  formatPph,
  formatRelativeTime,
} from "@/lib/format";
import { useLeagues } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const SCOPES = ["ours", "all"] as const;
type Scope = (typeof SCOPES)[number];

function enrichRows(
  entries: LeagueEntry[],
  discordByName: Map<string, DiscordLeague>,
): LeagueRow[] {
  return entries.map((entry) => {
    const discord = discordByName.get(entry.name.toLowerCase());
    const filled = discord
      ? 1 + (Array.isArray(discord.memberIds) ? discord.memberIds.length : 0)
      : null;
    const capacity = discord ? 1 + discord.capacity : null;
    return {
      ...entry,
      discordFilled: filled,
      discordCapacity: capacity,
    };
  });
}

function mergeAll(
  tracked: LeagueEntry[],
  top100: LeagueEntry[],
): LeagueEntry[] {
  const map = new Map<string, LeagueEntry>();
  for (const row of top100) map.set(row.name.toLowerCase(), row);
  for (const row of tracked) map.set(row.name.toLowerCase(), row);
  return [...map.values()];
}

function StatCell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-h-[4.5rem] flex-col justify-between gap-2 p-3.5 sm:p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <div>
        <p
          className={cn(
            "font-display text-2xl font-bold tabular-nums tracking-tight",
            accent ? "text-koi" : "text-ink",
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-ink-soft">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function LeaguesView({
  initialData = null,
  error: initialError = null,
}: {
  initialData?: LeaguesResponse | null;
  error?: string | null;
}) {
  const {
    data: liveData,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useLeagues({
    initialData: initialData ?? undefined,
  });
  const data = liveData ?? initialData;

  const [scope, setScope] = useQueryState(
    "scope",
    parseAsStringLiteral(SCOPES).withDefault("ours"),
  );
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("points"),
  );
  const [order, setOrder] = useQueryState(
    "order",
    parseAsString.withDefault("desc"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [leagueParam, setLeagueParam] = useQueryState("league", parseAsString);

  const sortKey = normalizeLeagueSortKey(sort);
  const sortOrder: LeagueSortOrder = order === "asc" ? "asc" : "desc";

  const loadError: string | null = !data
    ? (initialError ??
      (error
        ? error instanceof Error
          ? error.message
          : "Failed to load leagues"
        : null))
    : null;

  const discordByName = useMemo(() => {
    const map = new Map<string, DiscordLeague>();
    for (const d of data?.discordLeagues ?? []) {
      map.set(d.name.toLowerCase(), d);
    }
    return map;
  }, [data?.discordLeagues]);

  const tracked = data?.tracked ?? [];
  const top100 = data?.top100 ?? [];

  const scopedEntries = useMemo(() => {
    if (scope === "all") return mergeAll(tracked, top100);
    return tracked;
  }, [scope, tracked, top100]);

  const rows = useMemo(
    () => enrichRows(scopedEntries, discordByName),
    [scopedEntries, discordByName],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : rows;
    return sortLeagues(list, sortKey, sortOrder);
  }, [rows, search, sortKey, sortOrder]);

  const allForLookup = useMemo(
    () => enrichRows(mergeAll(tracked, top100), discordByName),
    [tracked, top100, discordByName],
  );

  const activeLeague = useMemo(() => {
    if (!leagueParam) return null;
    const needle = leagueParam.toLowerCase();
    return (
      allForLookup.find((r) => r.name.toLowerCase() === needle) ??
      allForLookup.find((r) => r.name.toLowerCase().includes(needle)) ??
      null
    );
  }, [allForLookup, leagueParam]);

  useEffect(() => {
    if (leagueParam && !activeLeague) void setLeagueParam(null);
  }, [leagueParam, activeLeague, setLeagueParam]);

  const discordCount = data?.discordLeagues?.length ?? 0;
  const pendingCount = tracked.filter((t) => t.pending).length;
  const bestRank = useMemo(() => {
    const ranks = tracked
      .map((t) => t.rank)
      .filter((r): r is number => r != null);
    if (!ranks.length) return null;
    return Math.min(...ranks);
  }, [tracked]);
  const topPace = useMemo(() => {
    const list = [...tracked].sort((a, b) => (b.pph ?? -1) - (a.pph ?? -1));
    return list[0] ?? null;
  }, [tracked]);
  const generatedAt = dataUpdatedAt || data?.generatedAt;

  function handleSort(key: LeagueSortKey) {
    if (key === sortKey) {
      void setOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    void setSort(key);
    void setOrder(key === "name" || key === "rank" ? "asc" : "desc");
  }

  function handleSortSelect(key: LeagueSortKey) {
    void setSort(key);
    void setOrder(key === "name" || key === "rank" ? "asc" : "desc");
  }

  if (isLoading && !data) {
    return (
      <div className="pond-page animate-fade-rise">
        <HubSkeleton className="h-36" />
        <HubSkeleton className="h-24" />
        <HubSkeleton className="h-72" />
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="pond-page animate-fade-rise">
        <div className="pond-card flex flex-col items-start gap-3 pond-pad">
          <Heading as="h1" className="text-3xl sm:text-4xl">
            League <span className="text-koi">tracker</span>
          </Heading>
          <p className="max-w-md text-sm text-ink-soft">{loadError}</p>
          <Button
            size="sm"
            className="active:scale-[0.97]"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pond-page">
      <article
        className={cn(
          "pond-card relative p-5 sm:p-6",
          "animate-fade-rise",
          "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_68%)]",
          "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div className="absolute -right-10 -top-12 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pond-teal)_36%,transparent),transparent_70%)] blur-2xl" />
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Heading as="h1">
              League <span className="text-koi">tracker</span>
            </Heading>
            <p className="pond-lede max-w-xl">
              Watch K0ii leagues climb the PS99 board — ranks, pace, and seats.
            </p>
            <p className="text-sm text-ink-soft">
              {formatNumber(tracked.length)} tracked ·{" "}
              {formatNumber(discordCount)} Discord teams ·{" "}
              {formatNumber(top100.length)} ladder
              {generatedAt
                ? ` · Updated ${formatRelativeTime(generatedAt)}${
                    isRefetching ? " · syncing" : ""
                  }`
                : ""}
              {data?.additionsOpen === false ? " · adds closed" : ""}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="self-start active:scale-[0.97] lg:self-end"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={isRefetching ? "animate-spin" : undefined} />
            Reload
          </Button>
        </div>
      </article>

      <div
        className={cn(
          "pond-card grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] overflow-hidden sm:grid-cols-4 sm:divide-y-0",
          "animate-fade-rise",
        )}
        style={{ animationDelay: "40ms" }}
      >
        <StatCell
          label="Tracked"
          value={formatNumber(tracked.length)}
          hint={
            pendingCount
              ? `${formatNumber(pendingCount)} pending PS99`
              : "Discord + pinned + auto"
          }
        />
        <StatCell
          label="Discord teams"
          value={formatNumber(discordCount)}
          hint="Owner + up to 3"
          accent={discordCount > 0}
        />
        <StatCell
          label="Best rank"
          value={bestRank != null ? `#${formatNumber(bestRank)}` : "—"}
          hint="Among tracked"
          accent
        />
        <StatCell
          label="Top pace"
          value={topPace ? formatPph(topPace.pph) : "—"}
          hint={
            topPace
              ? `${topPace.name} · ${formatPoints(topPace.points)}`
              : "PPH leader"
          }
        />
      </div>

      <section
        className="pond-section animate-fade-rise"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="pond-section-head min-w-0">
            <Heading as="h2">Leagues</Heading>
            <p className="text-sm text-ink-soft">
              {search.trim()
                ? `${formatNumber(filtered.length)} match${filtered.length === 1 ? "" : "es"}`
                : scope === "ours"
                  ? `${formatNumber(filtered.length)} tracked teams`
                  : `${formatNumber(filtered.length)} unique leagues`}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SegmentedControl
              value={scope}
              onChange={(id) => void setScope(id)}
              options={[
                { id: "ours", label: "Tracked" },
                { id: "all", label: "All" },
              ]}
            />
            <label className="relative w-full sm:w-56">
              <span className="sr-only">Search leagues</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value || null)}
                placeholder="Search leagues"
                className="h-11 pl-9"
                autoComplete="off"
              />
            </label>
          </div>
        </div>

        <PanelErrorBoundary title="League list failed">
          {filtered.length > 0 ? (
            <LeaguesTable
              rows={filtered}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={handleSort}
              onSortSelect={handleSortSelect}
              onSelect={(row) => void setLeagueParam(row.name)}
            />
          ) : (
            <div className="pond-card px-6 py-12 text-center">
              <p className="font-display text-base font-semibold text-ink">
                {scopedEntries.length === 0
                  ? scope === "ours"
                    ? "No tracked leagues yet"
                    : "Nothing on this board"
                  : "No matches"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {scopedEntries.length === 0
                  ? "Discord create / pin / auto k0i·koi fill Ours. Ladder still lists top 100."
                  : "Clear search or switch Tracked / All."}
              </p>
            </div>
          )}
        </PanelErrorBoundary>
      </section>

      <LeagueDetailDialog
        league={activeLeague}
        open={Boolean(activeLeague)}
        onOpenChange={(open) => {
          if (!open) void setLeagueParam(null);
        }}
      />
    </div>
  );
}
