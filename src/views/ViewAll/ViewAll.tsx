import './ViewAll.css';
import '../ProjectView/ProjectView.css';
import { ActionButton, Checkbox, CommandBar, DirectionalHint, Icon, Label, Link, MessageBar, MessageBarType, Modal, Spinner, SpinnerSize, Stack, TeachingBubble } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../../api';
import { CargoGrid, CargoRemaining, ChartGeneralProgress, ProjectLink } from '../../components';
import { appTheme, cn } from '../../theme';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, KnownFC, Project } from '../../types';
import { store } from '../../local-storage';
import { fcFullName, getCargoCountOnHand, mergeCargo, openDiscordLink, sumCargo, sumCargo as sumCargos } from '../../util';
import { FleetCarrier } from '../FleetCarrier';
import { CopyButton } from '../../components/CopyButton';
import { ModalCommander } from '../../components/ModalCommander';
import { HaulSize } from '../../components/BigSiteTable/BigSiteTable';

interface ViewAllProps {
}

interface ViewAllState {
  errorMsg?: string;
  loading?: boolean;
  allProjects: Project[],
  projects: Project[],
  linkedFC: KnownFC[],
  hiddenIDs: Set<string>,
  originalHiddenIDs: string,

  /** Merged cargo needs from all projects */
  sumCargo: Cargo,
  /** Merged cargo from all Fleet Carriers */
  fcCargo: Cargo,

  autoUpdateUntil: number;
  fcEditMarketId?: string;
  cmdrEdit?: boolean;
  hideLoginPrompt?: boolean;
}

export class ViewAll extends Component<ViewAllProps, ViewAllState> {
  private timer?: NodeJS.Timeout;

