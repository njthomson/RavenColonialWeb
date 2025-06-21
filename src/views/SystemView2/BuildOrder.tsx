import { IconButton, Panel, PanelType } from "@fluentui/react";
import { FunctionComponent } from "react";
import { appTheme, cn } from "../../theme";
import { isMobile } from "../../util";
import { SysMap2 } from "../../system-model2";
import { SiteLink } from "../../components/ProjectLink/ProjectLink";

export const BuildOrder: FunctionComponent<{ sysMap: SysMap2, onClose: () => void }> = (props) => {
  const { siteMaps } = props.sysMap;

  const rows = siteMaps.map((s, i) => <tr key={`bol${s.buildId}`} style={{ backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined }}>
    <td className={`cr ${cn.br}`}>{i + 1}</td>

    <td className={`cl`}>
      <SiteLink site={s} noSys noBold iconName={s.status === 'complete' ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />
    </td>

    <td className={`c3 ${cn.br}`}>
      <IconButton
        className={`btn ${cn.btn}`}
        iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
        style={{ width: 14, height: 14, marginLeft: 4 }}
        onClick={() => {
          if (s.status === 'plan') {
            // this.setState({ editMockSite: { ...s } });
          } else {
            // this.setState({ editRealSite: { ...s }, editFieldHighlight: 'timeCompleted' });
          }
        }}
      />
    </td>

    <td className={`cr ${cn.br}`}>{s.body?.name?.replace(props.sysMap.name, '')}</td>

    {/* <td className={`cr`}>{s.timeCompleted && !s.timeCompleted.startsWith('9999') ? new Date(s.timeCompleted).toLocaleDateString() : <div style={{ textAlign: 'center', color: 'grey' }}>-</div>}</td> */}
    <td className={`cr`}><div style={{ textAlign: 'center', color: 'grey' }}>-</div></td>
  </tr>);
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
      onDismiss={(ev) => {
        // closing  EditProject triggers this - so we'll ignore it if there is a site to be edited
        // if (!this.state.editRealSite && !this.state.editMockSite) {
        props.onClose();
        // }
      }}
    >
      <div style={{ marginBottom: 8, color: appTheme.palette.themeDark }}>
        Calculations are performed on sites ordered by their <b>Date Completed</b> value.
        <br />
        Change these dates to adjust the order of calculations.
      </div>

      <table cellPadding={0} cellSpacing={0}>
        <colgroup>
          <col width='5%' />
          <col width='70%' />
          <col width='5%' />
          <col width='8%' />
          <col width='12%' />
        </colgroup>

        <thead>
          <tr>
            <th className={`cr ${cn.bb} ${cn.br}`}>#</th>
            <th className={`cl ${cn.bb} ${cn.br}`} colSpan={2}>Site</th>
            <th className={`${cn.bb} ${cn.br}`}>Body</th>
            <th className={`${cn.bb}`}>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </Panel>
  </>;
}
