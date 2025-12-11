import * as api from '../../api';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { ActionButton, DirectionalHint, Icon, IconButton, Link, mergeStyleSets, Panel, PanelType, Spinner, Stack, Toggle } from "@fluentui/react";
import { appTheme, cn } from '../../theme';
import { asPosNegTxt, isMobile } from '../../util';
import { BuildStatus, mapStatus } from '../../types2';
import { SysSnapshot } from '../../api/v2-system';
import { store } from '../../local-storage';
import { TierPoint } from '../../components/TierPoints';
import { Chevrons } from '../../components/Chevrons';
import { SysEffects, getSiteType, mapName } from '../../site-data';
import { SystemView2 } from './SystemView2';
import { SysPop } from './SysPop';
import { getSnapshot } from '../../system-model2';
import { mapStatusIcon } from './ViewEditStatus';
import { CopyButton } from '../../components/CopyButton';
import { CalloutMsg } from '../../components/CalloutMsg';

const css = mergeStyleSets({
  component: {
    marginTop: 40,
    cursor: 'default',
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
    backgroundColor: appTheme.palette.themeLighter,
    overflow: 'hidden',
  },
  siteCardLink: {
    marginRight: 10,
    fontWeight: 'bold',
  },
  siteCardTable: {
    position: 'relative',
    marginTop: 10,
    fontSize: 12,
    display: 'grid',
    gridTemplateColumns: 'max-content min-content min-content auto',
    gap: '2px 10px',
  },
  siteCardCol2Span: {
    gridColumn: '2 / span 3'
  },
  siteCardTableRow: {
  },
  redChevrons: {
    maxWidth: 60,
    overflow: 'hidden',
  },
  btnFav: {
    width: 20,
    height: 20,
  },
  statBox: {
    padding: 4,
    color: appTheme.palette.themeDark,
    backgroundColor: appTheme.palette.neutralLight,
  }
});

type ArchStats = {
  sumScore: number,
  sumPop: number,
  cw: number,
  sumStatus: Record<string, number>;
  sumEffects: Record<string, number>;
  builds: Record<string, Record<string, number>>;
  excluded: Record<string, string[]>;
}

