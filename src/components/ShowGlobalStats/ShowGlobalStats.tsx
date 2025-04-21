import './ShowGlobalStats.css';
import * as api from '../../api';
import { Component, FunctionComponent, useState } from "react";
import { store } from '../../local-storage';
import { Callout, Icon, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { GlobalStats } from '../../types';
import { cn } from '../../theme';


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
      new Promise(resolve => setTimeout(resolve, 1000))
        .then(async () => {
          const stuff = await api.project.globalStats();
          store.globalStats = stuff;
          this.setState({ stats: stuff });
        });
    }
  }

  render() {
    const { stats } = this.state;

    return <div className='global-stats half'>
      <h3 className={cn.h3}>Raven Colonial Statistics:</h3>
      {!stats && <div style={{ display: 'inline-block' }}>
        <Spinner
          size={SpinnerSize.medium}
          label={`Loading  ...`}
          labelPosition='right'
        />
      </div>}

      {!!stats && <Stack horizontal wrap>
        <Stack>
          <StatsBox
            label='Projects'
            data={{ Active: stats.activeProjects, Complete: stats.completeProjects }}
          />
          <StatsBox
            label='Linked'
            data={{ Commanders: stats.commanders, 'Fleet Carriers': stats.fleetCarriers }}
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

      </Stack>}

    </div>;
  };
}


const StatsBox: FunctionComponent<{ label: string, title?: string, small?: string, data: Record<string, number> }> = (props) => {
  const [showBubble, setShowBubble] = useState(false);
  var rows = Object.entries(props.data).map(([k, v]) => <tr key={k}>
    <td className='l'>{k}:</td>
    <td className='r'>{v.toLocaleString()}</td>
  </tr>);

  const id = `k${Math.random().toString().substring(2)}`;

  return <div className={`home-box ${cn.greyer}`} title={props.title}>
    <div className='small t-right'>{props.small}</div>
    <h3 className={cn.h3} id={`${id}`} >
      {props.label}:
      &nbsp;
      {!!props.title && <>
        <Icon className='small' iconName='Info' onClick={() => setShowBubble(true)} />
        {showBubble && <Callout
          onDismiss={() => setShowBubble(false)}
          target={`#${id}`}
        >
          {props.title}
        </Callout>}
      </>}

    </h3>
    <table className='t-right' cellPadding={0} cellSpacing={0}>
      <tbody>
        {rows}
      </tbody>
    </table>
  </div>
};

