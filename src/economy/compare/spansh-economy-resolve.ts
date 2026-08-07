import type { GetRealEconomies } from "../../api/v2-system";
import type { BuildClass, PadSize } from "../../site-data";
import type { StationEDSM } from "../../types";
import type { Site } from "../../types2";
import { EconomyMap } from "../system-model2";
import {
  getSpanshCompareReliability,
  isSpanshCompareExcluded,
  mergeSpanshCompareNotes,
  SpanshCompareReliability,
} from "./spansh-compare-reliability";

/** Case/punctuation insensitive station name (game: unique per system). */
export const normalizeStationName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Construction / placeholder Spansh row (colony-only), not an operational port economy. */
export const isConstructionSpanshPlaceholder = (economies: EconomyMap | undefined): boolean => {
  if (!economies) {
    return true;
  }
  const nonZero = Object.entries(economies).filter(([, v]) => (v ?? 0) > 0);
  if (nonZero.length === 0) {
    return true;
  }
  return nonZero.every(([k]) => k === "colony");
};

export const findRealEconomiesRow = (
  realEconomies: GetRealEconomies[] | undefined,
  marketId: number,
): GetRealEconomies | undefined => {
  if (!realEconomies?.length || !Number.isFinite(marketId)) {
    return undefined;
  }
  return realEconomies.find(r => {
    const id = typeof r.id === "number" ? r.id : parseInt(String(r.id).replace(/^\D/, ""), 10);
    return id === marketId;
  });
};

/** EDSM returns marketId as string; live API sometimes uses number. */
const parseEdsmMarketId = (marketId: string | number | undefined): number | undefined => {
  if (marketId === undefined || marketId === null || marketId === "") {
    return undefined;
  }
  const n = typeof marketId === "number" ? marketId : parseInt(String(marketId), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const coerceSiteMarketId = (marketId: number | string | undefined): number | undefined => {
  if (marketId === undefined || marketId === null || marketId === "") {
    return undefined;
  }
  const n = typeof marketId === "number" ? marketId : parseInt(String(marketId), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** RC sites that already have a journal/market id (e.g. after import). */
export const buildMarketIdByNameFromRcSites = (sites: Site[] | undefined): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!sites?.length) {
    return out;
  }
  for (const site of sites) {
    const marketId = coerceSiteMarketId(site.marketId);
    if (marketId === undefined || !site.name) {
      continue;
    }
    const key = normalizeStationName(site.name);
    if (key) {
      out[key] = marketId;
    }
  }
  return out;
};

export const mergeMarketIdByNameIndexes = (
  ...indexes: (Record<string, number> | undefined)[]
): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const index of indexes) {
    if (!index) {
      continue;
    }
    Object.assign(out, index);
  }
  return out;
};

const hasEdsmMarketIdIndex = (index: Record<string, number> | undefined): boolean =>
  !!index && Object.keys(index).length > 0;

/** True when EDSM resolved a marketId that is missing from the current Spansh economies payload. */
export const spanshEconomiesNeedRefresh = (
  sites: SpanshCompareSite[],
  realEconomies: GetRealEconomies[] | undefined,
  marketIdByName: Record<string, number> | undefined,
): boolean => {
  if (!hasEdsmMarketIdIndex(marketIdByName)) {
    return false;
  }
  for (const site of sites) {
    if (site.status && site.status !== "complete") {
      continue;
    }
    if (site.padSize && isSpanshCompareExcluded({ padSize: site.padSize })) {
      continue;
    }
    if (resolveSpanshEconomyForSite(site, realEconomies, marketIdByName)) {
      continue;
    }
    const edsmMarketId = marketIdByName?.[normalizeStationName(site.name)];
    if (
      typeof edsmMarketId === "number" &&
      (!realEconomies?.length || !findRealEconomiesRow(realEconomies, edsmMarketId))
    ) {
      return true;
    }
  }
  return false;
};

export const buildEdsmMarketIdByNormalizedName = (
  stations: StationEDSM[] | undefined,
): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!stations?.length) {
    return out;
  }
  for (const st of stations) {
    const marketId = parseEdsmMarketId(st.marketId);
    if (marketId === undefined) {
      continue;
    }
    const key = normalizeStationName(st.name);
    if (!key) {
      continue;
    }
    out[key] = marketId;
  }
  return out;
};

type SpanshEconomyMatchKind = "marketId" | "edsmName" | "none";

/** UI copy when Spansh row was found via EDSM station name (not journal id). */
const formatEdsmNameMatchNote = (
  rcMarketId: number | undefined,
  spanshMarketId: number,
): string => {
  if (rcMarketId !== undefined) {
    return `EDSM name match (RC marketId ${rcMarketId} -> Spansh ${spanshMarketId})`;
  }
  return `EDSM name match (no RC marketId -> Spansh ${spanshMarketId})`;
};

