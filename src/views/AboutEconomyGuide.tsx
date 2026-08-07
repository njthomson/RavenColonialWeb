import { Icon, Link } from "@fluentui/react";
import { App } from "../App";
import { appTheme, cn } from "../theme";

const sectionStyle: React.CSSProperties = {
  marginTop: 22,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '10px 0 18px',
  fontSize: 15,
};

const thStyle: React.CSSProperties = {
  border: `1px solid ${appTheme.palette.themeTertiary}`,
  padding: '7px 9px',
  textAlign: 'left',
  color: appTheme.palette.themePrimary,
  background: appTheme.palette.neutralQuaternaryAlt,
};

const tdStyle: React.CSSProperties = {
  border: `1px solid ${appTheme.palette.themeTertiary}`,
  padding: '7px 9px',
  verticalAlign: 'top',
};

const flowBoxBase: React.CSSProperties = {
  border: `1px solid ${appTheme.palette.themeTertiary}`,
  padding: 12,
  minHeight: 134,
};

const flowColors = {
  local: '#2f7d32',
  strong: '#0078a8',
  weak: '#8a6f00',
};

export const AboutEconomyGuide: React.FunctionComponent = () => <div className={`home-box rel ${cn.greyer}`}>
  <h3 className={cn.h3}>Economy Guide</h3>

  <p>
    This guide explains how Raven Colonial estimates market economies for
    colonization ports, Odyssey settlements, hubs, and installations. A displayed
    value like <b>225%</b> means the market has economy strength <code>2.25</code>
    {' '}in the data.
  </p>

  <p>
    Spansh and EDSM are used for comparison and mismatch hints only. They do not
    feed the calculation.
  </p>

  <GuideSection title="The big picture">
    <p>Think of each market row as a ledger. Raven Colonial adds every line that applies, then shows the total.</p>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
        margin: '12px 0 6px',
      }}
    >
      <FlowBox title="What the site gets locally" color={flowColors.local}>
        <li>Planet, moon, star, or asteroid type</li>
        <li>Biological, Geological, Volcanism, Rings, and similar signals</li>
        <li>System reserve level for industry economies</li>
      </FlowBox>
      <FlowBox title="Strong links - big slices" color={flowColors.strong}>
        <li>Same-body hubs and settlements</li>
        <li>Surface-to-orbital port pairs</li>
        <li>Some gas-giant cluster farms</li>
      </FlowBox>
      <FlowBox title="Weak links - +5% each" color={flowColors.weak}>
        <li>Relays, medical support, security, farms, hubs, and subordinate ports</li>
      </FlowBox>
    </div>
    <div style={{ textAlign: 'center', margin: '6px 0 12px', color: appTheme.palette.themePrimary, fontSize: 28 }}>
      <Icon iconName='ChevronDown' /> <Icon iconName='ChevronDown' /> <Icon iconName='ChevronDown' />
    </div>
    <div
      style={{
        border: `2px solid ${appTheme.palette.themePrimary}`,
        color: appTheme.palette.themePrimary,
        background: appTheme.palette.neutralQuaternaryAlt,
        fontWeight: 700,
        textAlign: 'center',
        padding: 10,
        maxWidth: 280,
        margin: '0 auto 14px',
      }}
    >
      Market % on the System Map
    </div>
    <GuideTable
      headers={['Mechanism', 'Typical amount', 'Do local conditions change it?']}
      rows={[
        ['Local row', '+100%, +50%, or +40% chunks', 'Yes'],
        ['Strong link', '+40%, +80%, or +120% per source', 'Yes, especially Agriculture and reserve-level industry'],
        ['Weak link', '+5% per source', 'No, weak links stay flat'],
      ]}
    />
  </GuideSection>

  <GuideSection title="Surface and orbital terms">
    <GuideTable
      headers={['Term', 'Meaning']}
      rows={[
        ['Surface port', 'A dockable starport or outpost built on the surface of a landable planet or moon'],
        ['Orbital port', 'A dockable starport or outpost in space, including ports around a planet, moon, star, or asteroid cluster'],
        ['Settlement', 'An Odyssey surface settlement'],
        ['Hub / installation', 'A supporting build such as a relay, security post, space farm, comms installation, refinery hub, or science hub'],
        ['System primary port', 'The first port the game has you build when you colonize a system. It should only be changed in Raven Colonial if that primary port is wrong'],
        ['Body primary port', 'The main local market-link receiver for a body. When both orbital and surface ports share a body, the orbital port usually leads the pair'],
      ]}
    />
  </GuideSection>

  <GuideSection title="What to build for each economy">
    <GuideTable
      headers={['Goal', 'Typical helpers']}
      rows={[
        ['Agriculture', 'Biological bodies, Earth-like / Water worlds, space farms, Agriculture settlements'],
        ['Refinery / Industrial / Extraction', 'Rocky, Rocky-Ice, Icy, HMC, Metal-rich, rings, Geological / Volcanism, refinery / industrial / extraction hubs'],
        ['High Tech', 'Relays, medical installations, scientific settlements/hubs, Ammonia / Earth-like / Biological / Geological bodies'],
        ['Military', 'Security installations for weak links, military hubs for local strong links, star-based ports'],
        ['Tourism', 'Tourist builds, Earth-like / Water / Ammonia bodies, Biological / Geological signals, black holes, neutron stars, white dwarfs'],
      ]}
    />
  </GuideSection>

  <GuideSection title="What counts in the model">
    <GuideTable
      headers={['Mode', 'What counts']}
      rows={[
        ['Completed sites only', 'Complete sites only'],
        ['Use all Sites', 'Complete, building, and planned sites up to the cut line'],
      ]}
    />
    <p>Rows with missing or unsafe modeling data are forced below <b>BROKEN BELOW</b>{' '}and never feed the model:</p>
    <ul>
      <li>Unknown body</li>
      <li>Missing, <code>unknown</code>, or <code>null</code>{' '}build type</li>
      <li>Positive single-digit <code>marketId</code>{' '}values, <code>1</code>{' '}through <code>9</code></li>
      <li>Demolished site</li>
    </ul>
    <p>A new or planned site with placeholder <code>marketId: 0</code>{' '}is not automatically broken.</p>
  </GuideSection>

  <GuideSection title="Ports, settlements, hubs, and installations">
    <p>
      Dockable ports use the full model: local row, strong links, weak links,
      then primary economy selection. Surface and Orbital ports can behave
      differently when they share a body because the Surface port can push its
      local economies into the Orbital port as a strong link.
    </p>
    <GuideTable
      headers={['Site type', 'Economy behavior']}
      rows={[
        ['Specialized Surface port', 'Starts with +50% in its specialty, then receives eligible buffs and links'],
        ['Specialized Orbital port', 'Starts with +100% in its specialty, then receives eligible buffs and links'],
        ['Odyssey settlement', 'Gets fixed settlement economy, local buffs, and floors. Strong/weak links do not apply to its own row'],
        ['Hub / installation', 'Usually feeds links into ports. If it has its own market economy, it uses a fixed facility row'],
      ]}
    />
  </GuideSection>

  <GuideSection title="How a colony port gets its numbers">
    <ol>
      <li><b>Local body or orbital location:</b> Rocky bodies add Refinery, HMC and metal-rich bodies add Extraction, Earth-like worlds add Agriculture / High Tech / Military / Tourism, stars add Military, and asteroid clusters add Extraction.</li>
      <li><b>Signals and reserve level:</b> Biological and Geological signals add local rows where they apply. Pristine or Major systems can add +40% to industry rows; Low or Depleted can subtract -40% on non-settlement rows.</li>
      <li><b>Strong links:</b> Same-body facilities, hub children, settlements, and Surface-to-Orbital port pairs can add large slices into a primary port.</li>
      <li><b>Weak links:</b> Eligible sources add +5% each. Weak links do not get extra Pristine, Biological, Terraformable, tidal, or icy modifiers.</li>
      <li><b>Primary economy:</b> The highest total becomes the site's primary economy. Other non-zero economies remain visible.</li>
    </ol>
  </GuideSection>

  <GuideSection title="Local rows and body intrinsics">
    <GuideTable
      headers={['Body or feature', 'Common local economy']}
      rows={[
        ['Earth-like world', 'Agriculture, High Tech, Military, Tourism'],
        ['Water world', 'Agriculture, Tourism'],
        ['Ammonia world', 'High Tech, Tourism'],
        ['Gas giant / water giant', 'High Tech, Industrial'],
        ['HMC / metal-rich', 'Extraction'],
        ['Rocky-Ice', 'Industrial, Refinery'],
        ['Rocky', 'Refinery'],
        ['Icy', 'Industrial'],
        ['Asteroid cluster', 'Extraction'],
        ['Star', 'Military'],
        ['Black hole / neutron star / white dwarf', 'High Tech, Tourism'],
        ['Biological / Geological / Rings', 'Agriculture and Terraforming / Extraction and Industrial / Extraction'],
      ]}
    />
  </GuideSection>

  <GuideSection title="Strong links">
    <p>Strong link size follows construction tier, not pad size.</p>
    <GuideTable
      headers={['Source tier', 'Strong link contribution']}
      rows={[
        ['T1', '+40%'],
        ['T2', '+80%'],
        ['T3', '+120%'],
      ]}
    />
    <ul>
      <li>A T2 bio research settlement is a +80% strong-link source even if its pad is small.</li>
      <li>Hub children can appear as sub-strong contributors into the primary port.</li>
      <li>Pristine or Major reserve boosts can apply to each Refinery / Industrial / Extraction strong-link contribution.</li>
      <li>Gas-giant cluster farms can strong-link Agriculture into the moon's primary port only.</li>
    </ul>
  </GuideSection>

  <GuideSection title="Weak links">
    <p>Weak links are background support from elsewhere in the system. Each applied weak link is <b>+5%</b>.</p>
    <GuideTable
      headers={['Sender', 'What it sends']}
      rows={[
        ['Relay installation', 'High Tech +5% to eligible ports on other bodies'],
        ['Medical installation', 'High Tech +5% support, and can help relays count for starports'],
        ['Security installation', 'Military +5% to eligible ports on other bodies'],
        ['Demeter space farm', 'Agriculture +5% when it is a qualifying space farm'],
        ['Economy-bearing hub or subordinate port', 'Its primary economy outward'],
        ['Colony body primary', 'Agriculture outward through the main weak-link path'],
      ]}
    />
    <p>
      Starports are pickier with relay High Tech: the relay adds +5% only if the
      starport already has High Tech or another non-relay High Tech weak source
      is linked.
    </p>
  </GuideSection>

  <GuideSection title="Agriculture">
    <p>Agriculture is the special case because local agriculture, strong-link agriculture, and weak-link agriculture use different rules.</p>
    <GuideTable
      headers={['Path', 'Important rules']}
      rows={[
        ['Local Agriculture row', 'BIO can add +100% when the world type does not already grant Agriculture. BIO, ELW, WW, and optional Terraformable can add +40%. Icy or tidal conditions can reduce Agriculture by -40%.'],
        ['Agriculture strong links', 'Uses receiver conditions: BIO +40%, ELW/WW +40%, Terraformable +40% when enabled, Icy/Rocky-Ice -40%, Tidal -40%. Cannot fall below +10%.'],
        ['Agriculture weak links', 'Always +5% per applied source. Most ports can receive any number of valid weak Agriculture links; tidal orbital cluster colony ports are capped at 55% or 65%.'],
      ]}
    />
    <p>
      The <b>Terraformable Agri Bonuses</b>{' '}button is off by default because
      current game behavior does not consistently confirm the expected
      Terraformable Agriculture modifier.
    </p>
  </GuideSection>

  <GuideSection title="Tier points and the Order panel">
    <p>Tier-point math uses a canonical tax order so grouped display cannot change the result.</p>
    <ol>
      <li>Skip the system primary port.</li>
      <li>Consider valid starports with tier requirements.</li>
      <li>Sort higher tier before lower tier.</li>
      <li>Sort by body order.</li>
      <li>Sort orbital before surface.</li>
      <li>Sort by market/name fallback.</li>
    </ol>
    <p>
      The Order for Calculations panel is informational. It mirrors the main
      completed/all toggle, can group by body, can apply Spansh inversion hints,
      and includes a correction tool for the system primary port when Raven
      Colonial has the wrong first port.
    </p>
  </GuideSection>

  <GuideSection title="Spansh compare and market inversions">
    <p>The compare panel matches completed dockable sites against Spansh by journal/Raven Colonial market id first, then by EDSM station-name matching when needed.</p>
    <p>
      If two same-body sites appear swapped in Spansh, Raven Colonial can show
      up/down hints in Order for Calculations. <b>Auto re-order markets</b>{' '}
      applies those recommended inversion swaps only; it does not perform a
      general regroup.
    </p>
  </GuideSection>

  <GuideSection title="System effects buff/nerf">
    <p>
      Raven Colonial applies the system effects model by default. A
      commander/developer setting can still disable it for testing comparisons.
    </p>
    <GuideTable
      headers={['Stat', 'Primary', 'Non-primary']}
      rows={[
        ['Development', '+40%', '-10%'],
        ['Security', '+40%', '-10%'],
        ['Standard of Living', '+40%', '-20%'],
        ['Technology', '+20%', '-25%'],
        ['Wealth', '+40%', '-25%'],
        ['Population / Max population', 'unchanged', 'unchanged'],
      ]}
    />
  </GuideSection>

  <GuideSection title="Quick answers">
    <GuideTable
      headers={['Question', 'Answer']}
      rows={[
        ['How big is a weak link?', 'Always +5%.'],
        ['How big is a strong link?', '+40%, +80%, or +120% by source tier.'],
        ['Does Spansh change calculations?', 'No, it is comparison-only.'],
        ['Can users drag the calculation order?', 'No. The panel is informational; primary port correction is explicit.'],
        ['What is the system primary port?', 'The first port the game has you build when you colonize a system.'],
        ['Do invalid imported sites count?', 'No. They go below BROKEN BELOW.'],
        ['Is marketId: 0 broken by itself?', 'No. Positive single-digit ids 1 through 9 are the bad-id case.'],
      ]}
    />
  </GuideSection>

  <p>
    Economy modelling is still being refined. Please <Link onClick={() => App.showFeedback("Economy modelling guide feedback")}>report errors or issues</Link>{' '}when a completed site does not match observed market data.
  </p>
  <IconBtnScrollTopShim />
