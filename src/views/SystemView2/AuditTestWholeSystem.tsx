import { Icon, Link, Panel, PanelType, Spinner, SpinnerSize, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { SystemView2 } from "./SystemView2";
import { appTheme } from '../../theme';
import { isMobile } from '../../util';
import { EconomyTable2 } from './EconomyTable2';
import { EconomyMap } from "../../system-model2";

export const AuditTestWholeSystem: FunctionComponent<{ sysView: SystemView2; onClose: () => void }> = (props) => {
  const [onlyProblems, setOnlyProblems] = useState(window.location.hostname.includes('localhost'));
  const loadingRealEconomies = !props.sysView.state.realEconomies?.length;

  var sites = props.sysView.state.sysMap.siteMaps
    .filter(s => !!s.economies)
    .sort((a, b) => a.bodyNum - b.bodyNum);

  const colorYellow = appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod';
  const { sysMap, realEconomies } = props.sysView.state;

  // find sites where predicted economies do not match Spansh
  const nonMatchingSites = !loadingRealEconomies && sysMap.siteMaps.filter(site => {
    // skip sites without economies
    if (!site.economies) { return false; }

    // skip sites without matching Spansh data
    const realEconomy = realEconomies?.find(r => r.id === site?.id)?.economies;
    if (!realEconomy) { return false; }

    // does any economy not match?
    const keys = Array.from(new Set([...Object.keys(site.economies), ...Object.keys(realEconomy)])) as (keyof EconomyMap)[];
    return keys.some(key => {
      const estimate = Math.round((site.economies![key] ?? 0) * 100);
      const real = realEconomy[key] ?? 0
      return estimate !== real;
    });
  });

  return <>
    <Panel
      isOpen
      isLightDismiss
      className='build-order'
      headerText={`Compare: ${props.sysView.state.systemName}`}
      allowTouchBodyScroll={isMobile()}
      type={isMobile() ? PanelType.medium : PanelType.custom}
      customWidth='1280px'
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={(ev) => props.onClose()}

      onRenderFooterContent={() => {
        return <div className='small'>
          {!props.sysView.state.useIncomplete && <br />}
          {!!props.sysView.state.useIncomplete && <div style={{ color: colorYellow }}>
            <Icon iconName='Warning' /> Spansh comparison may not match if calculating with incomplete sites
            &nbsp;
          </div>}

          <div>
            <Link onClick={() => props.sysView.toggleUseIncomplete()} style={{ userSelect: 'none', }}>
              <Icon
                className='icon-inline'
                iconName={props.sysView.state.useIncomplete ? 'TestBeakerSolid' : 'TestBeaker'}
                style={{ marginRight: 4, textDecoration: 'none' }} />
              Toggle calculating with incomplete sites?
            </Link>
          </div>

          <div>
            Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
          </div>
        </div>;
      }}
    >
      {loadingRealEconomies && <Stack horizontal>
        <Spinner
          size={SpinnerSize.large}
          labelPosition='right'
          label='Loading Spansh data...'
        />
      </Stack>}

      {!loadingRealEconomies && <>
        <div style={{ position: 'relative', marginTop: 8, marginBottom: 8, fontSize: 12 }}>

          <div>
            <span>
              <Icon iconName='LightBulb' /> To update Spansh data - dock at stations with a client that uploads to EDDN
            </span>
            <Link onClick={() => setOnlyProblems(!onlyProblems)} style={{ marginLeft: 4, userSelect: 'none', fontSize: 12 }}>
              <Icon
                className='icon-inline'
                iconName={onlyProblems ? 'CircleStopSolid' : 'SkypeCircleCheck'}
                style={{ marginRight: 4, textDecoration: 'none' }} />
              {onlyProblems ? 'Problem sites' : 'All sites'}
            </Link>
          </div>

          {nonMatchingSites && nonMatchingSites.length === 0 && <Stack horizontal verticalAlign='center' style={{ fontSize: onlyProblems ? 18 : 12, marginTop: onlyProblems ? 20 : undefined }}>
            <Icon iconName='SkypeCircleCheck' style={{ color: appTheme.palette.greenLight, marginRight: 8, fontSize: onlyProblems ? 18 : undefined }} />
            <span>All site economies match Spansh data</span>
          </Stack>}

        </div>

        <div>
          {sites.map(s => {
            // skip if we should hide non-problem sites
            if (onlyProblems && nonMatchingSites && !nonMatchingSites.includes(s)) {
              return null;
            }

            return <div key={`atws-s-${s.id.slice(1)}`}>
              <h2 style={{ margin: '20px 0 0 0' }}>{s.name} <span style={{ color: 'grey' }}>- {s.body?.name}</span></h2>
              <div style={{ marginLeft: 40, width: 400 }}>
                <EconomyTable2 site={s} sysView={props.sysView} noTableHeader noDisclaimer noChart />
              </div>
            </div>;
          })}
        </div>
      </>}
    </Panel>
  </>;
}
