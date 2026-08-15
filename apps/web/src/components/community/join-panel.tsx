"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Banknote,
  Check,
  Globe2,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DISCORD_URL } from "@/components/layout/nav-config";
import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  CAREER_BADGES,
  JOIN_MUST,
  JOIN_NICE,
  JOIN_STEPS,
  JOIN_WHY,
} from "@/lib/join-content";
import { formatNumber, formatPoints } from "@/lib/format";
import { useBattleRewards, useRoster } from "@/lib/hooks/use-api";
import { useClanBank } from "@/lib/hooks/use-clan-bank";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { clanBattleGiveawayDisplay, clanBattlePodiumDisplay } from "@/lib/prize-copy";
import { cn } from "@/lib/utils";

const WHY_META: {
  icon: LucideIcon;
  accent: "koi" | "teal" | "lily";
  art?: string;
}[] = [
  { icon: Banknote, accent: "koi", art: "/badges/koi-8.png" },
  { icon: Wrench, accent: "teal" },
  { icon: Sparkles, accent: "lily", art: "/badges/koi-4.png" },
  { icon: Globe2, accent: "teal" },
];

function whyIconClass(accent: "koi" | "teal" | "lily") {
  if (accent === "koi") {
    return "bg-[color-mix(in_srgb,var(--koi-orange)_20%,var(--card-surface))] text-koi ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_24%,transparent)]";
  }
  if (accent === "lily") {
    return "bg-[color-mix(in_srgb,var(--lily-green)_22%,var(--card-surface))] text-lily ring-1 ring-[color-mix(in_srgb,var(--lily-green)_24%,transparent)]";
  }
  return "bg-[color-mix(in_srgb,var(--pond-teal)_20%,var(--card-surface))] text-pond-teal ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_24%,transparent)]";
}

