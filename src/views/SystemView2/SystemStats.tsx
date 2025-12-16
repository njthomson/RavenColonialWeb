import { FunctionComponent, useState } from "react";
import { Chevrons } from "../../components/Chevrons";
import { TierPoint } from "../../components/TierPoints";
import { mapName, sysEffects, SysEffects } from "../../site-data";
import { getSysScoreDiagnostic, SysMap2 } from "../../system-model2";
import { asPosNegTxt, isMobile } from "../../util";
import { appTheme, cn } from "../../theme";
import { HaulList } from "./HaulList";
import { ProjectLink2 } from "./ProjectLink2";
import { SystemView2 } from "./SystemView2";
import { SysPop } from "./SysPop";
import { Callout, Icon, IconButton, Link, mergeStyles, Panel, PanelType, Stack } from "@fluentui/react";
import { App } from "../../App";
import { ViewUnlockedFeatures } from "./ViewUnlocked";

const uls = mergeStyles({
  ul: {
    margin: 0,
    paddingLeft: 16
  }
});

export const SystemStats: FunctionComponent<{ sysMap: SysMap2, useIncomplete: boolean; sysView: SystemView2 }> = (props) => {
  const { sysMap } = props;
  const [showSysScoreInfo, setShowSysScoreInfo] = useState(false);
  const [scoreAudit, setScoreAudit] = useState(false);

  const buildTypes = sysMap.siteMaps
    .filter(s => s.status === 'plan' && props.sysMap.calcIds?.includes(s.id))
    .reduce((list, s) => ([...list, sysMap.primaryPortId === s.id ? `${s.buildType} (primary)` : s.buildType]), [] as string[]);

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

  return <div>
    <div
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

      <div>System Score:</div>
      <div style={{ gridColumn: '2 / span 4' }}>
        <Stack id='sys-score-info' horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ position: 'relative', width: 'min-content' }}>
          <div>{sysMap.systemScore}</div>

          <IconButton
            className={cn.bBox}
            iconProps={{ iconName: 'Info', style: { fontSize: 12 } }}
            style={{ width: 18, height: 18 }}
            onClick={ev => setShowSysScoreInfo(!showSysScoreInfo)}
          />
        </Stack>

        {showSysScoreInfo && <Callout
          target='#sys-score-info'
          styles={{
            beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
            calloutMain: {
              backgroundColor: appTheme.palette.neutralTertiaryAlt,
              color: appTheme.palette.neutralDark,
            }
          }}
          onDismiss={() => setShowSysScoreInfo(false)}
        >
          <div className={uls} style={{ paddingLeft: 30, cursor: 'default' }}>
            <Link style={{ float: 'right', fontSize: 10 }} onClick={() => setScoreAudit(true)}>Audit?</Link>
            <Icon iconName='Lightbulb' style={{ float: 'left', fontSize: 28, marginTop: 4, marginLeft: -30 }} />
            <div>Be aware: the game updates system scores during the weekly tick.</div>
            <div>However Raven Colonial calculates system scores in real-time.</div>

            <div style={{ marginTop: 8 }}>
              Incorrect score? <Link
                // style={{ marginLeft: 4, color: appTheme.palette.themeTertiary, fontSize: 11 }}
                onClick={() => App.showFeedback(`Incorrect score for: ${sysMap.name}`, `Actual score: ?\nCalculated score: ${sysMap.systemScore}\n\nSystem address: ${sysMap.id64}\n`)}
              >
                Share feedback
              </Link>
            </div>

            <div style={{ margin: '8px 0' }}>Scores for the following buildings are not yet known or need confirmation:</div>
            <ul>
              <li>Pirate Base Installation</li>
              <li>Mining/Industrial Installation</li>
              <li>Military Installation</li>
              <li>Medical Installation</li>
              <li>Tourist Installation</li>
              <li>Space Bar Installation</li>
              <li>All surface Hubs, exception Refinery</li>
            </ul>

            <div style={{ margin: '8px 0' }}>If you are building any of these and would like to help:</div>
            <ul>
              <li>When completing construction, take note of your system score in the game.</li>
              <li><Link
                style={{ color: appTheme.palette.themePrimary }}
                onClick={() => App.showFeedback(`Building score information: ${sysMap.name}`, `New building(s): ?\nScore last week: ?\nScore this week: ?\nCalculated system score: ${sysMap.systemScore}\n\nSystem address: ${sysMap.id64}\n`)}
              >
                After the weekly tick - please share new and old scores
              </Link></li>
            </ul>
          </div>
        </Callout>}

        {!!scoreAudit && <Panel
          isOpen
          isLightDismiss
          headerText='System score audit:'
          allowTouchBodyScroll={isMobile()}
          type={PanelType.custom}
          customWidth='1000px'
          styles={{
            header: { textTransform: 'capitalize', cursor: 'default' },
            overlay: { backgroundColor: appTheme.palette.blackTranslucent40, cursor: 'default' },
          }}
          onDismiss={(ev: any) => setScoreAudit(false)}
        >
          <pre style={{ cursor: 'default', color: appTheme.palette.themePrimary, fontSize: 12 }}>
            {getSysScoreDiagnostic(props.sysMap, props.sysMap.siteMaps)}
          </pre>
        </Panel>}
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
          <div key={`se${key}3`} style={{ textAlign: 'right', alignContent: 'center', fontSize: props.sysView.state.buffNerf ? 12 : undefined }}>{asPosNegTxt(actual)}</div>,
          <div key={`se${key}4`}>
            {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} cw={cw} />}
          </div>,
          <span key={`se${key}5`} style={{ width: '100%' }} />
        ]
      })}

      <Stack horizontal verticalAlign='center' style={{ gridColumn: '1 / span 5', fontSize: 10, marginLeft: 0 }}>
        <input type='checkbox' checked={props.sysView.state.buffNerf} onChange={() => props.sysView.doToggleBuffNerf()} />
        <div>Apply <Link href="https://forums.frontier.co.uk/threads/elite-dangerous-update-on-balancing-changes-to-system-development.643111/" target="fdev">stats buff/nerf</Link> to ALL facilities</div>
        <div style={{ color: appTheme.palette.themeSecondary }}>&nbsp;(Experimental unconfirmed behaviour)</div>
      </Stack>

      <div>System unlocks:</div>
      <div style={{ gridColumn: '2 / span 4', alignContent: 'center' }}>
        <ViewUnlockedFeatures sysMap={props.sysMap} />
      </div>

      {!!buildTypes.length && <>
        <div style={{ alignContent: 'center' }}>Planned haul:</div>
        <div style={{ gridColumn: '2 / span 4' }}>
          <HaulList buildTypes={buildTypes} shopNearSystem={props.sysMap.name} />
        </div>
      </>}

      {!!activeBuilds?.length && <>
        <div>Active builds:</div>
        <div style={{ gridColumn: '2 / span 4' }}>{activeBuilds}</div>
      </>}
    </div>

  </div>;
}