import { Icon, Link, Panel, PanelType, Spinner, SpinnerSize } from "@fluentui/react";
import { FunctionComponent } from "react";
import { SystemView2 } from "./SystemView2";
import { appTheme } from '../../theme';
import { isMobile } from '../../util';
import { EconomyTable2 } from './EconomyTable2';

export const AuditTestWholeSystem: FunctionComponent<{ sysView: SystemView2; onClose: () => void }> = (props) => {

  var sites = props.sysView.state.sysMap.siteMaps
    .filter(s => !!s.economies)
    .sort((a, b) => a.bodyNum - b.bodyNum);

  const colorYellow = appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod';

  return <>
    <Panel
      isOpen
      isLightDismiss
      className='build-order'
      headerText={`Compare: ${props.sysView.props.systemName}`}
      allowTouchBodyScroll={isMobile()}
      type={isMobile() ? PanelType.medium : PanelType.custom}
      customWidth='1280px'
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={(ev) => props.onClose()}

      onRenderFooterContent={() => {
        return <div className='small'>
          {!!props.sysView.state.useIncomplete && <div style={{ color: colorYellow }}>
            <Icon iconName='Warning' /> Spansh comparison may not match if calculating with incomplete sites
            &nbsp;
          </div>}
          {!props.sysView.state.useIncomplete && <br />}
          <div>
            Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
          </div>
        </div>;
      }}
    >
      {!props.sysView.state.realEconomies?.length && <>
        <Spinner
          size={SpinnerSize.large}
          labelPosition='right'
          label='Loading Spansh data...'
        />

      </>}
      {!!props.sysView.state.realEconomies?.length && <>
        <div style={{ position: 'relative', marginTop: 8, marginBottom: 8, fontSize: 12 }}>
          <div>
            <Icon iconName='LightBulb' /> To update Spansh data - dock at stations with a client that uploads to EDDN
          </div>
          <Link onClick={() => props.sysView.toggleUseIncomplete()} style={{ userSelect: 'none', }}>
            <Icon
              className='icon-inline'
              iconName={props.sysView.state.useIncomplete ? 'TestBeakerSolid' : 'TestBeaker'}
              style={{ marginRight: 4, textDecoration: 'none' }} />
            Toggle calculating with incomplete sites?
          </Link>
        </div>

        <div>
          {sites.map(s => {
            return <>
              <h2 style={{ margin: '20px 0 0 0' }}>{s.name} <span style={{ color: 'grey' }}>- {s.body?.name}</span></h2>
              <div style={{ marginLeft: 40, width: 400 }}>
                <EconomyTable2 site={s} sysView={props.sysView} noTableHeader noDisclaimer noChart />
              </div>
            </>;
          })}
        </div>
      </>}
    </Panel>
  </>;
}
