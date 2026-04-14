import * as api from '../../api';
import { Component } from 'react';
import { ActionButton, DirectionalHint, Icon, IconButton, Link, mergeStyleSets, Panel, PanelType, Spinner, Stack, Toggle } from '@fluentui/react';
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
import { HaulSize } from '../../components/BigSiteTable/BigSiteTable';
import { ProjectRef } from '../../types';

const css = mergeStyleSets({
  component: {
    marginTop: 40,
    cursor: 'default',
  },
  componentStack: {
    margin: '20px 0',
    '.ms-Stack-inner': { maxWidth: '100%' }
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
  },
  rowHover: {
    color: appTheme.palette.themePrimary,
    ':hover': {
      backgroundColor: appTheme.palette.themeTertiary + '!important',
      color: appTheme.palette.black,
    }
  }
});

type ArchStats = {
  sumScore: number,
  sumPop: number,
  cw: number,
  sumStatus: Record<string, number>;
  sumEffects: Record<string, number>;
  // builds: Record<string, Record<string, number>>; // retire?
  hauls: Record<string, number>; // retire?
  siteTypes: Record<string, Record<BuildStatus, number>>,
  excluded: Record<string, string[]>;
}

interface ArchitectSummaryProps {
  sysView: SystemView2;
}

interface ArchitectSummaryState {
  loading: boolean;
  systems: SysSnapshot[] | undefined;
  updatingPop: boolean;
  onlyFav: boolean;
  showMoreStats: boolean;
  moreStats: ArchStats | undefined;
  mapWindow: WindowProxy | null;

  loadingHelped?: boolean;
  refsHelped?: ProjectRef[]
  systemsHelped?: Record<string, number>;
  showHelped?: boolean;
}

export class ArchitectSummary extends Component<ArchitectSummaryProps, ArchitectSummaryState> {
  constructor(props: ArchitectSummaryProps) {
    super(props);

    this.state = {
      loading: false,
      systems: undefined,
      updatingPop: false,
      onlyFav: store.archFav,
      showMoreStats: false,
      moreStats: undefined,
      mapWindow: null,
    };
  }

