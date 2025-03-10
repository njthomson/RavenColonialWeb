import { ActionButton, PrimaryButton, Spinner, SpinnerSize, TextField } from '@fluentui/react';
import { ProjectQuery } from './project-query';
import { Project } from './top-state'
import { Component } from 'react';

interface ProjectProps {
  buildId: string | undefined | null;
}

interface ProjectState {
  proj?: Project;
  loading: boolean;
  showAddCmdr: boolean;
  newCmdr?: string;
}

export class ProjectView extends Component<ProjectProps, ProjectState> {
  constructor(props: ProjectProps) {
    super(props);
    this.state = {
      loading: false,
      newCmdr: '',
      showAddCmdr: false,
    };
  }

  componentDidMount() {
    this.fetchProject();
  }

  async fetchProject() {
    const { buildId } = this.props;
    const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/project/${buildId}`;
    console.log('Project.fetch: begin buildId:', url);

    // await new Promise(resolve => setTimeout(resolve, 250));
    const response = await fetch(url, { method: 'GET' })

    if (response.status === 200) {
      const newProj: Project = await response.json();

      console.log('Project.fetch: end buildId:', newProj);
      this.setState({
        proj: newProj,
        loading: false,
      });
    } else {
      console.error(`${response.status}: ${response.statusText}`);
    }
  }

  render() {
    const { loading, proj } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Loading build project...`} />
    }

    if (!proj) {
      return <>
        <ProjectQuery />
      </>;
    }

    return <>
      <div className="project">
        <h3>Build:</h3>
        <table>
          <tbody>
            <tr><td>Build name:</td><td>{proj?.buildName}</td></tr>
            <tr><td>Build type:</td><td>{proj?.buildType}</td></tr>
            <tr><td>System name:</td><td>{proj?.systemName}</td></tr>
            <tr><td>Architect:</td><td>{proj?.architectName}</td></tr>
            <tr><td>Faction:</td><td>{proj?.factionName}</td></tr>
          </tbody>
        </table>

        <h3>Commodities:</h3>
        {this.renderCommodities()}

        <h3>Commanders:</h3>
        {this.renderCommanders()}
      </div>
    </>;
  }

  renderCommodities() {
    const { proj } = this.state;
    if (!proj?.commodities) { return <div />; }

    const rows = [];
    const cmdrs = proj.commanders ? Object.keys(proj.commanders) : [];
    for (const key in proj.commodities) {
      const assigned = cmdrs
        .filter(k => cmdrs.some(cmdr => proj.commanders && proj.commanders[k].includes(key)))
        .map(k => <span key={`$${key}-${k}`}> 📌{k}</span>);

      var row = <tr key={`cc-${key}`}>
        <td className='commodity-name'>{key}</td>
        <td className='commodity-need'>{proj.commodities[key].toLocaleString()}</td>
        <td className='commodity-assigned'>{assigned}</td>
      </tr>;
      rows.push(row)
    }

    return <>
      <table>
        <thead>
          <tr>
            <th className='commodity-name'>Commodity:</th>
            <th className='commodity-need'>Need:</th>
            <th className='commodity-assigned'>Assigned:</th>
          </tr>
        </thead>

        <tbody>{rows}</tbody>
      </table>
    </>
  }

  renderCommanders() {
    const { proj, showAddCmdr, newCmdr } = this.state;
    if (!proj?.commanders) { return <div />; }

    const rows = [];
    for (const key in proj.commanders) {
      var assigned = proj.commanders[key].map(v => <span key={`@${key}-${v}`}> 📌{v}</span>);
      var row = <li key={`@${key}`}>
        <span className='cmdr'>
          {key}
          <button className='remove' onClick={() => {
            this.onClickCmdrRemove(key);
          }}>x</button>
        </span>
        <span>{assigned}</span>
      </li>;
      rows.push(row)
    }
    return <>
      <div hidden={showAddCmdr}><ActionButton text='+ Add a new Commander?' onClick={this.onShowAddCmdr} /></div>
      <div className='add-cmdr' hidden={!showAddCmdr}>
        <TextField
          label='Who:'
          value={newCmdr}
          onChange={(_, v) => this.setState({ newCmdr: v })}
        />
        <PrimaryButton text='+ Add' onClick={this.onClickAddCmdr} />
      </div>
      <ul>
        {rows}
      </ul>
    </>
  }

  onClickCmdrRemove = async (cmdr: string) => {
    if (!this.state.proj?.buildId || !cmdr) { return; }

    const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/project/${this.state.proj.buildId}/link/${cmdr}`;
    console.log('onClickCmdrRemove:', url);
    const response = await fetch(url, { method: 'DELETE' })
    console.log('onClickCmdrRemove:', response);

    if (response.status === 202) {
      // success - remove from in-memory data
      const { proj } = this.state;
      if (!proj.commanders) { proj.commanders = {}; }
      delete proj.commanders[cmdr];
      this.setState({ proj });
    }
  }

  onShowAddCmdr = () => {
    console.log('onShowAddCmdr:', this.state.showAddCmdr);
    this.setState({ showAddCmdr: true })
  }

  onClickAddCmdr = async () => {
    if (!this.state.proj?.buildId || !this.state.newCmdr) {
      this.setState({
        showAddCmdr: false,
        newCmdr: '',
      });
      return;
    }
    const { newCmdr } = this.state;

    const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/project/${this.state.proj.buildId}/link/${newCmdr}`;
    console.log('onShowAddCmdr:', url);
    const response = await fetch(url, { method: 'PUT' })
    console.log('onShowAddCmdr:', response);

    if (response.status === 202) {
      // success - add to in-memory data
      const { proj } = this.state;
      if (!proj.commanders) { proj.commanders = {}; }
      proj.commanders[newCmdr] = [];
      this.setState({
        showAddCmdr: false,
        newCmdr: '',
        proj
      });
    }
  }
}

// const Commander: FunctionComponent<{ cmdr: string, buildId: string }> = (props) => {
//   const { buildId, cmdr } = props;

//   const onRemove = async () => {
//     console.log('Commander.onRemove:', cmdr);

//     const url = `https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/project/${this.state.proj.buildId}/link/${newCmdr}`;
//     console.log('Commander.onRemove:', url);
//     const response = await fetch(url, { method: 'PUT' })
//     console.log('Commander.onRemove:', response);


//   }


//   return <span className='cmdr'>
//     {cmdr}
//     <button className='remove' onClick={onRemove}>x</button>

//   </span>;
// };