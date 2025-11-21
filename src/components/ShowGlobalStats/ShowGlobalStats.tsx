import './ShowGlobalStats.css';
import * as api from '../../api';
import { Component, FunctionComponent } from "react";
import { store } from '../../local-storage';
import { DirectionalHint, Link, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { GlobalStats } from '../../types';
import { cn } from '../../theme';
import { CalloutMsg } from '../CalloutMsg';
import { delay } from '../../util';


interface ShowGlobalStatsProps { }

interface ShowGlobalStatsState {
  stats?: GlobalStats;
}

export class ShowGlobalStats extends Component<ShowGlobalStatsProps, ShowGlobalStatsState> {

  constructor(props: ShowGlobalStatsProps) {
    super(props);

    let initialStats = store.globalStats;
    const currentTimeStamp = new Date().toISOString().substring(0, 13) + ':00:00Z';

    this.state = {
      // only use cached stats if timestamp is valid
      stats: currentTimeStamp === initialStats?.timeStamp ? initialStats : undefined,
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
    const { stats } = this.state;

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

    return <div className='global-stats half'>
      <h3 className={cn.h3}>Raven Colonial Statistics:</h3>

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

      <Stack horizontal>
        < StatsBox2 label='Top systems by score' data={stats.topSystemScores} />
        < StatsBox2 label='Top systems by population' data={stats.topSystemPops} />
      </Stack>

      {/* NOT QUITE READY
      <Stack horizontal wrap style={{ maxWidth: 800 }}>
        <StatsBox2 label='Top systems by Pop' data={stats.topSystemEffects['+pop']} count={5} />
        <StatsBox2 label='Top systems by MPop' data={stats.topSystemEffects['+mpop']} count={5} />
        <StatsBox2 label='Top systems by Sec' data={stats.topSystemEffects['+sec']} count={5} />
        <StatsBox2 label='Bottom systems by Sec' data={stats.topSystemEffects['-sec']} count={5} negative />
        <StatsBox2 label='Top systems by Wealth' data={stats.topSystemEffects['+wealth']} count={5} />
        <StatsBox2 label='Top systems by Tech' data={stats.topSystemEffects['+tech']} count={5} />
        <StatsBox2 label='Top systems by SoL' data={stats.topSystemEffects['+sol']} count={5} />
        <StatsBox2 label='Bottom systems by SoL' data={stats.topSystemEffects['-sol']} count={5} negative />
        <StatsBox2 label='Top systems by Dev' data={stats.topSystemEffects['+dev']} count={5} />
      </Stack>
      */}
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

const StatsBox2: FunctionComponent<{ label: string, title?: string, data: Record<number, Record<string, string>>, count?: number, negative?: boolean }> = (props) => {
  if (!props.data) { return null; }

  const rows: JSX.Element[] = [];
  let i = 0;
  const sorted = Object.keys(props.data)
    .map(t => parseFloat(t))
    .sort((a, b) => props.negative ? a - b : b - a)
    .slice(0, props.count ?? 10);

  for (const k of sorted) {
    let score = k.toLocaleString();
    if (k > 1_000_000_000) {
      score = (k / 1_000_000_000).toFixed(2) + ` B`;
    } else if (k > 1_000_000) {
      score = (k / 1_000_000).toFixed(2) + ` M`;
    }

    const hits = Object.entries(props.data[k as any] ?? []);
    rows.push(<div key={`${props.label}-${k}${++i}`} style={{ gridRow: `span ${hits.length}` }}>{score}</div>);

    hits.forEach(([n, a], i) => {
      rows.push(<div key={`${props.label}-${k}${++i}`}><Link href={`/#sys=${n}`}>{n}</Link></div>);
      rows.push(<div key={`${props.label}-${k}${++i}`} style={{ fontSize: 10 }}>{a}</div>);
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

