import { Site } from "../types2";
import type { BodyMap2, SiteMap2 } from "./system-model2";

export const isBadMarketId = (marketId: number | undefined) =>
  typeof marketId === 'number' && marketId > 0 && marketId < 10;

export const hasBadBuildType = (buildType: string | undefined | null) =>
  !buildType || buildType === 'unknown' || buildType === 'null';

export const isUnknownBodySite = (
  site: Pick<Site, 'bodyNum'>,
  body?: Pick<BodyMap2, 'num' | 'name'>,
) =>
  site.bodyNum < 0 ||
  body?.num === -1 ||
  body?.name === 'Unknown';

export const isExcludedFromCalculations = (
  site: Pick<Site, 'bodyNum' | 'buildType' | 'marketId'> | SiteMap2 | undefined,
  body?: Pick<BodyMap2, 'num' | 'name'>,
) =>
  !site ||
  isUnknownBodySite(site, body ?? (site as SiteMap2).body) ||
  hasBadBuildType(site.buildType) ||
  isBadMarketId(site.marketId);
