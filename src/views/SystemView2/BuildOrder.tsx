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
  private mouseInside: boolean = false;

  constructor(props: BuildOrderProps) {
    super(props);

    const map = props.sysMap.siteMaps.reduce((map, site) => {
      map[site.id] = site;
      return map;
    }, {} as Record<string, SiteMap2>);

    this.state = {
      map: map,
      sortedIDs: props.orderIDs,
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
          // if (!dragId) {            this.setState({ dragId: id });          }
          if (ev.buttons > 0 && dragId && id !== dragId) {
            this.shiftRow(dragId, id);
          }
        }}
      // draggable={true}
      // onDragStart={ev => {
      //   ev.dataTransfer.setData('text/plain', id);
      //   ev.dataTransfer.effectAllowed = 'copy';
      //   const img = new Image();
      //   img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=";
      //   ev.dataTransfer.setDragImage(img, 0, 0);
      //   this.setState({ dragId: id });
      // }}
      // onDrop={ev => {
      //   ev.preventDefault();
      //   this.setState({ dragId: undefined });
      // }}
      // onDragOver={ev => {
      //   ev.preventDefault();
      //   // ev.dataTransfer.dropEffect = 'move';
      //   ev.dataTransfer.dropEffect = 'copy';

      //   if (dragId && id !== dragId) {
      //     this.shiftRow(dragId, id);
      //   }
      // }}
      >
        <td className={`cr ${cn.br}`}>{i + 1}</td>

        <td className={`cl`}>

          <span style={{ color: s.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.accent, marginRight: 8 }}>
            <Icon iconName={s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
            &nbsp;
            {s.name}</span>

          <span style={{ fontSize: 12 }}>{getSiteType(s.buildType).displayName2} ({s.buildType})</span>
          {i === 0 && <Icon iconName='CrownSolid' style={{ marginLeft: 8 }} />}
          {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
          {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
          {/* <SiteLink site={s} noSys noBold iconName={s.status === 'complete' ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} /> */}
        </td>

        <td className={`c3 ${cn.br}`}>
          <Stack horizontal>
            {(dragId === id || !dragId) && <Icon
              iconName={dragId === id ? 'GripperBarHorizontal' : 'GripperDotsVertical'}
              style={{ cursor: 'row-resize', }}
            />}
            {/* <IconButton
              className={`btn ${cn.btn}`}
              disabled={i === 0}
              iconProps={{ iconName: 'CaretSolidUp', style: { fontSize: 12 } }}
              style={{ width: 14, height: 14, marginLeft: 4 }}
              onClick={() => {
                const z = sortedIDs[i];
                sortedIDs[i] = sortedIDs[i - 1]
                sortedIDs[i - 1] = z;
                this.setState({ sortedIDs });
              }}
            />
            <IconButton
              className={`btn ${cn.btn}`}
              disabled={i === sortedIDs.length - 1}
              iconProps={{ iconName: 'CaretSolidDown', style: { fontSize: 12 } }}
              style={{ width: 14, height: 14, marginLeft: 4 }}
              onClick={() => {
                const { sortedIDs } = this.state;
                console.log('A', sortedIDs);
                const z = sortedIDs[i];
                sortedIDs[i] = sortedIDs[i + 1]
                sortedIDs[i + 1] = z;
                console.log('B', sortedIDs);
                this.setState({ sortedIDs });
              }}
            /> */}
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