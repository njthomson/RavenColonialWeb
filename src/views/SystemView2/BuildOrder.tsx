import { DefaultButton, Icon, mergeStyles, Panel, PanelType, Stack } from "@fluentui/react";
import { Component, CSSProperties, FunctionComponent } from "react";
import { appTheme, cn } from "../../theme";
import { asPosNegTxt, isMobile } from "../../util";
import { SiteMap2, sumTierPoints, SysMap2, TierPoints } from "../../system-model2";
import { getSiteType } from "../../site-data";
import { TierPoint } from "../../components/TierPoints";

const ts = mergeStyles({
  "th": {
    borderBottom: `1px solid ${appTheme.palette.purpleDark}`,
    borderRight: `1px solid ${appTheme.palette.purpleDark}`,
  },
  "td": {
    padding: '0 4px',
  },
  ".cc": {
    textAlign: 'center',
  },
  ".cr": {
    textAlign: 'right',
  },
  ".dc": {
    cursor: 'default',
  }
} as Record<string, CSSProperties>);

interface BuildOrderProps {
  sysMap: SysMap2;
  orderIDs: string[];
  useIncomplete: boolean;
  onClose: (orderIDs: string[] | undefined) => void
};

interface BuildOrderState {
  map: Record<string, SiteMap2>
  sortedIDs: string[];
  dragId?: string;
  dragging: boolean;
  tierPoints: TierPoints;
}

export class BuildOrder extends Component<BuildOrderProps, BuildOrderState> {

  constructor(props: BuildOrderProps) {
    super(props);

    const map = props.sysMap.siteMaps.reduce((m, site) => {
      m[site.id] = site;
      return m;
    }, {} as Record<string, SiteMap2>);

    const tierPoints = sumTierPoints(props.sysMap.siteMaps, true);

    this.state = {
      map: map,
      sortedIDs: [...props.orderIDs],
      dragging: false,
      tierPoints: tierPoints,
    };
  }

  shiftRow(dragId: string, rowId: string) {
    const { sortedIDs, map } = this.state;

    // filter dragging item out of the list, then insert it ahead of the current row (getting idx before filtering, so we can drag it to the very bottom)
    const idx = sortedIDs.indexOf(rowId);
    const newSorted = sortedIDs.filter(id => id !== dragId);
    newSorted.splice(idx, 0, dragId);

    const sortedSiteMaps = newSorted.map(id => map[id]);
    const tierPoints = sumTierPoints(sortedSiteMaps, true);
    this.setState({ sortedIDs: newSorted, tierPoints });
  }

