# Economy Model

This document describes the current production economy model in `src/economy`.
External market data from Spansh/EDSM is used only for comparison and inversion
hints in the UI; it does not feed the calculation.

Plain-language companion: [economy-model-guide.md](./economy-model-guide.md)

## Entry Points

| Area | File |
|------|------|
| Public re-exports | `src/economy/index.ts` |
| System assembly, link graph, tier points, system effects | `src/economy/system-model2.ts` |
| Per-site economy pipeline | `src/economy/economy-model2.ts` |
| Body intrinsics, buffs, strong/weak link application | `src/economy/economy-documented.ts` |
| Agriculture modifiers and strong-link formulas | `src/economy/economy-ag-modifiers.ts` |
| Agriculture heuristics, floors, diagnostic helpers | `src/economy/economy-ag-heuristics.ts` |
| Facility fixed economies | `src/economy/economy-facilities.ts`, `src/economy/economy-facility-registry.ts` |
| Spansh compare and inversion hints | `src/economy/compare/*` |

## Included Sites

`buildSystemModel2(sys, useIncomplete, buffNerf, economyModelOptions)` builds
`calcIds` in `initializeSysMap`.

| Mode | Included in `calcIds` |
|------|------------------------|
| Completed only | Complete sites only |
| Use all Sites | Non-demolished sites up to `sys.idxCalcLimit` |

The following are forced below the cut line and excluded from calculations in
both modes:

- Unknown body (`bodyNum < 0`, missing body, or body name `Unknown`)
- Missing, `unknown`, or `null` build type
- Positive single-digit `marketId` (`1` through `9`)
- Demolished sites

The rules live in `site-calc-exclusions.ts`.

## System Primary Port

The system primary port is inferred from `system.sites[0]` for API compatibility.
The model stores the inferred value on the in-memory `SysMap2.primaryPortId`.
It is not a backend schema field.

If `sites[0]` is invalid, the model falls back to the first valid complete
starport/outpost, then finally to `sites[0]` as a last resort.

The Order for Calculations panel is informational. It groups rows for readability
and lets the user choose a new primary port by moving an eligible orbital
starport/outpost to row 0 in the saved site array. Drag/drop site ordering is no
longer part of the UI.

## Calculation Order

The model does not trust arbitrary `system.sites` order for tier-tax math.
`sumTierPoints` builds a canonical tax order:

1. Exclude the system primary port.
2. Include only valid starports with tier requirements.
3. Sort higher tier first.
4. Sort by body number.
5. Sort orbital before surface.
6. Sort by `marketId`, then name/id.

This keeps tier math stable even when the table display is grouped by body.

## System Build Pipeline

`buildSystemModel2` performs these steps:

1. Clone sites and build `siteMaps`, `bodyMap`, `calcIds`, and system score.
2. Determine each body's surface and orbital primaries.
3. Assign same-body subordinate links.
4. Mark economy-capable sites as pending.
5. Build each primary site's strong and weak link graph.
6. Calculate economies and link summaries.
7. Stabilize economy dependencies for up to five passes.
8. Sum tier points, system effects, economy counts, and unlocks.

Economy dependencies can be recursive because weak-link sources may need their
own primary economy before a receiver can use them. The stabilization pass
recalculates until signatures stop changing.

## Body Primaries and Links

Body primaries are selected from calculated sites only.

- Dockable ports anchor link graphs.
- Hubs can anchor a body only when the body has no dockable port.
- Installations never act as a body primary.
- Higher tier wins; dockable ports beat hubs at the same tier.
- For star/asteroid-cluster bodies, sibling asteroid-cluster sites are considered
  with the parent star body.

Subordinate links are assigned before weak-link sources are collected. Surface
primaries cannot claim orbital ports when an orbital primary exists.

## Strong Links

Strong links are applied by `applyStrongLinks2`.

| Source tier/type | Base contribution |
|------------------|-------------------|
| Tier 1 | 0.4 |
| Tier 2 | 0.8 |
| Tier 3 | 1.2 |
| Agriculture installation (`demeter`, `picumnus`) | 0.4 |

For non-colony sources, the source economy is applied at the base contribution.
For colony sources, only intrinsic economies from the source are considered.

Hub grandchildren are flattened into the primary's strong-source list so the UI
and calculation can show the hub plus its children. The old parent-hub
sub-strong pass is intentionally disabled in `applyParentHubSubStrongLink`
because current observed data does not support adding that extra contribution to
subordinate/converted ports.

Gas-giant cluster farms (`demeter`, `picumnus` on sibling moons under the same
gas giant) strong-link agriculture only to the body primary. They are not nested
as sub-strong sources for subordinate ports.

## Strong-Link Boosts

After a non-agriculture strong-link contribution is added,
`applyStrongLinkBoost` may add another body/system adjustment.

