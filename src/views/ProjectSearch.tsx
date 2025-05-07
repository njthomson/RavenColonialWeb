import { ActionButton, Link, MessageBar, MessageBarType, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { FindSystemName, ProjectCreate, ProjectLink } from '../components';
import { Cargo, Project, ProjectRef } from '../types';
import { EditProject } from '../components/EditProject/EditProject';
import { delayFocus } from '../util';
import { SystemView } from './SystemView';
import { CopyButton } from '../components/CopyButton';

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
    } else {
      delayFocus('find-system-input');
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
        {<FindSystemName
          text={systemName}
          onMatch={(text) => {
            if (text && text !== this.state.systemName) {
              window.location.assign(`#find=${text}`);
            }
          }}
        />}

        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

        {loading && <Spinner size={SpinnerSize.large} label={`Searching for projects in: ${systemName}`} />}

        {!loading && refs.length === 0 && systemName && <h2>
          No known projects in: {systemName}
          <span style={{ fontSize: 16 }}> <CopyButton text={systemName} /></span>
        </h2>}

        {!loading && this.renderActiveProjects()}

        {!loading && !showCreate && <div>
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

          {systemName && refs.length > 0 && <SystemView systemName={systemName} projects={refs} />}
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