</div>;

const GuideSection: React.FunctionComponent<{ title: string }> = ({ title, children }) => <section style={sectionStyle}>
  <h3 className={cn.h3} style={{ fontSize: 22 }}>{title}</h3>
  {children}
</section>;

const FlowBox: React.FunctionComponent<{ title: string, color: string }> = ({ title, color, children }) => <div style={{ ...flowBoxBase, borderColor: color }}>
  <div style={{ color, fontWeight: 700, marginBottom: 8 }}>{title}</div>
  <ul style={{ margin: 0, paddingLeft: 22 }}>
    {children}
  </ul>
</div>;

const GuideTable: React.FunctionComponent<{ headers: string[], rows: string[][] }> = ({ headers, rows }) => <table style={tableStyle}>
  <thead>
    <tr>
      {headers.map(header => <th key={header} style={thStyle}>{header}</th>)}
    </tr>
  </thead>
  <tbody>
    {rows.map((row, i) => <tr key={`${row[0]}-${i}`} style={{ background: i % 2 ? appTheme.palette.neutralQuaternaryAlt : undefined }}>
      {row.map((cell, j) => <td key={`${row[0]}-${j}`} style={tdStyle}>{j === 0 ? <b>{cell}</b> : cell}</td>)}
    </tr>)}
  </tbody>
</table>;

const IconBtnScrollTopShim: React.FunctionComponent = () => <button
  type="button"
  aria-label="Scroll to top"
  title="Scroll to top"
  className={cn.bBox}
  style={{
    position: 'absolute',
    bottom: 8,
    right: 8,
    color: appTheme.palette.themePrimary,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 24,
  }}
  onClick={() => window.scrollTo({ top: 0 })}
>
  <Icon iconName='DoubleChevronUp12' />
</button>;
