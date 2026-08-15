import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { MemberCustomization } from "@/lib/api/customizations";
import { httpsOnlyUrl } from "@/lib/https-url";

/**
 * Avatar with the member's frame and decoration.
 *
 * The structure matters: the portrait keeps `overflow-hidden` so the image stays
 * inside its circle, while the decoration sits *outside* that wrapper because it
 * is meant to overhang the edge. Frames that glow outward paint themselves with
 * a box-shadow on the clipped element rather than an inset pseudo-element, since
 * anything drawn inside it would be cut off.
 */
export function MemberAvatar({
  avatarUrl,
  displayName,
  customization,
  size = "sm",
}: {
  avatarUrl: string | null | undefined;
  displayName: string;
  customization?: MemberCustomization | null;
  size?: "sm" | "lg";
}) {
  const src = httpsOnlyUrl(avatarUrl);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";
  const frame = customization?.frameStyle ?? null;
  const accent = customization?.accentColor ?? null;
  const decoration = customization?.decoration ?? null;

  const box = size === "lg" ? "size-16" : "size-8";
  const overhang = size === "lg" ? "-inset-2" : "-inset-1.5";

  return (
    <span className={cn("relative inline-flex shrink-0", box)}>
      <span
        data-frame={frame ?? undefined}
        style={accent ? ({ "--row-accent": accent } as CSSProperties) : undefined}
        className={cn(
          "koi-avatar relative inline-flex size-full items-center justify-center",
          "overflow-hidden rounded-full bg-[#1f2937]",
          !frame &&
            "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "font-display font-bold text-koi",
              size === "lg" ? "text-xl" : "text-xs",
            )}
            aria-hidden
          >
            {initial}
          </span>
        )}
      </span>

      {decoration ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={decoration}
          alt=""
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          data-cutout={customization?.decorationCutout ? "" : undefined}
          data-size={size === "lg" ? "lg" : undefined}
          className={cn(
            "koi-avatar-decoration pointer-events-none absolute z-[2] object-contain",
            overhang,
          )}
        />
      ) : null}

      {frame === "crown" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1/2 z-[3] -translate-x-1/2 leading-none",
            size === "lg" ? "-top-4 text-[22px]" : "-top-2.5 text-[13px]",
          )}
        >
          👑
        </span>
      ) : null}
    </span>
  );
}
