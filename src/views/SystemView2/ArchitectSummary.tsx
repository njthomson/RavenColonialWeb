import * as api from '../../api';
import { FunctionComponent, useEffect, useState } from "react";
import { Link, mergeStyleSets, Spinner, Stack } from "@fluentui/react";
import { appTheme, cn } from '../../theme';
import { asPosNegTxt } from '../../util';
import { BuildStatus, mapStatus } from '../../types2';
import { SysSnapshot } from '../../api/v2-system';
import { store } from '../../local-storage';
import { TierPoint } from '../../components/TierPoints';
import { Chevrons } from '../../components/Chevrons';
import { SysEffects, mapName } from '../../site-data';
import { SystemView2 } from './SystemView2';

const css = mergeStyleSets({
  component: {
    marginTop: 40,
    userSelect: 'none',
  },
  componentStack: {
    margin: '20px 0',
  },
  siteCard: {
    width: 320,
    padding: 10,
    marginRight: '20px!important',
    marginBottom: '20px!important',
    // border: `4px solid ${appTheme.palette.neutralTertiaryAlt}`,
    backgroundColor: appTheme.palette.themeLighter
  },
  siteCardLink: {
    marginRight: 10,
    fontWeight: 'bold',
  },
  siteCardTable: {
    marginTop: 10,
    fontSize: 12,
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'max-content min-content min-content auto',
    gap: '2px 10px',
  },
  siteCardCol2Span: {
    gridColumn: '2 / span 3'
  },
  siteCardTableRow: {
  },
});

export const ArchitectSummery: FunctionComponent<{ sysView: SystemView2 }> = (props) => {
  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<SysSnapshot[] | undefined>();

  useEffect(() => {
    if (!systems) {
      // fetch prior systems
      setLoading(true);
      api.systemV2.getCmdrSnapshots()
        .then(snapshots => {
          // alpha sort by name
          snapshots.sort((a, b) => a.name.localeCompare(b.name));

          setSystems(snapshots);
          setLoading(false);
        })
        .catch(err => {
          console.error(`getCmdrSnapshots: ${err.stack}`);
          props.sysView.setState({ errorMsg: err.message });
        });
    }
  }, [props.sysView, systems]);

  var rows = systems?.map(snapshot => {

    // consolidate count of sites per status
    const statusCountMap = snapshot.sites.reduce((map, s) => {
      map[s.status] = (map[s.status] ?? 0) + 1;
      return map;
    }, {} as Record<BuildStatus, number>)
    const statusCounts: string[] = [];
    if (statusCountMap.complete) { statusCounts.push(`${statusCountMap.complete} ${mapStatus.complete}`) }
    if (statusCountMap.build) { statusCounts.push(`${statusCountMap.build} ${mapStatus.build}`) }
    if (statusCountMap.plan) { statusCounts.push(`${statusCountMap.plan} ${mapStatus.plan}`) }

    return <div
      key={`snap-${snapshot.id64}`}
      className={css.siteCard}
    >
      <Stack
        horizontal
        horizontalAlign='space-between'
        verticalAlign='center'
        tokens={{ childrenGap: 4 }}
      >
        <Link href={`/#sys=${snapshot.name}`} className={css.siteCardLink}>{snapshot.name}</Link>
        <div>
          <TierPoint tier={2} count={snapshot.tierPoints.tier2} />
          &nbsp;
          <TierPoint tier={3} count={snapshot.tierPoints.tier3} />
        </div>
      </Stack>

      <div className={css.siteCardTable}>

        <div key={`seSiteCounts1`}>Sites:</div>
        <div key={`seSiteCounts2`} className={css.siteCardCol2Span} >
          {statusCounts.join(', ')}
        </div>

        {Object.keys(snapshot.sumEffects).map(key => {
          const actual = snapshot.sumEffects[key as keyof SysEffects] ?? 0;

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
    </div>;
  });

  return <>
    <div className={css.component}>
      <h3 className={cn.h3}>
        Architect summary:
        &nbsp;
        {store.cmdrName}
      </h3>
      {loading && <Stack horizontal><Spinner labelPosition='right' label='Loading ...' /></Stack>}

      <Stack className={css.componentStack} horizontal wrap>
        {rows}
        {rows?.length === 0 && <div style={{ color: appTheme.palette.themeSecondary }}>No known systems</div>}
      </Stack>

    </div >
  </>;
}