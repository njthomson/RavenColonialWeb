import './MarketLinks.css';
import { FunctionComponent } from "react";
import { appTheme, cn } from "../../theme";
import { economyColors, mapName } from "../../site-data";
import { SiteMap } from "../../system-model";
import { ProjectLink } from "../ProjectLink/ProjectLink";
import { SiteMap2 } from '../../system-model2';
import { SystemView2 } from '../../views/SystemView2/SystemView2';
import { SiteLink } from '../../views/SystemView2/SiteLink';
import { Icon, Stack } from '@fluentui/react';

export const MarketLinks: FunctionComponent<{ site: SiteMap, showName?: boolean, sysView?: SystemView2 }> = (props) => {
  if (!props.site) return null;

  // exit early if this port does not have links
  if (!props.site.links) {
    return <div>
      <h3 className={cn.h3}>Market links:</h3>
      {props.site.parentLink && <span>Contributes to: <ProjectLink proj={props.site.parentLink} noSys /></span>}
      {!props.site.parentLink && <span style={{ fontSize: 12 }}>{props.site.buildName} does not receive market links</span>}
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
  const blockHeight = 14;
  const colorBlocks = generateColorBlocks(props.site, 370, blockHeight);

  // table rows for strong/weak links
  const linkRows = [];
  for (const key of Object.keys(props.site.links.economies)) {

    const { strong, weak } = props.site.links.economies[key];
    const color = economyColors[key] ?? '#FFF';

    linkRows.push(<tr key={`link${props.site.buildId}-${key}`}>
      <td className={cn.br}>
        <div style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, backgroundColor: color, border: '1px solid rgba(0,0,0,0.3)' }}></div>
        {mapName[key]}
      </td>
      <td className={cn.br} style={{ textAlign: 'center' }}>{getLinkCountSpan(strong)}</td>
      <td style={{ textAlign: 'center' }}>{getLinkCountSpan(weak)}</td>
    </tr>);
  };

  // TODO: Split this component into 2?
  // list of strong linked sites
  const siteRows = props.site.links.strongSites.map(s => {
    return <div key={`link${props.site.buildId}-${s.buildId ?? (s as any).id}`} style={{ marginLeft: 8 }}>
      {!props.sysView && <ProjectLink proj={s} noSys noBold />}
      {props.sysView && <SiteLink prefix='ml' site={s as any as SiteMap2} sysView={props.sysView} siteGraphType='none' noPin />}
    </div>;
  });

  return <div>

    <h3 id='market-links' className={cn.h3} style={{ cursor: props.showName ? 'move' : undefined }}>
      {!props.showName && <>Market links:</>}
      {props.showName && <>Market links for: {props.site.buildName}</>}
    </h3>

    <Stack horizontal verticalAlign='center' style={{ position: 'relative' }}>
      <Icon iconName='Link12' style={{ marginRight: 4, color: appTheme.palette.themeTertiary, position: 'relative', top: 1 }} />
      <div style={{ position: 'relative', margin: '4px 0 2px 0', lineHeight: `${blockHeight}px` }}>
        {colorBlocks}
      </div>
    </Stack>

    <table className='table-market-links' cellPadding={0} cellSpacing={0} style={{ fontSize: 14 }}>
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
      <div style={{ marginBottom: 12, fontSize: 14 }}>
        {siteRows}
      </div>
    </>}

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

  return <div style={{ position: 'relative', lineHeight: `${props.height}px`, minWidth: props.width + 4 }}>
    {colorBlocks}
  </div>
}

export const EconomyBlocks: FunctionComponent<{ economies: Record<string, number>, width: number, height: number; }> = (props) => {

  let maxCount = 0
  Object.values(props.economies).forEach(v => maxCount += v);
  const blockWidthRatio = props.width / maxCount;

  // sort largest first
  const sorted = Object.keys(props.economies).sort((a, b) => props.economies[b] - props.economies[a]);

  const colorBlocks = [];
  for (const key of sorted) {
    const v = props.economies[key];
    if (v === 0) continue;

    const color = economyColors[key] ?? '#FFF';
    const blockWidth = (v * blockWidthRatio) - 4;

    let title = `${mapName[key]}: ${(v * 100).toFixed()}%`;

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

  return <div style={{ position: 'relative', lineHeight: `${props.height}px`, minWidth: props.width + 4 }}>
    {colorBlocks}
  </div>
}