  render() {
    const { map, sortedIDs, dragId, dragging, tierPoints } = this.state;

    const tp: TierPoints = { tier2: 0, tier3: 0 };
    const rows = sortedIDs.map((id, i) => {
      const s = map[id];
      let backgroundColor = i % 2 ? appTheme.palette.neutralLighter : undefined;
      if (dragId === id) {
        backgroundColor = appTheme.palette.blackTranslucent40;
      }
      return <tr
        key={`bol${id}${i}`}
        style={{
          backgroundColor: backgroundColor,
          cursor: 'row-resize',
        }}
        onMouseOver={ev => {
          ev.preventDefault();
          if (!dragging) { this.setState({ dragId: id }); }
        }}
        onMouseDown={ev => {
          ev.preventDefault();
          this.setState({ dragging: true, dragId: id });
        }}
        onMouseUp={ev => {
          ev.preventDefault();
          this.setState({ dragging: false, dragId: undefined });
        }}
        onMouseEnter={ev => {
          ev.preventDefault();
          if (ev.buttons > 0 && dragId && id !== dragId) {
            this.shiftRow(dragId, id);
          }
        }}
      >
        <td className={`cr ${cn.br}`}>{i + 1}</td>

        <td>
          <span style={{ color: s.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.accent, marginRight: 8 }}>
            <Icon iconName={s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
            &nbsp;
            {s.name}
          </span>

          <span style={{ fontSize: 12 }}>{getSiteType(s.buildType, true)?.displayName2} ({s.buildType})</span>
          {i === 0 && <Icon iconName='CrownSolid' style={{ marginLeft: 8 }} />}
          {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
          {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
        </td>

        <td className={`${cn.br}`}>
          <Stack horizontal>
            {(dragId === id || !dragId) && <Icon
              iconName={dragId === id ? 'GripperBarHorizontal' : 'GripperDotsVertical'}
              style={{ cursor: 'row-resize', }}
            />}

          </Stack>
        </td>
        <td className={`cc dc ${cn.br}`}>{getTierPointsDelta(s, 2, tp, i === 0)}</td>
        <td className={`cc dc ${cn.br}`}>{getTierPointsDelta(s, 3, tp, i === 0)}</td>
        <td className='cr'>{s.body?.name?.replace(this.props.sysMap.name, '')}</td>
      </tr>;
    });

    // and add a totals row
    rows.push(<tr style={{ fontSize: 16 }}>
      <td className={cn.bt} />
      <td className={`${cn.bt} ${cn.br}`} style={{ textAlign: 'right' }} colSpan={2}>Total points:</td>
      <td className={`cc ${cn.bt} ${cn.br}`} style={{ fontWeight: 'bold', color: tierPoints.tier2 < 0 ? appTheme.palette.red : appTheme.palette.greenLight }}>
        {asPosNegTxt(tierPoints.tier2)}
      </td>
      <td className={`cc ${cn.bt} ${cn.br}`} style={{ fontWeight: 'bold', color: tierPoints.tier3 < 0 ? appTheme.palette.red : appTheme.palette.greenLight }}>
        {asPosNegTxt(tierPoints.tier3)}
      </td>
      <td className={cn.bt} />
    </tr>);

    return <>
      <Panel
        isOpen
        isLightDismiss

        headerText='Order for calculations:'
        allowTouchBodyScroll={isMobile()}
        type={PanelType.custom}
        customWidth='800px'
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={(ev) => this.props.onClose(undefined)}
        onRenderFooterContent={() => <div style={{ marginBottom: 10 }}>
          <Stack horizontal horizontalAlign='end' verticalAlign='center' tokens={{ childrenGap: 10 }}>

            <div style={{ fontSize: 16, color: appTheme.semanticColors.disabledBodyText }}>
              <Icon className='icon-inline' style={{ color: appTheme.palette.yellowDark, marginRight: 4 }} iconName='Warning' />
              Including all sites in tier points calculations
            </div>

            <DefaultButton
              iconProps={{ iconName: 'Accept' }}
              text='Okay'
              style={{ marginLeft: 40 }}
              onClick={() => this.props.onClose(this.state.sortedIDs)}
            />
            <DefaultButton
              iconProps={{ iconName: 'Cancel' }}
              text='Cancel'
              onClick={() => this.props.onClose(undefined)}
            />
          </Stack>
        </div>}
      >
        <div style={{ marginBottom: 8, color: appTheme.palette.themeDark }}>
          Calculations are performed on sites in the following order.
          <br />
          Drag rows up and down to adjust the order.
        </div>

        <table className={ts} cellPadding={0} cellSpacing={0} style={{ userSelect: 'none', fontSize: 14, width: '100%' }}>
          <colgroup>
            <col width='30px' />
            <col width='auto' />
            <col width='30px' />
            <col width='36px' />
            <col width='36px' />
            <col width='50px' />
          </colgroup>

          <thead>
            <tr style={{ fontSize: 16 }}>
              <th >#</th>
              <th colSpan={2} style={{ textAlign: 'left', paddingLeft: 24 }}>Site</th>
              <th title='Tier 2 points'><Icon className="icon-inline" iconName='Product' style={{ color: appTheme.palette.yellow, fontSize: 24 }} /></th>
              <th title='Tier 3 points'><Icon className="icon-inline" iconName='ProductVariant' style={{ color: appTheme.palette.green, fontSize: 24 }} /></th>
              <th style={{ borderRight: 'unset' }}>Body</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </Panel>
    </>;
  }
}

export const BothTierPoints: FunctionComponent<{ tier2: number; tier3: number; disable: boolean; fontSize: number; }> = (props) => {
  return <div
    style={{
      marginLeft: 10,
      color: props.disable ? 'grey' : undefined,
      fontSize: props.fontSize
    }}>
    <span style={{ width: 20 }} />
    <span
      className='bubble'
      style={props.tier2 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
    >
      <TierPoint tier={2} count={props.tier2} disabled={props.disable} />
    </span>
    <span style={{ width: 4 }} />
    <span
      className='bubble'
      style={props.tier3 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
    >
      <TierPoint tier={3} count={props.tier3} disabled={props.disable} />
    </span>
  </div>;
}

const getTierPointsDelta = (s: SiteMap2, tier: number, tp: TierPoints, first: boolean) => {
  let p = 0;

  let taxed = false;
  if (s.type.needs.tier === tier && !first) {
    taxed = s.calcNeeds?.count !== s.type.needs.count;
    p = -(s.calcNeeds?.count ?? s.type.needs.count);
  } else if (s.type.gives.tier === tier) {
    p = s.type.gives.count;
  }

  let title = '';
  let deficit = false;
  if (tier === 2) {
    tp.tier2 += p;
    title = `Current total: ${tp.tier2}\n`;
    deficit = p < 0 && tp.tier2 < 0;
  } else {
    tp.tier3 += p;
    title = `Current total: ${tp.tier3}\n`;
    deficit = p < 0 && tp.tier3 < 0;
  }

  // exit early if nothing to render
  if (!p) { return null; }

  const style = {} as CSSProperties;
  if (taxed) {
    title = 'Points tax applied.'
    style.color = appTheme.palette.yellow;
    style.fontWeight = 'bold';
  }
  if (deficit) {
    if (taxed) { title += '\n'; }
    const d = tier === 2 ? tp.tier2 : tp.tier3;
    title += `Insufficient points.\nNeed ${asPosNegTxt(-d)} Tier ${tier} points`;
    style.color = appTheme.palette.red;
    style.fontWeight = 'bold';
  }

  return <span style={style} title={title}>{asPosNegTxt(p)}</span>;
}