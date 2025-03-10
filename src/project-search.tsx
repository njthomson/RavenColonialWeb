import { List, PrimaryButton, TextField } from '@fluentui/react';
import { ProjectRef } from './top-state';
import { Component } from 'react';


interface ProjectProps {
  find: string;
}

interface ProjectState {
  q?: string;
  df: boolean;
  rows?: ProjectRef[];
}


export class ProjectSearch extends Component<ProjectProps, ProjectState> {
  constructor(props: ProjectProps) {
    super(props);
    this.state = {
      q: props.find,
      df: false,
    };
  }

  componentDidMount() {
    this.findProjects(this.props.find);
  }

  onFind = () => {
    window.location.assign(`#find=${this.state.q}`);
    this.setState({
      rows: undefined,
    })
    this.findProjects(this.state.q);
  }

  findProjects = async (qq: string) => {
    if (!qq) { return; }
    const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/system/${qq}`;
    console.log('ProjectSearch.fetch: begin:', url);
    this.setState({ df: true });

    // await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch(url, { method: 'GET' })

    if (response.status === 200) {
      const newRows: ProjectRef[] = await response.json();

      console.log('Project.ProjectSearch: end', newRows);
      this.setState({ df: false });
      this.setState({
        rows: newRows
      });
    } else {
      console.error(`${response.status}: ${response.statusText}`);
    }
  }

  onKeyDown = (event) => {
    if (event.key === 'Enter') { this.onFind(); }
  };

  render() {
    const { q, df, rows } = this.state;

    return <>
      {<div className="projects-query">
        <TextField
          label="System name:"
          required description="Enter complete system name"
          value={q}
          onChange={(_, v) => this.setState({ q: v })}
          disabled={df}
          onKeyDown={this.onKeyDown}
        />
        <br />
        <PrimaryButton
          text="find"
          disabled={df}
          onClick={this.onFind} />
      </div>}
      <hr />
      <div className="projects-list">
        <p>{rows?.length ?? '?'} Build projects in: <a>{this.props.find}</a></p>
        <List items={rows} onRenderCell={this.renderRow} />
      </div>
    </>
  }

  renderRow(row: ProjectRef, index: number) {
    const onRowClick = (ev) => {
      window.location.replace(ev.target.href);
    }

    return (
      <div data-is-focusable className={index % 2 === 0 ? 'even' : 'odd'}>
        <div>#{index}
          &nbsp;
          <a
            href={`#build=${row.buildId}`}
            onClick={onRowClick}
          >
            {row.buildName} ({row.buildType})
          </a>
        </div>
      </div>
    );
  }

}
