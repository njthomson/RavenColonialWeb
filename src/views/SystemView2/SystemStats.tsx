import { FunctionComponent } from "react";
import { Chevrons } from "../../components/Chevrons";
import { TierPoint } from "../../components/TierPoints";
import { mapName, sysEffects, SysEffects } from "../../site-data";
import { SysMap2 } from "../../system-model2";
import { asPosNegTxt } from "../../util";
import { appTheme } from "../../theme";
import { HaulList } from "./HaulList";
import { ProjectLink2 } from "./ProjectLink2";
import { SystemView2 } from "./SystemView2";
import { SysPop } from "./SysPop";
import { Icon } from "@fluentui/react";

// //cargoTypes["Asteroid Starport"].items.
// // const cargoTypes2 = cargoTypes as Record<string, any>;
// const foo = Object.entries(cargoTypes).reduce((map, [k, v]) => {
//   map[k] = {};
//   for (const [x, y] of Object.entries(v.items)) {
//     map[k][x] = y.avg;
//   }
//   return map;
// }, {} as Record<string, Record<string, number>>);
// console.log(JSON.stringify(foo));

export const SystemStats: FunctionComponent<{ sysMap: SysMap2, useIncomplete: boolean; sysView: SystemView2 }> = (props) => {
  const { sysMap } = props;

  const buildTypes = sysMap.siteMaps
    .filter(s => s.status === 'plan')
    .reduce((list, s) => ([...list, s.buildType]), [] as string[]);

  const activeBuilds = sysMap.siteMaps
    .filter(s => s.status === 'build' && s.buildId)
    .map(s => (<div key={`ssab-${s.buildId.slice(1)}`}>
      <ProjectLink2 site={s} sysView={props.sysView} bigLink />
    </div>));

  const maxEffectCount = Math.max(...Object.values(sysMap.sumEffects));
  let cw = 5;
  if (maxEffectCount > 64) {
    cw = 2.5;
  } else if (maxEffectCount > 50) {
    cw = 2.5;
  } else if (maxEffectCount > 42) {
    cw = 3;
  } else if (maxEffectCount > 30) {
    cw = 4;
  }

  return <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'max-content max-content max-content max-content 100%',
      gap: '2px 4px',
      fontSize: '14px',
    }}
  >

    <div>Calculating:</div>
    <div style={{ gridColumn: '2 / span 4' }}>
      <Icon className='icon-inline' iconName={props.useIncomplete ? 'TestBeakerSolid' : 'TestBeaker'} style={{ color: appTheme.palette.themePrimary }} />
      &nbsp;
      {props.useIncomplete ? 'All sites' : 'Completed sites only'}
    </div>

    <div>System architect:</div>
    <div style={{ gridColumn: '2 / span 4' }}>
      {!sysMap.architect && <span style={{ color: 'grey' }}>-</span>}
      {sysMap.architect && <>Cmdr {sysMap.architect}</>}
    </div>

    <div>Population:</div>
    <div style={{ gridColumn: '2 / span 4' }}>
      <SysPop id64={sysMap.id64} name={sysMap.name} pop={sysMap.pop} onChange={newPop => props.sysView.updatePop(newPop)} />
    </div>

    <div>Tier points:</div>
    <div style={{ gridColumn: '2 / span 4' }}>
      &nbsp;
      <span style={{ color: sysMap.tierPoints.tier2 < 0 ? appTheme.palette.red : undefined }}>
        <TierPoint tier={2} count={sysMap.tierPoints.tier2} />
      </span>
      &nbsp;
      <span style={{ color: sysMap.tierPoints.tier3 < 0 ? appTheme.palette.red : undefined }}>
        <TierPoint tier={3} count={sysMap.tierPoints.tier3} />
      </span>
    </div>

    {sysEffects.map(key => {
      const actual = sysMap.sumEffects[key as keyof SysEffects] ?? 0;

      return [
        <div key={`se${key}1`}>{mapName[key]}:</div>,
        <div key={`se${key}2`} style={{ maxWidth: 100, overflowX: 'hidden' }}>
          {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} cw={cw} />}
        </div>,
        <div key={`se${key}3`} style={{ textAlign: 'right' }}>{asPosNegTxt(actual)}</div>,
        <div key={`se${key}4`}>
          {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} cw={cw} />}
        </div>,
        <span key={`se${key}5`} style={{ width: '100%' }} />
      ]
    })}

    {!!buildTypes.length && <>
      <div style={{ alignContent: 'center' }}>Planned haul:</div>
      <div style={{ gridColumn: '2 / span 4' }}>
        <HaulList buildTypes={buildTypes} />
      </div>
    </>}

    {!!activeBuilds?.length && <>
      <div>Active builds:</div>
      <div style={{ gridColumn: '2 / span 4' }}>{activeBuilds}</div>
    </>}

  </div>;
}