  constructor(props: ViewAllProps) {
    super(props);

    this.state = {
      allProjects: [],
      projects: [],
      linkedFC: [],
      hiddenIDs: new Set<string>(),
      originalHiddenIDs: '',
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
    if (!store.cmdrName) {
      console.warn('You need to sign in in for this');
      return;
    }
    this.setState({ loading: true });

    try {
      const [allProjects, linkedFC, hiddenIDs] = await Promise.all([
        // get the projects, FCs and hiddenIDs
        api.cmdr.getActiveProjects(store.cmdrName),
        api.cmdr.getAllLinkedFCs(store.cmdrName),
        api.cmdr.getHiddenIDs(store.cmdrName)
      ]);

      const projects = allProjects.filter(p => !hiddenIDs.includes(p.buildId));
      const sumCargo = mergeCargo(projects.map(p => p.commodities));
      this.setState({
        loading: false,
        allProjects, projects, sumCargo,
        linkedFC, fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
        hiddenIDs: new Set(hiddenIDs),
        originalHiddenIDs: hiddenIDs.sort().join(),
      });

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
        projects: newProjects,
        sumCargo: mergeCargo(newProjects.map(p => p.commodities))
      });

      // add artificial delay to avoid flicker on the spinner
      setTimeout(() => this.setState({ loading: false }), 500);
    } catch (err: any) {
      console.error(`Error loading data: ${err.message}`);
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  saveHiddenIDs = () => {
    this.setState({ loading: true });
    api.cmdr.setHiddenIDs(store.cmdrName, Array.from(this.state.hiddenIDs))
      .then(newHiddenIDs => {
        this.setState({ loading: false, hiddenIDs: new Set(newHiddenIDs), originalHiddenIDs: newHiddenIDs.sort().join() });
      })
      .catch((err: any) => {
        console.error(`saveHiddenIDs failed: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      });
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
      // add artificial delay to avoid flicker on the spinner
      setTimeout(() => this.setState({ loading: false }), 500);
    }
  }

  render() {
    const { errorMsg, autoUpdateUntil, loading, fcEditMarketId, sumCargo, fcCargo, cmdrEdit, hideLoginPrompt, projects, allProjects } = this.state;

    const cargoRemaining = sumCargos(sumCargo);
    const cargoOnHand = getCargoCountOnHand(sumCargo, fcCargo)
    const fcRemaining = cargoRemaining - cargoOnHand;

    if (!store.cmdrName) {
      return <div className='view-all'>

        <div style={{ margin: 20 }}>
          Commander name needed
        </div>

        {!hideLoginPrompt && <TeachingBubble
          target={'#current-cmdr'}
          headline='Greetings'
          calloutProps={{
            preventDismissOnResize: true,
            directionalHint: DirectionalHint.bottomLeftEdge,
          }}
          onDismiss={() => this.setState({ hideLoginPrompt: true })}
          primaryButtonProps={{
            text: 'Okay',
            onClick: () => {
              document.getElementById('current-cmdr')?.click();
              this.setState({ hideLoginPrompt: true });
            }
          }}
          secondaryButtonProps={{
            text: 'Maybe later',
            onClick: () => this.setState({ hideLoginPrompt: true }),
          }}
        >
          You must enter a Commander name to use this tool.
        </TeachingBubble>}
      </div>;
    }

    const whereToBuy = !projects?.length
      ? undefined
      : { refSystem: projects[0].systemName, buildIds: allProjects.map(p => p.buildId) }

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
              className: cn.bBox,
              style: { color: (loading) ? 'grey' : undefined },
              onClick: () => {
                this.toggleAutoRefresh();
              }
            },

            {
              key: 'sys-loading',
              title: 'Networking ...',
              iconProps: { iconName: 'Nav2DMapView' },
              onRender: () => {
                return !loading ? null : <div>
                  <Spinner
                    size={SpinnerSize.medium}
                    labelPosition='right'
                    label='Loading ...'
                    style={{ marginTop: 12, cursor: 'default' }}
                  />
                </div>
              },
            },
          ]}
        />
      </div>

      <div className='contain-horiz'>

        <div className='half' style={{ minWidth: 540 }}>
          <CargoGrid
            cargo={this.state.sumCargo}
            linkedFC={this.state.linkedFC}
            whereToBuy={whereToBuy}
            minWidthNeed={55}
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
    const { allProjects, projects, linkedFC, fcCargo, loading, hiddenIDs, originalHiddenIDs } = this.state;

    const mapBySystem = allProjects.reduce((map, p) => {
      if (!map[p.systemName]) { map[p.systemName] = []; }
      map[p.systemName] = [...map[p.systemName], p];
      return map;
    }, {} as Record<string, Project[]>);

    const systemRows = [];
    let first = true;
    const sortedSystems = Object.keys(mapBySystem).sort();
    for (const systemName of sortedSystems) {
      if (!first) {
        systemRows.push(<div key={`${systemName}-d`} style={{ marginTop: 8, marginBottom: 12, borderTop: `1px dashed ${appTheme.palette.themeTertiary}` }} />);
      }
      first = false;

      let checkCount = 0;
      const projCount = mapBySystem[systemName].length;

      const systemProjectRows = mapBySystem[systemName].map(p => {
        const sumNeed = sumCargos(p.commodities);
        const approxProgress = p.maxNeed - sumNeed;
        const percent = 100 / p.maxNeed * approxProgress;

        const checkProj = !hiddenIDs.has(p.buildId);
        if (checkProj) { checkCount++; }
        const countReadyOnFCs = getCargoCountOnHand(p.commodities, fcCargo);

        const projSum = sumCargo(p.commodities);
        return <div key={p.buildId} style={{ marginLeft: 32, marginTop: 4, color: checkProj ? undefined : 'grey' }}>

          <Stack horizontal verticalAlign='baseline' style={{ position: 'relative', float: 'right', marginLeft: 8, marginTop: 4 }}>
            <HaulSize haul={projSum} size={1} dim={!checkProj} />
            <span style={{ position: 'relative', marginLeft: 4, top: -1, fontSize: 12 }}>{projSum.toLocaleString()}</span>
          </Stack>

          <Stack className='project-link' horizontal tokens={{ childrenGap: 4 }} verticalAlign='center'>

            <Checkbox checked={checkProj} onChange={(e, c) => {
              // add or remove an entry
              const { hiddenIDs } = this.state;
              if (c) {
                hiddenIDs.delete(p.buildId);
              } else {
                hiddenIDs.add(p.buildId);
              }
              const projects = allProjects.filter(p => !hiddenIDs.has(p.buildId));
              const sumCargo = mergeCargo(projects.map(p => p.commodities));
              this.setState({ hiddenIDs, projects, sumCargo });
            }} />

            <ProjectLink proj={p} noSys greyIncomplete={!checkProj} incompleteLinkColor={appTheme.palette.themeTertiary} />

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
            <Label style={{ marginBottom: 2, color: checkProj ? undefined : 'grey' }}>&nbsp;&nbsp;{percent.toFixed(0)}%</Label>
          </Stack>

        </div>;
      });

      const checkSys = checkCount === projCount;

      const rowSys = <div key={systemName} style={{ marginTop: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 4 }} verticalAlign='center' style={{ fontWeight: 'bold', marginBottom: 8, color: checkSys ? undefined : 'grey' }} >

          <Checkbox checked={checkSys} indeterminate={checkCount > 0 && checkCount < projCount} onChange={(e, c) => {
            // add or remove an each project
            const { hiddenIDs } = this.state;
            for (const p of mapBySystem[systemName]) {
              if (c) {
                hiddenIDs.delete(p.buildId);
              } else {
                hiddenIDs.add(p.buildId);
              }
            }
            const projects = allProjects.filter(p => !hiddenIDs.has(p.buildId));
            const sumCargo = mergeCargo(projects.map(p => p.commodities));
            this.setState({ hiddenIDs, projects, sumCargo });
          }} />

          <Link href={`#sys=${encodeURIComponent(systemName)}`} style={{ color: checkSys ? undefined : appTheme.palette.themeTertiary }}>{systemName}</Link>
          <CopyButton text={systemName} />
          <span>{mapBySystem[systemName].length} projects</span>
        </Stack>

        {systemProjectRows}
      </div>;
      systemRows.push(rowSys);
    }

    const cmdrLinkedFC: KnownFC[] = [];
    const projectLinkedFC: KnownFC[] = [];

    const cmdrLinkedFCs = store.cmdrLinkedFCs;

    for (let fc of linkedFC) {
      let projLinked = allProjects.some(p => p.linkedFC.map(_ => _.marketId).includes(fc.marketId));
      if (projLinked) {
        projectLinkedFC.push(fc);
      } else if (!cmdrLinkedFCs) {
        cmdrLinkedFC.push(fc);
      }
      if (fc.marketId in cmdrLinkedFCs) {
        cmdrLinkedFC.push(fc);
      }
    }

    const hiddenIDsChanged = originalHiddenIDs !== Array.from(hiddenIDs).sort().join();

    return <>
      <h3 className={cn.h3}>
        {systemRows.length} Systems: {allProjects.length} active, {projects.length} chosen projects&nbsp;

        {hiddenIDsChanged && <ActionButton
          className={cn.bBox2}
          disabled={loading}
          iconProps={{ iconName: 'Save' }}
          style={{ float: 'right' }}
          text='Save'
          title='Save changes to chosen projects'
          onClick={() => this.saveHiddenIDs()}
        />}
      </h3>
      <div style={{ fontSize: 14 }}>
        {systemRows}
      </div>

      <div className='linked-fc' style={{ marginTop: 20, fontSize: 14 }}>
        <h3 className={cn.h3}>
          {linkedFC.length} Fleet Carriers:
        </h3>
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
        <h4 style={{ color: appTheme.palette.themePrimary }}>Project linked:</h4>
        <div className='hint small'>These Fleet Carriers may also be linked to your commander</div>
        <ul>
          {this.getLinkedFCRows(projectLinkedFC)}
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
