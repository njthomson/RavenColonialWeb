import { ActionButton, Icon, Label, Link, MessageBar, MessageBarType, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { FindSystemName, ProjectCreate, ProjectLink } from '../components';
import { Cargo, Project, ProjectRef } from '../types';
import { appTheme, cn } from '../theme';
import { EditProject } from '../components/EditProject/EditProject';
import { isSurfaceSite } from '../util';

interface ProjectProps {
  systemName?: string;
}

interface ProjectState {
  systemName?: string;
  loading: boolean;
  refs: ProjectRef[];
  errorMsg?: string;

  showCompleted?: boolean;
  showCreate?: boolean;
  showAddExisting?: boolean;
}

export class ProjectSearch extends Component<ProjectProps, ProjectState> {

  constructor(props: ProjectProps) {
    super(props);

    this.state = {
      refs: [],
      systemName: undefined,
      loading: false,
    };
  }

  componentDidMount() {
    window.document.title = `Find: ?`;
    if (this.props.systemName) {
      this.findProjects(this.props.systemName);
    }
  }

  componentDidUpdate(prevProps: Readonly<ProjectProps>, prevState: Readonly<ProjectState>, snapshot?: any): void {
    if (prevProps.systemName !== this.props.systemName) {
      this.findProjects(this.props.systemName)
        .catch(err => this.setState({ errorMsg: err.message }));
    }
  }

  findProjects = async (systemName?: string) => {
    if (!systemName || systemName === this.state.systemName) { return; }

    this.setState({ loading: true, systemName: systemName });
    window.document.title = `Find: ${systemName}`;
    window.location.assign(`#find=${systemName}`);

    try {
      const matches = await api.project.findAllBySystem(systemName);
      this.setState({
        loading: false,
        refs: matches,
      });

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  render() {
    const { systemName, loading, errorMsg, refs, showCreate, showAddExisting } = this.state;

    const knownMarketIds = refs?.map(p => p.marketId.toString()) ?? [];

    return <div className='contain-horiz'>
      <div className='half'>
        <h3 className={cn.h3}>Find an existing project?</h3>

        <div className="projects-query">
          <Stack horizontal style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FindSystemName
              text={systemName}
              onMatch={(text) => {
                if (text && text !== this.state.systemName) {
                  window.location.assign(`#find=${text}`);
                }
              }}
            />
          </Stack>
        </div>

        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

        {this.renderActiveProjects()}

        {!loading && !showCreate && !showAddExisting && <div>
          <ActionButton
            iconProps={{ iconName: 'Manufacturing' }}
            text='Start a new project?'
            onClick={() => this.setState({ showCreate: !this.state.showCreate })}
          />
          <ActionButton
            iconProps={{ iconName: 'CityNext2' }}
            text='Add a completed project?'
            onClick={() => this.setState({ showAddExisting: !this.state.showAddExisting })}
          />

          {!!refs.length && this.renderSystemBodies()}
        </div>}
      </div>

      {showCreate && <div className='half right'>
        <ProjectCreate
          systemName={systemName}
          knownMarketIds={knownMarketIds}
          onCancel={() => this.setState({ showCreate: false })}
        /></div>}

      {showAddExisting && this.renderAddExisting()}

    </div >
  }

  renderActiveProjects() {
    const { loading, refs, systemName } = this.state;
    const active = refs.filter(p => !p.complete);

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Searching for projects in: ${systemName}`} />
    }

    if (!!systemName && active.length === 0) {
      return <h2>No active projects in: <Link href={`#find=${systemName}`}>{systemName}</Link></h2>;
    }

    if (active.length > 0) {
      const listItems = active.map(r => <li key={r.buildId}><ProjectLink proj={r} noSys /></li>)
      return <div className="projects-list">
        <h2>{loading ? '?' : active.length} Active projects in: <Link href={`#find=${systemName}`}>{systemName}</Link></h2>
        <ul>
          {listItems}
        </ul>
      </div>
    }
  }

  renderSystemBodies() {
    const { refs } = this.state;

    const mapByBody = (refs ?? []).reduce((map, p) => {
      let bodyName = p.bodyName || 'Unknown';
      if (!map[bodyName]) { map[bodyName] = { surface: [], orbital: [] }; }
      if (isSurfaceSite(p.buildType))
        map[bodyName].surface.push(p);
      else
        map[bodyName].orbital.push(p);
      return map;
    }, {} as Record<string, { surface: ProjectRef[], orbital: ProjectRef[] }>);

    const keys = Object.keys(mapByBody)
      .filter(n => n !== 'Unknown')
      .sort();

    // force Unknown to be last in the list
    if ('Unknown' in mapByBody) {
      keys.push('Unknown');
    }

    const systemRows = [];
    for (const bodyName of keys) {
      const orbitalSites = mapByBody[bodyName].orbital.length === 0
        ? <span key={`b${bodyName}-noo`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='Communications' /> No orbital sites</span>
        : mapByBody[bodyName].orbital.map(p => <div key={p.buildId} ><ProjectLink proj={p} noSys noBold iconName={p.complete ? 'Communications' : ''} /></div>)

      const surfaceSites = mapByBody[bodyName].surface.length === 0
        ? <span key={`b${bodyName}-nos`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='MountainClimbing' /> No surface sites</span>
        : mapByBody[bodyName].surface.map(p => <div key={p.buildId} ><ProjectLink proj={p} noSys noBold iconName={p.complete ? 'MountainClimbing' : ''} /></div>)

      const rowP = <li key={`li${bodyName}`} style={{ marginBottom: 8 }}>
        <Label>{bodyName}</Label>
        {orbitalSites}
        <div style={{ margin: '4px 40px 4px -10px', height: 1, borderBottom: `1px dashed ${appTheme.palette.neutralTertiaryAlt}` }}></div>
        {surfaceSites}
      </li>;
      systemRows.push(rowP);
    }

    const architect = refs.find(p => p.architectName)?.architectName;
    const primary = refs.find(p => p.isPrimaryPort);

    return <div className='half'>
      <h3 className={cn.h3}>
        {systemRows.length} Colonised bodies:
      </h3>
      {architect && <div className='hint'>System architect: {architect}</div>}
      {!primary && <div className='hint'>⚑ No Primary port?</div>}

      <ul>
        {systemRows}
      </ul>
      <br />
    </div >;
  }

  renderAddExisting() {
    const proj = {
      systemName: this.state.systemName,
      // we need some marketId and some commodities otherwise other things kick in populate those (which is not helpful in this case)
      marketId: 1,
      commodities: { steel: 0 } as Cargo,
    } as Project;

    var ref = this.state.refs[0];
    if (ref) {
      proj.systemAddress = ref.systemAddress;
      proj.starPos = ref.starPos;
      proj.architectName = ref.architectName;
    }

    return <EditProject
      proj={proj}
      onChange={(savedProj) => {
        if (savedProj) {
          this.onExistingCreated(savedProj);
        } else {
          this.setState({ showAddExisting: false });
        }
      }}
    />;
  }

  async onExistingCreated(savedProj: Project) {
    await api.project.complete(savedProj.buildId);

    const newRefs = [
      ...this.state.refs,
      savedProj,
    ];

    this.setState({
      refs: newRefs,
      showAddExisting: false,
    });

  }
}
