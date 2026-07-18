/**
 * CSS filter for Mentrixer / Guide rank emblems on light (paper, sticky, white) surfaces.
 * Forces solid ink contrast + a crisp edge without changing the SVG assets for dark shells.
 */
export const RANK_ICON_ON_LIGHT_FILTER =
  "contrast(1.6) brightness(0.72) saturate(1.3) drop-shadow(0 0 0.7px #0B1220) drop-shadow(0 0.6px 0 #0B1220)";

/** Cache-bust query when rank SVG strokes/opacities change. */
export const RANK_ICON_VERSION = "20260718";
