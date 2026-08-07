import { SiteMap2 } from "../../economy/system-model2";
import { isExcludedFromCalculations } from "../../economy/site-calc-exclusions";

export const isBelowCutLineOnly = (site: SiteMap2 | undefined) =>
  isExcludedFromCalculations(site);

export const getActivePrimaryId = (map: Record<string, SiteMap2>, sortedIDs: string[]) => {
  const first = sortedIDs.find(id => {
    const site = map[id];
    return !!site && !isBelowCutLineOnly(site) && site.status === 'complete' && (site.type.buildClass === 'starport' || site.type.buildClass === 'outpost');
  });
  return first ?? sortedIDs.find(id => !isBelowCutLineOnly(map[id])) ?? sortedIDs[0];
};

export const groupSitesByBody = (map: Record<string, SiteMap2>, sortedIDs: string[], cutoffIdx: number) => {
  const primaryId = getActivePrimaryId(map, sortedIDs);
  const belowCutOnlyIDs = sortedIDs.filter(id => isBelowCutLineOnly(map[id]));
  const sortableIDs = sortedIDs.filter(id => !isBelowCutLineOnly(map[id]));
  const splitIdx = cutoffIdx >= 0 ? Math.min(cutoffIdx, sortedIDs.length) : sortedIDs.length;
  const aboveCut = sortableIDs.slice(0, splitIdx);
  const belowCut = sortableIDs.slice(splitIdx);

  return [
    ...groupSiteSegmentByBody(map, aboveCut, primaryId),
    ...groupSiteSegmentByBody(map, belowCut, undefined),
    ...groupSiteSegmentByBody(map, belowCutOnlyIDs, undefined),
  ];
};

export const groupSitesByActiveCut = (map: Record<string, SiteMap2>, sortedIDs: string[], activeIDs: string[]) => {
  const activeSet = new Set(activeIDs);
  const primaryId = getActivePrimaryId(map, sortedIDs);
  const activeSortedIDs = sortedIDs.filter(id => activeSet.has(id) && !isBelowCutLineOnly(map[id]));
  const inactiveSortedIDs = sortedIDs.filter(id => !activeSet.has(id) && !isBelowCutLineOnly(map[id]));
  const belowCutOnlyIDs = sortedIDs.filter(id => isBelowCutLineOnly(map[id]));
  const groupedActiveIDs = groupSiteSegmentByBody(map, activeSortedIDs, activeSortedIDs.includes(primaryId) ? primaryId : undefined);
  const groupedInactiveIDs = groupSiteSegmentByBody(map, inactiveSortedIDs, undefined);
  const groupedBelowCutOnlyIDs = groupSiteSegmentByBody(map, belowCutOnlyIDs, undefined);

  return {
    sortedIDs: [...groupedActiveIDs, ...groupedInactiveIDs, ...groupedBelowCutOnlyIDs],
    cutoffIdx: groupedActiveIDs.length,
  };
};

export const groupCompletedSitesByBody = (map: Record<string, SiteMap2>, sortedIDs: string[]) => {
  const primaryId = getActivePrimaryId(map, sortedIDs);
  const completeIDs = sortedIDs.filter(id => map[id].status === 'complete' && !isBelowCutLineOnly(map[id]));
  const incompleteIDs = sortedIDs.filter(id => map[id].status !== 'complete' && !isBelowCutLineOnly(map[id]));
  const belowCutOnlyIDs = sortedIDs.filter(id => isBelowCutLineOnly(map[id]));

  if (!completeIDs.includes(primaryId)) {
    const groupedIncompleteIDs = groupSiteSegmentByBody(map, incompleteIDs, undefined);
    const groupedBelowCutOnlyIDs = groupSiteSegmentByBody(map, belowCutOnlyIDs, undefined);
    return {
      sortedIDs: [...groupSiteSegmentByBody(map, completeIDs, undefined), ...groupedIncompleteIDs, ...groupedBelowCutOnlyIDs],
      cutoffIdx: 0,
    };
  }

  const groupedCompleteIDs = groupSiteSegmentByBody(map, completeIDs, primaryId);
  const groupedIncompleteIDs = groupSiteSegmentByBody(map, incompleteIDs, undefined);
  const groupedBelowCutOnlyIDs = groupSiteSegmentByBody(map, belowCutOnlyIDs, undefined);

  return {
    sortedIDs: [...groupedCompleteIDs, ...groupedIncompleteIDs, ...groupedBelowCutOnlyIDs],
    cutoffIdx: groupedCompleteIDs.length,
  };
};

