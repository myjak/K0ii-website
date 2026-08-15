"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { JoinPanel } from "@/components/community/join-panel";
import { RegistryPanel } from "@/components/community/registry-panel";
import { HubPanel, HubViewSwitcher } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";

const COMMUNITY_VIEWS = ["join", "registry"] as const;

const OPTIONS = [
  { value: "join" as const, label: "Join" },
  { value: "registry" as const, label: "Registry" },
];

export function CommunityHub() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(COMMUNITY_VIEWS).withDefault("join"),
  );

  return (
    <div className="pond-page">
      <header className="animate-fade-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="pond-section-head">
          <Heading as="h1" className="pond-glow">
            {view === "join" ? (
              "Join"
            ) : (
              <>
                Clan <span className="text-koi">Registry</span>
              </>
            )}
          </Heading>
          <p className="pond-lede max-w-lg">
            {view === "join"
              ? "Requirements, perks, and how to apply."
              : "Staff profiles and the live roster. Tap a card for war history."}
          </p>
        </div>
        <HubViewSwitcher
          ariaLabel="Community view"
          value={view}
          options={OPTIONS}
          onChange={(next) => void setView(next)}
        />
      </header>

      <HubPanel key={view}>
        {view === "join" ? <JoinPanel /> : <RegistryPanel />}
      </HubPanel>
    </div>
  );
}
