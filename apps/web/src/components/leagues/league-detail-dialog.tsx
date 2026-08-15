"use client";

import type {
  DiscordLeague,
  LeagueContributor,
  LeagueDetailResponse,
  LeagueEntry,
} from "@k0ii/schemas";
import { useEffect, useState } from "react";

import {
  DialogSection,
  EmptyPanel,
  MetricTile,
  dialogContentClass,
} from "@/components/roster/dialog-bits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatOrdinal } from "@/lib/analytics/rank-forecast";
import { fetchLeagueDetail } from "@/lib/api/client";
import {
  formatNumber,
  formatPoints,
  formatPph,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { cn } from "@/lib/utils";

function DiscordRoster({ discord }: { discord: DiscordLeague }) {
  const seats = [
    { id: discord.ownerId, role: "Owner" as const },
    ...discord.memberIds.map((id) => ({ id, role: "Member" as const })),
  ];
  const filled = seats.length;
  const capacity = 1 + discord.capacity; // owner + max members

  return (
    <DialogSection
      title="Discord team"
      description={`${formatNumber(filled)} of ${formatNumber(capacity)} · Discord IDs (no username lookup)`}
    >
      <ul className="space-y-2">
        {seats.map((seat) => (
          <li
            key={`${seat.role}-${seat.id}`}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] bg-card-surface-alt/90 px-3 py-2.5 text-sm ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)]"
          >
            <span className="min-w-0">
              <span className="block font-medium text-ink">{seat.role}</span>
              <span
                className="mt-0.5 block truncate font-tabular text-xs text-ink-soft"
                title={seat.id}
              >
                {seat.id}
              </span>
            </span>
            {seat.role === "Owner" ? (
              <span className="shrink-0 text-xs font-medium text-koi">
                Owner
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </DialogSection>
  );
}

function ContributionRow({
  row,
  rank,
}: {
  row: LeagueContributor;
  rank: number;
}) {
  const avatar = httpsOnlyUrl(row.avatarUrl);
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-input)] bg-card-surface-alt/90 px-3 py-2.5 ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)]">
      <span className="w-6 shrink-0 font-tabular text-xs text-ink-soft">
        #{rank}
      </span>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]"
        />
      ) : (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] font-display text-xs font-bold text-ink-soft"
          aria-hidden
        >
          {row.displayName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">
          {row.displayName}
        </span>
        {row.sharePct != null ? (
          <span className="mt-0.5 block text-xs text-ink-soft">
            {formatNumber(row.sharePct)}% of league points
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-tabular font-semibold text-koi">
        {formatPoints(row.points)}
      </span>
    </li>
  );
}

export function LeagueDetailDialog({
  league,
  open,
  onOpenChange,
}: {
  league: LeagueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<LeagueDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !league) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchLeagueDetail(league.name)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load members",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, league?.name]);

  const title = detail?.name ?? league?.name ?? "League";
  const contributions =
    detail?.contributions ?? league?.contributions ?? [];
  const discord = detail?.discord ?? null;
  const rank = detail?.rank ?? league?.rank ?? null;
  const points = detail?.points ?? league?.points ?? null;
  const pph = detail?.pph ?? league?.pph ?? null;
  const isOurs = detail?.isOurs ?? league?.isOurs ?? false;
  const contributorCount =
    detail?.contributorCount ??
    league?.contributorCount ??
    (contributions.length || null);
  const memberCount = detail?.memberCount ?? league?.memberCount ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClass} showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Small teams (owner + ≤3) vs the full clan roster. Discord seats and
            PS99 point split.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Rank"
            value={rank != null ? formatOrdinal(rank) : "—"}
            accent={isOurs}
          />
          <MetricTile label="Points" value={formatPoints(points)} accent />
          <MetricTile label="PPH" value={formatPph(pph)} />
          <MetricTile
            label="Team size"
            value={
              discord
                ? `${formatNumber(1 + discord.memberIds.length)}/${formatNumber(1 + discord.capacity)}`
                : memberCount != null
                  ? formatNumber(memberCount)
                  : contributorCount != null
                    ? formatNumber(contributorCount)
                    : "—"
            }
            hint={
              discord
                ? "Discord seats"
                : contributorCount != null
                  ? "PS99 contributors"
                  : "Seats unknown"
            }
          />
        </div>

        {discord ? <DiscordRoster discord={discord} /> : null}

        <DialogSection
          title="PS99 contributions"
          description={
            loading
              ? "Loading member breakdown…"
              : contributions.length > 0
                ? `${formatNumber(contributions.length)} players with points`
                : "No per-player breakdown yet"
          }
        >
          {error ? (
            <EmptyPanel>{error}</EmptyPanel>
          ) : contributions.length === 0 && !loading ? (
            <EmptyPanel>
              No contribution snapshot for this league. Tracked leagues fill
              after the next poll; top-100 rows load live when available.
            </EmptyPanel>
          ) : (
            <ul className="max-h-[min(40vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {contributions.map((row, i) => (
                <ContributionRow
                  key={row.robloxUserId}
                  row={row}
                  rank={i + 1}
                />
              ))}
            </ul>
          )}
          {loading && contributions.length > 0 ? (
            <p
              className={cn(
                "text-xs text-ink-soft",
                "animate-pulse motion-reduce:animate-none",
              )}
            >
              Refreshing…
            </p>
          ) : null}
        </DialogSection>
      </DialogContent>
    </Dialog>
  );
}
