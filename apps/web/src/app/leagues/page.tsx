import { Suspense } from "react";

import { LeaguesView } from "@/components/leagues/leagues-view";
import { fetchLeagues } from "@/lib/api/client";

function Fallback() {
  return (
    <div className="pond-page">
      <div className="h-16 w-full max-w-xs animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
      <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
      <div className="h-72 animate-pulse rounded-[var(--radius-card)] bg-card-surface-alt" />
    </div>
  );
}

export default async function LeaguesPage() {
  let data = null;
  let error: string | null = null;

  try {
    data = await fetchLeagues();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load leagues";
  }

  return (
    <Suspense fallback={<Fallback />}>
      <LeaguesView initialData={data} error={error} />
    </Suspense>
  );
}
