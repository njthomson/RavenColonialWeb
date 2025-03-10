import { PrimaryButton, Spinner, SpinnerSize, TextField } from '@fluentui/react';
import { ProjectRef } from './top-state';
import { Component } from 'react';


interface ProjectProps {
  find: string | undefined | null;
}

interface ProjectState {
  q?: string;
  loading: boolean;
  rows?: ProjectRef[];
}


export class ProjectSearch extends Component<ProjectProps, ProjectState> {
  constructor(props: ProjectProps) {
    super(props);
    this.state = {
      q: props.find ?? '',
      loading: false,
    };
  }

  componentDidMount() {
    this.findProjects(this.props.find ?? '');
  }

  onFind = () => {
    window.location.assign(`#find=${this.state.q}`);
    this.setState({
      rows: undefined,
    })
    this.findProjects(this.state.q ?? '');
  }

  findProjects = async (qq: string) => {
    if (!qq) { return; }
    const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/system/${qq}`;
    console.log('ProjectSearch.fetch: begin:', url);
    this.setState({ loading: true });

    // await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch(url, { method: 'GET' })

    if (response.status === 200) {
      const newRows: ProjectRef[] = await response.json();

      console.log('Project.ProjectSearch: end', newRows);
      this.setState({
        loading: false,
        rows: newRows,
      });
    } else {
      console.error(`${response.status}: ${response.statusText}`);
    }
  }

  render() {
    const { q, loading } = this.state;

    return <>
      {<div className="projects-query">
        <TextField
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
      </div>}
      <hr />
      {this.renderRows()}
    </>
  }

  renderRows() {
    const { q, loading, rows } = this.state;
    const { find } = this.props;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Searching for projects within: ${q}`} />
    }

    if (!rows) { return; }

    if (rows.length === 0) {
      return <h2>No build projects in: <a href={`#find=${find}`}>{find}</a></h2>;
    }

    if (rows.length > 0) {
      const listItems = rows.map(r => <li key={r.buildId}><a href={`#build=${r.buildId}`}>{r.buildName} ({r.buildType})</a></li>)
      return <div className="projects-list">
        <h2>{rows?.length ?? '?'} Build projects in: <a href={`#find=${find}`}>{find}</a></h2>
        <ul>
          {listItems}
        </ul>
      </div>
    }
  }
}
