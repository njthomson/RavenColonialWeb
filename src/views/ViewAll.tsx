import './ProjectView/ProjectView.css';
import { CommandBar, Icon, MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { ProjectLink } from '../components';
import { cn } from '../theme';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, KnownFC, Project } from '../types';
import { store } from '../local-storage';
import { mergeCargo } from '../util';
import { CargoGrid } from '../components/CargoGrid';

interface ViewAllProps {
}

interface ViewAllState {
  loading?: boolean;
  projects: Project[],
  linkedFC: KnownFC[],
  sumCargo: Cargo,
  autoUpdateUntil: number;
}

export class ViewAll extends Component<ViewAllProps, ViewAllState> {
  private timer?: NodeJS.Timeout;

  constructor(props: ViewAllProps) {
    super(props);

    this.state = {
      projects: [],
      linkedFC: [],
      sumCargo: {},
      autoUpdateUntil: 0,
    };
  }

  componentDidMount(): void {
    window.document.title = `Build: ${store.cmdrName}`;

    this.initialLoad().then(() => this.toggleAutoRefresh())
      .catch(err => console.error(err));
  }

  async initialLoad() {
    this.setState({ loading: true });

    await Promise.all([
      api.cmdr.getActiveProjects(store.cmdrName).then(projects => {
        this.setState({
          projects: projects,
          sumCargo: mergeCargo(projects.map(p => p.commodities))
        });
      }),

      api.cmdr.getCmdrLinkedFCs(store.cmdrName).then(linkedFC => {
        this.setState({ linkedFC });
      }),
    ]);

    this.setState({ loading: false });
  }

  render() {
    const { projects, linkedFC, autoUpdateUntil, loading } = this.state;

    return <div className='half'>
      {/* {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>} */}
      <h2 className='project-title'>

        Cmdr: {store.cmdrName} : {projects.length} projects, {linkedFC.length} Fleet Carriers
      </h2>

      <CommandBar
        className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`}
        items={[
          {
            key: 'btn-refresh',
            text: 'Refresh',
            title: !!autoUpdateUntil ? 'Click to stop auto updating' : 'Click to refresh now and auto update every 30 seconds',
            iconProps: { iconName: !!autoUpdateUntil ? 'PlaybackRate1x' : 'Refresh' },
            disabled: loading,
            onClick: () => {
              this.toggleAutoRefresh();
            }
          }
        ]}
      />
      <MessageBar messageBarType={MessageBarType.warning}      >Work in progress - this page is incomplete.</MessageBar>

      {loading && <Spinner size={SpinnerSize.medium} label={`Loading ...`} labelPosition={'right'} />}

      <CargoGrid
        cargo={this.state.sumCargo}
        linkedFC={this.state.linkedFC}
      />

      <br />
      {this.renderActiveProjects()}
    </div>;
  }

  renderActiveProjects() {
    const { projects } = this.state;

    const rows = [];
    for (const p of projects) {
      if (p.complete) continue;

      // a row the the project link
      const rowP = <li key={`cp${p.buildId}`} className='header'>
        <ProjectLink proj={p} />
        {p.buildId === store.primaryBuildId && <Icon iconName='SingleBookmarkSolid' className='icon-inline' title='This is your current primary project' />}
      </li>;
      rows.push(rowP);
    }

    return <>
      <h3>{projects.length} Active projects:</h3>
      <ul>
        {rows}
      </ul>
    </>;
  }

  toggleAutoRefresh = () => {
    if (this.state.autoUpdateUntil > 0) {
      // stop auto-refresh poll and don't refresh at this time.
      console.log(`Stopping timer at: ${new Date().toISOString()}`);
      clearTimeout(this.timer);
      this.setState({ autoUpdateUntil: 0 });
    } else {
      // start polling (which causes an immediate refresh)
      console.log(`Starting timer at: ${new Date().toISOString()}`);
      this.setState({ autoUpdateUntil: Date.now() + autoUpdateStopDuration });
      this.pollLastTimestamp(true);
    }
  };


  async pollLastTimestamp(force: boolean = false) {
    try {
      this.setState({ loading: true });

      const lasts = this.state.projects.reduce((map, p) => {
        map[p.buildId] = p.timestamp;
        return map;
      }, {} as Record<string, string>);

      // call server to see if anything changed
      const buildIds = this.state.projects.map(p => p.buildId);
      const newLasts = await Promise.all(buildIds.map(buildId => api.project.last(buildId)));

      const changedBuildIds = buildIds.filter((buildId, i) => lasts[buildId] !== newLasts[i]);
      console.debug(`pollTimestamp: changedBuildIds: [${changedBuildIds}], force: ${force}`);

      if (changedBuildIds.length > 0) {
        // something changed
        await this.initialLoad();
      }

      // schedule next poll?
      if (this.state.autoUpdateUntil > 0) {
        if (Date.now() < this.state.autoUpdateUntil) {
          this.timer = setTimeout(() => {
            this.pollLastTimestamp();
          }, autoUpdateFrequency);
        } else {
          console.log(`Stopping auto-update after one hour of no changes at: ${new Date().toISOString()}`);
          this.setState({ autoUpdateUntil: 0 });
        }
      }
    } catch (err: any) {
      console.error(`Stop auto-updating at: ${new Date()} due to:\n`, err?.message);
      this.setState({ autoUpdateUntil: 0 });
    } finally {
      this.setState({ loading: false });
    }
  }

}
