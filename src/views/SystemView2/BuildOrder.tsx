import { DefaultButton, Icon, Panel, PanelType, Stack } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../../theme";
import { isMobile } from "../../util";
import { SiteMap2, SysMap2 } from "../../system-model2";
import { getSiteType } from "../../site-data";

interface BuildOrderProps {
  sysMap: SysMap2;
  orderIDs: string[];
  onClose: (orderIDs: string[] | undefined) => void
};

interface BuildOrderState {
  map: Record<string, SiteMap2>
  sortedIDs: string[];
  dragId?: string;
  dragging: boolean;
}

export class BuildOrder extends Component<BuildOrderProps, BuildOrderState> {

  constructor(props: BuildOrderProps) {
    super(props);

    const map = props.sysMap.siteMaps.reduce((m, site) => {
      m[site.id] = site;
      return m;
    }, {} as Record<string, SiteMap2>);

    this.state = {
      map: map,
      sortedIDs: [...props.orderIDs],
      dragging: false,
    };
  }

  shiftRow(id1: string, id2: string) {
    const { sortedIDs } = this.state;
    const i1 = sortedIDs.indexOf(id1);
    const i2 = sortedIDs.indexOf(id2);

    const z = sortedIDs[i1];
    sortedIDs[i1] = sortedIDs[i2]
    sortedIDs[i2] = z;
    this.setState({ sortedIDs });
  }

  render() {
    const { map, sortedIDs, dragId, dragging } = this.state;

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
            <DefaultButton
              iconProps={{ iconName: 'Accept' }}
              text='Okay'
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