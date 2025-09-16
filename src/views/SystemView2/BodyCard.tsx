import { Callout, DirectionalHint, Icon, IconButton, mergeStyles, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { SystemView2 } from "./SystemView2";
import { Bod } from "../../types2";
import { BodyFeature, mapBodyFeature } from "../../types";
import { mapBodyFeatureColor, mapBodyFeatureIcon } from "./SitesBodyView";
import { ViewEditSlotCount } from "./ViewEditSlotCount";
import { AuditEconomy, BodyMap2, EconomyMap, SiteMap2 } from "../../system-model2";
import { applyBodyType, applyBuffs, applyStrongLinkBoost } from "../../economy-model2";
import { Economy, getSiteType, mapName } from "../../site-data";
import { asPosNegTxt2 } from "../../util";
import { store } from "../../local-storage";

const cbt = mergeStyles({
  color: appTheme.semanticColors.bodyText
});

const borderLeft = '1px solid ' + appTheme.palette.purpleDark;
const thd = mergeStyles({
  padding: 4,
  textAlign: 'center',
});
const col1 = mergeStyles({
  padding: '4px 8px',
  textAlign: 'center',
  verticalAlign: 'top',
});
const col2 = mergeStyles({
  padding: '4px 0 4px 4px',
  textAlign: 'right',
  verticalAlign: 'top',
  borderLeft,
});
const col3 = mergeStyles({
  padding: 4,
  textAlign: 'left',
  verticalAlign: 'top',
});
const col4 = mergeStyles({
  padding: 4,
  textAlign: 'left',
  verticalAlign: 'top',
  borderLeft,
});
const col4b = mergeStyles({
  paddingBottom: 6
});


const calcForBody = (bod: Bod | BodyMap2, sysView: SystemView2) => {

  const mapColony = { agriculture: 0, extraction: 0, hightech: 0, industrial: 0, military: 0, refinery: 0, terraforming: 0, tourism: 0, service: 0, } as EconomyMap;
  const site: SiteMap2 = {
    buildType: 'no_truss',
    type: getSiteType('no_truss')!,
    status: 'complete',
    bodyNum: bod.num,
    body: bod as BodyMap2,
    sys: sysView.state.sysMap,
    id: '', buildId: '', name: '', original: undefined!, economyAudit: [],
  };
  // run economy calculations as if it were a Coriolis
  applyBodyType(mapColony, site);
  applyBuffs(mapColony, site, false, false);
  const auditColony = site.economyAudit!.sort((a, b) => a.inf.localeCompare(b.inf));

  site.economyAudit = [];
  const mapLinks = { agriculture: 0, extraction: 0, hightech: 0, industrial: 0, military: 0, refinery: 0, terraforming: 0, tourism: 0, service: 0, } as EconomyMap;
  for (const econ in mapColony) {
    applyStrongLinkBoost(econ as Economy, mapLinks, site, '');
  }

  // and trim initial "+ boost: "
  const auditLinks = site.economyAudit;
  for (const a of auditLinks) { a.reason = a.reason.substring(10); }

  return { mapColony, auditColony, mapLinks, auditLinks };
};


const getEconomyTable = (map: EconomyMap, audit: AuditEconomy[], sumValues: boolean) => {
  const colonyRows: JSX.Element[] = [];
  let nn = 1;
  for (const econ in map) {
    const val = map[econ as keyof EconomyMap];
    if (val === 0) { continue; }

    colonyRows.push(<tr key={`cr-er-${++nn}`}><td className={cn.bt} colSpan={4} /><td /></tr>);

    const subAudit = audit.filter(a => a.inf === econ);
    for (let i = 0; i < subAudit.length; i++) {
      const d = subAudit[i];
      const isLast = i === subAudit.length - 1;
      colonyRows.push(<tr key={`cr-er-${++nn}`}>
        <td className={`${col1} ${isLast ? col4b : ''}`} >{i === 0 ? mapName[econ] : ''}</td>
        <td className={`${col2}`}>{asPosNegTxt2(d.delta)}</td>
        <td className={`${col3}`}>{sumValues && isLast && ` = ${val.toFixed(2)}`}</td>
        <td className={`${col4} ${isLast ? col4b : ''}`}>{d.reason}</td>
      </tr>);
    }
  }

  // add a blank row with empty cells at the end
  colonyRows.push(<tr key={`cr-er-${++nn}`}><td className={`${col1}`} /><td className={`${col2}`} /><td className={`${col3}`} /><td className={`${col4}`} /></tr>);

  return <>
    <table cellPadding={0} cellSpacing={0} style={{ fontSize: 11, lineHeight: '8px' }}>
      <thead>
        <tr style={{ width: 70, fontSize: 10, textAlign: 'center', padding: 4 }}>
          <th className={thd}>Economy</th>
          <th className={thd} style={{ borderLeft }} colSpan={2}>Value</th>
          <th className={thd} style={{ borderLeft }}>Effects</th>
        </tr>
      </thead>
      <tbody style={{ color: appTheme.semanticColors.bodyText }}>
        {colonyRows}
      </tbody>
    </table>
  </>;
};

export const BodyCard: FunctionComponent<{ targetId: string, bod: Bod | BodyMap2, sysView: SystemView2, onClose: () => void }> = (props) => {
  const { bod, sysView } = props;
  const bodySlots = sysView.state.sysMap.slots[bod.num] ?? [-1, -1];
  const isLandable = bod.features.includes(BodyFeature.landable);
  const [data] = useState(calcForBody(bod, sysView));

  return <div>
    <Callout
      target={`#${props.targetId}`}
      setInitialFocus
      alignTargetEdge
      directionalHint={DirectionalHint.rightTopEdge}
      gapSpace={-8}
      style={{
        border: '1px solid ' + appTheme.palette.themePrimary,
        padding: 0,
      }}
      styles={{
        beak: { backgroundColor: appTheme.palette.themePrimary },
        calloutMain: {
          boxShadow: `${appTheme.palette.blackTranslucent40} -1px 0px 20px 10px`,
        }
      }}
      role="dialog"
      onDismiss={() => props.onClose()}
    >
      <div className='system-view2' style={{ position: 'relative', padding: 10, textTransform: 'capitalize' }}>

        <h3 className={cn.h3} style={{ fontSize: 20 }}>{bod.name}</h3>

        <div style={{ color: appTheme.palette.themePrimary }}>
          {!!store.cmdrName && <IconButton
            className={cn.ibBri}
            iconProps={{ iconName: 'CircleAddition' }}
            title={`Add a new site to: ${bod.name}`}
            style={{ position: 'absolute', right: 20, top: 42, paddingTop: 2 }}
            onClick={() => {
              sysView.createNewSite(bod.num);
            }}
          />}

          <div>{bod.subType} <span style={{ color: 'grey' }}>-</span> Arrival: ~{bod.distLS.toFixed(1)} ls</div>

          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }} style={{ marginTop: 10 }}>
            <div>Slots:</div>

            <div><ViewEditSlotCount
              showIcon bright
              max={bodySlots[0]}
              current={0}
              isOrbital={true}
              onChange={newCount => sysView.setBodySlot(bod.num, newCount, true)}
            /></div>

            {isLandable && <div><ViewEditSlotCount
              showIcon bright
              max={bodySlots[1]}
              current={0}
              isOrbital={false}
              onChange={newCount => sysView.setBodySlot(bod.num, newCount, false)}
            /></div>}
          </Stack>


          {bod.features.length > 0 && <Stack horizontal wrap tokens={{ childrenGap: '0 8px' }} style={{ marginTop: 10 }}>
            <div>Features:</div>
            <Stack className={cbt} horizontal wrap verticalAlign='center' tokens={{ childrenGap: '0 8px' }} style={{ maxWidth: 300 }}>

              {bod.features.map(f => <div key={f} style={{ marginLeft: 4 }}>
                <Icon
                  className='icon-inline'
                  key={`bfi-${bod.num}${f}`}
                  title={mapBodyFeature[f]}
                  iconName={mapBodyFeatureIcon[f]}
                  style={{ color: mapBodyFeatureColor[f].slice(0, -1) + ', 0.8)' }}
                />
                <span>&nbsp;{mapBodyFeature[f]}</span>
              </div>)}
            </Stack>
          </Stack>}


          <div style={{ marginTop: 10, textTransform: 'none' }}>
            <div>Default Economies:</div>
            <div style={{ color: appTheme.palette.themeTertiary, fontSize: 10 }}>
              Ports with a colony economy will start with the following:
            </div>
            {getEconomyTable(data.mapColony, data.auditColony, true)}
          </div>


          <div style={{ marginTop: 10, textTransform: 'none' }}>
            <div>Strong link boosts:</div>
            <div style={{ color: appTheme.palette.themeTertiary, fontSize: 10 }}>
              Each strong link will receive the following boosts:
            </div>
            {getEconomyTable(data.mapLinks, data.auditLinks, false)}
          </div>


        </div>
      </div>
    </Callout >
  </div >;
}