| Economy | Strong-link boosts |
|---------|--------------------|
| Extraction | Reserve level +/-0.4, volcanism +0.4 |
| Industrial | Reserve level +/-0.4 |
| Refinery | Reserve level +/-0.4 |
| High Tech | AW/ELW/WW +0.4, BIO +0.4, GEO +0.4 |
| Tourism | AW/ELW/WW +0.4, BIO +0.4, GEO +0.4, NS/BH/WD +0.4 |

The current live-compatible code lets these boosts apply per contribution.

## Weak Links

Weak links are flat `+0.05` steps. They are processed alphabetically by source
name. Strong-linked sources are skipped.

Current graph construction uses cross-body weak candidates. The `sameBodyWeakSites`
field still exists, but same-body weak candidates are not populated in the live
path.

Weak-link contributor rules live in `economy-weak-links.ts`.

| Source | Weak-link behavior |
|--------|--------------------|
| Relay installations (`enodia`, `ichnaea`) | High Tech weak source. Outposts always receive it; starports receive it only if High Tech is already present or another High Tech weak anchor exists. |
| Medical High Tech installations (`asclepius`, `eupraxia`) | High Tech weak source. |
| Security installations (`dicaeosyne`, `eunomia`, `nomos`, `poena`) | Military weak source. |
| Military hub installations (`alastor`, `vacuna`) | Currently allowed as weak contributors by the code. |
| Demeter space farm | Agriculture weak source when it is a qualifying space farm. |
| Economy-bearing hubs | Weak contributors. |
| Subordinate tiered ports | Weak contributors. |
| Body-primary non-colony tiered ports | Do not weak-link outward. |
| Colony body primaries | Only agriculture is applied outward by the weak-link application path. |
| Star-body primary tiered ports | Non-agriculture weak export is blocked. |

Colony weak sources use intrinsic economies. Body-primary colony sources are
restricted to agriculture during the main weak-link pass.

## Agriculture

Agriculture is split into own-row buffs, strong-link modifiers, and weak links.

### Own Row

`applyAgricultureBodyBuffs` runs inside `applyBuffs` when agriculture is already
above zero.

Positive own-row buffs:

- BIO: +0.4
- Terraformable: +0.4 only when `enableTerraformableAgricultureBonus` is enabled
- ELW/WW: +0.4

Current code also applies an own-row `-0.4` when the site is on an icy body or
is tidal to a star, with a settlement guard: settlements only receive this
negative row when a positive agriculture body buff was applied.

ELW/WW agriculture is floored to at least 1.0.

`shouldSkipPositiveAgricultureBodyBuffs` currently returns `false`, so the old
"move orbital paired-port agriculture buffs to the strong link" behavior is not
active.

### Strong-Link Agriculture

`calculateAgricultureStrongLinkContribution` starts from the source value and
then applies receiver-body modifiers:

| Modifier | Delta |
|----------|-------|
| BIO | +0.4 |
| Terraformable, option enabled | +0.4 |
| ELW/WW | +0.4, except same-body ELW/WW colony source when skipped |
| Icy/Rocky-Ice | -0.4 |
| Tidal | -0.4 |

If the final contribution is zero or lower, it is floored to
`STRONG_LINK_CONTRIBUTION_FLOOR` (`0.1`).

Colony agriculture strong-link source value currently uses the tier coefficient.
Historical source-value amplification code is disabled.

### Weak-Link Agriculture

Agriculture weak links are flat `+0.05` per applied source.

Most historical agriculture budget rules are disabled for live calculations.
`getMaxAgricultureWeakLinkBudget` returns `Infinity` except for tidal orbital
cluster colony ports (`plutus`, `vulcan`, `prometheus`), which are capped:

| Case | Budget |
|------|--------|
| Tidal orbital cluster with same-body agriculture facility/settlement strong link | 0.55 |
| Tidal orbital cluster without that same-body agriculture strong link | 0.65 |

The old budget constants remain available for local hypothesis tests, and
`explainAgricultureWeakLinkBudget` intentionally reports no matching rules.

### Agriculture Heuristics Still Active

The following heuristics are active:

- Icy subordinate `atropos` preset:
  - Extraction +0.65
  - Agriculture +0.55
  - Refinery +0.35
  - Military +0.30
  - Industrial +0.25
  - High Tech +0.15
- Foreign-star agriculture weak links: surface colony ports without agriculture
  intrinsic accept at most one agriculture weak link per foreign star root.
- Agriculture settlement floor: tier-1 agriculture settlements are floored to
  their fixed settlement value.
- Fixed surface/orbital non-agriculture ports can receive agriculture floors
  after links in specific cases.

## Body Intrinsics

`applyBodyType` applies intrinsic economies to colony ports.

