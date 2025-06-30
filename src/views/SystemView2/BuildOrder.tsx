import { DefaultButton, Icon, Panel, PanelType, Stack } from "@fluentui/react";
import { Component, FunctionComponent } from "react";
import { appTheme, cn } from "../../theme";
import { isMobile } from "../../util";
import { SiteMap2, sumTierPoints, SysMap2, TierPoints } from "../../system-model2";
import { getSiteType } from "../../site-data";
import { TierPoint } from "../../components/TierPoints";

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

    const tierPoints = sumTierPoints(props.sysMap.siteMaps, props.useIncomplete);

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
    const tierPoints = sumTierPoints(sortedSiteMaps, this.props.useIncomplete);
    this.setState({ sortedIDs: newSorted, tierPoints });
  }

  render() {
    const { map, sortedIDs, dragId, dragging, tierPoints } = this.state;

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

        <td className={`cl`}>

          <span style={{ color: s.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.accent, marginRight: 8 }}>
            <Icon iconName={s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
            &nbsp;
            {s.name}
          </span>

          <span style={{ fontSize: 12 }}>{getSiteType(s.buildType).displayName2} ({s.buildType})</span>
          {i === 0 && <Icon iconName='CrownSolid' style={{ marginLeft: 8 }} />}
          {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
          {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
        </td>

        <td className={`c3 ${cn.br}`}>
          <Stack horizontal>
            {(dragId === id || !dragId) && <Icon
              iconName={dragId === id ? 'GripperBarHorizontal' : 'GripperDotsVertical'}
              style={{ cursor: 'row-resize', }}
            />}

          </Stack>
        </td>

        <td className={`cr ${cn.br}`}>{s.body?.name?.replace(this.props.sysMap.name, '')}</td>
      </tr>;
    });
    return <>
      <Panel
        isOpen
        isLightDismiss
        className='build-order'
        headerText='Order for calculations:'
        allowTouchBodyScroll={isMobile()}
        type={PanelType.medium}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={(ev) => this.props.onClose(undefined)}
        onRenderFooterContent={() => <div style={{ marginBottom: 10 }}>
          <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 10 }}>
            <BothTierPoints disable={false} tier2={tierPoints.tier2} tier3={tierPoints.tier3} fontSize={24} />

            <DefaultButton
              iconProps={{ iconName: 'Accept' }}
              text='Okay'
              style={{ marginLeft: 100 }}
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

        <table cellPadding={0} cellSpacing={0} style={{ userSelect: 'none', fontSize: 16 }}>
          <colgroup>
            <col width='5%' />
            <col width='70%' />
            <col width='5%' />
            <col width='8%' />
          </colgroup>

          <thead>
            <tr>
              <th className={`cr ${cn.bb} ${cn.br}`}>#</th>
              <th className={`cl ${cn.bb} ${cn.br}`} colSpan={2}>Site</th>
              <th className={`${cn.bb} ${cn.br}`}>Body</th>
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
