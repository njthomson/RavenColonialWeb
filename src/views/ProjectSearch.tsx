import { DefaultButton, Icon, Link, MessageBar, MessageBarType, Modal, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { FindSystemName, ProjectCreate, ProjectLink } from '../components';
import { Cargo, Project, ProjectRef } from '../types';
import { EditProject } from '../components/EditProject/EditProject';
import { delayFocus } from '../util';
import { SystemView } from './SystemView/SystemView';
import { CopyButton } from '../components/CopyButton';
import { ImportStationsFromEDSM } from '../components/ImportStationsFromEDSM';
import { ChooseBody } from '../components/ChooseBody';
import { appTheme } from '../theme';

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
  showImportEDSM?: boolean;
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

      // TODO: figure out why scroll bars appear when we're loading bodies JIT
      // if (matches.some(m => !m.bodyName)) {
      ChooseBody.prepCache(systemName)
        .catch(err => console.error(err.stack));
      // }

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  render() {
    const { systemName, loading, errorMsg, refs, showCreate, showAddExisting, showImportEDSM } = this.state;

    const knownMarketIds = refs?.map(p => p.marketId.toString()) ?? [];

    return <div className='contain-horiz'>
      <div className='half'>
        {<FindSystemName
          text={systemName}
          onMatch={(text) => {
            if (text && text !== this.state.systemName) {
              window.location.assign(`#find=${text.trim()}`);
            }
          }}
        />}

        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

        {loading && <Spinner size={SpinnerSize.large} label={`Searching for projects in: ${systemName}`} />}

        {!loading && refs.length === 0 && systemName && <>
          <h2>
            No known projects in: {systemName}
            <span style={{ fontSize: 16 }}><CopyButton text={systemName} /></span>
          </h2>
          <div style={{ fontSize: 14, marginLeft: 20, marginTop: -10 }}>
            <Icon className='icon-inline' iconName='LightBulb' style={{ color: appTheme.palette.accent }} />
            &nbsp;
            Would you like to <Link onClick={() => this.setState({ showImportEDSM: true })}>import data from EDSM ?</Link>
          </div>
        </>}

        {!loading && this.renderActiveProjects()}

        {!loading && !showCreate && <div>
          <Stack horizontal tokens={{ childrenGap: 8 }} style={{ marginTop: 16 }}>
            <DefaultButton
              iconProps={{ iconName: 'Manufacturing' }}
              text='Start a new project?'
              onClick={() => this.setState({ showCreate: !this.state.showCreate })}
            />
            <DefaultButton
              iconProps={{ iconName: 'CityNext2' }}
              text='Add a completed project?'
              split
              menuProps={{
                items: [
                  {
                    key: 'import-from-edsm',
                    text: 'Import from EDSM ...',
                    onClick: () => {
                      this.setState({ showImportEDSM: true });
                    }
                  }
                ],
                calloutProps: {
                  style: { border: '1px solid ' + appTheme.palette.themePrimary, width: 300 }
                }
              }}
              onClick={() => this.setState({ showAddExisting: !this.state.showAddExisting })}
            />
          </Stack>

          {systemName && <SystemView systemName={systemName} projects={refs} />}
        </div>}

      </div>

      {!loading && showImportEDSM && systemName && <Modal
        allowTouchBodyScroll
        isBlocking
        isOpen={true}
        onDismiss={() => this.setState({ showImportEDSM: false })}
      >
        <ImportStationsFromEDSM systemName={systemName} projects={refs} onClose={() => this.setState({ showImportEDSM: false })} />
      </Modal>}

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
      // we need some commodities otherwise other wise server create logic applies a default template (which is not helpful in this case)
      marketId: 1,
      complete: true,
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