| Body | Intrinsics |
|------|------------|
| BH/NS/WD | High Tech, Tourism |
| Star | Military |
| ELW | Agriculture, High Tech, Military, Tourism |
| WW | Agriculture, Tourism |
| Ammonia world | High Tech, Tourism |
| Gas giant / water giant | High Tech, Industrial |
| HMC / metal-rich | Extraction |
| Rocky-Ice | Industrial, Refinery |
| Rocky | Refinery |
| Icy | Industrial |
| Asteroid cluster | Extraction |

Feature intrinsics:

- Rings: Extraction unless HMC/metal-rich already supplies it.
- BIO: Agriculture unless ELW/WW already supplies it, plus Terraforming.
- GEO: Extraction unless HMC/metal-rich already supplies it, and Industrial
  unless gas/water/rocky-ice/icy already supplies it.
- Star/remnant bodies with asteroid clusters add Extraction.

## Own-Row Buffs

`applyBuffs` applies after intrinsic or fixed economy rows exist.

| Economy | Own-row buffs |
|---------|---------------|
| Extraction, Industrial, Refinery | Major/Pristine +0.4; Low/Depleted -0.4 except settlements |
| Agriculture | See Agriculture section |
| High Tech | BIO/GEO or ELW/AW; settlements in the new model can receive BIO, GEO, and ELW/AW checks separately |
| Extraction | Volcanism +0.4 |
| Tourism | BH, NS, WD, BIO/GEO, or ELW/WW/AW |

Facility rows call `applyBuffs` with `skipHightechBodyBuffs` so scientific and
medical hub fixed High Tech does not also receive BIO/GEO body buffs.

## Site-Type Pipelines

### Colony Starports and Outposts

1. Apply body intrinsics unless the site is a fixed specialized port.
2. Apply own-row buffs.
3. Apply observed presets.
4. Apply strong links.
5. Apply weak links.
6. Apply agriculture floors/post-link fixed-port BIO behavior.
7. Sort audit rows and set `primaryEconomy`.

### Fixed Specialized Ports

Specialized ports receive:

- Orbital fixed economy: +1.0
- Surface fixed economy: +0.5

They then receive own-row buffs, strong/weak links, and post-link agriculture
floor/BIO handling where applicable.

### Odyssey Settlements

Settlements receive a fixed economy of `1.0` for `site.type.inf`, then own-row
buffs. They do not receive strong or weak links as receivers in the current
pipeline. Agriculture tier-1 settlements can be floored back to their fixed
value.

### Hubs and Installations

Hubs/installations with `type.inf !== "none"` use the facility registry.

- Most fixed facility rows are 100%.
- `eunostus` is 140% Industrial.
- `athena` is 100% High Tech by default and 140% when operational comms
  (`aletheia`, `pistis`, `soter`) exists on the same body or an ancestor body.
- Some facilities are link-only (`type.inf === "none"`) and have no economy row.

Facility rows still receive applicable non-High-Tech own-row buffs through
`applyBuffs`.

## System Effects Buff/Nerf

The user-facing experimental checkbox was removed. The system effects model can
still be toggled through commander/developer settings.

When enabled, the system primary port gets buffs while other facilities get
nerfs for affected system stats:

| Stat | Primary | Non-primary |
|------|---------|-------------|
| Development | +40% | -10% |
| Security | +40% | -10% |
| Standard of Living | +40% | -20% |
| Technology | +20% | -25% |
| Wealth | +40% | -25% |
| Population / Max population | unchanged | unchanged |

## Spansh Compare

Spansh compare is UI-only.

Resolution order:

1. Use journal/RC `marketId` if it resolves to an operational Spansh economy row.
2. Fall back to EDSM station-name matching when the journal id is missing,
   stale, or a construction placeholder.

Sites with no landing pads are excluded from hard Spansh comparison and display
a caveat because their journal market ids can remain construction-era snapshots.

The compare panel can detect likely same-body market inversions. Exact swaps are
flagged when each site's modeled economy is a better match for the partner's
Spansh row. A secondary strong heuristic uses economy-count improvement when
external data appears stale. Order for Calculations can show up/down hints and
Auto re-order markets can apply the recommended inversion swaps.

## Order for Calculations Panel

The panel shows the order used up to the cut line, but rows are not draggable.

- Completed/all mode mirrors the main System View toggle.
- Group by body preserves the active cut line.
- Use all Sites keeps planned sites after complete/build sites.
- Broken/invalid sites are forced below `BROKEN BELOW`.
- Primary market-link sites show a link icon.
- Primary port can be changed through a picker of eligible orbital starports or
  outposts; saving keeps the chosen site at `system.sites[0]`.

## Verification

Live repo verification should use:

```bash
npm run build
```

Local-only regression and fixture tests live under `local/economy/tests/` and
are not part of the deployed site or tracked package scripts.