  componentDidMount(): void {
    window.addEventListener('message', this.messageListener);
    this.loadData();
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.messageListener);
  }

  componentDidUpdate(prevProps: Readonly<ArchitectSummaryProps>, prevState: Readonly<ArchitectSummaryState>, snapshot?: any): void {
    const { mapWindow } = this.state;

    if (prevState.mapWindow !== mapWindow && mapWindow !== null) {
      this.postMapData();
    }
  }

  messageListener = (ev: MessageEvent) => {
    if (ev.data.ready === 'host') {
      //console.log(`!map!`, ev.data);
      this.postMapData();
    }
  }

  async postMapData() {
    const { systems, mapWindow } = this.state;
    if (!mapWindow || !systems?.length) { return; }

    // fetch helped systems if not already known
    let refsHelped = this.state.refsHelped;
    if (!refsHelped) {
      await this.loadSystemsHelped(false);
      refsHelped = this.state.refsHelped;
    }
    const helpedSystems = { ...this.state.systemsHelped ?? {} };

    const mapSystems = systems.map(d => {
      delete helpedSystems[d.name];

      const cats = [];
      if (d.fav) { cats.push(1); }
      if (d.sites.some(s => s.status === 'build')) { cats.push(2); }
      if (d.sites.some(s => s.status === 'plan')) { cats.push(3); }
      cats.push(0);
      const infos = `<a class='bl' href='/#sys=${d.name}' target='_blank' style="font-size: 12px">View: ${d.name}</a>
<br/><br/>
<table>
<tr><td>Score:</td><td>${d.score}</td></tr>
<tr><td>Population:</td><td>${d.pop?.pop.toLocaleString()}</td></tr>
<tr><td>Points:</td><td>T2: ${d.tierPoints.tier2} T3: ${d.tierPoints.tier3}</td></tr>
<tr><td><br/>Sites:</td><td/></tr>
<tr><td>Planning:</td><td>${d.sites.filter(s => s.status === 'plan').length}</td></tr>
<tr><td>Building:</td><td>${d.sites.filter(s => s.status === 'build').length}</td></tr>
<tr><td>Complete:</td><td>${d.sites.filter(s => s.status === 'complete').length}</td></tr>
<tr><td>Demolished:</td><td>${d.sites.filter(s => s.status === 'demolish').length}</td></tr>
</table>`;
      return {
        name: d.nickname ?? d.name,
        coords: { x: d.pos[0], y: d.pos[1], z: d.pos[2] },
        cat: cats,
        infos: infos,
      };
    });

    for (const key in helpedSystems) {
      const pos = refsHelped?.find(r => r.systemName === key)?.starPos ?? [0, 0, 0];
      const infos = `<a class='bl' href='/#sys=${key}' target='_blank' style="font-size: 12px">View: ${key}</a>
<br/><br/>
<div>Helped builds: ${helpedSystems[key]}</div>`;
      mapSystems.push({
        name: key,
        coords: { x: pos[0], y: pos[1], z: pos[2] },
        cat: [4],
        infos: infos,
      });
    }


    const msg = {
      source: 'opener',
      init: {
        // startAnim: false,
      },
      mapData: {
        categories: {
          'Filter:': {
            "0": { name: "Architect", color: "00ffff" },
            "1": { name: "Favourite", color: "ffff00" },
            "2": { name: "Building", color: "ff0000" },
            "3": { name: "Planning", color: "0000ff" },
            "4": { name: "Helped", color: "880088" },
          },
        },
        systems: mapSystems,
      },
    };
    mapWindow.postMessage(msg);
  }

  loadData() {
    // fetch prior systems
    this.setState({ loading: true });

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
          // builds: {},
          hauls: {},
          siteTypes: {},
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

              // if (!stats.builds[s.status]) { stats.builds[s.status] = {}; }

              const type = getSiteType(s.buildType);
              if (!type) { continue; }
              // if (!stats.builds[s.status][type.displayName2]) { stats.builds[s.status][type.displayName2] = 0; }
              // stats.builds[s.status][type.displayName2] += 1;

              if (!stats.hauls[s.status]) { stats.hauls[s.status] = 0; }
              stats.hauls[s.status] = stats.hauls[s.status] + (type?.haul ?? 0);

              if (!stats.siteTypes[type.displayName2]) { stats.siteTypes[type.displayName2] = { plan: 0, build: 0, complete: 0, demolish: 0 }; }
              stats.siteTypes[type.displayName2][s.status] += 1;
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

        const stales = snapshots.filter(s => s.stale);

        this.setState({
          systems: snapshots,
          moreStats: stats,
          loading: false,
        });

        // update any stales? (delay some or it looks spooky)
        if (!stales.length) { return; }

        setTimeout(async () => {
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
            const idx = snapshots.indexOf(snap);
            snapshots.splice(idx, 1, newSnapshot);
            this.setState({ systems: [...snapshots] });
          } catch (err: any) {
            console.error(err.stack);
          }
        }, 500);
      })
      .catch(err => {
        console.error(`getCmdrSnapshots: ${err.stack}`);
        this.props.sysView.setState({ errorMsg: err.message });
      });
  }

  async updatePops() {
    if (!this.state.systems) { return; }

    // mark all systems as pending
    const pendingSystems = this.state.systems.map(s => { return { ...s, pendingPop: true }; });
    this.setState({ systems: pendingSystems, updatingPop: true });

    pendingSystems.forEach(async snap => {
      await api.systemV2.refreshPop(snap.id64)
        .then(newPop => {
          if (!snap.pop) {
            snap.pop = newPop;
          } else {
            snap.pop.pop = newPop.pop;
            snap.pop.timeSaved = newPop.timeSaved;
            snap.pop.timeSpansh = newPop.timeSpansh;
          }
          snap.pendingPop = false;
          this.setState({ systems: pendingSystems });
        })
        .catch(err => {
          console.error(`SysPop-updateFromSpansh: ${err.stack}`);
        });
    });
    this.setState({ updatingPop: false });
  }

  async loadSystemsHelped(nextShowHelped: boolean) {
    // already loaded?
    if (!!this.state.refsHelped) {
      this.setState({ showHelped: !this.state.showHelped });
      return;
    }

    this.setState({
      loadingHelped: true,
      showHelped: nextShowHelped,
    });

    return api.cmdr.getProjectRefs(store.cmdrName)
      .then(refs => {
        // count how many projects in each system
        const map = refs.reduce((m, r) => {
          m[r.systemName] = (m[r.systemName] ?? 0) + 1;
          return m;
        }, {} as Record<string, number>);

        // alpha sort by system name
        const sorted = Object.keys(map)
          .filter(s => !!s)
          .sort((a, b) => a.localeCompare(b))
          .reduce((m, k) => {
            m[k] = map[k];
            return m;
          }, {} as Record<string, number>);

        this.setState({
          loadingHelped: false,
          refsHelped: refs,
          systemsHelped: sorted,
        });
      });
  }

  render() {
    const { loading, systems, updatingPop, onlyFav, showMoreStats, moreStats, showHelped, loadingHelped, systemsHelped } = this.state;

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
                this.setState({ systems: [...systems] });
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
                  this.setState({ systems: [...systems] });
                });
              }
            }}
          />
        </Stack>
      </div>;
    });

    const sumRatio = moreStats && moreStats.sumScore / moreStats.sumPop * 1000;
    const excludedSystemNames = moreStats?.excluded && Object.keys(moreStats?.excluded).sort();

    // calc how much horizontal space to give each site in the bars far below
    const max = Object.values(moreStats?.siteTypes ?? {}).reduce((mm, r) => {
      var rm = Object.values(r).reduce((m, v) => v > m ? v : m, 0);
      return rm > mm ? rm : mm;
    }, 0);
    const stRatio = 800 / (max * 3);

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
              onClick={() => this.updatePops()}
            />

            <div className={css.statBox}>Total score: {moreStats?.sumScore.toLocaleString()}</div>
            <ActionButton
              className={cn.bBox2}
              style={{ height: 24, fontSize: 12 }}
              iconProps={{ iconName: 'BarChart4', style: { fontSize: 12 } }}
              text='More stats'
              onClick={() => this.setState({ showMoreStats: !showMoreStats })}
            />

            <ActionButton
              className={cn.bBox2}
              style={{ height: 24, fontSize: 12 }}
              iconProps={{ iconName: 'Globe', style: { fontSize: 12 } }}
              text='Show on map'
              onClick={() => {
                const mapWindow = window.open('/#map', 'ravenMap');
                this.setState({ mapWindow });
              }}
            />

            <div style={{ marginLeft: 20, height: 24, paddingTop: 4 }}>
              <Toggle
                onText='Favourites'
                offText='Favourites'
                checked={onlyFav && !!filtered?.length}
                disabled={!filtered?.length}
                onChange={() => {
                  store.archFav = !onlyFav;
                  this.setState({ onlyFav: !onlyFav });
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

      <div style={{ fontSize: 14 }}>
        <ActionButton
          iconProps={{ iconName: showHelped ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
          text='Systems you have contributed to ...'
          title='Show systems where you have contributed to a site'
          onClick={() => {
            this.loadSystemsHelped(true);
          }}
        />

        {(showHelped) && <div style={{ justifyContent: 'left' }}>
          {/* <div style={{ marginBottom: 10, color: appTheme.palette.themeSecondary }}>Systems where you have contributed to a project site:</div> */}
          {loadingHelped && <Stack horizontal><Spinner labelPosition='right' label='Loading ...' /></Stack>}
          {systemsHelped && <>
            <div>
              <ul>
                {Object.entries(systemsHelped).map(([name, count]) => (<li key={`s${name}`}>
                  <Link onClick={() => window.location.assign(`/#sys=${encodeURIComponent(name)}`)}>
                    {name}
                    <span style={{ color: 'grey' }}> - {count} sites</span>
                  </Link>
                </li>))}
              </ul>
            </div>

            {!Object.entries(systemsHelped).length && <Stack horizontal verticalAlign='center'>
              <div style={{ marginRight: 20 }}>
                Have you not contributed to any Raven Colonial projects?
                <br />
                Search for a system above and see what you can find.
              </div>
            </Stack>}
          </>}
        </div>}
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
        onDismiss={(ev: any) => this.setState({ showMoreStats: false })}
      >
        <div style={{ cursor: 'default' }}>
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
                  {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} cw={moreStats.cw} />}
                </div>,
                <div key={`mse${key}3`}>{asPosNegTxt(actual)}</div>,
                <div key={`mse${key}4`}>
                  {actual > 0 && <Chevrons name={`sys${key}r`} count={actual} cw={moreStats.cw} />}
                </div>,
              ]
            })}
          </div>

          {/* {['complete', 'build', 'plan', 'demolish'].map(status => !moreStats.sumStatus[status] ? null : <div key={`as-${status}`}>
          <h2 style={{ fontWeight: 'normal' }}>
            <Stack horizontal verticalAlign='baseline'>
              <div>{mapStatusLabels[status]}: {moreStats.sumStatus[status]}</div>
              <div style={{ marginLeft: 20, color: 'grey', fontSize: 12 }}>Haul: ~{moreStats.hauls[status].toLocaleString()}</div>
              <HaulSize haul={moreStats.hauls[status]} size={1} />
            </Stack>
          </h2>

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
        </div>)} */}

          <div>
            <h2 style={{ fontWeight: 'normal' }}>Building site types:</h2>

            <div style={{ marginBottom: 10 }}>
              <table cellPadding={0} cellSpacing='0'>
                <tbody>
                  {['complete', 'build', 'plan', 'demolish'].map(status => <tr key={`msstt${status}`}>
                    <td>{mapStatusLabels[status]}:</td>
                    <td style={{ paddingLeft: 20, textAlign: 'right' }}>{moreStats.sumStatus[status]?.toLocaleString() ?? 0}</td>
                    {moreStats.hauls[status] && <>
                      <td style={{ paddingLeft: 20, color: 'grey', fontSize: 12 }}>Haul:</td>
                      <td>
                        <Stack horizontal verticalAlign='baseline' horizontalAlign='end'>
                          <div style={{ marginLeft: 4, color: 'grey', fontSize: 12 }}>~{moreStats.hauls[status]?.toLocaleString()}</div>
                          <HaulSize haul={moreStats.hauls[status] ?? 0} size={1} />
                        </Stack>
                      </td>
                    </>}
                  </tr>)}
                </tbody>
              </table>
            </div>

            <table cellPadding={0} cellSpacing='0'>
              <thead>
                <tr style={{ textAlign: 'left', paddingBottom: 10 }}>
                  <th className={cn.bbr}>Type</th>
                  <th className={cn.bbr}>Completed</th>
                  <th className={cn.bbr}>Building</th>
                  <th className={cn.bbr}>Planning</th>
                  <th className={cn.bb}>Demolished</th>
                </tr>
              </thead>

              <tbody>
                {Object.keys(moreStats.siteTypes).sort().map((displayName2, i) => {
                  const max = Object.values(moreStats.siteTypes[displayName2]).reduce((c, v) => c + v, 0);
                  if (max === 0) { return null; }

                  return <tr className={css.rowHover} key={`msst${displayName2}`} style={{ textAlign: 'center', backgroundColor: i % 2 ? appTheme.palette.neutralQuaternaryAlt : '' }}>
                    <td className={`${cn.br}`} style={{ paddingRight: 4, paddingBottom: 0, textAlign: 'left' }}>{displayName2}</td>
                    <td className={cn.br}>{getColorBlock(moreStats.siteTypes, displayName2, 'complete', stRatio)}</td>
                    <td className={cn.br}>{getColorBlock(moreStats.siteTypes, displayName2, 'build', stRatio)}</td>
                    <td className={cn.br}>{getColorBlock(moreStats.siteTypes, displayName2, 'plan', stRatio)}</td>
                    <td>{getColorBlock(moreStats.siteTypes, displayName2, 'demolish', stRatio)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          {excludedSystemNames && <div>
            <h2 style={{ fontWeight: 'normal' }}>Systems excluded from global statistics:</h2>

            <Stack
              horizontal wrap
              verticalAlign='center'
              tokens={{ childrenGap: 8 }}
              style={{ fontSize: 12, color: appTheme.palette.themeSecondary }}
            >
              {excludedSystemNames.map((name, i) => <Link
                key={`esn-${i}`}
                className={css.statBox}
                title={moreStats.excluded[name].map(t => `● ${t}`).join(`\n`)}
                target='_blank'
                href={`/#sys=${name}`}
              >
                {name}
              </Link>)}
            </Stack>
          </div>}
        </div>
      </Panel>}

    </>;
  }
}

const getColorBlock = (map: Record<string, Record<BuildStatus, number>>, displayName2: string, status: BuildStatus, stRatio: number) => {
  const v = map[displayName2][status];
  if (v === 0) { return null; }

  return <div style={{
    backgroundColor: mapStatusColors[status],
    color: 'wheat',
    width: stRatio * v,
    margin: 1,
  }}
  >
    {v}
  </div>;
}

const mapStatusLabels: Record<string, string> = {
  complete: 'Completed sites',
  build: 'Building in-progress',
  plan: 'Planned sites',
  demolish: 'Demolished sites',
}

const mapStatusColors: Record<string, string> = {
  complete: 'rgb(0, 100, 0)',
  build: 'rgb(100, 0, 0)',
  plan: 'rgb(40, 40, 119)',
  demolish: 'rgb(50, 50, 50)',
}