interface ResolvedSpanshEconomy {
  row: GetRealEconomies;
  spanshMarketId: number;
  kind: SpanshEconomyMatchKind;
  note?: string;
  reliability: SpanshCompareReliability;
}

export interface SpanshCompareSite {
  name: string;
  marketId?: number;
  status?: string;
  buildClass?: BuildClass;
  padSize?: PadSize;
}

/**
 * Resolve Spansh compare row for a completed RC site.
 * Uses journal marketId first; falls back to EDSM name -> marketId when the id row is missing or colony-only.
 */
export const resolveSpanshEconomyForSite = (
  site: SpanshCompareSite,
  realEconomies: GetRealEconomies[] | undefined,
  edsmMarketIdByName: Record<string, number> | undefined,
): ResolvedSpanshEconomy | null => {
  if (site.status && site.status !== "complete") {
    return null;
  }
  if (site.padSize && isSpanshCompareExcluded({ padSize: site.padSize })) {
    return null;
  }

  const reliability = getSpanshCompareReliability(
    site.buildClass && site.padSize ? { buildClass: site.buildClass, padSize: site.padSize } : undefined,
  );

  const tryMarketId = (marketId: number, kind: SpanshEconomyMatchKind, note?: string): ResolvedSpanshEconomy | null => {
    const row = findRealEconomiesRow(realEconomies, marketId);
    if (!row || isConstructionSpanshPlaceholder(row.economies)) {
      return null;
    }
    return {
      row,
      spanshMarketId: marketId,
      kind,
      reliability,
      note: mergeSpanshCompareNotes(reliability, note),
    };
  };

  const journalMarketId = coerceSiteMarketId(site.marketId);
  if (journalMarketId !== undefined) {
    const byId = tryMarketId(journalMarketId, "marketId");
    if (byId) {
      return byId;
    }
  }

  const edsmMarketId = edsmMarketIdByName?.[normalizeStationName(site.name)];
  if (typeof edsmMarketId === "number") {
    const byName = tryMarketId(
      edsmMarketId,
      "edsmName",
      formatEdsmNameMatchNote(journalMarketId, edsmMarketId),
    );
    if (byName) {
      return byName;
    }
  }

  return null;
};

/** User-facing hint when compare is loaded but resolveSpanshEconomyForSite returned null. */
export const getSpanshCompareFailureReason = (
  site: SpanshCompareSite,
  realEconomies: GetRealEconomies[] | undefined,
  edsmMarketIdByName: Record<string, number> | undefined,
  options?: { edsmLoadError?: string; edsmStationCount?: number },
): string | undefined => {
  if (site.status && site.status !== "complete") {
    return undefined;
  }
  if (site.padSize && isSpanshCompareExcluded({ padSize: site.padSize })) {
    return undefined;
  }
  if (resolveSpanshEconomyForSite(site, realEconomies, edsmMarketIdByName)) {
    return undefined;
  }

  const journalMarketId = coerceSiteMarketId(site.marketId);
  const noJournalId = journalMarketId === undefined;
  const edsmMarketId = edsmMarketIdByName?.[normalizeStationName(site.name)];

  if (typeof edsmMarketId === "number") {
    const row = findRealEconomiesRow(realEconomies, edsmMarketId);
    if (!row) {
      return (
        `"${site.name}" is on EDSM (market ${edsmMarketId}) but that station is missing from the loaded Spansh list - ` +
        "click Compare again to refresh Spansh data."
      );
    }
    if (isConstructionSpanshPlaceholder(row.economies)) {
      return `EDSM name match (${edsmMarketId}) is still a construction placeholder on Spansh (Colony only).`;
    }
  }

  if (!hasEdsmMarketIdIndex(edsmMarketIdByName)) {
    const edsmHint = options?.edsmLoadError
      ? ` (${options.edsmLoadError})`
      : options?.edsmStationCount === 0
        ? " (EDSM returned no stations for this system name)"
        : "";
    return noJournalId
      ? `No journal marketId - EDSM station list did not load${edsmHint}, so name matching could not run.`
      : `EDSM station list did not load${edsmHint}.`;
  }

  if (noJournalId) {
    return (
      `No journal marketId - "${site.name}" was not found in the EDSM index for this system ` +
      `(${options?.edsmStationCount ?? Object.keys(edsmMarketIdByName!).length} stations loaded). ` +
      "Check the name matches EDSM exactly, then click Compare again."
    );
  }

  if (journalMarketId !== undefined) {
    const journalRow = findRealEconomiesRow(realEconomies, journalMarketId);
    if (journalRow && isConstructionSpanshPlaceholder(journalRow.economies)) {
      return "Journal marketId is a construction placeholder (Colony only on Spansh). No operational match via EDSM name.";
    }
  }

  return "No operational Spansh data for this station.";
};
