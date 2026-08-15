/**
 * Interaction routing is owned by the kit (`create-bot` → router).
 * Keep this file as a marker so the events folder documents the Discord
 * lifecycle; do not register a second handler here.
 */
export const event = "interactionCreate";
export const once = false;

export function execute() {
  // no-op — kit router handles chat input commands
}
