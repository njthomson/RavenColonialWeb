# How Colonization Economies Work

A player-facing guide for **Elite Dangerous** CMDRs using Raven Colonial to plan
colonization ports, Odyssey settlements, hubs, and installations. It explains
the same model as the [technical economy model](./economy-model.md), but without
code terms.

**What you see in Raven Colonial:** every dockable port, settlement, hub, or
installation with a market can show percentages for Agriculture, Refinery,
Military, High Tech, Tourism, and the other economy types. A value like **225%**
means the market has economy strength `2.25` in the data.

Those percentages come from three places:

- The site's **host location**: planet type, moon type, star, asteroid cluster,
  Biological/Geological signals, volcanism, rings, and similar conditions.
- The system's **reserve level**: Pristine, Major, Low, Depleted, and related
  resource states.
- **Market links** from other valid builds in the same system.

**Spansh check:** for completed in-game stations, Raven Colonial can compare its
estimate with Spansh/EDSM market snapshots. Spansh is comparison-only; it does
not change the calculation.

---

## Surface and Orbital Terms

Raven Colonial uses these terms throughout this guide:

| Term | Meaning |
|------|---------|
| **Surface port** | A dockable starport or outpost built on the surface of a landable planet or moon |
| **Orbital port** | A dockable starport or outpost in space, including ports around a planet, moon, star, or asteroid cluster |
| **Settlement** | An Odyssey surface settlement |
| **Hub / installation** | A supporting build such as a relay, security post, space farm, comms installation, refinery hub, or science hub |
| **System primary port** | The first port the game has you build when you colonize a system. It should only be changed in Raven Colonial if that primary port is wrong |
| **Body primary port** | The main local market-link receiver for a body. When both orbital and surface ports share a body, the orbital port usually leads the pair |
| **Subordinate port** | An extra port attached under a body primary port or hub |

When this guide says **same body**, it means builds on the same planet, moon,
star, or asteroid cluster. When it says **other bodies**, it means different
locations in the same system.

---

## The Big Picture

Think of each market row as a ledger. Raven Colonial adds every line that
applies, then shows the total.

<div class="economy-flow" role="img" aria-label="Three mechanisms combine into the market percentage"><div class="economy-flow__sources"><div class="economy-flow__box economy-flow__box--own">
<p class="economy-flow__title">What the site gets locally</p>
<ul>
<li>Planet, moon, star, or asteroid type</li>
<li>Biological, Geological, Volcanism, Rings, and similar signals</li>
<li>System reserve level for industry economies</li>
</ul>
</div><div class="economy-flow__box economy-flow__box--strong">
<p class="economy-flow__title">Strong links - big slices</p>
<ul>
<li>Same-body hubs and settlements</li>
<li>Surface-to-orbital port pairs</li>
<li>Some gas-giant cluster farms</li>
</ul>
</div><div class="economy-flow__box economy-flow__box--weak">
<p class="economy-flow__title">Weak links - +5% each</p>
<ul>
<li>Relays, medical support, security, farms, hubs, and subordinate ports</li>
</ul>
</div></div><div class="economy-flow__arrows" aria-hidden="true">
<span>v</span><span>v</span><span>v</span>
</div><p class="economy-flow__result">Market % on the System Map</p></div>

| Mechanism | Typical amount | Do local conditions change it? |
|-----------|----------------|--------------------------------|
| **Local row** | +100%, +50%, or +40% chunks | Yes |
| **Strong link** | +40%, +80%, or +120% per source | Yes, especially Agriculture and reserve-level industry |
| **Weak link** | +5% per source | No, weak links stay flat |

**Market Links** shows candidates that can link into a port. The audit table
shows which candidates actually changed the market row.

**Who counts:** by default, only builds marked **Complete** affect the economy
model. **Use all Sites** adds planned and in-progress builds for what-if
planning, but invalid rows still stay below **BROKEN BELOW**.

---

## What To Build For Each Economy

This is the short CMDR version. Later sections explain the edge cases.

| Goal | Typical helpers |
|------|-----------------|
| **Agriculture** | Biological bodies, Earth-like / Water worlds, space farms, Agriculture settlements |
| **Refinery / Industrial / Extraction** | Rocky, Rocky-Ice, Icy, HMC, Metal-rich, rings, Geological / Volcanism, refinery / industrial / extraction hubs |
| **High Tech** | Relays, medical installations, scientific settlements/hubs, Ammonia / Earth-like / Biological / Geological bodies |
| **Military** | Security installations for weak links, military hubs for local strong links, star-based ports |
| **Tourism** | Tourist builds, Earth-like / Water / Ammonia bodies, Biological / Geological signals, black holes, neutron stars, white dwarfs |

