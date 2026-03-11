import * as api from '../../api';
import rcc32 from '../../assets/rcc-32.png';
import { CSSProperties, FunctionComponent, useState } from "react";
import { SiteMap2, SysMap2 } from "../../system-model2";
import { ActionButton, Icon, IconButton, mergeStyles, Panel, PanelType, Spinner, SpinnerSize, Stack } from "@fluentui/react";
import { appTheme, cn } from "../../theme";
import { isMobile } from "../../util";
import { getSiteType } from "../../site-data";
import { HaulSize } from '../../components/BigSiteTable/BigSiteTable';
import { getAvgHaulCosts } from '../../avg-haul-costs';


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
} as Record<string, CSSProperties>);


export const TotalHauled: FunctionComponent<{ sysMap: SysMap2 }> = (props) => {
  const [showPanel, setShowPanel] = useState(false);
  const [loadCmdrs, setLoadCmdrs] = useState(false);
  const [cmdrRows, setCmdrRows] = useState<JSX.Element[] | undefined>(undefined);
  const [freeDodec, setFreeDodec] = useState('')

  const completedSites = props.sysMap.siteMaps.filter(s => s.status === 'complete' || s.status === 'demolish');
  const haulMap: Record<string, number> = {};
  let approxHauled = 0;
  // calc total hauled amount, mindful of free-dodecs and primary-port increases
  for (const s of completedSites) {
    let total = 0;
    if (s.id !== freeDodec) {
      const haulCost = getAvgHaulCosts(s.id === props.sysMap.primaryPortId ? `${s.buildType} (primary)` : s.buildType);
      total = Object.values(haulCost).reduce((sum, val) => sum += val, 0);
    }

    haulMap[s.id] = total;
    approxHauled += total;
  }

  // prep rows for each site
  let rows = [<div />];
  if (showPanel) {
    let runningTotal = 0;
    rows = !showPanel ? [] : completedSites.map((s, i) => {
      const siteHaul = haulMap[s.id];
      runningTotal += siteHaul;

      const backgroundColor = i % 2 ? appTheme.palette.neutralLighter : undefined;

      const key = `thl${s.id.substring(1)}${i}`;
      const demolished = s.status === 'demolish';
      const isCutOff = !props.sysMap.calcIds?.includes(s.id) || demolished;
      const isDodec = s.buildType === 'dodec' || s.buildType === 'quint_truss' || s.buildType === 'dec_truss';

      return <tr
        key={key}
        style={{
          backgroundColor: backgroundColor,
          color: isCutOff ? 'grey' : undefined,
        }}
      >
        <td className={`cr ${cn.br}`} style={{}}>
          <div>{i + 1}</div>
        </td>

        <td style={{ position: 'relative' }}>
          <span style={{ color: isCutOff ? 'grey' : s.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.accent, marginRight: 8 }}>
            <Icon iconName={s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} style={{ color: isCutOff ? 'grey' : undefined }} />
            &nbsp;
            {s.name}
          </span>

          <span style={{ fontSize: 12 }}>{getSiteType(s.buildType, true)?.displayName2} ({s.buildType})</span>
          {isDodec && <input type='checkbox' checked={freeDodec !== s.id} onChange={() => setFreeDodec(freeDodec === s.id ? '' : s.id)} title='Uncheck if this was a free dodec' />}
          {i === 0 && <Icon iconName='CrownSolid' style={{ marginLeft: 8 }} title='Primary port' />}
          {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
          {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
          {demolished && <Icon iconName='Broom' style={{ marginLeft: 4, textDecorationLine: 'unset' }} className='icon-inline' title='Demolished' />}
        </td>

        <td className={`${cn.br}`}>
          {s.buildId && <IconButton
            iconProps={{ imageProps: { src: rcc32, width: 16, height: 16 } }}
            title='Open project page'
            className={cn.bBox}
            style={{ width: 24, height: 24 }}
            href={`${window.location.origin}/#build=${s.buildId}`}
            target='build'
          />}
        </td>

        <td className={`cr ${cn.br}`}>{s.body?.name?.replace(props.sysMap.name, '')}</td>

        <td className={`cr ${cn.br}`}>
          <Stack horizontal verticalAlign='center' horizontalAlign='end'>
            <div>{siteHaul.toLocaleString()}</div>
            <HaulSize haul={siteHaul} size={1} />
          </Stack>
        </td>
        <td className={`cr`}>
          {runningTotal.toLocaleString()}
        </td>

      </tr>;
    });

    // and add a totals row
    rows.push(<tr key='bol-totals' style={{ fontSize: 16 }}>
      <td className={cn.bt} />
      <td className={cn.bt} />
      <td className={cn.bt} />
      <td className={`${cn.bt} ${cn.br}`} style={{ textAlign: 'right', color: 'grey' }} colSpan={2}>Total hauled:</td>
      <td className={`cc ${cn.bt}`}>
        {runningTotal.toLocaleString()}
      </td>
    </tr>);
  }

  const hasCmdrRows = !!cmdrRows?.length;
  return <>
    <div>
      <Stack horizontal verticalAlign='center'>
        <HaulSize haul={approxHauled} />
        <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: 'DeliveryTruck' }}
          text={`~${approxHauled.toLocaleString()} units`}
          style={{ height: 24 }}
          title='Based on fixed costs for completed sites'
          onClick={() => setShowPanel(true)}
        />
      </Stack>
    </div>

    {showPanel && <>
      <Panel
        isOpen
        isLightDismiss
        headerText='Total hauled:'
        allowTouchBodyScroll={isMobile()}
        type={PanelType.custom}
        customWidth='800px'
        styles={{
          header: { textTransform: 'capitalize' },
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => setShowPanel(false)}
      >

        <div style={{
          color: appTheme.palette.themeSecondary,
          marginBottom: 4,
          fontSize: 12,
        }}>
          Based on fixed costs of completed sites:
        </div>

        <table className={ts} cellPadding={0} cellSpacing={0} style={{ userSelect: 'none', fontSize: 14, width: '100%' }}>
          <colgroup>
            <col width='40px' />
            <col width='auto' />
            <col width='30px' />
            <col width='max-content' />
            <col width='auto' />
            <col width='auto' />
          </colgroup>

          <thead>
            <tr style={{ fontSize: 16 }}>
              <th >#</th>
              <th colSpan={2} style={{ textAlign: 'left', paddingLeft: 24 }}>Site</th>
              <th>Body</th>
              <th>Haul</th>
              <th style={{ borderRight: 'unset' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>

        <div>
          {!hasCmdrRows && !loadCmdrs && <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'DeliveryTruck' }}
            text={'Show Commanders stats'}
            style={{ height: 24 }}
            title='Show totals per Commander from tracked projects'
            onClick={() => {
              setLoadCmdrs(true);
              fetchCmdrStats(completedSites)
                .then(x => {
                  setCmdrRows(x);
                  setLoadCmdrs(false);
                });
            }}
          />}

          <div>
            {loadCmdrs && <div style={{ width: 100 }}>
              <Spinner size={SpinnerSize.medium} labelPosition={'right'} label='Loading ...' />
            </div>}

            {hasCmdrRows && <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'max-content max-content',
                  gap: '0px 4px',
                  fontSize: '14px',
                  textTransform: 'capitalize',
                }}
              >

                <h3>Commander</h3>
                <h3 style={{ paddingLeft: 10 }}>Hauled</h3>
                {cmdrRows}
              </div>
            </>}
          </div>

          <div style={{ color: appTheme.palette.themeSecondary, fontSize: 12, marginTop: 4 }}>
            Based on stats tracked from Raven Colonial Build Projects
          </div>
        </div>

      </Panel>
    </>
    }

  </>;
}

const fetchCmdrStats = async (sites: SiteMap2[]) => {
  const buildIds = sites.filter(s => !!s.buildId).map(s => s.buildId);
  if (buildIds.length === 0) { return []; }

  console.debug(`Fetch Cmdr contributions for: ${buildIds}`);
  const stats = await api.project.getManyStats(buildIds);
  const newCmdrStats: Record<string, number> = {};
  for (const x of stats) {
    for (let cmdr in x.cmdrs) {
      const cmdrL = cmdr.toLocaleLowerCase();
      const v = newCmdrStats[cmdrL] ?? 0;
      newCmdrStats[cmdrL] = v + x.cmdrs[cmdr];
    }
  }

  // order by most delivered
  const cmdrRows: JSX.Element[] = [];
  Object.entries(newCmdrStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(x => {
      cmdrRows.push(
        <div key={`thc${x[0]}-a`}>{x[0]}:</div>,
        <div key={`thc${x[0]}-b`} style={{ textAlign: 'right' }}>
          <Stack horizontal verticalAlign='center' horizontalAlign='end'>
            <div>{x[1].toLocaleString()}</div>
            <HaulSize haul={x[1]} size={1} />
          </Stack>
        </div>
      );
    });

  return cmdrRows;
}