import { Project } from './top-state'
import { Component } from 'react';

interface ProjectProps {
  buildId: string;
}

interface ProjectState {
  proj?: Project;
}

export class ProjectView extends Component<ProjectProps, ProjectState> {
  constructor(props) {
    super(props);
    this.state = {};
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
        proj: newProj
      });
    } else {
      console.error(`${response.status}: ${response.statusText}`);
    }
  }

  renderCommodities() {
    const { proj } = this.state;
    if (!proj?.commodities) { return <div />; }

    const rows = [];
    for (const key in proj.commodities) {
      const assigned = Object.keys(proj.commanders)
        .filter(k => proj.commanders[k].includes(key))
        .map(k => <span>📌 {k}</span>);

      var row = <tr>
        <td className='commodity-name'>{key}</td>
        <td className='commodity-need'>{proj.commodities[key].toLocaleString()}</td>
        <td className='commodity-assigned'>{assigned}</td>
      </tr>;
      rows.push(row)
    }

    return <>
      <table>
        <thead>
          <td className='commodity-name'><h4>Commodity:</h4></td>
          <td className='commodity-need'><h4>Need:</h4></td>
          <td className='commodity-need'><h4>Assigned:</h4></td>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </>
  }


  renderCommanders() {
    const { proj } = this.state;
    if (!proj?.commanders) { return <div />; }


    const rows = [];
    for (const key in proj.commanders) {
      var assigned = proj.commanders[key].map(v => <span>📌 {v}</span>);
      var row = <li>
        {key}
        <span>{assigned}</span>
      </li>;
      rows.push(row)
    }

    return <>
      <ul>
        {rows}
      </ul>
    </>
  }

  render() {
    const { proj } = this.state;
    const commods = proj?.commodities ? Object.entries(proj.commodities) : [];

    console.log(`ProjectView.render:`, commods);
    return <>
      <div className="project">
        <h3>Build:</h3>
        <table>
          <tbody>
            <tr><td>Build name:</td>      <td>{proj?.buildName}</td></tr>
            <tr><td>Build type:</td>      <td>{proj?.buildType}</td></tr>
            <tr><td>System name:</td>    <td>{proj?.systemName}</td></tr>
            <tr><td>Architect:</td>      <td>{proj?.architectName}</td></tr>
            <tr><td>Faction:</td>      <td>{proj?.factionName}</td></tr>
          </tbody>
        </table>
        <h3>Commodities:</h3>
        {this.renderCommodities()}
        {/* <List items={commods} onRenderCell={this.renderCommodity} /> */}
        <h3>Commanders:</h3>
        {this.renderCommanders()}
      </div>
    </>;
  }
}
