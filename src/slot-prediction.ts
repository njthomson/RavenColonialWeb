import { BodyFeature } from './types';
import { Bod, BT } from './types2';

export const predictSurfaceSlots = (body: Bod): number => {
  const features = new Set(body.features);
  if (body.type === BT.un
    || body.temp > 700
    || body.gravity > 2.7
    || !features.has(BodyFeature.landable)) {
    return -1;
  }

  let predictedSlots = body.radius < 1500 ? 1
    : body.radius < 3750 ? 2
    : body.radius < 6000 ? 3
    : 4;

  if (body.subType === "High metal content world") predictedSlots++;
  if (features.has(BodyFeature.terraformable)) predictedSlots++;
  if (features.has(BodyFeature.volcanism) || features.has(BodyFeature.geo)) predictedSlots++;
  if (features.has(BodyFeature.atmosphere)) predictedSlots += 2;

  // Total slots are capped at 7
  return Math.min(predictedSlots, 7);
}