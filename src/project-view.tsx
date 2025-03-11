import { ActionButton, ComboBox, DefaultButton, IconButton, initializeIcons, IStackTokens, MessageBar, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { ProjectQuery } from './project-query';
import { apiSvcUrl, Project } from './types'
import { Component } from 'react';
import { ProjectCreate } from './project-create';
import './project-view.css';

interface ProjectViewProps {
  buildId: string | undefined | null;
}

interface ProjectViewState {
  proj?: Project;
  loading: boolean;
  showAddCmdr: boolean;
  newCmdr?: string;
  confirmDelete?: boolean;
  confirmComplete?: boolean;
  errorMsg?: string;
  assignCommodity?: string;
  assignCmdr?: string;
  editCommodities?: Record<string, number>;
  editProject?: Partial<Project>;
}

// Initialize icons in case this example uses them
initializeIcons();

export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  constructor(props: ProjectViewProps) {
    super(props);
    this.state = {
      loading: true,
      newCmdr: '',
      showAddCmdr: false,
    };
  }

  componentDidMount() {
    this.fetchProject();
  }

  async fetchProject() {
    const { buildId } = this.props;
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    const url = `${apiSvcUrl}/api/project/${buildId}`;
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
      this.setState({ loading: false });
      console.error(`${response.status}: ${response.statusText}`);
    }
  }

  render() {
    const { proj, loading, confirmDelete, confirmComplete, errorMsg, editCommodities, editProject } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Loading build project...`} />
    }

    if (!proj) {
      return <>
        <div className='half right'><ProjectCreate /></div>
        <div className='half'><ProjectQuery /></div>
      </>;
    }

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      <div className='full'>
        <h2><a href={`#find=${proj.systemName}`}>{proj.systemName}</a>: {proj.buildName} ({proj.buildType})</h2>
      </div>

      <div className='half-container'>
        {!editProject && <div className='half'>
          <h3>Commodities:</h3>
          {this.renderCommodities()}
        </div>}

        {!editCommodities && <div className='half'>
          {this.renderProjectDetails(proj, editProject!)}
        </div>}
      </div>

      <div className='full'>
        <br />
        {!editCommodities && !editProject && <>
          <DefaultButton text='Edit commodities' iconProps={{ iconName: 'AllAppsMirrored' }} onClick={() => {
            this.setState({
              editCommodities: { ...proj.commodities },
            });
          }} />
          <DefaultButton text='Mark project complete' iconProps={{ iconName: 'Completed' }} onClick={() => this.setState({ confirmComplete: true })} disabled />
          <DefaultButton text='Delete project' iconProps={{ iconName: 'Delete' }} onClick={() => this.setState({ confirmDelete: true })} />
          <DefaultButton text='Edit project' iconProps={{ iconName: 'Edit' }} onClick={() => { this.setState({ editProject: { ...proj }, }) }} />
        </>}

        <Modal isOpen={confirmDelete}>
          <h3>Are you sure you want to delete?</h3>
          <p>This cannot be undone.</p>
          <DefaultButton text='Yes' onClick={this.onProjectDelete} />
          <PrimaryButton text='No' onClick={() => this.setState({ confirmDelete: false })} />
        </Modal>
        <Modal isOpen={confirmComplete}>
          <h3>Are you sure?</h3>
          <p>Congratulations!</p>
          <PrimaryButton text='Yes' onClick={this.onProjectDelete} />
          <DefaultButton text='No' onClick={() => this.setState({ confirmComplete: false })} />
        </Modal>
      </div >
    </>;
  }

  renderCommodities() {
    const { proj, assignCommodity, assignCmdr, editCommodities } = this.state;
    if (!proj?.commodities) { return <div />; }

    const rows = [];
    const cmdrs = proj.commanders ? Object.keys(proj.commanders) : [];

    let flip = false;
    for (const key in proj.commodities) {
      flip = !flip;
      var row = this.getCommodityRow(proj, key, cmdrs, editCommodities, flip);
      rows.push(row)

      // show extra row to assign a commodity to a cmdr?
      if (assignCommodity === key && proj.commanders && !editCommodities) {
        const cmdrOptions = cmdrs
          // .filter(cmdr => proj.commanders && proj.commanders[cmdr] && !proj.commanders[cmdr].includes(key))
          .map(k => ({ key: k, text: k }))
          .sort();

        const assignRow = <tr>
          <td colSpan={3}>
            <Stack horizontal>
              <ComboBox options={cmdrOptions} selectedKey={assignCmdr} onChange={(_, o) => this.setState({ assignCmdr: `${o?.key}` })} />
              <PrimaryButton text='Assign' iconProps={{ iconName: 'Assign' }} onClick={this.onClickAssign} />
              <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ assignCommodity: undefined })} />
            </Stack>
          </td>
        </tr>;
        rows.push(assignRow);
      }
    }

    return <>
      <table className='commodities' cellSpacing={0} cellPadding={0}>
        <thead>
          <tr>
            <th className='commodity-name'>Commodity:</th>
            <th className='commodity-need'>Need:</th>
            {!editCommodities && <th className='commodity-assigned'>Assigned:</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      {editCommodities && <>
        <div>Use click / shift mouse-wheel to adjust values</div>
        <PrimaryButton text='Save commodities' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectCommodities} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ editCommodities: undefined, })} />
      </>}
    </>
  }

  private getCommodityRow(proj: Project, key: string, cmdrs: string[], editCommodities: Record<string, number> | undefined, flip: boolean) {
    const assigned = cmdrs
      .filter(k => cmdrs.some(cmdr => proj!.commanders && proj!.commanders[k].includes(key)))
      .map(k => {
        return <span className='removable' key={`$${key}-${k}`}> 📌{k}<button className='btn' title={`Remove assignment of ${key} from ${k}`} onClick={() => { this.onClickUnassign(k, key); }}>x</button></span>;
      });

    return <tr key={`cc-${key}`} className={flip ? '' : ' odd'}>
      <td className='commodity-name'>
        <span>{key}</span>
        {!editCommodities && <button className='btn-assign' onClick={() => this.setState({ assignCommodity: key })} title={`Assign a commander to commodity: ${key}`}>+</button>}
      </td>
      <td className='commodity-need'>
        {!editCommodities && proj.commodities![key].toLocaleString()}
        {editCommodities && <input className='commodity-num' type='number' value={editCommodities[key]} min={0} onChange={(ev) => {
          const ec2 = this.state.editCommodities!;
          ec2[key] = ev.target.valueAsNumber;
          this.setState({ editCommodities: ec2 });
        }} />}

      </td>
      {!editCommodities && <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>}
    </tr>;
  }

  renderProjectDetails(proj: Project, editProject: Partial<Project>) {
    const className = !!editProject ? 'project-edit' : 'project';

    return <div className={className}>
      <h3>Build:</h3>
      <table>
        <tbody>
          <tr><td>Build name:</td><td>
            {!editProject && <div className='detail'>{proj?.buildName}</div>}
            {editProject && <input type='text' value={editProject.buildName} onChange={(ev) => this.updateProjData('buildName', ev.target.value)} />}
          </td></tr>
          <tr><td>Build type:</td><td><div className='detail'>{proj?.buildType}</div></td></tr>
          <tr><td>System name:</td><td><div className='detail'>{proj?.systemName}</div></td></tr>
          <tr><td>Architect:</td><td>
            {!editProject && <div className='detail'>{proj?.architectName}</div>}
            {editProject && <input type='text' value={editProject.architectName} onChange={(ev) => this.updateProjData('architectName', ev.target.value)} />}
          </td></tr>
          <tr><td>Faction:</td><td>
            {!editProject && <div className='detail'>{proj?.factionName}</div>}
            {editProject && <input type='text' value={editProject.factionName} onChange={(ev) => this.updateProjData('factionName', ev.target.value)} />}
          </td></tr>
          <tr><td>Notes:</td><td>
            {!editProject && <div className='detail notes'>{proj?.notes}&nbsp;</div>}
            {editProject && <textarea className='notes' value={editProject.notes} onChange={(ev) => this.updateProjData('notes', ev.target.value)} />}
          </td></tr>
        </tbody>
      </table>
      {!editProject && this.renderCommanders()}

      {editProject && <>
        <PrimaryButton text='Save changes' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectDetails} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ editProject: undefined, })} />
      </>}

    </div>;
  };

  updateProjData = (key: keyof (Project), value: string) => {
    const editProject = { ...this.state.editProject } as any;

    if (editProject && typeof editProject[key] === 'string') {
      editProject[key] = value;
      this.setState({ editProject });
    }
  }

  renderCommanders() {
    const { proj, showAddCmdr, newCmdr } = this.state;
    if (!proj?.commanders) { return <div />; }

    const rows = [];
    for (const key in proj.commanders) {
      // var assigned = proj.commanders[key].map(v => <span key={`@${key}-${v}`}> 📌{v}</span>);
      var row = <li key={`@${key}`}>
        <span className='removable'>
          {key}
          <button className='btn' title={`Remove commander ${key} from this project`} onClick={() => { this.onClickCmdrRemove(key); }}>x</button>
        </span>
        {/* <span>{assigned}</span> */}
      </li>;
      rows.push(row)
    }
    const horizontalGapStackTokens: IStackTokens = {
      childrenGap: 10,
      padding: 10,
    };
    return <>
      <h3>{Object.keys(proj.commanders).length ?? 0} Commanders:</h3>
      <ul>
        {rows}
      </ul>
      <div hidden={showAddCmdr}><ActionButton text='Add a new Commander?' onClick={this.onShowAddCmdr} iconProps={{ iconName: 'AddFriend' }} /></div>
      <div className='add-cmdr' hidden={!showAddCmdr}>
        <Stack horizontal tokens={horizontalGapStackTokens}>
          <TextField
            value={newCmdr}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { this.onClickAddCmdr(); }
            }}
            onChange={(_, v) => this.setState({ newCmdr: v })}
          />
          <PrimaryButton text='Add' onClick={this.onClickAddCmdr} iconProps={{ iconName: 'Add' }} />
          <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showAddCmdr: false })} />
        </Stack>
      </div>
    </>
  }

  onClickCmdrRemove = async (cmdr: string) => {
    if (!this.state.proj?.buildId || !cmdr) { return; }

    const url = `${apiSvcUrl}/api/project/${this.state.proj.buildId}/link/${cmdr}`;
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

    const url = `${apiSvcUrl}/api/project/${this.state.proj.buildId}/link/${newCmdr}`;
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

  onClickAssign = async () => {
    const { proj, assignCommodity, assignCmdr } = this.state;
    if (!proj || !assignCmdr || !assignCommodity) { return; }

    const url = `${apiSvcUrl}/api/project/${proj?.buildId}/assign/${assignCmdr}/${assignCommodity}/`;
    console.log('onClickAssign:', url);
    const response = await fetch(url, { method: 'PUT' })
    console.log('onClickAssign:', response);

    if (response.status === 202) {
      // success - add to in-memory data
      if (!proj.commanders) { proj.commanders = {}; }
      if (!proj.commanders[assignCmdr]) { proj.commanders[assignCmdr] = []; }

      proj.commanders[assignCmdr].push(assignCommodity)
      this.setState({
        assignCommodity: undefined,
        proj
      });
    }
  }


  onClickUnassign = async (cmdr: string, commodity: string) => {
    const { proj } = this.state;
    if (!proj?.commanders || !cmdr || !commodity || !proj.commanders[cmdr]) { return; }

    const url = `${apiSvcUrl}/api/project/${proj?.buildId}/assign/${cmdr}/${commodity}/`;
    console.log('onClickAssign:', url);
    const response = await fetch(url, { method: 'DELETE' })
    console.log('onClickAssign:', response);

    if (response.status === 202) {
      // success - remove from to in-memory data

      const idx = proj.commanders[cmdr].indexOf(commodity)
      proj.commanders[cmdr].splice(idx, 1);
      this.setState({
        proj
      });
    }
  }

  onProjectDelete = async () => {
    console.log('onProjectDelete:', this.state.showAddCmdr);

    if (this.state.proj?.buildId) {
      const url = `${apiSvcUrl}/api/project/${this.state.proj?.buildId}`;
      console.log('onShowAddCmdr:', url);
      const response = await fetch(url, { method: 'DELETE' })

      if (response.status === 202) {
        // success - navigate to home
        window.location.assign(`#`);
        window.location.reload();
      }
      else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
      }
    }
  }

  onUpdateProjectCommodities = async () => {
    const { proj, editCommodities } = this.state;
    console.log('onUpdateProjectCommodities:', editCommodities);

    if (!!proj?.commodities && proj?.buildId && editCommodities) {
      const url = `${apiSvcUrl}/api/project/${proj?.buildId}`;
      console.log('onUpdateProjectCommodities:', url);
      const deltaProj = {
        buildId: proj.buildId,
        commodities: {} as Record<string, number>
      };
      // only send deltas
      for (const key in editCommodities) {
        if (proj.commodities[key] !== editCommodities[key]) {
          deltaProj.commodities[key] = editCommodities[key];
        }
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(deltaProj)
      })

      if (response.status === 200) {
        // success - apply new commodity count
        var savedProj: Project = await response.json();
        console.log('onUpdateCommodities: savedProj:', savedProj);
        this.setState({
          proj: savedProj,
          editCommodities: undefined,
        });
      }
      else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
      }
    }

  };

  onUpdateProjectDetails = async () => {
    const { proj, editProject } = this.state;
    console.log('onUpdateProjectDetails:', editProject);

    if (proj && proj?.buildId && editProject) {
      const url = `${apiSvcUrl}/api/project/${proj?.buildId}`;
      console.log('onUpdateProjectDetails:', url);
      const deltaProj: Record<string, string> = {
        buildId: proj.buildId,
      };
      // only send deltas
      for (const key in editProject) {
        const kk = key as keyof (Project);
        if (proj[kk] !== editProject[kk]) {
          deltaProj[kk] = editProject[kk]?.toString()!;
        }
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(deltaProj)
      })

      if (response.status === 200) {
        // success - apply new commodity count
        var savedProj: Project = await response.json();
        console.log('onUpdateProjectDetails: savedProj:', savedProj);
        this.setState({
          proj: savedProj,
          editProject: undefined,
        });
      }
      else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
      }
    }

  };
}
