
import { FunctionComponent } from "react";
import { appTheme, cn } from "../theme";
import { getSiteType, SysEffects, mapName, mapSitePads } from "../site-data";
import { asPosNegTxt } from "../util";
import { Chevrons } from "./Chevrons";
import { Icon, Stack } from "@fluentui/react";
import { TierPoint } from "./TierPoints";
import { PadSize } from "./PadSize";

export const BuildEffects: FunctionComponent<{ buildType: string, noTitle?: boolean, noType?: boolean, heading?: string; noPads?: boolean }> = (props) => {
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
    needs = <span><TierPoint tier={st.needs.tier} count={st.needs.count} /></span>;
  }

  let gives = <span style={{ color: 'grey' }}>None</span>;
  if (st.gives.count > 0) {
    gives = <TierPoint tier={st.gives.tier} count={st.gives.count} />
  }

  const padMap = mapSitePads[props.buildType];

  return <div style={{ cursor: 'default' }}>
    {!props.noTitle && <h3 className={cn.h3}>{props.heading ?? 'System effects:'}</h3>}

    <table style={{ fontSize: 14 }} cellPadding={0} cellSpacing={0}>
      <tbody>

        {!props.noType && <tr>
          <td style={{ paddingTop }}>Type:</td>
          <td colSpan={3} style={{ paddingTop }}>
            <div className='grey'>
              <div className='grey'>{st.displayName2}</div>
            </div>
          </td>
        </tr>}

        {!props.noPads && <tr>
          <td style={{ paddingTop }}>Landing pads:</td>
          <td colSpan={3} style={{ paddingTop }}>
            <div className='grey'>
              {!padMap && <span style={{ color: 'grey' }}>No landing pads</span>}

              {padMap && <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 10 }}>
                <span title={`${padMap[0]} small pads`}>
                  <PadSize size='small' title={undefined} />
                  &nbsp;
                  {padMap[0] ? padMap[0] : <span style={{ color: 'grey' }}>-</span>}
                </span>
                <span title={`${padMap[1]} medium pads`}>
                  <PadSize size='medium' />
                  &nbsp;
                  {padMap[1] ? padMap[1] : <span style={{ color: 'grey' }}>-</span>}
                </span>
                <span title={`${padMap[2]} large pads`}>
                  <PadSize size='large' />
                  &nbsp;
                  {padMap[2] ? padMap[2] : <span style={{ color: 'grey' }}>-</span>}
                </span>
              </Stack>}
            </div>
          </td>
        </tr>}

        {st.inf !== 'none' && st.inf !== 'colony' && <tr>
          <td style={{ paddingTop }}>Economic inf:</td>
          <td colSpan={3} style={{ paddingTop }}><div className='grey'>{mapName[st.inf]}</div></td>
        </tr>}

        {effectRows}

        <tr>
          <td colSpan={4} style={{ paddingTop: 8 }}>
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
  </div>;
};
