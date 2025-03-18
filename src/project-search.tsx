import { MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, TextField } from '@fluentui/react';
import { apiSvcUrl, ProjectRef } from './types';
import { Component } from 'react';
import { ProjectCreate } from './project-create';
import { ProjectLink } from './misc';

interface ProjectProps {
  find: string | undefined | null;
}

interface ProjectState {
  q?: string;
  find?: string;
  loading: boolean;
  rows?: ProjectRef[];
  errorMsg?: string;
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
    window.location.reload();
  }

  findProjects = async (systemName: string) => {
    if (!systemName) { return; }
    const url = `${apiSvcUrl}/api/system/${encodeURIComponent(systemName)}`;
    console.log('ProjectSearch.fetch: begin:', url);
    this.setState({ loading: true });
    window.document.title = `Find: ${systemName}`;
    try {

      // await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await fetch(url, { method: 'GET' });

      if (response.status === 200) {
        const newRows: ProjectRef[] = await response.json();

        console.log('Project.ProjectSearch: end', newRows);
        this.setState({
          loading: false,
          rows: newRows,
        });
      } else {
        const txt = await response.text();
        const msg = `${response.status}: ${response.statusText} ${txt}`;
        this.setState({
          errorMsg: msg,
          loading: false,
        });
        console.error(msg);
      }
    } catch (err: any) {
      this.setState({
        loading: false,
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  }

  render() {
    const { q, loading, errorMsg } = this.state;

    return <div className='contain-horiz'>
      <div className='half'>
        <div className="projects-query">
          <TextField
            autoFocus
            name='systemName'
            label="System name:"
            required description="Enter complete system name"
            value={q}
            onChange={(_, v) => this.setState({ q: v })}
            disabled={loading}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { this.onFind(); }
            }}
          />
          <br />
          <PrimaryButton
            text="find"
            disabled={loading}
            onClick={this.onFind} />
        </div>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
        {this.renderRows()}
      </div>

      <div className='half right'><ProjectCreate systemName={this.props.find!} /></div>
    </div>
  }

  renderRows() {
    const { q, loading, rows, find } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Searching for projects in: ${q}`} />
    }

    if (!rows) { return; }

    if (rows.length === 0) {
      return <h2>No build projects in: <a href={`#find=${find}`}>{find}</a></h2>;
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
