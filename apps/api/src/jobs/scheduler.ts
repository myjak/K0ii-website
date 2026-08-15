import { loadEnv } from "../env";
import { invalidateResponseCache } from "../lib/response-cache";
import { pollLeagues, leaguePollIntervalMs } from "../services/poll-leagues";
import { pollPs99 } from "../services/poll-ps99";
import { refreshGlobalPlayerIndex } from "../services/refresh-global-index";

const env = loadEnv();

let lastGlobalRefreshAt = 0;
let globalRefreshRunning = false;
let leaguePollRunning = false;

async function maybeRefreshGlobal(live: boolean): Promise<void> {
  if (!live) return;
  if (globalRefreshRunning) return;
  const due =
    lastGlobalRefreshAt === 0 ||
    Date.now() - lastGlobalRefreshAt >= env.GLOBAL_INDEX_REFRESH_MS;
  if (!due) return;

  globalRefreshRunning = true;
  try {
    const result = await refreshGlobalPlayerIndex(env);
    if (result.ran) {
      lastGlobalRefreshAt = Date.now();
    } else if (result.skipped === "no-live-battle") {
      lastGlobalRefreshAt = Date.now();
    }
  } catch (error) {
    console.error("[global-index] refresh failed", error);
  } finally {
    globalRefreshRunning = false;
  }
}

async function leagueLoop() {
  if (!leaguePollRunning) {
    leaguePollRunning = true;
    try {
      await pollLeagues(env);
      invalidateResponseCache();
    } catch (error) {
      console.error("[leagues-poll] failed", error);
    } finally {
      leaguePollRunning = false;
    }
  }
  const nextMs = leaguePollIntervalMs(env);
  console.log(`[leagues-poll] next tick in ${nextMs}ms`);
  setTimeout(leagueLoop, nextMs);
}

async function warLoop() {
  let live = false;
  try {
    const result = await pollPs99(env);
    live = result.live;
  } catch (error) {
    console.error("[poll] failed", error);
  }

  void maybeRefreshGlobal(live);

  const nextMs = live ? env.POLL_INTERVAL_MS : env.POLL_INTERVAL_IDLE_MS;
  console.log(`[poll] next tick in ${nextMs}ms (live=${live})`);
  setTimeout(warLoop, nextMs);
}

console.log(
  `[poll] starting adaptive poll live=${env.POLL_INTERVAL_MS}ms idle=${env.POLL_INTERVAL_IDLE_MS}ms clan=${env.CLAN_NAME}`,
);
console.log(
  `[global-index] cadence=${env.GLOBAL_INDEX_REFRESH_MS}ms clans=${env.GLOBAL_INDEX_CLAN_LIMIT} concurrency=${env.GLOBAL_INDEX_FETCH_CONCURRENCY}`,
);
console.log(
  `[leagues-poll] independent cadence=${leaguePollIntervalMs(env)}ms`,
);

void warLoop();
void leagueLoop();
