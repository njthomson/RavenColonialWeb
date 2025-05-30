
import { FunctionComponent } from "react";
import { appTheme, cn } from "../theme";
import { getSiteType, SysEffects, mapName } from "../site-data";
import { ProjectRef } from "../types";
import { asPosNegTxt } from "../util";
import { Chevrons, TierPoints } from "./Chevrons";
import { Icon } from "@fluentui/react";

export const BuildEffects: FunctionComponent<{ proj: ProjectRef, noTitle?: boolean }> = (props) => {
  const paddingTop = 2;

  const st = getSiteType(props.proj.buildType);
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

    <table className="foo" style={{ fontSize: '14px' }} cellPadding={0} cellSpacing={0}>
      <tbody>

        {st.inf !== 'none' && <tr>
          <td style={{ paddingTop }}>Economy:</td>
          <td colSpan={3} style={{ paddingTop }}><div className='grey'>{mapName[st.inf]}</div>
          </td>
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
