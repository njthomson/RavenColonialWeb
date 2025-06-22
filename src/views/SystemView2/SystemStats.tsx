import { FunctionComponent } from "react";
import { TierPoints, Chevrons } from "../../components/Chevrons";
import { mapName, sysEffects, SysEffects } from "../../site-data";
import { SysMap2 } from "../../system-model2";
import { asPosNegTxt } from "../../util";
import { appTheme } from "../../theme";


export const SystemStats: FunctionComponent<{ sysMap: SysMap2 }> = (props) => {
  const { sysMap } = props;

  // let max = Math.max(...Object.values(sysInf));
  // let econTxt = Object.keys(sysMap.economies)
  //   // .filter(k => sysInf[k] === max)
  //   .map(k => `${mapName[k] ?? k}: ${sysMap.economies[k]}`)
  //   .join(', ');


  return <div style={{
    display: 'grid',
    gridTemplateColumns: 'max-content min-content min-content auto',
    gap: '2px 10px',
    fontSize: '14px',
  }}>

    <div>System architect:</div>
    <div style={{ gridColumn: '2 / span 3' }}>{sysMap.architect}</div>

    <div>Tier points:</div>
    <div style={{ gridColumn: '2 / span 3' }}>
      &nbsp;
      &nbsp;
      <span style={{ color: sysMap.tierPoints.tier2 < 0 ? appTheme.palette.red : undefined }}>
        <TierPoints tier={2} count={sysMap.tierPoints.tier2} />
      </span>
      &nbsp;
      <span style={{ color: sysMap.tierPoints.tier3 < 0 ? appTheme.palette.red : undefined }}>
        <TierPoints tier={3} count={sysMap.tierPoints.tier3} />
      </span>

    </div>

    {/* <div>Economies:</div>
    <div style={{ gridColumn: '2 / span 3' }}>
      <div>{econTxt}</div>
      <EconomyBlocks economies={sysMap.economies} width={200} height={10} />
    </div>
    */}

    {sysEffects.map(key => {
      const actual = sysMap.sumEffects[key as keyof SysEffects] ?? 0;
      // if (key === 'pop' || key === 'mpop') return null;

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
  </div>
}