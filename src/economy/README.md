# `src/economy/`

All TypeScript for **colonization economy math** and the **per-system site model** lives here. The React app does not implement economy rules in views — it loads a system, calls `buildSystemModel2`, and renders the `SysMap2` / `SiteMap2` objects this folder produces.

**Outside this folder:** site records (`site-data.ts`), raw body/site types (`types2.ts`), API shapes (`api/v2-system.ts`). **Inside this folder:** link graphs, percentage calculation, facility intrinsics, and Spansh row matching for the UI.

Rule details: [`docs/economy-model.md`](../../docs/economy-model.md).

---

## Layout

```
economy/
├── index.ts                      # barrel → economy-model2
├── system-model2.ts              # system build, types, link graph, build validation
├── economy-model2.ts             # per-site economy pipeline (entry for calc)
├── economy-core.ts               # adjust(), constants, shared helpers
├── economy-documented.ts         # body intrinsics, buffs, strong/weak apply
├── economy-ag-modifiers.ts       # agriculture ±0.4 rules
├── economy-ag-heuristics.ts      # agriculture budgets, floors, presets
├── economy-weak-links.ts         # who emits weak links; relay/security filters
├── economy-link-sources.ts         # strong-link source discovery (clusters, farms, hubs)
├── economy-facility-registry.ts  # hub/installation intrinsic table
├── economy-facilities.ts         # facility economy calc
└── compare/
    ├── spansh-economy-resolve.ts   # match RC sites to Spansh/EDSM rows (UI)
    └── spansh-compare-reliability.ts  # compare confidence / caveats (UI)
```

---

## Relationship to the site

When a user opens a system in **SystemView2** or **ProjectView**, the app passes `Sys` (bodies + sites from the API) into `buildSystemModel2` (`system-model2.ts`). That returns a `SysMap2` cached on the view. Every economy-aware screen reads from that object — it does not recalculate rules itself.

| Site area | Reads from this folder |
|-----------|-------------------------|
| **SystemView2** (`SystemView2.tsx`) | `buildSystemModel2`, `getSnapshot`, `hasPreReq2`; Spansh helpers from `compare/` |
| **Economy table** (`EconomyTable2.tsx`) | `SiteMap2.economies`, `economyAudit`, `stellarRemnants`, `isFacilityWithEconomy`; Spansh diff via `compare/` |
| **Market Links** (`MarketLinks.tsx`) | `getAppliedWeakLinkCount`, `getAppliedWeakLinkSources`; `SiteMap2.links` |
| **Body cards** (`BodyCard.tsx`) | `applyBodyType`, `applyBuffs`, `applyStrongLinkBoost`, `bodyIsTidalToStar` for live previews; `AuditEconomy` type |
| **Build order** (`BuildOrder.tsx`) | `sumTierPoints`, `hasPreReq2`, `isTypeValid2`, `getPreReqNeeded` |
| **Build type / tax** (`ViewEditBuildType.tsx`) | `applyTax`, `isTypeValid2` |
| **System unlocks** (`ViewUnlocked.tsx`) | `mapSysUnlocks`, `SysUnlocks` |
| **Build effects** (`BuildEffects.tsx`) | `summarizeEconomicInfForBuild`, `isUndockableFacility` |
| **Big site table / choose body** | `SysMap2`, `isTypeValid2`, `BodyMap2` |
| **EDSM import** (`api/edsm.ts`) | `buildEdsmMarketIdByNormalizedName` |
| **API types** (`api/v2-system.ts`) | `EconomyMap`, `TierPoints` type re-use |

**Import pattern from the rest of `src/`:**

- `from '../economy'` or `from '../../economy'` — public calc helpers (`index.ts` → `economy-model2.ts`)
- `from '../economy/system-model2'` — `buildSystemModel2`, `SiteMap2`, `SysMap2`, build validation
- `from '../economy/compare/...'` — Spansh comparison only; never affects modeled percentages

Nothing under `src/economy/` imports React or view code. Dependency direction is always **views → economy**.

### Terraformable agriculture what-if toggle

SystemView2 has a top command-bar button for **Terraformable Agri Bonuses**. It is off by default and persists as `terraformableAgriBonus` in local storage.

The button passes `enableTerraformableAgricultureBonus` into `buildSystemModel2`. When enabled, terraformable bodies receive the optional +0.4 agriculture modifier on own-row agriculture buffs and agriculture strong-link contribution formulas. This is intentionally a what-if mode for planning around a future Elite Dangerous fix; the default remains conservative for current live-game behavior.

---

## Internal flow

```
system-model2.buildSystemModel2()
  ├─ assign body primaries, parentLink subordinates
  ├─ economy-link-sources + economy-weak-links  →  strongSites / weakSites pools
  ├─ precalc weak-link source economies
  └─ per site in calcIds:
        economy-model2.calculateColonyEconomies2()   (ports, settlements)
        or economy-model2 → economy-facilities.calculateFacilityEconomies2()
              └─ economy-documented (body type, buffs, links)
              └─ economy-ag-modifiers / economy-ag-heuristics (agriculture)
              └─ economy-core.adjust() → site.economyAudit
```

`compare/` is **not** in this pipeline. It runs after calc when the UI lines up Spansh journal data against `SiteMap2.economies`.

---

