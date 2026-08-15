import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GlobalFonts } from "@napi-rs/canvas";

const FONT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../assets/fonts",
);

let registered = false;

/** Register Outfit once for chart canvas text. */
export function ensureChartFonts(): void {
  if (registered) return;
  GlobalFonts.registerFromPath(join(FONT_DIR, "Outfit-Regular.ttf"), "Outfit");
  GlobalFonts.registerFromPath(join(FONT_DIR, "Outfit-Medium.ttf"), "Outfit");
  GlobalFonts.registerFromPath(join(FONT_DIR, "Outfit-SemiBold.ttf"), "Outfit");
  GlobalFonts.registerFromPath(join(FONT_DIR, "Outfit-Bold.ttf"), "Outfit");
  registered = true;
}

export function font(weight: 400 | 500 | 600 | 700, sizePx: number): string {
  return `${weight} ${sizePx}px "Outfit"`;
}
