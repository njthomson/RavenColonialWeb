import { Site, Sys } from "../../types2";

export interface SanitizedImport {
  sys: Sys;
  droppedSites: Site[];
}

const getKnownSiteKeys = (sites: Site[]) => {
  const ids = new Set<string>();
  const names = new Set<string>();
  const marketIds = new Set<number>();

  for (const site of sites) {
    ids.add(site.id);
    names.add(site.name);
    if (site.marketId) {
      marketIds.add(site.marketId);
    }
  }

  return { ids, names, marketIds };
};

const isKnownSite = (site: Site, known: ReturnType<typeof getKnownSiteKeys>) =>
  known.ids.has(site.id) ||
  known.names.has(site.name) ||
  (!!site.marketId && known.marketIds.has(site.marketId));

export const sanitizeImportedSystemSites = (currentSys: Sys | undefined, importedSys: Sys): SanitizedImport => {
  if (!currentSys) {
    return { sys: importedSys, droppedSites: [] };
  }

  const known = getKnownSiteKeys(currentSys.sites ?? []);
  const droppedSites: Site[] = [];
  const sites = (importedSys.sites ?? []).filter(site => {
    if (isKnownSite(site, known)) {
      return true;
    }
    droppedSites.push(site);
    return false;
  });

  if (!droppedSites.length) {
    return { sys: importedSys, droppedSites };
  }

  return {
    sys: {
      ...importedSys,
      sites,
      idxCalcLimit: importedSys.idxCalcLimit == null
        ? importedSys.idxCalcLimit
        : Math.min(importedSys.idxCalcLimit, sites.length),
    },
    droppedSites,
  };
};