---

## What Counts In The Model

The System View has two calculation modes:

| Mode | What counts |
|------|-------------|
| **Completed sites only** | Complete sites only |
| **Use all Sites** | Complete, building, and planned sites up to the cut line |

Rows with missing or unsafe modeling data are forced below **BROKEN BELOW** and
never feed the model:

- Unknown body
- Missing, `unknown`, or `null` build type
- Positive single-digit `marketId` values (`1` through `9`)
- Demolished site

A new or planned site with placeholder `marketId: 0` is not automatically
broken. If it has a valid body and build type, it belongs below the normal cut
line in completed-only mode.

---

## Ports, Settlements, Hubs, And Installations

**Dockable ports** are the main market rows most CMDRs care about. General
colony ports use the full model: local row, strong links, weak links, then
primary economy selection.

**Surface ports** and **Orbital ports** can behave differently when they share a
body. If a Surface colony port and an Orbital colony port are both present, the
Surface port can push its local economies into the Orbital port as a strong
link.

**Specialized ports** start with their specialty:

| Specialized port location | Starting specialty |
|---------------------------|--------------------|
| **Surface** | +50% |
| **Orbital** | +100% |

Examples: Refinery outpost, Tourism starport, Extraction outpost.

**Odyssey settlements** have a shorter path. They get a fixed settlement
economy, local buffs, and any settlement floors. Strong and weak links do **not**
apply to the settlement's own market row, but settlements can still send links
outward when the link graph makes them a source.

**Hubs and installations** mostly feed links into ports. If they have their own
market economy, Raven Colonial gives them a fixed facility row instead of
running the full port model. Link-only facilities do not get their own market
percentage.

---

## How A Colony Port Gets Its Numbers

1. **Local body or orbital location**

   The port starts with economies from where it is built. Rocky bodies add
   Refinery, Metal-rich and HMC bodies add Extraction, Earth-like worlds add
   Agriculture / High Tech / Military / Tourism, stars add Military, black holes
   / neutron stars / white dwarfs add High Tech and Tourism, and asteroid
   clusters add Extraction.

2. **Signals and reserve level**

   Biological and Geological signals add local rows where they apply. In
   **Pristine** or **Major** systems, Refinery, Industrial, and Extraction can
   gain **+40%**. In **Low** or **Depleted** systems, those same industry rows
   can lose **-40%** on non-settlement rows.

3. **Strong links**

   Same-body facilities, hub children, settlements, and Surface-to-Orbital port
   pairs can add large economy slices into a primary port.

4. **Weak links**

   Eligible sources add **+5%** each. Weak links are intentionally small and do
   not get extra Pristine, Biological, Terraformable, tidal, or icy modifiers.

5. **Primary economy**

   The highest total becomes the site's **primary economy**, which is the main
   economy tag the game highlights. Other non-zero economies still remain on the
   market row.

---

## Local Rows And Body Intrinsics

Common body/feature rows:

| Body or feature | Common local economy |
|-----------------|----------------------|
| Earth-like world | Agriculture, High Tech, Military, Tourism |
| Water world | Agriculture, Tourism |
| Ammonia world | High Tech, Tourism |
| Gas giant / water giant | High Tech, Industrial |
| HMC / metal-rich | Extraction |
| Rocky-Ice | Industrial, Refinery |
| Rocky | Refinery |
| Icy | Industrial |
| Asteroid cluster | Extraction |
| Star | Military |
| Black hole / neutron star / white dwarf | High Tech, Tourism |
| Rings | Extraction |
| Biological signal | Agriculture and Terraforming |
| Geological signal | Extraction and Industrial |

Reserve level affects Extraction, Industrial, and Refinery:

| Reserve level | Effect |
|---------------|--------|
| Major / Pristine | +40% |
| Low / Depleted | -40% on non-settlement own rows |

Other common local buffs:

- Volcanism can add **+40% Extraction**.
- BIO/GEO or ELW/AW can add **+40% High Tech**.
- Black holes, neutron stars, white dwarfs, BIO/GEO, and ELW/WW/AW can add
  **+40% Tourism**.

---

## Strong Links

Strong links are the main way to specialize a port. They are large because they
represent local infrastructure directly feeding the port.

### Strong Link Size

Strong link size follows **construction tier**, not pad size.

| Source tier | Strong link contribution |
|-------------|--------------------------|
| **T1** | +40% |
| **T2** | +80% |
| **T3** | +120% |

A T2 bio research settlement is a +80% strong-link source even if its pad is
small.