export const ArchitectSummary: FunctionComponent<{ sysView: SystemView2 }> = (props) => {
  const [loading, setLoading] = useState(false);
  const [systems, setSystems] = useState<SysSnapshot[] | undefined>();
  const [updatingPop, setUpdatingPop] = useState(false);
  const [onlyFav, setOnlyFav] = useState(store.archFav);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [moreStats, setMoreStats] = useState<ArchStats | undefined>(undefined);

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
        const newSnapshot = getSnapshot(newSys, snap.fav);
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

          const stats: ArchStats = {
            sumScore: 0,
            sumPop: 0,
            sumStatus: { plan: 0, build: 0, complete: 0 },
            cw: 5,
            sumEffects: {},
            builds: {},
            excluded: {}
          };
          if (snapshots.length) {

            for (const sys of snapshots) {
              stats.sumPop += sys.pop?.pop ?? 0;
              stats.sumScore += sys.score;

              for (const [key, val] of Object.entries(sys.sumEffects as Record<string, number>)) {
                if (!stats.sumEffects[key]) { stats.sumEffects[key] = 0; }
                stats.sumEffects[key] += val;
              }

              // per each site in the system
              for (const s of sys.sites) {
                if (!stats.sumStatus[s.status]) { stats.sumStatus[s.status] = 0; }
                stats.sumStatus[s.status] += 1;

                if (!stats.builds[s.status]) { stats.builds[s.status] = {}; }

                const type = getSiteType(s.buildType)!
                if (!stats.builds[s.status][type.displayName2]) { stats.builds[s.status][type.displayName2] = 0; }
                stats.builds[s.status][type.displayName2] += 1;
              }

              // is this system excluded from global stats?
              if (!sys.pop?.pop) {
                if (!stats.excluded[sys.name]) { stats.excluded[sys.name] = []; }
                stats.excluded[sys.name].push('No population recorded');
              }
              if (sys.tierPoints.tier2 < 0 && sys.tierPoints.tier3 < 0) {
                if (!stats.excluded[sys.name]) { stats.excluded[sys.name] = []; }
                stats.excluded[sys.name].push('Both T2 and T3 points are negative');
              }
            }

            const maxEffectCount = Math.max(...Object.values(stats.sumEffects));
            stats.cw = 5;
            if (maxEffectCount > 64) {
              stats.cw = 2.5;
            } else if (maxEffectCount > 50) {
              stats.cw = 2.5;
            } else if (maxEffectCount > 42) {
              stats.cw = 3;
            } else if (maxEffectCount > 30) {
              stats.cw = 4;
            }
          }

          setSystems(snapshots);
          setMoreStats(stats);
          setLoading(false);
        })
        .catch(err => {
          console.error(`getCmdrSnapshots: ${err.stack}`);
          props.sysView.setState({ errorMsg: err.message });
        });
    }
  }, [props.sysView, systems]);

  const filtered = systems?.filter(snapshot => snapshot.fav);
  const rows = (onlyFav && filtered?.length ? filtered : systems)?.map(snapshot => {

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

    const nicknameDiffers = !!snapshot.nickname && snapshot.nickname !== snapshot.name;

    return <div
      key={`snap-${snapshot.id64}-${snapshot.pop?.timeSaved}`}
      className={css.siteCard}
    >
      <span style={{ position: 'relative' }}>
        {nicknameDiffers && <>
          <Link href={`/#sys=${encodeURIComponent(snapshot.name)}`} className={css.siteCardLink} style={{ fontWeight: 'bold' }} onClick={() => SystemView2.nextID64 = snapshot.id64}>{snapshot.nickname}</Link>
        </>}
        {!nicknameDiffers && <>
          <CopyButton text={snapshot.nickname || snapshot.name} fontSize={10} />
          <Link href={`/#sys=${encodeURIComponent(snapshot.name)}`} className={css.siteCardLink} onClick={() => SystemView2.nextID64 = snapshot.id64}>{snapshot.nickname || snapshot.name}</Link>
        </>}
      </span>
      <div style={{ float: 'right' }}>
        <div>
          <TierPoint tier={2} count={snapshot.tierPoints.tier2} />
          &nbsp;
          <TierPoint tier={3} count={snapshot.tierPoints.tier3} />
        </div>
        <div style={{ float: 'right', fontSize: 12, marginTop: 10 }}>Score: {snapshot.score < 0 ? '?' : snapshot.score}</div>
      </div>

      {nicknameDiffers && <div style={{ height: 10, fontSize: 10 }}>
        <CopyButton text={snapshot.name} fontSize={8} />
        <Link href={`/#sys=${encodeURIComponent(snapshot.name)}`} className={css.siteCardLink} style={{ color: appTheme.palette.themeTertiary }} onClick={() => SystemView2.nextID64 = snapshot.id64}>{snapshot.name}</Link>
      </div>}

      <div className={css.siteCardTable}>

        <div key={`seSitePop1`}>Population:</div>
        <div key={`seSitePop2`} className={css.siteCardCol2Span}>
          <SysPop id64={snapshot.id64} name={snapshot.name} pop={snapshot.pop} onChange={newPop => {
            if (systems) {
              snapshot.pop = newPop;
              setSystems([...systems]);
            }
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
            <div key={`se${key}2`} className={css.redChevrons}>
              {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} cw={cw} />}
            </div>,
            <div key={`se${key}3`}>{asPosNegTxt(actual)}</div>,
            <div key={`se${key}4`}>
              {actual > 0 && <Chevrons name={`sys${key}r`} count={actual} cw={cw} />}
            </div>,
          ]
        })}
      </div>

      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ position: 'absolute', bottom: 4, right: 8, color: appTheme.palette.themeTertiary, fontSize: 12 }}>
        {(snapshot.pendingPop || snapshot.stale || snapshot.score < 0) && <>
          <Icon iconName='SyncOccurence' />
          <span>updating</span>
        </>}

        <IconButton
          className={`${cn.bBox} ${css.btnFav}`}
          iconProps={{ iconName: snapshot.fav ? 'FavoriteStarFill' : 'FavoriteStar' }}
          style={{ color: snapshot.fav ? appTheme.palette.yellow : appTheme.palette.themeTertiary }}
          title='Set or clear this system as a favourite'
          onClick={() => {
            if (systems) {
              api.systemV2.setSysfav(snapshot.id64, !snapshot.fav).then(() => {
                snapshot.fav = !snapshot.fav;
                setSystems([...systems]);
              });
            }
          }}
        />
      </Stack>
    </div>;
  });

  const sumRatio = moreStats && moreStats.sumScore / moreStats.sumPop * 1000;
  const excludedSystemNames = moreStats?.excluded && Object.keys(moreStats?.excluded).sort();

  return <>
    <div className={css.component}>
      <h3 className={cn.h3}>
        Architect summary:
        &nbsp;
        {store.cmdrName}
      </h3>
      {loading && <Stack horizontal><Spinner labelPosition='right' label='Loading ...' /></Stack>}

      {!!rows?.length && <>
        <Stack
          horizontal
          verticalAlign='center'
          tokens={{ childrenGap: 8 }}
          style={{ fontSize: 16, color: appTheme.palette.themeSecondary }}
        >
          <div className={css.statBox}>Total population: {moreStats?.sumPop.toLocaleString()}</div>
          <ActionButton
            className={cn.bBox2}
            style={{ height: 24, fontSize: 12 }}
            iconProps={{ iconName: 'Refresh', style: { fontSize: 12 } }}
            text='Update all'
            disabled={updatingPop}
            onClick={() => {
              if (!systems) { return; }
              systems.forEach(s => s.pendingPop = true);
              setSystems([...systems]);
            }}
          />

          <div className={css.statBox}>Total score: {moreStats?.sumScore.toLocaleString()}</div>
          <ActionButton
            className={cn.bBox2}
            style={{ height: 24, fontSize: 12 }}
            iconProps={{ iconName: 'BarChart4', style: { fontSize: 12 } }}
            text='More stats'
            disabled={updatingPop}
            onClick={() => setShowMoreStats(v => !v)}
          />

          <div style={{ marginLeft: 20, height: 24, paddingTop: 4 }}>
            <Toggle
              onText='Favourites'
              offText='Favourites'
              checked={onlyFav && !!filtered?.length}
              disabled={!filtered?.length}
              onChange={() => {
                setOnlyFav(x => {
                  store.archFav = !x;
                  return !x
                });
              }}
            />
          </div>

        </Stack>
      </>}

      <Stack className={css.componentStack} horizontal wrap>
        {rows}
        {rows?.length === 0 && <div style={{ color: appTheme.palette.themeSecondary }}>No known systems. Start by searching for a system, add yourself as System Architect to see summaries here.</div>}
      </Stack>

    </div>

    {moreStats && showMoreStats && <Panel
      isOpen
      isLightDismiss
      headerText={`Architect statistics: ${store.cmdrName}`}
      allowTouchBodyScroll={isMobile()}
      type={PanelType.custom}
      customWidth='1000px'
      styles={{
        header: { textTransform: 'capitalize', cursor: 'default' },
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40, cursor: 'default' },
      }}
      onDismiss={(ev: any) => setShowMoreStats(false)}
    >
      <div>
        <Stack
          horizontal
          verticalAlign='center'
          tokens={{ childrenGap: 8 }}
          style={{ fontSize: 16, color: appTheme.palette.themeSecondary }}
        >
          <div className={css.statBox}>Systems colonized: {systems?.length.toLocaleString()}</div>
          <div className={css.statBox}>Total score: {moreStats.sumScore.toLocaleString()}</div>
          <div className={css.statBox}>Total population: {moreStats.sumPop.toLocaleString()}</div>
          <div className={css.statBox}>Score/pop ratio:<CalloutMsg msg='Calculated from: <score> / <population> * 1000' iconStyle={{ fontSize: 12 }} directionalHint={DirectionalHint.bottomCenter} /> {sumRatio?.toLocaleString()}</div>
        </Stack>

        <h2 style={{ fontWeight: 'normal' }}>
          Aggregate system effects:
          <CalloutMsg msg='Calculated from completed sites only' iconStyle={{ fontSize: 12 }} directionalHint={DirectionalHint.rightCenter} />
        </h2>

        <div className={css.siteCardTable}>
          {Object.keys(moreStats.sumEffects).map(key => {
            const actual = moreStats.sumEffects[key as keyof SysEffects] ?? 0;

            return [
              <div key={`mse${key}1`}>{mapName[key]}:</div>,
              <div key={`mse${key}2`} className={css.redChevrons}>
                {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} cw={5} />}
              </div>,
              <div key={`mse${key}3`}>{asPosNegTxt(actual)}</div>,
              <div key={`mse${key}4`}>
                {actual > 0 && <Chevrons name={`sys${key}r`} count={actual} cw={5} />}
              </div>,
            ]
          })}
        </div>

        {['complete', 'build', 'plan'].map(status => <div>
          <h2 style={{ fontWeight: 'normal' }}>{mapStatusLabels[status]}: {moreStats.sumStatus[status]}</h2>

          <Stack
            horizontal wrap
            verticalAlign='center'
            tokens={{ childrenGap: 8 }}
            style={{ fontSize: 12, color: appTheme.palette.themeSecondary }}
          >
            {Object.keys(moreStats.builds[status]).sort().map(buildGroup => <div key={`bt-${buildGroup}`} className={css.statBox}>
              {moreStats.builds[status][buildGroup]} {buildGroup}
            </div>)}
          </Stack>
        </div>)}

        {excludedSystemNames && <div>
          <h2 style={{ fontWeight: 'normal' }}>Systems excluded from global statistics:</h2>

          <Stack
            horizontal wrap
            verticalAlign='center'
            tokens={{ childrenGap: 8 }}
            style={{ fontSize: 12, color: appTheme.palette.themeSecondary }}
          >
            {excludedSystemNames.map((name, i) => <div
              key={`esn-${i}`}
              className={css.statBox}
              title={moreStats.excluded[name].map(t => `● ${t}`).join(`\n`)}
            >
              {name}
            </div>)}
          </Stack>
        </div>}
      </div>
    </Panel>}

  </>;
}

const mapStatusLabels: Record<string, string> = {
  complete: 'Completed sites',
  build: 'Building in-progress',
  plan: 'Planned sites'
}
