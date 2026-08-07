import type { SiteType } from "../../site-data";

/**
 * Spansh/journal compare confidence for a site.
 * - dockable: post-completion docking can refresh journal -> EDDN -> Spansh.
 * - limited: sites with no pads - journal id often frozen at construction;
 *   Spansh economies are third-party snapshots, not live verification of RC rules.
 */
export type SpanshCompareReliability = "dockable" | "limited";

export const SPANSH_COMPARE_LIMITED_TITLE =
  "Spansh compare is approximate for this facility";

export const SPANSH_COMPARE_LIMITED_BODY =
  "This site has no landing pads, so you usually cannot dock it again after completion. " +
  "The journal marketId is often captured at the construction depot and may keep a construction-depot " +
  "station type in Spansh even when the facility is finished. Spansh percentages come from aggregated " +
  "journal dumps (predetermined snapshots), not from RC's economy model - they can lag in-game changes " +
  "(e.g. comms unlocking 140% High Tech) or disagree with planning rules. Use RC for expected ratios; " +
  "treat Spansh as a historical reference, not ground truth.";

/** Sites with no landing pads use modeled economies, not journal/Spansh market snapshots. */
export const isSpanshCompareExcluded = (type: Pick<SiteType, "padSize">): boolean =>
  type.padSize === "none";

export const SPANSH_COMPARE_EXCLUDED_NOTE =
  "Sites with no landing pads use RC modeled economies only (not compared to Spansh).";

/** Sites that cannot be docked after build (`padSize: none`). */
export const isUndockableFacility = (type: Pick<SiteType, "buildClass" | "padSize">): boolean =>
  isSpanshCompareExcluded(type);

export const getSpanshCompareReliability = (
  type?: Pick<SiteType, "buildClass" | "padSize">,
): SpanshCompareReliability =>
  type && isUndockableFacility(type) ? "limited" : "dockable";

/** Mismatch vs Spansh should not count as a hard regression for undockable facilities. */
export const spanshMismatchIsInformational = (type?: Pick<SiteType, "buildClass" | "padSize">): boolean =>
  getSpanshCompareReliability(type) === "limited";

export const mergeSpanshCompareNotes = (
  reliability: SpanshCompareReliability,
  note?: string,
): string | undefined => {
  if (reliability === "limited") {
    return note ? `${note} ${SPANSH_COMPARE_LIMITED_TITLE}.` : SPANSH_COMPARE_LIMITED_TITLE;
  }
  return note;
};