export const groupAllSitesByBodyWithPlansLast = (map: Record<string, SiteMap2>, sortedIDs: string[]) => {
  const primaryId = getActivePrimaryId(map, sortedIDs);
  const belowCutOnlyIDs = sortedIDs.filter(id => isBelowCutLineOnly(map[id]));
  const sortableIDs = sortedIDs.filter(id => !isBelowCutLineOnly(map[id]));
  const nonPlanIDs = sortableIDs.filter(id => map[id].status !== 'plan');
  const planIDs = sortableIDs.filter(id => map[id].status === 'plan');

  return [
    ...groupSiteSegmentByBody(map, nonPlanIDs, nonPlanIDs.includes(primaryId) ? primaryId : undefined),
    ...groupSiteSegmentByBody(map, planIDs, undefined),
    ...groupSiteSegmentByBody(map, belowCutOnlyIDs, undefined),
  ];
};

const groupSiteSegmentByBody = (map: Record<string, SiteMap2>, ids: string[], primaryId?: string) => {
  const originalIndex = new Map(ids.map((id, i) => [id, i]));
  const primaryIDs = primaryId && ids.includes(primaryId) ? [primaryId] : [];
  const primarySite = primaryId ? map[primaryId] : undefined;
  const primaryBodyKey = primarySite
    ? getBodyGroupKey(primarySite)
    : undefined;
  const bodyGroups = ids
    .filter(id => id !== primaryId)
    .reduce((groups, id) => {
      const site = map[id];
      const key = getBodyGroupKey(site);
      const group = groups.get(key) ?? [];
      group.push(id);
      groups.set(key, group);
      return groups;
    }, new Map<string, string[]>());

  const primaryBodyIDs = primaryBodyKey
    ? bodyGroups.get(primaryBodyKey) ?? []
    : [];
  if (primaryBodyKey) {
    bodyGroups.delete(primaryBodyKey);
  }

  const groupedIDs = Array.from(bodyGroups.values())
    .sort((a, b) => compareBodyGroups(map, a, b))
    .flatMap(group => group.sort((a, b) => compareSitesWithinBody(map, originalIndex, a, b)));

  return [
    ...primaryIDs,
    ...primaryBodyIDs.sort((a, b) => compareSitesWithinBody(map, originalIndex, a, b)),
    ...groupedIDs,
  ];
};

const getBodyGroupKey = (site: SiteMap2) =>
  `${site.body?.num ?? site.bodyNum ?? Number.MAX_SAFE_INTEGER}:${site.body?.name ?? 'Unknown'}`;

const compareBodyGroups = (map: Record<string, SiteMap2>, a: string[], b: string[]) => {
  const siteA = map[a[0]];
  const siteB = map[b[0]];
  const bodyA = siteA.body?.num ?? siteA.bodyNum ?? Number.MAX_SAFE_INTEGER;
  const bodyB = siteB.body?.num ?? siteB.bodyNum ?? Number.MAX_SAFE_INTEGER;
  if (bodyA !== bodyB) { return bodyA - bodyB; }

  return (siteA.body?.name ?? '').localeCompare(siteB.body?.name ?? '');
};

const compareSitesWithinBody = (map: Record<string, SiteMap2>, originalIndex: Map<string, number>, a: string, b: string) => {
  const siteA = map[a];
  const siteB = map[b];

  const rankA = getBodyGroupRank(siteA);
  const rankB = getBodyGroupRank(siteB);
  if (rankA !== rankB) { return rankA - rankB; }

  const indexA = originalIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
  const indexB = originalIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
  if (indexA !== indexB) { return indexA - indexB; }

  return siteA.name.localeCompare(siteB.name) || siteA.id.localeCompare(siteB.id);
};

const getBodyGroupRank = (site: SiteMap2) => {
  if (site.body?.orbitalPrimary?.id === site.id) { return 0; }
  if (site.type.orbital) { return 1; }
  if (site.body?.surfacePrimary?.id === site.id) { return 2; }
  return 3;
};
