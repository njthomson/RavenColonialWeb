import * as api from '../../api';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { ActionButton, Icon, Link, mergeStyleSets, Spinner, Stack } from "@fluentui/react";
import { appTheme, cn } from '../../theme';
import { asPosNegTxt } from '../../util';
import { BuildStatus, mapStatus } from '../../types2';
import { SysSnapshot } from '../../api/v2-system';
import { store } from '../../local-storage';
import { TierPoint } from '../../components/TierPoints';
import { Chevrons } from '../../components/Chevrons';
import { SysEffects, mapName } from '../../site-data';
import { SystemView2 } from './SystemView2';
import { SysPop } from './SysPop';
import { getSnapshot } from '../../system-model2';
import { mapStatusIcon } from './ViewEditStatus';
import { CopyButton } from '../../components/CopyButton';

const css = mergeStyleSets({
  component: {
    marginTop: 40,
    userSelect: 'none',
  },
  componentStack: {
    margin: '20px 0',
  },
  siteCard: {
    position: 'relative',
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
    position: 'relative',
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

export const ArchitectSummary: FunctionComponent<{ sysView: SystemView2 }> = (props) => {
  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<SysSnapshot[] | undefined>();
  const [updatingPop, setUpdatingPop] = useState(false);

  // load, re-calc and save each stale snapshot
  useMemo(() => {

    // delay some or it looks spooky
    setTimeout(async () => {

      // exit early if nothing to re-calc
      const stales = systems?.filter(s => s.stale || s.score < 0) ?? [];
      if (!systems || stales.length === 0) { return; }

      try {
        const snap = stales[0];
        console.log(`Recalculating snapshot for: ${snap.name} (${snap.id64})`);
        const newSys = await api.systemV2.getSys(snap.id64.toString());
        const newSnapshot = getSnapshot(newSys);
        await api.systemV2.saveSites(snap.id64.toString(), {
          update: [],
          delete: [],
          snapshot: newSnapshot,
        });

        // replace the snapshot, which triggers the next memo
        const idx = systems.indexOf(snap);
        systems.splice(idx, 1, newSnapshot);
        setSystems([...systems]);
      } catch (err: any) {
        console.error(err.stack);
      }
    }, 500);
  }, [systems]);

  // update all
  useMemo(() => {
    // exit early if nothing to re-calc
    const pendings = systems?.filter(s => s.pendingPop) ?? []
    if (!systems || pendings.length === 0) { return; }

    try {
      const snap = pendings[0];

      setUpdatingPop(true);

      api.systemV2.refreshPop(snap.id64)
        .then(newPop => {
          if (!snap.pop) {
            snap.pop = newPop;
          } else {
            snap.pop.pop = newPop.pop;
            snap.pop.timeSaved = newPop.timeSaved;
            snap.pop.timeSpansh = newPop.timeSpansh;
          }
          snap.pendingPop = false;

          setSystems([...systems]);
          setUpdatingPop(false);
        })
        .catch(err => {
          console.error(`SysPop-updateFromSpansh: ${err.stack}`);
        });
    } catch (err: any) {
      console.error(err.stack);
    }
  }, [systems]);

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

    const maxEffectCount = Math.max(...Object.values(snapshot.sumEffects));
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
      key={`snap-${snapshot.id64}-${snapshot.pop?.timeSaved}`}
      className={css.siteCard}
    >
      <span>
        <CopyButton text={snapshot.name} fontSize={10} />
        <Link href={`/#sys=${encodeURIComponent(snapshot.name)}`} className={css.siteCardLink} onClick={() => SystemView2.nextID64 = snapshot.id64}>{snapshot.name}</Link>
      </span>
      <div style={{ float: 'right' }}>
        <div>
          <TierPoint tier={2} count={snapshot.tierPoints.tier2} />
          &nbsp;
          <TierPoint tier={3} count={snapshot.tierPoints.tier3} />
        </div>
        <div style={{ float: 'right', fontSize: 12, marginTop: 10 }}>Score: {snapshot.score < 0 ? '?' : snapshot.score}</div>
      </div>

      <div className={css.siteCardTable}>

        <div key={`seSitePop1`}>Population:</div>
        <div key={`seSitePop2`} className={css.siteCardCol2Span}>
          <SysPop id64={snapshot.id64} name={snapshot.name} pop={snapshot.pop} onChange={newPop => {
            snapshot.pop = newPop;
            setSystems([...systems]);
          }} />
        </div>

        <div key={`seSiteCounts1`}>Sites:</div>
        <Stack horizontal key={`seSiteCounts2`} verticalAlign='center' className={css.siteCardCol2Span} style={{ display: 'inline-block', fontSize: 14 }} tokens={{ childrenGap: 16 }}>
          {statusCountMap.complete && <span title={`${statusCountMap.complete} ${mapStatus.complete}`}><Icon iconName={mapStatusIcon.complete} /> {statusCountMap.complete}</span>}
          {statusCountMap.build && <span title={`${statusCountMap.build} ${mapStatus.build}`} style={{ color: appTheme.palette.yellow }}><Icon iconName={mapStatusIcon.build} /> {statusCountMap.build}</span>}
          {statusCountMap.plan && <span title={`${statusCountMap.plan} ${mapStatus.plan}`}><Icon iconName={mapStatusIcon.plan} /> {statusCountMap.plan}</span>}
        </Stack>

        {Object.keys(snapshot.sumEffects).map(key => {
          const actual = snapshot.sumEffects[key as keyof SysEffects] ?? 0;

          return [
            <div key={`se${key}1`}>{mapName[key]}:</div>,
            <div key={`se${key}2`}>
              {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} cw={cw} />}
            </div>,
            <div key={`se${key}3`}>{asPosNegTxt(actual)}</div>,
            <div key={`se${key}4`}>
              {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} cw={cw} />}
            </div>,
          ]
        })}
      </div>
      {(snapshot.pendingPop || snapshot.stale || snapshot.score < 0) && <>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ position: 'absolute', bottom: 4, right: 8, color: appTheme.palette.themeTertiary, fontSize: 12 }}>
          <Icon iconName='Processing' />
          <span>updating</span>
        </Stack>
      </>}
    </div>;
  });

  const totalPop = systems?.reduce((sum, s) => sum + (s.pop?.pop ?? 0), 0) ?? 0;
  return <>
    <div className={css.component}>
      <h3 className={cn.h3}>
        Architect summary:
        &nbsp;
        {store.cmdrName}
      </h3>
      {loading && <Stack horizontal><Spinner labelPosition='right' label='Loading ...' /></Stack>}

      {!!rows?.length && <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ fontSize: 12, color: appTheme.palette.themeSecondary }}>
        <div>Total population: {totalPop.toLocaleString()}</div>
        <ActionButton
          className={cn.bBox2}
          style={{ height: 24, fontSize: 12 }}
          iconProps={{ iconName: 'Refresh', style: { fontSize: 12 } }}
          text='Update all'
          onClick={() => {
            if (!systems) { return; }
            systems.forEach(s => s.pendingPop = true);
            setSystems([...systems]);
          }}
        />
        {updatingPop && <div>Updating ...</div>}
      </Stack>}

      <Stack className={css.componentStack} horizontal wrap>
        {rows}
        {rows?.length === 0 && <div style={{ color: appTheme.palette.themeSecondary }}>No known systems. Start by searching for a system.</div>}
      </Stack>

    </div>
  </>;
}