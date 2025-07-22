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

  return <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'max-content min-content min-content auto',
      gap: '2px 10px',
      fontSize: '14px',
    }}
  >

    <div>Calculating:</div>
    <div style={{ gridColumn: '2 / span 3' }}>{props.useIncomplete ? 'All sites' : 'Completed sites only'}</div>

    <div>System architect:</div>
    <div style={{ gridColumn: '2 / span 3' }}>{sysMap.architect}</div>

    <div>Tier points:</div>
    <div style={{ gridColumn: '2 / span 3' }}>
      &nbsp;
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
        <div key={`se${key}2`}>
          {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} />}
        </div>,
        <div key={`se${key}3`}>{asPosNegTxt(actual)}</div>,
        <div key={`se${key}4`}>
          {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} />}
        </div>,
      ]
    })}

    {!!buildTypes.length && <>
      <div style={{ alignContent: 'center' }}>Planned haul:</div>
      <div style={{ gridColumn: '2 / span 3' }}>
        <HaulList buildTypes={buildTypes} />
      </div>
    </>}

    {!!activeBuilds?.length && <>
      <div>Active builds:</div>
      <div style={{ gridColumn: '2 / span 3' }}>{activeBuilds}</div>
    </>}

  </div>;
}