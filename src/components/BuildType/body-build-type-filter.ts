import { SiteType } from "../../site-data";
import { BT } from "../../types2";

export const asteroidClusterBuildType = 'asteroid';

export const isTypeAllowedForBody = (bodyType: BT | undefined, siteType: SiteType): boolean => {
  if (bodyType === BT.ac) {
    return siteType.subTypes.includes(asteroidClusterBuildType);
  }

  return true;
};

export const getBuildTypeLocationForBody = (bodyType: BT | undefined, fallbackLocation: string): string => {
  if (bodyType === BT.ac) {
    return 'orbital';
  }

  return fallbackLocation;
};
