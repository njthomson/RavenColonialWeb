import type { GetRealEconomies } from "../../api/v2-system";
import type { EconomyMap, SiteMap2, SysMap2 } from "../system-model2";
import {
  isSpanshCompareExcluded,
  spanshMismatchIsInformational,
} from "./spansh-compare-reliability";

type ResolvedSpanshEconomyLike = {
  row: Pick<GetRealEconomies, "economies">;
} | null | undefined;

export type SpanshInversionConfidence = "exact" | "strong";

export interface SpanshInversionHint {
  siteId: string;
  swapWithSiteId: string;
  swapWithSiteName: string;
  direction: "up" | "down";
  confidence: SpanshInversionConfidence;
  reasons: string[];
}

export type SpanshInversionHints = Record<string, SpanshInversionHint>;

interface InversionCandidate {
  a: SiteMap2;
  b: SiteMap2;
  confidence: SpanshInversionConfidence;
  score: number;
  reasons: string[];
}

const MIN_STRONG_SCORE_IMPROVEMENT = 20;
const MAX_STRONG_SWAPPED_SCORE_RATIO = 0.35;
const MIN_PRIMARY_MARKET_ECONOMY_COUNT = 4;

export const detectSameBodySpanshInversions = (
  sysMap: SysMap2,
  resolveSpanshEconomyForSite: (site: SiteMap2) => ResolvedSpanshEconomyLike,
  orderIDs: string[] = sysMap.sites.map(s => s.id),
): SpanshInversionHints => {
  const rows = sysMap.siteMaps
    .filter(site =>
      site.status === "complete" &&
      !!site.economies &&
      !isSpanshCompareExcluded(site.type) &&
      !spanshMismatchIsInformational(site.type),
    )
    .map(site => ({
      site,
      resolved: resolveSpanshEconomyForSite(site),
    }))
    .filter(row => !!row.resolved?.row.economies);

  const byBody = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = getBodyKey(row.site);
    const bodyRows = byBody.get(key) ?? [];
    bodyRows.push(row);
    byBody.set(key, bodyRows);
  }

  const candidates: InversionCandidate[] = [];
  for (const bodyRows of byBody.values()) {
    if (bodyRows.length < 2) {
      continue;
    }

    for (let i = 0; i < bodyRows.length - 1; i++) {
      for (let j = i + 1; j < bodyRows.length; j++) {
        const candidate = scorePair(bodyRows[i], bodyRows[j]);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }
  }

  const used = new Set<string>();
  const hints: SpanshInversionHints = {};
  const orderIndex = new Map(orderIDs.map((id, i) => [id, i]));

  candidates
    .sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return a.confidence === "exact" ? -1 : 1;
      }
      return b.score - a.score;
    })
    .forEach(candidate => {
      if (used.has(candidate.a.id) || used.has(candidate.b.id)) {
        return;
      }

      used.add(candidate.a.id);
      used.add(candidate.b.id);
      hints[candidate.a.id] = buildHint(candidate.a, candidate.b, candidate, orderIndex);
      hints[candidate.b.id] = buildHint(candidate.b, candidate.a, candidate, orderIndex);
    });

  return hints;
};

export const getSpanshInversionSwapCount = (hints: SpanshInversionHints | undefined) =>
  hints ? collectSpanshInversionPairs(hints).length : 0;

export const applySpanshInversionReorder = (
  sortedIDs: string[],
  hints: SpanshInversionHints | undefined,
) => {
  if (!hints) {
    return sortedIDs;
  }

  const newSortedIDs = [...sortedIDs];
  for (const hint of collectSpanshInversionPairs(hints)) {
    const siteIdx = newSortedIDs.indexOf(hint.siteId);
    const partnerIdx = newSortedIDs.indexOf(hint.swapWithSiteId);
    if (siteIdx < 0 || partnerIdx < 0 || siteIdx === partnerIdx) {
      continue;
    }

    newSortedIDs[siteIdx] = hint.swapWithSiteId;
    newSortedIDs[partnerIdx] = hint.siteId;
  }

  return newSortedIDs;
};