## Files

### `index.ts`

Re-exports `economy-model2.ts`. Exists so components can `import { … } from '../../economy'` without reaching into internal file names.

### `system-model2.ts`

Largest module. **Site model + orchestration.**

- **Types:** `SysMap2`, `BodyMap2`, `SiteMap2`, `SiteLinks2`, `EconomyMap`, `AuditEconomy` — the shape SystemView2 and child components expect.
- **`buildSystemModel2`:** single entry the site calls to materialize a full system model (primaries, links, economies, tier points, system effects, unlocks).
- **Link graph:** which sites appear in each port’s `strongSites`, `weakSites`, `sameBodyWeakSites`; uses `economy-link-sources` and `economy-weak-links`.
- **Build tooling:** `hasPreReq2`, `isTypeValid2`, `getPreReqNeeded`, `sumTierPoints`, `applyTax`, `getSnapshot`, `mapSysUnlocks` — used by build-order and project flows, not just economy display.

### `economy-model2.ts`

**Per-site economy entry.** `calculateColonyEconomies2` runs the documented step order for settlements, fixed specialized ports, and colony starports/outposts. Delegates hubs/installations to `economy-facilities.ts`. Re-exports symbols the UI imports directly (`stellarRemnants`, weak-link helpers, `applyStrongLinkBoost`, etc.).

### `economy-core.ts`

Low-level building blocks used by every calc file. **`adjust()`** is the only path that mutates economy values and fills **`economyAudit`** (shown in the economy table). Also: `bodyIsTidalToStar`, `stellarRemnants`, agriculture run flags on `SiteMap2.agEconomyCalc`, `STRONG_LINK_CONTRIBUTION_FLOOR`.

### `economy-documented.ts`

Rules from the community colonization sheet and Mega Guide: body-type intrinsics, BIO/GEO/RINGS buffs, specialized port fixed rows, **strong-link** contributions (+40% refinery boost, hub sub-links), **weak-link** application (+5% per source, agriculture budgets). Exports `getAppliedWeakLinkCount` / `getAppliedWeakLinkSources` for Market Links.

### `economy-ag-modifiers.ts`

Agriculture-only ±0.4 modifiers (BIO, TIDAL, ICY, ELW/WW, terraformable). Own docked row vs strong-link contribution use different rule subsets. `calculateAgricultureStrongLinkContribution` is used from `economy-documented` during strong-link apply.

### `economy-ag-heuristics.ts`

Agriculture behavior **not** in the public sheet: weak-link budget caps (`AG_WEAK_LINK_BUDGET`, per build type), settlement/orbital floors, preset economy rows, foreign-star weak links. Called from `economy-model2` and `economy-documented` during weak-link apply.

### `economy-weak-links.ts`

Defines **which sites can emit weak links** (hubs, relay/security installations, subordinate tiered ports, etc.) and **whether a weak link actually changes the receiver** (`relayWeakLinkAppliesEconomyTo`, `securityWeakLinkAppliesEconomyTo`). `siteContributesWeakLinks` / `siteAlreadyStrongLinkedTo` are used when `system-model2` assembles link pools.

### `economy-link-sources.ts`

Defines **which sites can be strong-link sources** beyond the obvious same-body cases: gas-giant cluster farms (sibling moons), anchored vs free space farms, hub grandchild flattening (so Market Links matches in-game link UI). `findSameBodyWeakLinkCandidates` feeds same-body weak pools.

### `economy-facility-registry.ts`

Lookup table **`FACILITY_ECONOMY_REGISTRY`**: every hub/installation build type is `linkOnly`, `fixed` intrinsic, or `athenaComms` (100% vs 140% hightech with operational comms on host/ancestors). `summarizeEconomicInfForBuild` drives the build-effects panel. `bodyHasOperationalCommsForAthena` / `getAthenaHightechIntrinsic` support athena calc.

### `economy-facilities.ts`

`calculateFacilityEconomies2` — facility path: registry intrinsic → `applyBuffs` → `primaryEconomy`. Facilities skip colony strong/weak steps; they are link sources and fixed market rows. `isFacilityWithEconomy` gates economy-table rows.

### `compare/spansh-compare-reliability.ts`

UI-only. Labels whether Spansh comparison is meaningful (`dockable` vs `limited`), excludes hubs/installations from compare, supplies tooltip copy (`SpanshCompareCaveat`). Does not read or write `SiteMap2.economies`.

### `compare/spansh-economy-resolve.ts`

UI-only. Normalizes station names, matches `marketId` to Spansh/EDSM rows, detects construction placeholders, explains compare failures in the economy table. `buildEdsmMarketIdByNormalizedName` supports EDSM import. Does not participate in `buildSystemModel2`.

---

## `SiteMap2` fields the site renders

| Field | Set by | Used in site |
|-------|--------|--------------|
| `economies` | `economy-model2` / `economy-facilities` | Economy table, body cards |
| `primaryEconomy` | finish step in calc | Weak links from colony sources |
| `economyAudit` | `economy-core.adjust` | Economy table audit column |
| `links.strongSites` / `weakSites` | `system-model2` | Market Links, link indicators |
| `parentLink` | `system-model2` | Subordinate display, link inheritance |
| `intrinsic` | `economy-documented` | Body card intrinsic badges |