### Surface + Orbital Pairs

If a Surface colony port and an Orbital colony port share the same planet or
moon, the Surface port's local economies can strong-link into the Orbital port.

Body primary behavior is calculated from the current valid site order for that
body. The system primary port remains the original port the game had you build
first for the system.

### Hub Children

A hub can bring its children along as **sub-strong** links. For example, a
Refinery hub with settlements underneath can show the hub plus each child as
strong-link contributors into the primary port.

In a **Pristine** or **Major** system, each Refinery / Industrial / Extraction
strong-link contribution can also receive its own +40% reserve boost.

### Gas-Giant Cluster Farms

A space farm on a sibling moon under the same gas giant can strong-link
Agriculture into that moon's **primary** port only. If a second port exists on
that moon, it gets Agriculture through weak +5% steps instead of the farm's
strong link.

---

## Weak Links

Weak links are background support from elsewhere in the system. Each applied
weak link is **+5%**.

### Who Sends Weak Links

| Sender | What it sends |
|--------|---------------|
| **Relay installation** | High Tech +5% to eligible ports on other bodies |
| **Medical installation** | High Tech +5% support, and can help relays count for starports |
| **Security installation** | Military +5% to eligible ports on other bodies |
| **Demeter space farm** | Agriculture +5% when it is a qualifying space farm |
| **Economy-bearing hub** | Its primary economy outward |
| **Subordinate starport / outpost / hub** | Its primary economy outward |
| **Colony body primary** | Agriculture outward through the main weak-link path |
| **Primary port at the central star** | Agriculture outward only; Military and other local rows stay on that port |

### Relay And Medical High Tech

Relays are straightforward on outposts: if the relay is eligible and it is not
on the same body as the receiver, it adds **+5% High Tech**.

Starports are pickier. A relay adds **+5% High Tech** to a starport only when the
starport has a High Tech reason to receive it. That reason can be:

- High Tech already exists on the starport's market row, or
- Another non-relay High Tech weak source is linked, such as medical or
  scientific support.

If a starport has no High Tech row and no non-relay High Tech support, the relay
may still appear in **Market Links**, but it does not add +5% to the economy
total.

### Agriculture From Distant Stars

A Surface colony with no local Agriculture may accept only **one** Agriculture
weak link per distant star's subtree. Farms and Agriculture ports around another
star count once for that receiver. Agriculture settlements are exempt from that
distant-star cap.

---

## Agriculture

Agriculture is the special case because local agriculture, strong-link
agriculture, and weak-link agriculture use different rules.

### Local Agriculture Row

On the site's own market row:

- Biological signals can add **+100% Agriculture** if the world type does not
  already grant Agriculture.
- Biological, Earth-like, and Water world conditions can add **+40%** Agriculture
  buffs.
- The optional **Terraformable Agri Bonuses** button can add a +40% what-if
  buff.
- Icy bodies or tidal conditions can apply **-40%** Agriculture. Settlements
  only receive that negative row when a positive Agriculture body buff was
  applied.

### Agriculture Strong Links

Strong-link Agriculture uses the receiver's conditions:

| Receiver condition | Strong-link Agriculture effect |
|--------------------|--------------------------------|
| Biological | +40% |
| Earth-like / Water world | +40% |
| Terraformable toggle enabled | +40% |
| Icy / Rocky-Ice | -40% |
| Tidal to the star | -40% |

A tidal or icy penalty cannot reduce an Agriculture strong link below **+10%**.

### Agriculture Weak Links

Weak Agriculture is always **+5%** per applied farm, Agriculture port, or
Agriculture settlement source. These +5% steps do not receive Biological,
Terraformable, icy, tidal, or reserve modifiers.

Most ports can receive any number of valid weak Agriculture links. Tidal orbital
cluster colony ports are the notable capped case:

| Tidal orbital cluster case | Weak Agriculture budget |
|----------------------------|-------------------------|
| Same-body Agriculture facility/settlement strong link exists | 55% |
| No same-body Agriculture strong link | 65% |

### Terraformable Agri Bonuses

The System page has a **Terraformable Agri Bonuses** button. It is off by
default because current Elite Dangerous market behavior does not consistently
confirm the expected Terraformable Agriculture modifier.

Turn it on to preview what Agriculture numbers would look like if that in-game
behavior is fixed later. The setting is saved in your browser.

---

## Refinery, Industrial, And Extraction In Pristine Systems

In **Pristine** or **Major** systems, reserve level matters in two places:

| Where | Reserve effect |
|-------|----------------|
| Port's local Refinery / Industrial / Extraction row | +40% once |
| Each Refinery / Industrial / Extraction strong link | +40% per strong-link contribution |