function WhyJoinSection() {
  const [lead, ...rest] = JOIN_WHY;
  const leadMeta = WHY_META[0]!;
  const LeadIcon = leadMeta.icon;

  return (
    <section className="pond-section">
      <Heading as="h2">Why join K0ii?</Heading>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
        Bank, tooling, alts, and scouting that keep wars competitive.
      </p>

      <div
        className={cn(
          "pond-card mt-5 grid overflow-hidden lg:grid-cols-[1.2fr_0.9fr]",
          "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)]",
        )}
      >
        {/* Featured: Clan Bank */}
        <article
          className={cn(
            "join-lift relative flex flex-col justify-between gap-8 overflow-hidden p-6 sm:p-8 lg:p-10",
            "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_18%,var(--card-surface)),var(--card-surface)_55%,color-mix(in_srgb,var(--pond-teal)_8%,var(--card-surface)))]",
            "border-b border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] lg:border-b-0 lg:border-r",
          )}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_32%,transparent),transparent_68%)] blur-2xl"
            aria-hidden
          />
          {leadMeta.art ? (
            <Image
              src={leadMeta.art}
              alt=""
              width={140}
              height={140}
              className="pointer-events-none absolute -bottom-4 -right-2 size-28 rotate-[-8deg] opacity-50 drop-shadow-md sm:size-36 lg:size-40"
            />
          ) : null}

          <div className="relative space-y-5">
            <div className={cn("flex size-12 items-center justify-center rounded-full", whyIconClass("koi"))}>
              <LeadIcon className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {lead.title}
              </h3>
              <p className="max-w-md text-base leading-relaxed text-ink-soft">
                {lead.desc}
              </p>
            </div>
          </div>

          <p className="relative font-display text-sm font-semibold text-koi">
            Transparent funding. Never left behind.
          </p>
        </article>

        {/* Stacked trio */}
        <ul className="flex flex-col divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)]">
          {rest.map((item, i) => {
            const meta = WHY_META[i + 1]!;
            const Icon = meta.icon;
            return (
              <li
                key={item.title}
                className={cn(
                  "join-lift group relative flex gap-4 overflow-hidden p-5 sm:p-6",
                  "transition-colors duration-200 ease-[var(--ease-out)]",
                  "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-[color-mix(in_srgb,var(--card-surface-alt)_55%,transparent)]",
                  meta.accent === "lily" &&
                    "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--lily-green)_8%,transparent),transparent_60%)]",
                  meta.accent === "teal" &&
                    i === 0 &&
                    "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--pond-teal)_7%,transparent),transparent_60%)]",
                )}
              >
                {meta.art ? (
                  <Image
                    src={meta.art}
                    alt=""
                    width={72}
                    height={72}
                    className="pointer-events-none absolute -right-1 bottom-0 size-16 opacity-25 transition-opacity duration-200 group-hover:opacity-40"
                  />
                ) : null}
                <div
                  className={cn(
                    "relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                    whyIconClass(meta.accent),
                  )}
                >
                  <Icon className="size-5" strokeWidth={2} aria-hidden />
                </div>
                <div className="relative min-w-0 space-y-1.5">
                  <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{item.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function CompeteSection({
  podium,
  giveaway,
}: {
  podium: Array<{
    place: string;
    prizes: readonly string[];
    featured?: boolean;
  }>;
  giveaway: {
    placesLabel?: string;
    title: string;
    description: string;
    tiers: Array<{ places: string; rewards: readonly string[] }>;
  };
}) {
  const first = podium.find((p) => p.featured) ?? podium[0];
  const rest = podium.filter((p) => p !== first);
  const giveawayPlaces =
    giveaway.placesLabel ?? giveaway.tiers.map((t) => t.places).join(", ");

  return (
    <section className="pond-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading as="h2">What We Compete For</Heading>
          <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
            Payout by final placement every clan battle.
          </p>
        </div>
        <Link
          href="/battle-rewards"
          className="font-display text-sm font-semibold text-pond-teal hover:underline"
        >
          Full breakdown
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {first ? (
          <article
            className={cn(
              "pond-card relative overflow-hidden p-6 sm:p-8 lg:col-span-1",
              "bg-[linear-gradient(145deg,color-mix(in_srgb,var(--koi-orange)_20%,var(--card-surface)),var(--card-surface)_60%)]",
              "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_28%,transparent)]",
            )}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-8 size-36 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_35%,transparent),transparent_70%)] blur-2xl"
              aria-hidden
            />
            <p className="pond-label relative">{first.place} place</p>
            <p className="relative mt-2 font-display text-4xl font-bold tracking-tight text-koi sm:text-5xl">
              {first.place}
            </p>
            <ul className="relative mt-3 space-y-1">
              {first.prizes.map((line) => (
                <li
                  key={line}
                  className="font-display text-xl font-semibold text-ink sm:text-2xl"
                >
                  {line}
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {rest.map((p) => (
            <article
              key={p.place}
              className="pond-card flex flex-col justify-center gap-2 p-5 sm:p-6"
            >
              <p className="pond-label">{p.place} place</p>
              <ul className="space-y-1">
                {p.prizes.map((line) => (
                  <li
                    key={line}
                    className="font-display text-2xl font-bold tracking-tight text-ink"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <article
            className={cn(
              "pond-card relative overflow-hidden p-5 sm:col-span-2 sm:p-6",
              "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface)),var(--card-surface)_70%)]",
            )}
          >
            <Image
              src="/badges/koi-10.png"
              alt=""
              width={100}
              height={100}
              className="pointer-events-none absolute -right-2 -bottom-3 size-24 opacity-40 drop-shadow-md sm:size-28"
            />
            <div className="relative max-w-[calc(100%-5.5rem)] space-y-2">
              <p className="pond-label">{giveawayPlaces}</p>
              <p className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                {giveaway.title}
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                {giveaway.description}
              </p>
              {giveaway.tiers.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {giveaway.tiers.map((tier) => (
                    <li
                      key={tier.places}
                      className="rounded-full bg-card-surface-alt px-3 py-1 text-xs font-medium text-ink ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]"
                    >
                      <span className="font-semibold">{tier.places}</span>
                      <span className="text-ink-soft">
                        {" "}
                        {tier.rewards.join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function CareerBadgesSection() {
  return (
    <section className="pond-section">
      <Heading as="h2">Career Badges</Heading>
      <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
        Every battle upgrades your roster badge, Regular Koi to Rainbow Titanic.
      </p>

      <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {CAREER_BADGES.map((badge) => {
          const battleLabel =
            badge.battles === 1 ? "1 battle" : `${badge.battles} battles`;
          const shortName = badge.name.replace(/ Fish$/, "");
          return (
            <li
              key={badge.name}
              title={`${badge.name}, earned after ${battleLabel}`}
              className={cn(
                "pond-card flex flex-col items-center gap-2 p-3 text-center sm:p-4",
                "transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
                "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
                "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[var(--shadow-card-hover)]",
                badge.battles >= 8 &&
                  "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--koi-orange)_12%,var(--card-surface)),var(--card-surface)_75%)]",
                badge.battles >= 4 &&
                  badge.battles < 8 &&
                  "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--pond-teal)_10%,var(--card-surface)),var(--card-surface)_75%)]",
              )}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-koi font-display text-[0.65rem] font-bold text-white">
                {badge.battles}
              </span>
              <Image
                src={badge.image}
                alt={badge.name}
                width={72}
                height={72}
                className="size-14 object-contain sm:size-16"
              />
              <span className="font-display text-[0.7rem] font-semibold leading-snug text-ink sm:text-xs">
                {shortName}
              </span>
              <span className="text-[0.65rem] text-ink-soft">{battleLabel}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RequirementsSection() {
  return (
    <section className="pond-section">
      <Heading as="h2">Requirements</Heading>
      <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
        What we expect, and extras that help your application.
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
        <article
          className={cn(
            "pond-card relative overflow-hidden p-5 sm:p-7",
            "bg-[linear-gradient(150deg,color-mix(in_srgb,var(--koi-orange)_12%,var(--card-surface)),var(--card-surface)_70%)]",
            "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_20%,transparent)]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_28%,transparent),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div className="relative mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-koi text-white shadow-[var(--shadow-button)]">
              <Check className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-2xl font-bold text-ink">
                Minimum
              </h3>
              <p className="text-sm text-ink-soft">Must meet these to apply</p>
            </div>
          </div>
          <ul className="relative grid gap-2 sm:grid-cols-2">
            {JOIN_MUST.map((item) => (
              <li
                key={item}
                className={cn(
                  "flex gap-2.5 rounded-[var(--radius-input)] bg-card-surface/80 px-3 py-2.5",
                  "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_14%,transparent)]",
                )}
              >
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--koi-orange)_18%,var(--card-surface))] text-koi"
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="text-sm leading-snug text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </article>

        <article
          className={cn(
            "pond-card relative overflow-hidden p-5 sm:p-7",
            "bg-[linear-gradient(150deg,color-mix(in_srgb,var(--pond-teal)_14%,var(--card-surface)),var(--card-surface)_72%)]",
            "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-8 -bottom-10 size-36 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pond-teal)_30%,transparent),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div className="relative mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-pond-teal text-white shadow-[var(--shadow-button)]">
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-2xl font-bold text-ink">
                Nice to Have
              </h3>
              <p className="text-sm text-ink-soft">Helps your application</p>
            </div>
          </div>
          <ul className="relative space-y-2">
            {JOIN_NICE.map((item) => (
              <li
                key={item}
                className={cn(
                  "flex gap-2.5 rounded-[var(--radius-input)] bg-card-surface/80 px-3 py-3",
                  "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]",
                )}
              >
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_20%,var(--card-surface))] text-pond-teal"
                  aria-hidden
                >
                  <Plus className="size-3" strokeWidth={3} />
                </span>
                <span className="text-sm leading-snug text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

/** Roster cap the clan runs to; the old join page used the same fallback. */
const ROSTER_CAPACITY = 75;

function TrophyStat({
  label,
  value,
  countTo,
  format,
  tone,
}: {
  label: string;
  /** Static display value; ignored when `countTo` is given. */
  value?: string;
  countTo?: number | null;
  format?: (n: number) => string;
  tone: string;
}) {
  const counted = useCountUp(countTo ?? null);
  const shown =
    countTo != null ? (format ?? ((n: number) => String(Math.round(n))))(counted) : value;

  return (
    <div>
      <dd
        className={cn(
          "font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
          tone,
        )}
      >
        {shown}
      </dd>
      <dt className="pond-label mt-1">{label}</dt>
    </div>
  );
}

export function JoinPanel() {
  const { data } = useRoster({ refetchInterval: false });
  const { data: rewards } = useBattleRewards();
  const { data: bank } = useClanBank();

  const podium = rewards?.podium?.length
    ? rewards.podium
    : clanBattlePodiumDisplay();
  const giveaway = rewards?.giveaway ?? clanBattleGiveawayDisplay();

  const memberCount = data?.battle?.memberCount ?? data?.members.length ?? null;
  const spotsOpen =
    memberCount != null ? Math.max(0, ROSTER_CAPACITY - memberCount) : null;

  return (
    <div className="pond-chapters">
      {/* Hero: asymmetric split */}
      <section
        className={cn(
          "pond-card relative grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]",
          "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--koi-orange)_14%,var(--card-surface)),var(--card-surface)_48%,color-mix(in_srgb,var(--pond-teal)_10%,var(--card-surface)))]",
          "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_26%,transparent)]",
        )}
      >
        <div
          className="pointer-events-none absolute -left-16 top-0 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_28%,transparent),transparent_70%)] blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Applications open</Badge>
            <Badge variant="secondary">Pet Simulator 99</Badge>
          </div>
          <div className="space-y-3">
            <Heading as="h2" className="pond-glow text-3xl leading-tight sm:text-4xl lg:text-[2.75rem]">
              Come Make Clan Wars Fun Again!
            </Heading>
            <p className="max-w-md text-base leading-relaxed text-ink-soft">
              Competitive PS99 clan with bank access, war tooling, and a track
              record that holds. Apply in Discord.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:max-w-md sm:flex-row">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "cta-pulse w-full sm:flex-1",
              )}
            >
              Apply on Discord
            </a>
            <Link
              href="/community?view=registry"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full sm:flex-1",
              )}
            >
              Our members
            </Link>
          </div>
        </div>

        <aside className="join-lift relative border-t border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] bg-[color-mix(in_srgb,var(--card-surface-alt)_55%,var(--card-surface))] p-6 sm:p-8 lg:border-t-0 lg:border-l">
          <Image
            src="/badges/koi-10.png"
            alt=""
            width={120}
            height={120}
            className="pointer-events-none absolute -right-2 -top-2 size-24 opacity-40 drop-shadow-md sm:size-28"
          />
          <p className="pond-label relative">Track record</p>
          {/* The old join page led with what the clan has actually won, not just
              today's numbers — that is the part that sells it. Each figure gets
              its own colour so the panel reads as a trophy case. */}
          <dl className="relative mt-4 grid grid-cols-2 gap-5 lg:grid-cols-1">
            <TrophyStat
              label="🥇 Top 3 Finishes"
              countTo={2}
              tone="stat-grad-gold"
            />
            <TrophyStat
              label="🏆 Top 10 Finishes"
              value="10+"
              tone="stat-grad-indigo"
            />
            {bank != null ? (
              <TrophyStat
                label="💎 Clan Bank"
                countTo={bank}
                format={formatPoints}
                tone="stat-grad-lily"
              />
            ) : null}
            <TrophyStat
              label="🟢 Current Members"
              countTo={memberCount}
              format={(n) => formatNumber(Math.round(n))}
              tone="text-ink"
            />
          </dl>

          <p className="pond-label relative mt-7">Clan right now</p>
          {data?.battle ? (
            <dl className="relative mt-3 grid grid-cols-2 gap-4 lg:grid-cols-1">
              {(
                [
                  {
                    label: "Live Rank",
                    value:
                      data.battle.rank != null
                        ? `#${formatNumber(data.battle.rank)}`
                        : "-",
                  },
                  {
                    label: "Points",
                    value: formatPoints(data.battle.points),
                  },
                ] as const
              ).map((cell) => (
                <div key={cell.label}>
                  <dt className="text-xs font-medium text-ink-soft">{cell.label}</dt>
                  <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums tracking-tight text-koi drop-shadow-[0_0_16px_color-mix(in_srgb,var(--koi-orange)_40%,transparent)] sm:text-3xl">
                    {cell.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="relative mt-3 text-sm text-ink-soft">
              Between wars. Roster still open for applications.
            </p>
          )}
        </aside>
      </section>

      {/* Live scarcity — the old page's strongest pull. Only shown when there is
          genuinely room, so it never advertises a full roster. */}
      {spotsOpen != null && spotsOpen > 0 ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-card)] px-5 py-3.5",
            "bg-[color-mix(in_srgb,var(--lily-green)_14%,var(--card-surface))]",
            "ring-1 ring-[color-mix(in_srgb,var(--lily-green)_32%,transparent)]",
            "shadow-[0_0_28px_-6px_color-mix(in_srgb,var(--lily-green)_45%,transparent)]",
          )}
        >
          <span
            className="race-live-dot size-2 shrink-0 rounded-full bg-lily"
            aria-hidden
          />
          <span className="text-sm font-semibold text-lily drop-shadow-[0_0_10px_color-mix(in_srgb,var(--lily-green)_50%,transparent)]">
            {spotsOpen} spot{spotsOpen === 1 ? "" : "s"} open right now
          </span>
          <span className="text-sm text-ink-soft">
            — {memberCount}/{ROSTER_CAPACITY} on the roster.
          </span>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm font-semibold text-koi transition-colors hover:text-koi-deep"
          >
            Apply now →
          </a>
        </div>
      ) : null}

      <WhyJoinSection />

      <CompeteSection
        podium={podium}
        giveaway={giveaway}
      />

      <CareerBadgesSection />

      <RequirementsSection />

      <ApplyPathSection />
    </div>
  );
}

function ApplyPathSection() {
  return (
    <section
      className={cn(
        "pond-card relative overflow-hidden",
        "bg-[linear-gradient(155deg,color-mix(in_srgb,var(--pond-teal)_10%,var(--card-surface)),var(--card-surface)_45%,color-mix(in_srgb,var(--koi-orange)_10%,var(--card-surface)))]",
        "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_20%,transparent)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-25 pond-caustic-tex pond-caustic-tex--near"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-1/3 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--pond-teal)_28%,transparent),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-12 bottom-0 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--koi-orange)_26%,transparent),transparent_70%)] blur-2xl"
        aria-hidden
      />

      {/* CTA lead */}
      <div className="relative flex flex-col gap-5 border-b border-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)] px-6 py-8 text-center sm:px-10 sm:py-10 sm:text-left sm:flex-row sm:items-end sm:justify-between">
        <div className="mx-auto max-w-xl space-y-2 sm:mx-0">
          <Heading as="h2" className="text-3xl sm:text-4xl">
            Ready to compete at the top?
          </Heading>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
            Walk the four steps below, then send your application in Discord.
          </p>
        </div>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mx-auto w-full shrink-0 sm:mx-0 sm:w-auto",
          )}
        >
          Apply on Discord
        </a>
      </div>

      {/* Timeline */}
      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <p className="pond-label mb-8 text-center sm:text-left">
          Four steps from Discord to a roster spot
        </p>

        {/* Mobile: vertical path */}
        <ol className="relative space-y-0 lg:hidden">
          <span
            className="pointer-events-none absolute bottom-3 left-[1.15rem] top-3 w-0.5 bg-[color-mix(in_srgb,var(--pond-teal)_30%,transparent)]"
            aria-hidden
          />
          {JOIN_STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
              <span className="relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full bg-koi font-display text-sm font-bold text-white shadow-[var(--shadow-button)] ring-4 ring-[color-mix(in_srgb,var(--card-surface)_90%,transparent)]">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-1 pt-0.5">
                <h3 className="font-display text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-soft">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop: horizontal path like reference */}
        <ol className="relative hidden lg:grid lg:grid-cols-4 lg:gap-6">
          <span
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-[color-mix(in_srgb,var(--pond-teal)_32%,transparent)]"
            aria-hidden
          />
          {JOIN_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative flex flex-col items-center gap-4 text-center"
            >
              <span className="relative z-[1] flex size-10 items-center justify-center rounded-full bg-koi font-display text-base font-bold text-white shadow-[var(--shadow-button)] ring-4 ring-[color-mix(in_srgb,var(--card-surface)_92%,transparent)]">
                {i + 1}
              </span>
              <div className="space-y-2">
                <h3 className="font-display text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-[16rem] text-sm leading-relaxed text-ink-soft">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
