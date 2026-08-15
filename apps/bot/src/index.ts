import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./env";
import { createBot } from "./kit/create-bot";

const env = loadEnv();
const rootDir = dirname(fileURLToPath(import.meta.url));

console.log(`[bot] API_BASE_URL=${env.API_BASE_URL}`);
console.log(
  `[bot] guild sync=${env.DISCORD_GUILD_ID ?? "off (global commands)"}`,
);

await createBot(env, rootDir);
