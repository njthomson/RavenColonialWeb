
import { FunctionComponent } from "react";
import { appTheme, cn } from "../theme";
import { getSiteType, SysEffects, mapName } from "../site-data";
import { asPosNegTxt } from "../util";
import { Chevrons } from "./Chevrons";
import { Icon } from "@fluentui/react";
import { TierPoints } from "./TierPoints";

export const BuildEffects: FunctionComponent<{ buildType: string, noTitle?: boolean }> = (props) => {
  const paddingTop = 2;

  const st = getSiteType(props.buildType);
  const effectRows = Object.keys(st.effects)
    .map(key => {
      if (!st.effects[key as keyof SysEffects]) return null;

      const value = st.effects[key as keyof SysEffects] ?? 0;
      const displayName = mapName[key];
      let displayVal = asPosNegTxt(value);

      return <tr key={`se${key}`} title={`${displayName}: ${asPosNegTxt(value)}`}>
        <td style={{ paddingTop }}>{displayName}:</td>
        <td style={{ paddingTop }}>
          {value < 0 && <Chevrons name={displayName} count={value} />}
        </td>
        <td style={{ paddingTop }}>
          &nbsp;{displayVal}&nbsp;
        </td>
        <td style={{ paddingTop }}>
          {value > 0 && <Chevrons name={displayName} count={value} />}
        </td>
      </tr>
    });

  let needs = <span style={{ color: 'grey' }}>None</span>;
  if (st.needs.count > 0) {
    needs = <span><TierPoints tier={st.needs.tier} count={st.needs.count} /></span>;
  }

  let gives = <span style={{ color: 'grey' }}>None</span>;
  if (st.gives.count > 0) {
    gives = <TierPoints tier={st.gives.tier} count={st.gives.count} />
  }

  return <>
    {!props.noTitle && <h3 className={cn.h3}>System effects:</h3>}

    <table style={{ fontSize: 14 }} cellPadding={0} cellSpacing={0}>
      <tbody>

        <tr>
          <td style={{ paddingTop }}>Type:</td>
          <td colSpan={3} style={{ paddingTop }}><div className='grey'>{st.displayName2}</div></td>
        </tr>

        {st.inf !== 'none' && st.inf !== 'colony' && <tr>
          <td style={{ paddingTop }}>Economic inf:</td>
          <td colSpan={3} style={{ paddingTop }}><div className='grey'>{mapName[st.inf]}</div></td>
        </tr>}

        {effectRows}

        <tr>
          <td colSpan={4} style={{ paddingTop }}>
            <span>Needs: {needs}</span>
            &nbsp;
            <span>Provides: {gives}</span>
            {st.preReq && <div>
              <Icon className="icon-inline" iconName='Lightbulb' style={{ color: appTheme.palette.accent }} /> Requires {mapName[st.preReq]}
            </div>}
          </td>
        </tr>

      </tbody>
    </table>
  </>;
};
