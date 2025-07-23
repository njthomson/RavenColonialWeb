import './ViewAll.css';
import '../ProjectView/ProjectView.css';
import { ActionButton, CommandBar, Icon, Label, Link, MessageBar, MessageBarType, Modal, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../../api';
import { CargoGrid, CargoRemaining, ChartGeneralProgress, ProjectLink } from '../../components';
import { appTheme, cn } from '../../theme';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, KnownFC, Project } from '../../types';
import { store } from '../../local-storage';
import { fcFullName, getCargoCountOnHand, mergeCargo, openDiscordLink, sumCargo as sumCargos } from '../../util';
import { FleetCarrier } from '../FleetCarrier';
import { CopyButton } from '../../components/CopyButton';
import { ModalCommander } from '../../components/ModalCommander';

interface ViewAllProps {
}

interface ViewAllState {
  errorMsg?: string;
  loading?: boolean;
  projects: Project[],
  linkedFC: KnownFC[],

  /** Merged cargo needs from all projects */
  sumCargo: Cargo,
  /** Merged cargo from all Fleet Carriers */
  fcCargo: Cargo,

  autoUpdateUntil: number;
  fcEditMarketId?: string;
  cmdrEdit?: boolean;
}

export class ViewAll extends Component<ViewAllProps, ViewAllState> {
  private timer?: NodeJS.Timeout;

  constructor(props: ViewAllProps) {
    super(props);

    this.state = {
      projects: [],
      linkedFC: [],
      sumCargo: {},
      fcCargo: {},
      autoUpdateUntil: 0,
    };
  }

  componentDidMount(): void {
    window.document.title = `Build: ${store.cmdrName}`;

    this.fetchAll().then(() => this.toggleAutoRefresh())
      .catch(err => console.error(err));
  }

