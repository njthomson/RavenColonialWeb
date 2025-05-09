import { FunctionComponent } from "react";
import { cn } from "../../theme";
import { economyColors, mapName } from "../../site-data";
import { SiteMap } from "../../system-model";
import { ProjectLink } from "../ProjectLink/ProjectLink";
import { Link } from "@fluentui/react";

export const MarketLinks: FunctionComponent<{ site: SiteMap, showName?: boolean }> = (props) => {
  if (!props.site) return null;

  // exit early if this port does not have links
  if (!props.site.links) {
    return <div>
      <h3 className={cn.h3}>Market links:</h3>
      {props.site.parentLink && <span>Contributes to: <ProjectLink proj={props.site.parentLink} noSys /></span>}
      {!props.site.parentLink && <span>{props.site.buildName} does not receive market links</span>}
      <br />
      <br />
    </div>;
  }

  const getLinkCountSpan = (num: number) => {
    if (num === 0) {
      return <span style={{ color: 'grey' }}>-</span>;
    } else {
      return <span>{num}</span>;
    }
  }

  const colorBlocks = generateColorBlocks(props.site, 400, 20);

  // table rows for strong/weak links
  const linkRows = [];
  for (const key of Object.keys(props.site.links.economies)) {

    const { strong, weak } = props.site.links.economies[key];
    const color = economyColors[key] ?? '#FFF';

    linkRows.push(<tr key={`link${props.site.buildId}${key}`}>
      <td className={cn.br}>
        <div style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }}></div>
        {mapName[key]}
      </td>
      <td className={cn.br} style={{ textAlign: 'center' }}>{getLinkCountSpan(strong)}</td>
      <td style={{ textAlign: 'center' }}>{getLinkCountSpan(weak)}</td>
    </tr>);
  };

  // list of strong linked sites
  const siteRows = props.site.links.strongSites.map(s => <li key={`link${props.site.buildId}${s.buildId}`}><ProjectLink proj={s} noSys noBold /></li>)

  // blocks for the color bars

  return <div>

    <h3 className={cn.h3}>
      Market links:
      {props.showName && <>for: {props.site.buildName}</>}
    </h3>

    <div style={{ margin: '12px 0 4px 0' }}>
      {colorBlocks}
    </div>

    <table className='table-market-links' cellPadding={0} cellSpacing={0}>
      <thead>
        <tr>
          <th className={`${cn.bb} ${cn.br}`}>Economy:</th>
          <th className={`${cn.bb} ${cn.br}`}>Strong:</th>
          <th className={cn.bb}>Weak:</th>
        </tr>
      </thead>
      <tbody>{linkRows}</tbody>
    </table>
    <br />

    {siteRows.length > 0 && <>
      <h3 className={cn.h3}>Strong market links:</h3>
      <ul>{siteRows}</ul>
    </>}

    <div className='small'>
      Market link tracking is a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
      <br />
    </div>
  </div>;
};

const generateColorBlocks = (site: SiteMap, width: number, height: number): JSX.Element[] => {
  if (!site.links) return [];

  let maxLinks = 0
  Object.values(site.links.economies).forEach(l => maxLinks += (l.strong * 62) + (l.weak * 8));
  const blockWidthRatio = width / maxLinks;

  const colorBlocks = [];
  for (const key of Object.keys(site.links.economies)) {
    const { strong, weak } = site.links.economies[key];

    const color = economyColors[key] ?? '#FFF';
    const blockWidth = (((strong * 62) + (weak * 8)) * blockWidthRatio) - 4;

    let title = `${mapName[key]} -`;
    if (strong > 0) { title += ` strong: ${strong}`; }
    if (weak > 0) { title += ` weak: ${weak}`; }


    const block = <div
      key={`cb${key}`}
      title={title}
      style={{
        display: 'inline-block',
        width: blockWidth,
        height: height,
        marginRight: 2,
        backgroundColor: color,
        border: '1px solid rgba(0,0,0,0.3)'
      }}
    />;
    colorBlocks.push(block);
  };

  return colorBlocks;
};


export const MarketLinkBlocks: FunctionComponent<{ site: SiteMap, width: number, height: number; }> = (props) => {
  if (!props.site.links) return null;

  const colorBlocks = generateColorBlocks(props.site, props.width, props.height);

  return <div>
    {colorBlocks}
  </div>
}

export const EconomyBlocks: FunctionComponent<{ economies: Record<string, number>, width: number, height: number; }> = (props) => {

  let maxCount = 0
  Object.values(props.economies).forEach(v => maxCount += v);
  const blockWidthRatio = props.width / maxCount;

  const colorBlocks = [];
  for (const key of Object.keys(props.economies)) {
    const v = props.economies[key];

    const color = economyColors[key] ?? '#FFF';
    const blockWidth = (v * blockWidthRatio) - 4;

    let title = `${mapName[key]}: ${v}`;

    const block = <div
      key={`eb${key}`}
      title={title}
      style={{
        display: 'inline-block',
        width: blockWidth,
        height: props.height,
        marginRight: 2,
        backgroundColor: color,
        border: '1px solid rgba(0,0,0,0.3)'
      }}
    />;
    colorBlocks.push(block);
  };

  return <div style={{ margin: '0' }}>
    {colorBlocks}
  </div>
}
