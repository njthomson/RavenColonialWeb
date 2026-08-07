import { EconomyMap } from "../site-data";
import {
  EconomyModelOptions,
  STRONG_LINK_CONTRIBUTION_FLOOR,
  adjust,
  bodyIsTidalToStar,
  matches,
} from "./economy-core";
import type { SiteMap2 } from "./system-model2";
import { BodyFeature } from "../types";
import { BT } from "../types2";

export interface AgricultureModifierOptions {
  enableTerraformableBonus?: boolean;
  skipElWwForSameBodyColonySource?: boolean;
}

interface AgricultureModifierContext {
  site: SiteMap2;
  options?: AgricultureModifierOptions;
  sourceSite?: SiteMap2;
}

interface AgricultureBodyModifierRule {
  delta: number;
  formulaPart: string;
  auditReason?: string;
  applies: (ctx: AgricultureModifierContext) => boolean;
}

const isSameBodyElwWwColonySource = (source: SiteMap2 | undefined, site: SiteMap2): boolean => {
  return !!source &&
    source.body === site.body &&
    source.type.inf === 'colony' &&
    matches([BT.elw, BT.ww], site.body?.type);
};

/**
 * Documented ±0.4 agriculture modifiers (community sheet / Mega Guide).
 * Decreases (icy, tidal) apply on **strong-link contributions** only; weak links stay +0.05.
 * Own docked agriculture keeps intrinsics + positive body buffs on subordinate surface ports.
 */
export const AGRICULTURE_STRONG_LINK_MODIFIER_RULES: AgricultureBodyModifierRule[] = [
  {
    delta: 0.4,
    formulaPart: 'BIO 0.4',
    auditReason: 'Buff: body has BIO',
    applies: ({ site }) => matches([BodyFeature.bio], site.body?.features),
  },
  {
    delta: 0.4,
    formulaPart: 'TERRAFORMABLE 0.4',
    auditReason: 'Buff: body is TERRAFORMABLE',
    applies: ({ site, options }) =>
      !!options?.enableTerraformableBonus &&
      matches([BodyFeature.terraformable], site.body?.features),
  },
  {
    delta: 0.4,
    formulaPart: 'ELW/WW 0.4',
    auditReason: 'Buff: body is ELW or WW',
    applies: ({ site, options, sourceSite }) => {
      if (options?.skipElWwForSameBodyColonySource && isSameBodyElwWwColonySource(sourceSite, site)) {
        return false;
      }
      return matches([BT.elw, BT.ww], site.body?.type);
    },
  },
  {
    delta: -0.4,
    formulaPart: 'ICY/ROCKY-ICE 0.4',
    auditReason: 'Buff: body is ICY/ROCKY-ICE',
    applies: ({ site }) => matches([BT.ib, BT.ri], site.body?.type),
  },
  {
    delta: -0.4,
    formulaPart: 'TIDAL 0.4',
    auditReason: 'Buff: body has TIDAL',
    applies: ({ site }) =>
      bodyIsTidalToStar(site.sys, site.body) ||
      (
        matches([BodyFeature.tidal], site.body?.features) &&
        !matches([BodyFeature.bio], site.body?.features)
      ),
  },
];

/** Positive modifiers for a port's own agriculture row (after body intrinsics). */
export const AGRICULTURE_INTRINSIC_BODY_BUFF_RULES = AGRICULTURE_STRONG_LINK_MODIFIER_RULES.filter(
  rule => rule.delta > 0,
);

function filterAgricultureModifierRules(
  rules: AgricultureBodyModifierRule[],
  site: SiteMap2,
  options?: AgricultureModifierOptions,
  sourceSite?: SiteMap2,
) {
  const ctx: AgricultureModifierContext = { site, options, sourceSite };
  return rules
    .filter(rule => rule.applies(ctx))
    .map(({ delta, formulaPart, auditReason }) => ({ delta, formulaPart, auditReason }));
}

export function getAgricultureStrongLinkModifierDeltas(
  site: SiteMap2,
  options?: AgricultureModifierOptions,
  sourceSite?: SiteMap2,
) {
  return filterAgricultureModifierRules(
    AGRICULTURE_STRONG_LINK_MODIFIER_RULES,
    site,
    options,
    sourceSite,
  );
}

export function getAgricultureIntrinsicBodyBuffDeltas(
  site: SiteMap2,
  options?: AgricultureModifierOptions,
) {
  return filterAgricultureModifierRules(AGRICULTURE_INTRINSIC_BODY_BUFF_RULES, site, options);
}

/**
 * Orbital colony paired with a same-body surface colony port receives agriculture body
 * buffs via port-to-port strong links, not on its own docked row.
 */
export function shouldSkipPositiveAgricultureBodyBuffs(site: SiteMap2): boolean {
  return false;
}

export function applyAgricultureBodyBuffs(
  map: EconomyMap,
  site: SiteMap2,
  adjustFn: typeof adjust,
  options?: EconomyModelOptions & { isSettlement?: boolean },
) {
  if (map.agriculture <= 0) { return; }

  let positiveBuffApplied = false;
  if (!shouldSkipPositiveAgricultureBodyBuffs(site)) {
    for (const { delta, auditReason } of getAgricultureIntrinsicBodyBuffDeltas(site, {
      enableTerraformableBonus: options?.enableTerraformableAgricultureBonus ?? false,
    })) {
      if (auditReason) {
        adjustFn('agriculture', delta, auditReason, map, site, 'body');
        if (delta > 0) {
          positiveBuffApplied = true;
        }
      }
    }
  }

  if (
    (!options?.isSettlement || positiveBuffApplied) &&
    (matches([BT.ib, BT.ri], site.body?.type) || bodyIsTidalToStar(site.sys, site.body))
  ) {
    adjustFn('agriculture', -0.4, 'Buff: body is ICY/ROCKY-ICE or has TIDAL', map, site, 'body');
  }

  if (matches([BT.elw, BT.ww], site.body?.type) && map.agriculture < 1) {
    adjustFn(
      'agriculture',
      1 - map.agriculture,
      'Floor: body type agriculture cannot drop below 1.0',
      map,
      site,
      'body',
    );
  }
}

export function calculateAgricultureStrongLinkContribution(
  sourceValue: number,
  site: SiteMap2,
  options?: EconomyModelOptions,
  sourceSite?: SiteMap2,
) {
  if (sourceValue <= 0) {
    return { score: 0, formula: '0.0' };
  }

  const parts = [`${sourceValue.toFixed(1)}`];
  let score = sourceValue;

  for (const { delta, formulaPart } of getAgricultureStrongLinkModifierDeltas(site, {
    enableTerraformableBonus: options?.enableTerraformableAgricultureBonus ?? false,
    skipElWwForSameBodyColonySource: true,
  }, sourceSite)) {
    score += delta;
    parts.push(`${delta >= 0 ? '+' : '-'} ${formulaPart}`);
  }

  if (score <= 0) {
    parts.push(`=> floor ${STRONG_LINK_CONTRIBUTION_FLOOR.toFixed(1)}`);
    score = STRONG_LINK_CONTRIBUTION_FLOOR;
  }

  return {
    score: Math.round(score * 100) / 100,
    formula: `${parts.join(' ')} = ${score.toFixed(1)}`,
  };
}