  componentWillUnmount(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  async fetchAll() {
    this.setState({ loading: true });

    try {
      await Promise.all([
        // get the projects
        api.cmdr.getActiveProjects(store.cmdrName).then(projects => {
          this.setState({
            projects: projects,
            sumCargo: mergeCargo(projects.map(p => p.commodities))
          });
        }),

        // get the FCs
        api.cmdr.getAllLinkedFCs(store.cmdrName).then(linkedFC => {
          const fcCargo = mergeCargo(linkedFC.map(fc => fc.cargo));
          this.setState({ linkedFC, fcCargo });
        }),
      ]);

      this.setState({ loading: false });
    } catch (err: any) {
      console.error(`Error loading data: ${err.message}`);
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  async fetchProject(buildId: string) {
    this.setState({ loading: true });

    try {
      // get one project
      const newProject = await api.project.get(buildId);
      const newProjects = this.state.projects.map(p => p.buildId === buildId ? newProject : p);

      this.setState({
        loading: false,
        projects: newProjects,
        sumCargo: mergeCargo(newProjects.map(p => p.commodities))
      });
    } catch (err: any) {
      console.error(`Error loading data: ${err.message}`);
      this.setState({ loading: false, errorMsg: err.message });
    }
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

      if (changedBuildIds.length === 1) {
        await this.fetchProject(changedBuildIds[0]);
      } else if (changedBuildIds.length > 1) {
        // something changed
        await this.fetchAll();
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

  render() {
    const { errorMsg, autoUpdateUntil, loading, fcEditMarketId, sumCargo, fcCargo, cmdrEdit } = this.state;

    const cargoRemaining = sumCargos(sumCargo);
    const cargoOnHand = getCargoCountOnHand(sumCargo, fcCargo)
    const fcRemaining = cargoRemaining - cargoOnHand;

    return <div className='view-all'>
      <div>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

        <h2 className='project-title'>
          All projects for: {store.cmdrName}
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

        {loading && <Spinner size={SpinnerSize.medium} label={`Loading ...`} labelPosition={'right'} />}
      </div>

      <div className='contain-horiz'>

        <div className='half'>
          <CargoGrid
            cargo={this.state.sumCargo}
            linkedFC={this.state.linkedFC}
          />
          <br />
          <CargoRemaining sumTotal={cargoRemaining} label='Remaining cargo' />
          <CargoRemaining sumTotal={fcRemaining} label='Fleet Carrier deficit' />
          <br />
        </div>

        <div className='half'>
          {this.renderActiveProjectsAndFCs()}
        </div>

      </div>

      {fcEditMarketId && <FleetCarrier
        marketId={fcEditMarketId}
        onClose={cargoUpdated => {
          // use updated cargo?
          const { linkedFC } = this.state;
          if (cargoUpdated) {
            const fc = linkedFC.find(fc => fc.marketId.toString() === fcEditMarketId);
            if (fc) { fc.cargo = cargoUpdated; }
          }

          this.setState({
            fcEditMarketId: undefined,
            linkedFC: linkedFC,
            fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
          });
        }}
      />}

      {cmdrEdit && <Modal isOpen>
        <ModalCommander onComplete={() => this.setState({ cmdrEdit: false })} preAddFC />
      </Modal>}

    </div>;
  }

  renderActiveProjectsAndFCs() {
    const { projects, linkedFC, fcCargo } = this.state;

    const mapBySystem = projects.reduce((map, p) => {
      if (!map[p.systemName]) { map[p.systemName] = []; }
      map[p.systemName] = [...map[p.systemName], p];
      return map;
    }, {} as Record<string, Project[]>);

    const systemRows = [];
    for (const systemName in mapBySystem) {
      const rowP = <li key={systemName} style={{ marginBottom: 8 }}>
        <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign='center' style={{ fontWeight: 'bold', marginBottom: 8 }} >
          <Link href={`#sys=${systemName}`} >{systemName}</Link>
          <CopyButton text={systemName} />
          <span>{mapBySystem[systemName].length} projects</span>
        </Stack>

        {mapBySystem[systemName].map(p => {
          const sumNeed = sumCargos(p.commodities);
          const approxProgress = p.maxNeed - sumNeed;
          const percent = 100 / p.maxNeed * approxProgress;

          const countReadyOnFCs = getCargoCountOnHand(p.commodities, fcCargo);

          return <div key={p.buildId} >
            <Stack className='project-link' horizontal tokens={{ childrenGap: 4 }} verticalAlign='center' >
              <ProjectLink proj={p} noSys />
              {p.discordLink && <Icon
                className='icon-btn'
                iconName='OfficeChatSolid'
                title='Open Discord link'
                onClick={() => openDiscordLink(p.discordLink)}
              />}
              {p.buildId === store.primaryBuildId && <Icon iconName='SingleBookmarkSolid' title='This is your current primary project' />}
            </Stack>

            <Stack className='project-link' horizontal tokens={{ childrenGap: 4 }} verticalAlign='center'>
              <ChartGeneralProgress maxNeed={p.maxNeed} progress={approxProgress} readyOnFC={countReadyOnFCs} minimal />
              <Label style={{ marginBottom: 2 }}>&nbsp;&nbsp;{percent.toFixed(0)}%</Label>
            </Stack>

          </div>;
        })}
      </li>;
      systemRows.push(rowP);
    }

    const cmdrLinkedFC: KnownFC[] = [];
    const projectLinkedFC: KnownFC[] = [];

    for (let fc of linkedFC) {
      let projLinked = projects.some(p => p.linkedFC.map(_ => _.marketId).includes(fc.marketId));
      if (projLinked) {
        projectLinkedFC.push(fc);
      } else {
        cmdrLinkedFC.push(fc);
      }
    }

    return <>
      <h3 className={cn.h3}>
        {systemRows.length} Systems, {projects.length} Active projects:
      </h3>
      <ul>
        {systemRows}
      </ul>

      <div className='linked-fc'>
        <h3 className={cn.h3}>
          {linkedFC.length} Fleet Carriers:
        </h3>
        <h4 style={{ color: appTheme.palette.themePrimary }}>Project linked:</h4>
        <div className='hint small'>These Fleet Carriers may also be linked to your commander</div>
        <ul>
          {this.getLinkedFCRows(projectLinkedFC)}
        </ul>
        <h4 style={{ color: appTheme.palette.themePrimary }}>
          <Stack horizontal>
            <span>Commander linked only:</span>
            <ActionButton
              iconProps={{ iconName: 'Add' }}
              text='Add'
              title='Link a new Fleet Carrier to your Commander'
              style={{
                marginLeft: 10,
                padding: 0,
                height: 22,
                backgroundColor: appTheme.palette.themeLighter,
              }}
              onClick={() => {
                this.setState({ cmdrEdit: true });
              }}
            />
          </Stack>
        </h4>
        <ul>
          {this.getLinkedFCRows(cmdrLinkedFC)}
        </ul>
      </div>
    </>;
  }

  getLinkedFCRows(fcs: KnownFC[]) {
    if (fcs.length === 0) {
      return <span className='hint' style={{ color: appTheme.palette.neutralTertiaryAlt }} >None</span>;
    }

    return fcs.map(fc => <li key={`@${fc.marketId}`}>
      <span className={`removable ${cn.removable}`}>
        {fcFullName(fc.name, fc.displayName)}
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Edit'
          title={`Edit FC: ${fc.displayName} (${fc.name})`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ fcEditMarketId: fc.marketId.toString() });
          }}
        />
      </span>
    </li>);
  }

}