const collectSpanshInversionPairs = (hints: SpanshInversionHints) => {
  const seen = new Set<string>();
  return Object.values(hints).filter(hint => {
    const key = [hint.siteId, hint.swapWithSiteId].sort().join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const scorePair = (
  a: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
  b: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
): InversionCandidate | undefined => {
  const aSpansh = a.resolved?.row.economies;
  const bSpansh = b.resolved?.row.economies;
  if (!a.site.economies || !b.site.economies || !aSpansh || !bSpansh) {
    return undefined;
  }

  const aCurrent = economyDistance(a.site.economies, aSpansh);
  const bCurrent = economyDistance(b.site.economies, bSpansh);
  const aSwapped = economyDistance(a.site.economies, bSpansh);
  const bSwapped = economyDistance(b.site.economies, aSpansh);
  const currentScore = aCurrent + bCurrent;
  const swappedScore = aSwapped + bSwapped;
  const improvement = currentScore - swappedScore;

  if (currentScore <= 0 || improvement <= 0) {
    return undefined;
  }

  if (swappedScore === 0) {
    return {
      a: a.site,
      b: b.site,
      confidence: "exact",
      score: improvement,
      reasons: ["Swapped economy values match exactly."],
    };
  }

  const primaryEvidence = getPrimaryMarketEconomyEvidence(a, b);
  const strongImprovement =
    improvement >= MIN_STRONG_SCORE_IMPROVEMENT &&
    swappedScore <= currentScore * MAX_STRONG_SWAPPED_SCORE_RATIO;

  if (!strongImprovement && !primaryEvidence) {
    return undefined;
  }

  const reasons = ["Swapped economy values improve the audit match."];
  if (primaryEvidence) {
    reasons.push(primaryEvidence);
  }

  return {
    a: a.site,
    b: b.site,
    confidence: "strong",
    score: improvement,
    reasons,
  };
};

const buildHint = (
  site: SiteMap2,
  partner: SiteMap2,
  candidate: InversionCandidate,
  orderIndex: Map<string, number>,
): SpanshInversionHint => {
  const siteIdx = orderIndex.get(site.id) ?? 0;
  const partnerIdx = orderIndex.get(partner.id) ?? siteIdx;
  return {
    siteId: site.id,
    swapWithSiteId: partner.id,
    swapWithSiteName: partner.name,
    direction: partnerIdx < siteIdx ? "up" : "down",
    confidence: candidate.confidence,
    reasons: candidate.reasons,
  };
};

const getPrimaryMarketEconomyEvidence = (
  a: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
  b: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
): string | undefined =>
  hasPrimaryMarketEconomyEvidence(a, b)
    ? "The richer Spansh economy set appears on the market-link primary partner."
    : hasPrimaryMarketEconomyEvidence(b, a)
      ? "The richer Spansh economy set appears on the market-link primary partner."
      : undefined;

const hasPrimaryMarketEconomyEvidence = (
  primary: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
  partner: { site: SiteMap2; resolved: ResolvedSpanshEconomyLike },
): boolean => {
  if (!isMarketLinkPrimary(primary.site) || !primary.site.economies) {
    return false;
  }

  const primarySpansh = primary.resolved?.row.economies;
  const partnerSpansh = partner.resolved?.row.economies;
  if (!primarySpansh || !partnerSpansh) {
    return false;
  }

  const modelCount = countPositiveEconomies(primary.site.economies, true);
  const primarySpanshCount = countPositiveEconomies(primarySpansh, false);
  const partnerSpanshCount = countPositiveEconomies(partnerSpansh, false);

  return (
    modelCount >= MIN_PRIMARY_MARKET_ECONOMY_COUNT &&
    partnerSpanshCount >= MIN_PRIMARY_MARKET_ECONOMY_COUNT &&
    partnerSpanshCount > primarySpanshCount &&
    economyDistance(primary.site.economies, partnerSpansh) < economyDistance(primary.site.economies, primarySpansh)
  );
};

const isMarketLinkPrimary = (site: SiteMap2) =>
  site.body?.surfacePrimary?.id === site.id || site.body?.orbitalPrimary?.id === site.id;

const getBodyKey = (site: SiteMap2) =>
  `${site.body?.num ?? site.bodyNum ?? ""}:${site.body?.name ?? ""}`;

const economyDistance = (model: EconomyMap, spansh: Partial<Record<keyof EconomyMap, number>>) => {
  const keys = getEconomyKeys(model, spansh);
  return keys.reduce((sum, key) => sum + Math.abs(getModelPct(model, key) - (spansh[key] ?? 0)), 0);
};

const getEconomyKeys = (
  model: EconomyMap,
  spansh: Partial<Record<keyof EconomyMap, number>>,
) => Array.from(new Set([...Object.keys(model), ...Object.keys(spansh)])) as (keyof EconomyMap)[];

const getModelPct = (model: EconomyMap, key: keyof EconomyMap) =>
  Math.round((model[key] ?? 0) * 100);

const countPositiveEconomies = (
  economies: Partial<Record<keyof EconomyMap, number>>,
  modelValues: boolean,
) =>
  (Object.keys(economies) as (keyof EconomyMap)[]).filter(key => {
    const value = economies[key] ?? 0;
    return modelValues ? Math.round(value * 100) > 0 : value > 0;
  }).length;
