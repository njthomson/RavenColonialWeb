
import { FunctionComponent } from "react";
import { appTheme, cn } from "../theme";
import { getSiteType, SysEffects, mapName, mapSitePads } from "../site-data";
import { asPosNegTxt } from "../util";
import { Chevrons } from "./Chevrons";
import { Icon, mergeStyleSets, Stack } from "@fluentui/react";
import { TierPoint } from "./TierPoints";
import { PadSize } from "./PadSize";
import { HaulSize } from "./BigSiteTable/BigSiteTable";

const { tds, tc, tr } = mergeStyleSets({
  tds: {
    paddingTop: 2,
    padding: 0,
  },
  tc: { textAlign: 'center', },
  tr: { textAlign: 'right', },
})

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
        <td className={tds}>{displayName}:</td>
        <td className={` ${tr} ${tds}`}>
          {value < 0 && <Chevrons name={displayName} count={value} />}
        </td>
        <td className={`${tds} ${tc}`} >
          {displayVal}
        </td>
        <td className={tds}>
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
      <colgroup>
        <col width='auto' />
        <col width={40} />
        <col width={40} />
        <col width={40} />
        <col width='auto' />
      </colgroup>
      <tbody>

        {!props.noType && <tr>
          <td className={tds} style={{ paddingTop }}>Type:</td>
          <td className={tds} colSpan={3} style={{ paddingTop }}>
            <div className='grey'>
              <div className='grey'>{st.displayName2}</div>
            </div>
          </td>
        </tr>}

        {!props.noPads && <tr>
          <td className={tds} style={{ paddingTop }}>Landing pads:</td>
          <td className={tds} colSpan={3} style={{ paddingTop }}>
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
          <td className={tds} style={{ paddingTop }}>Economic inf:</td>
          <td className={tds} colSpan={3} style={{ paddingTop }}><div className='grey'>{mapName[st.inf]}</div></td>
        </tr>}

        {effectRows}

        <tr>
          <td className={tds} style={{ paddingTop }}>Average haul:</td>
          <td className={tds} colSpan={3} style={{ paddingTop }}>
            <div className='grey'>
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 10 }}>
                <HaulSize haul={st.haul} />
                <div>~{st.haul.toLocaleString()} units</div>
              </Stack>
            </div>
          </td>
        </tr>

        <tr>
          <td className={tds} colSpan={4} style={{ paddingTop: 8 }}>
            <span>Needs: {needs}</span>
            &nbsp;
            <span>Provides: {gives}</span>
            {st.preReq && <div style={{ marginTop: 4 }}>
              <Icon className="icon-inline" iconName='Lightbulb' style={{ color: appTheme.palette.accent }} /> Requires {mapName[st.preReq]}
            </div>}
          </td>
        </tr>

        <tr>
          <td className={tds} colSpan={3} />
          <td className={tds} style={{ width: 200 }} />
        </tr>

      </tbody>
    </table>
  </div>;
};
