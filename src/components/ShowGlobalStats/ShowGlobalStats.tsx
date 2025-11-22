import './ShowGlobalStats.css';
import * as api from '../../api';
import { Component, FunctionComponent } from "react";
import { store } from '../../local-storage';
import { DefaultButton, DirectionalHint, Link, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { GlobalStats } from '../../types';
import { cn } from '../../theme';
import { CalloutMsg } from '../CalloutMsg';
import { delay } from '../../util';

interface ShowGlobalStatsProps { }

type ShowGroup = 'tops' | 'others' | 'pops' | 'sec' | 'sol';
interface ShowGlobalStatsState {
  stats?: GlobalStats;
  showGroup: Set<ShowGroup>
}

export class ShowGlobalStats extends Component<ShowGlobalStatsProps, ShowGlobalStatsState> {

  constructor(props: ShowGlobalStatsProps) {
    super(props);

    let initialStats = store.globalStats;
    const currentTimeStamp = new Date().toISOString().substring(0, 13) + ':00:00Z';

    this.state = {
      // only use cached stats if timestamp is valid
      stats: currentTimeStamp === initialStats?.timeStamp ? initialStats : undefined,
      showGroup: new Set(['tops']),
    };
  }

  componentDidMount(): void {
    // fetch stats if we have none cached
    if (!this.state.stats) {
      // add a little artificial delay so the spinner doesn't flicker in and out
      delay(1000)
        .then(async () => {
          const stuff = await api.project.globalStats();
          store.globalStats = stuff;
          this.setState({ stats: stuff });
        });
    }
  }

  render() {
    const { stats, showGroup } = this.state;

    if (!stats) {
      return <div className='global-stats half'>
        <h3 className={cn.h3}>Raven Colonial Statistics:</h3>
        <div style={{ display: 'inline-block' }}>
          <Spinner
            size={SpinnerSize.medium}
            label={`Loading  ...`}
            labelPosition='right'
          />
        </div>
      </div>;
    }

    const topSystemRatios = Object.keys(stats.topSystemRatios).map(t => parseFloat(t)).reduce((m, k) => {
      const v = k * 1000;
      m[v] = stats.topSystemRatios[k];
      return m;
    }, {} as Record<number, Record<string, string>>);

    const disclaimer = <div>
      <div>• Statistics are generated hourly.</div>
      <div>• Systems with no  population or bogus conditions are not considered.</div>
      <div>• Systems stats are calculated using only completed sites and with buff/nerf applied.</div>
    </div>;

    return <div className='global-stats half'>
      <h3 className={cn.h3}>
        <span>Raven Colonial Statistics: </span>
        <CalloutMsg msg={disclaimer} iconStyle={{ fontSize: 12 }} />
      </h3>

      <Stack horizontal>
        <Stack>
          <StatsBox
            label='Projects'
            data={{ Active: stats.activeProjects, Complete: stats.completeProjects }}
          />
          <StatsBox
            label='Linked'
            data={{ Commanders: Math.max(stats.totalArchitects, stats.commanders), 'Fleet Carriers': stats.fleetCarriers, Systems: stats.totalPlannedSystems }}
          />
          {/* <StatsBox
            label='Deliveries'
            data={{ Count: stats.countDeliveriesEver, Volume: stats.totalDeliveredEver }}
          /> */}
          <StatsBox
            small='Last 7 days'
            label='Deliveries'
            data={{ Count: stats.countDeliveries7d, Volume: stats.totalDelivered7d }}
          />
        </Stack>

        <StatsBox
          small='Last 7 days'
          label='Top Contributors'
          title='Top Commanders by volume of cargo delivered.'
          data={stats.topContributors7d}
        />

        <StatsBox
          small='Last 7 days'
          label='Top Helpers'
          title='Top Commanders by count of projects they have contributed to.'
          data={stats.topHelpers7d}
        />

        <StatsBox
          small='&nbsp;'
          label='Most Systems'
          data={stats.topArchitects}
        />
      </Stack>

      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
        <span>Systems by:</span>
        {(Object.keys(mapGroups) as ShowGroup[]).map(k => <DefaultButton
          key={k}
          className={cn.bBox2}
          style={{ height: 28 }}
          text={mapGroups[k]}
          checked={showGroup.has(k)}
          iconProps={{ iconName: showGroup.has(k) ? 'CheckMark' : undefined }}
          onClick={ev => {
            if (ev.ctrlKey) {
              // add/remove groups if CTRL is being held
              if (showGroup.has(k)) {
                showGroup.delete(k);
              } else {
                showGroup.add(k);
              }
              this.setState({ showGroup });
            } else {
              // otherwise replace current groups
              this.setState({ showGroup: new Set([k]) });
            }
          }}
        />)}
      </Stack>


      {showGroup.has('tops') && <Stack horizontal>
        <StatsBox2 keyPrefix='topSysRatio' label='Top systems' data={topSystemRatios} title='Calculated from: <system score> / <system population> * 1000' />
        <StatsBox2 keyPrefix='topSysScore' label='Top systems by score' data={stats.topSystemScores} />
        <StatsBox2 keyPrefix='topSysPop' label='Top systems by population' data={stats.topSystemPops} />
      </Stack>}

      {showGroup.has('pops') && <Stack horizontal>
        <StatsBox2 keyPrefix='pop' label='Top systems by Pop' data={stats.topSystemEffects['+pop']} />
        <StatsBox2 keyPrefix='mpop' label='Top systems by MPop' data={stats.topSystemEffects['+mpop']} />
      </Stack>}

      {showGroup.has('others') && <Stack horizontal>
        <StatsBox2 keyPrefix='wealth' label='Top systems by Wealth' data={stats.topSystemEffects['+wealth']} />
        <StatsBox2 keyPrefix='tech' label='Top systems by Tech' data={stats.topSystemEffects['+tech']} />
        <StatsBox2 keyPrefix='dev' label='Top systems by Dev' data={stats.topSystemEffects['+dev']} />
      </Stack>}

      {showGroup.has('sec') && <Stack horizontal>
        <StatsBox2 keyPrefix='sec+' label='Top systems by Sec' data={stats.topSystemEffects['+sec']} />
        <StatsBox2 keyPrefix='sec-' label='Bottom systems by Sec' data={stats.topSystemEffects['-sec']} negative />
      </Stack>}

      {showGroup.has('sol') && <Stack horizontal>
        <StatsBox2 keyPrefix='sol+' label='Top systems by SoL' data={stats.topSystemEffects['+sol']} />
        <StatsBox2 keyPrefix='sol-' label='Bottom systems by SoL' data={stats.topSystemEffects['-sol']} negative />
      </Stack>}

    </div>;
  };
}

const StatsBox: FunctionComponent<{ label: string, title?: string, small?: string, data: Record<string, number> }> = (props) => {
  const rows = Object.entries(props.data).map(([k, v]) => <tr key={k}>
    <td className='l'>{k}:</td>
    <td className='r'>{v.toLocaleString()}</td>
  </tr>);

  return <div className={`home-box ${cn.greyer}`} title={props.title}>
    <div className='small t-right'>{props.small}</div>
    <h3 className={cn.h3}>
      {props.label}:
      &nbsp;
      {!!props.title && <CalloutMsg msg={props.title} iconStyle={{ fontSize: 12 }} directionalHint={DirectionalHint.topCenter} />}
    </h3>
    <table className='t-right' cellPadding={0} cellSpacing={0}>
      <tbody>
        {rows}
      </tbody>
    </table>
  </div>
};

const StatsBox2: FunctionComponent<{ keyPrefix: string, label: string, title?: string, data: Record<number, Record<string, string>>, count?: number, negative?: boolean }> = (props) => {
  if (!props.data) { return null; }

  const rows: JSX.Element[] = [];
  let i = 0;
  const sorted = Object.keys(props.data)
    .map(t => parseFloat(t))
    .sort((a, b) => props.negative ? a - b : b - a)
    .slice(0, props.count ?? 10);

  for (const k of sorted) {
    i++;
    let score = k.toLocaleString();
    if (k > 1_000_000_000) {
      score = (k / 1_000_000_000).toFixed(2) + ` B`;
    } else if (k > 1_000_000) {
      score = (k / 1_000_000).toFixed(2) + ` M`;
    }

    const hits = Object.entries(props.data[k as any] ?? []);
    rows.push(<div key={`${props.keyPrefix}-${k}-${i}a`} style={{ gridRow: `span ${hits.length}` }}>{score}</div>);
    // 
    hits.forEach(([n, a], i) => {
      const url = `/#sys=${encodeURIComponent(mapSpecialNames[n] ?? n)}`;
      rows.push(<div key={`${props.keyPrefix}-${k}-${i}b`}><Link href={url}>{n}</Link></div>);
      rows.push(<div key={`${props.keyPrefix}-${k}-${i}c`} style={{ fontSize: 10 }}>{a}</div>);
    });
  }

  return <div className={`home-box ${cn.greyer}`} title={props.title}>
    <h3 className={cn.h3}>
      {props.label}:
      &nbsp;
      {!!props.title && <CalloutMsg msg={props.title} iconStyle={{ fontSize: 12 }} directionalHint={DirectionalHint.topCenter} />}
    </h3>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'max-content max-content max-content',
      gap: '2px 10px',
      fontSize: '14px',
    }}>
      {rows}
    </div>

  </div>
};

const mapSpecialNames: Record<string, string> = {
  '2MASS J05351131+1000502': '9472415114065'
}

const mapGroups: Record<ShowGroup, string> = {
  tops: 'Score + Population',
  pops: 'Pop + MPop',
  others: 'Wealth + Tech + Dev',
  sec: 'Security',
  sol: 'Standard of Living',
}