In **Low** or **Depleted** systems, the same rows can receive **-40%** instead.

Example: Orbital starport over a rocky moon in a Pristine system.

| Ledger line | Amount |
|-------------|--------|
| Rocky body gives Refinery | +100% |
| Pristine buff on local row | +40% |
| Strong link from Surface colony partner | +40% |
| Pristine buff on that strong link | +40% |
| Sub-strong link from Refinery hub child | +80% |
| Pristine buff on that sub-strong link | +40% |
| **Total Refinery** | **340%** |

High Tech and Tourism body bonuses on strong links can apply as their own
contributions. Reserve-level industry boosts are especially visible because they
stack per Refinery / Industrial / Extraction strong-link contribution.

---

## Multiple Ports On One Body

Frontier's colonization rules make multiple dockable ports around one planet,
moon, star, or asteroid cluster awkward. Raven Colonial models the behavior this
way:

1. The model chooses a body primary from valid calculated sites.
2. Orbital ports normally outrank surface ports for the same body.
3. Other same-body ports become subordinates.
4. Subordinates can send their primary economy outward as weak support.
5. Same-body partner ports can create strong links into the body primary.

The Order for Calculations panel groups rows by body for readability, but the
math does not depend on arbitrary visual row dragging.

---

## Tier Points And The Order Panel

Tier-point math uses a canonical tax order so the grouped display cannot change
the result.

1. Skip the system primary port.
2. Consider valid starports with tier requirements.
3. Sort higher tier before lower tier.
4. Sort by body order.
5. Sort orbital before surface.
6. Sort by market/name fallback.

The Order for Calculations panel is now informational:

- **Completed sites only** and **Use all Sites** mirror the main System View
  toggle.
- **Group by body** regroups the visible information without changing the model
  facts.
- **Auto re-order markets** applies current Spansh inversion hints only.
- Users no longer drag table rows.
- **Change Primary Port?** is a correction tool for cases where Raven Colonial
  has the wrong system primary port.

Warnings about insufficient Tier 2/Tier 3 points appear for planned sites.
Complete and building sites are already locked in.

---

## Broken Below

Rows below **BROKEN BELOW** are visible but excluded. This protects the model
from imports or stale data that cannot be safely interpreted.

| Broken reason | Why it is excluded |
|---------------|--------------------|
| Unknown body | Body order, local rows, and body links cannot be trusted |
| Missing/unknown/null build type | The site has no valid economy pipeline |
| Positive single-digit market id | Treated as bad imported placeholder data |
| Demolished | The site should not affect current calculations |

Valid planned sites belong below the normal cut line in completed-only mode, not
below **BROKEN BELOW**.

---

## Spansh Compare And Market Inversions

The compare panel tries to match completed dockable sites against Spansh:

1. Use journal/Raven Colonial `marketId` if it resolves to an operational Spansh
   economy row.
2. Fall back to EDSM station-name matching when the journal id is missing,
   stale, or a construction placeholder.

Sites with no landing pads are treated as lower-reliability comparisons because
their public market ids can remain stuck on construction-era snapshots.

If two same-body sites appear swapped in Spansh, Raven Colonial can show up/down
hints in Order for Calculations. **Auto re-order markets** applies those
recommended market inversion swaps only; it does not perform a general site
regroup.

---

## System Effects Buff/Nerf

Raven Colonial applies the system effects model by default. A
commander/developer setting can still disable it for testing comparisons.

When enabled, the system primary port receives buffs while other facilities
receive nerfs for affected system stats:

| Stat | Primary | Non-primary |
|------|---------|-------------|
| Development | +40% | -10% |
| Security | +40% | -10% |
| Standard of Living | +40% | -20% |
| Technology | +20% | -25% |
| Wealth | +40% | -25% |
| Population / Max population | unchanged | unchanged |

---

## Quick Answers

| Question | Answer |
|----------|--------|
| How big is a weak link? | Always +5%. |
| How big is a strong link? | +40%, +80%, or +120% by source tier. |
| Does Spansh change calculations? | No, it is comparison-only. |
| Can users drag the calculation order? | No. The panel is informational; primary port correction is explicit. |
| What is the system primary port? | The first port the game has you build when you colonize a system. |
| Do invalid imported sites count? | No. They go below **BROKEN BELOW**. |
| Is `marketId: 0` broken by itself? | No. Positive single-digit ids `1` through `9` are the bad-id case. |
| Are Agriculture weak links usually capped? | No. Tidal orbital cluster colony ports are the capped case. |
