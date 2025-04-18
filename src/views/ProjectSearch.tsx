import { ActionButton, IconButton, MessageBar, MessageBarType, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { FindSystemName, ProjectCreate, ProjectLink } from '../components';
import { ProjectRef, ProjectRefComplete } from '../types';

interface ProjectProps {
  find: string | undefined | null;
}

interface ProjectState {
  q?: string;
  find?: string;
  loading: boolean;
  rows?: ProjectRef[];
  errorMsg?: string;

  completed?: ProjectRefComplete[];
  showCompleted?: boolean;
}

export class ProjectSearch extends Component<ProjectProps, ProjectState> {
  constructor(props: ProjectProps) {
    super(props);
    this.state = {
      q: props.find ?? '',
      find: props.find ?? '',
      loading: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<ProjectProps>, prevState: Readonly<ProjectState>, snapshot?: any): void {
    if (this.state.rows?.length === 0) {
      document.getElementById('create-systemName')?.focus();
    }
  }

  componentDidMount() {
    window.document.title = `Find: ?`;
    this.findProjects(this.props.find ?? '');
  }

  onFind = () => {
    window.location.assign(`#find=${this.state.q}`);
    this.findProjects(this.state.q!);
  }

  findProjects = async (systemName: string) => {
    if (!systemName) { return; }
    this.setState({ loading: true });
    window.document.title = `Find: ${systemName}`;

    try {
      // look-up completed projects in parallel
      api.project.findCompletedBySystem(systemName)
        .then(completed => this.setState({ completed: completed }))
        .catch(err => this.setState({ loading: false, errorMsg: err.message, }));

      const matches = await api.project.findBySystem(systemName);
      this.setState({
        loading: false,
        rows: matches,
      });

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message, });
    }
  }

  render() {
    const { q, loading, errorMsg, rows, completed, showCompleted } = this.state;

    const knownMarketIds = [
      ...rows?.map(p => p.marketId.toString()) ?? [],
      ...completed?.map(p => p.marketId.toString()) ?? [],
    ];

    return <div className='contain-horiz'>
      <div className='half'>
        <h3>Find an existing project?</h3>

        <div className="projects-query">
          <Stack horizontal style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FindSystemName
              text={q}
              onMatch={(text) => {
                this.setState({ q: text });
                setTimeout(() => this.onFind(), 10);
              }}
            />
            <IconButton
              iconProps={{ iconName: 'Search' }}
              disabled={loading}
              onClick={this.onFind} />
          </Stack>
        </div>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
        {this.renderRows()}

        {completed && completed.length > 0 && <>
          <ActionButton
            iconProps={{ iconName: showCompleted ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
            text={`${completed.length} Completed projects`}
            title={showCompleted ? 'Showing completed projects' : 'Hiding completed projects'}
            onClick={() => this.setState({ showCompleted: !showCompleted })}
          />
          <ul>
            {showCompleted && completed.map(p => <li key={`pc${p.buildId}`}><ProjectLink proj={p} noSys={true} /></li>)}
          </ul>
        </>}
      </div>

      {!!completed && <div className='half right'>
        <ProjectCreate systemName={q} knownMarketIds={knownMarketIds} />
      </div>}
    </div>
  }

  renderRows() {
    const { loading, rows, find } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Searching for projects in: ${find}`} />
    }

    if (!rows) { return; }

    if (rows.length === 0) {
      return <h2>No active projects in: <a href={`#find=${find}`}>{find}</a></h2>;
    }

    if (rows.length > 0) {
      const listItems = rows.map(r => <li key={r.buildId}><ProjectLink proj={r} noSys={true} /></li>)
      return <div className="projects-list">
        <h2>{rows?.length ?? '?'} Build projects in: <a href={`#find=${find}`}>{find}</a></h2>
        <ul>
          {listItems}
        </ul>
      </div>
    }
  }
}
