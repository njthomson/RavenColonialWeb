import { ActionButton, ComboBox, CommandBar, DefaultButton, ICommandBarItemProps, IconButton, IStackTokens, MessageBar, MessageBarButton, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { ProjectQuery } from './project-query';
import { apiSvcUrl, mapCommodityNames, Project } from './types'
import { Component } from 'react';
import { ProjectCreate } from './project-create';
import './project-view.css';
import { Store } from './local-storage';
import { CargoRemaining, CommodityIcon } from './misc';

interface ProjectViewProps {
  buildId?: string;
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
  disableDelete?: boolean;
  fixMarketId?: string;
}


export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  constructor(props: ProjectViewProps) {
    super(props);
    this.state = {
      loading: true,
      newCmdr: '',
      showAddCmdr: false,
      disableDelete: true,
    };
  }

  componentDidMount() {
    this.fetchProject(this.props.buildId);
  }

  componentDidUpdate(prevProps: Readonly<ProjectViewProps>, prevState: Readonly<ProjectViewState>, snapshot?: any): void {
    if (this.props.buildId && prevState.proj?.buildId && prevState.proj.buildId !== this.props.buildId) {
      this.fetchProject(this.props.buildId);
    }

    // document.getElementById('auto-focus')?.focus();
  }

  async fetchProject(buildId: string | undefined) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}`;
    console.log('Project.fetch: begin buildId:', url);

    // await new Promise(resolve => setTimeout(resolve, 250));
    const response = await fetch(url, { method: 'GET' })

    if (response.status === 200) {
      const newProj: Project = await response.json();

      console.log('Project.fetch: end buildId:', newProj);
      Store.addRecentProject(newProj);

      const cmdrName = Store.getCmdr()?.name;
      this.setState({
        proj: newProj,
        loading: false,
        disableDelete: !!cmdrName && (!newProj.architectName || newProj.architectName.toLowerCase() !== cmdrName.toLowerCase()),
      });
      window.document.title = `Build: ${newProj.buildName} in ${newProj.systemName}`;
    } else if (response.status === 404 && buildId) {
      this.setState({
        loading: false,
        errorMsg: 'No project found by that ID',
      });
      Store.removeRecentProject(buildId);
      window.document.title = `Build: ?`;
    } else {
      const msg = `${response.status}: ${response.statusText}`;
      this.setState({
        loading: false,
        errorMsg: msg,
      });
      console.error(msg);
    }
  }

  render() {
    const { proj, loading, confirmDelete, confirmComplete, errorMsg, editCommodities, editProject, disableDelete } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Loading build project...`} />
    }

    if (!proj) {
      return <div className='contain-horiz'>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
        <div className='half'><ProjectQuery /></div>
        <div className='half right'><ProjectCreate /></div>
      </div>;
    }

    const cmds: ICommandBarItemProps[] = [{
      key: 'edit-commodities', text: 'Edit commodities',
      iconProps: { iconName: 'AllAppsMirrored' },
      onClick: () => this.setState({ editCommodities: { ...this.state.proj?.commodities } }),
    }, {
      key: 'btn-edit', text: 'Edit project',
      iconProps: { iconName: 'Edit' },
      onClick: () => this.setState({ editProject: { ...this.state.proj } }),
    }, {
      key: 'btn-complete', text: 'Complete',
      iconProps: { iconName: 'Completed' },
      disabled: true,
      onClick: () => this.setState({ confirmComplete: true }),
    }, {
      key: 'btn-delete', text: 'Delete',
      iconProps: { iconName: 'Delete' },
      disabled: disableDelete,
      onClick: () => this.setState({ confirmDelete: true }),
    }]

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      <div className='full'>
        <h2><a href={`#find=${proj.systemName}`}>{proj.systemName}</a>: {proj.buildName} ({proj.buildType})</h2>
        {proj.marketId <= 0 && this.renderMissingMarketId()}
        {!editCommodities && !editProject && <CommandBar className='top-bar' items={cmds} />}
      </div >

      <div className='contain-horiz'>
        {!editProject && <div className='half'>
          {!editCommodities && <h3>Commodities:</h3>}
          {this.renderCommodities()}
        </div>}

        {!editCommodities && <div className='half'>
          {this.renderProjectDetails(proj, editProject!)}
          {/* {this.renderStats()} */}
        </div>}
      </div>

      <Modal isOpen={confirmDelete} onDismiss={() => this.setState({ confirmDelete: false })}>
        <h3>Are you sure you want to delete?</h3>
        <p>This cannot be undone.</p>
        <DefaultButton text='Yes' onClick={this.onProjectDelete} style={{ backgroundColor: '#FF8844' }} />
        &nbsp;
        <DefaultButton text='No' onClick={() => this.setState({ confirmDelete: false })} autoFocus />
      </Modal>
      <Modal isOpen={confirmComplete}>
        <h3>Are you sure?</h3>
        <p>Congratulations!</p>
        <PrimaryButton text='Yes' onClick={this.onProjectDelete} />
        &nbsp;
        <DefaultButton text='No' onClick={() => this.setState({ confirmComplete: false })} />
      </Modal>
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
      var row = this.getCommodityRow(proj, key, cmdrs, editCommodities, flip, rows.length === 0);
      rows.push(row)

      // show extra row to assign a commodity to a cmdr?
      if (assignCommodity === key && proj.commanders && !editCommodities) {
        if (Object.keys(proj.commanders).length === 0) {
          // show a warning when there's no cmdrs to add
          rows.push(<tr key={`c${key}`}>
            <td colSpan={3}>
              <MessageBar messageBarType={MessageBarType.warning} onDismiss={() => this.setState({ assignCommodity: undefined })} >You need to add cmdrs first</MessageBar>
            </td>
          </tr>
          );
        } else {
          const cmdrOptions = cmdrs
            // .filter(cmdr => proj.commanders && proj.commanders[cmdr] && !proj.commanders[cmdr].includes(key))
            .map(k => ({ key: k, text: k }))
            .sort();

          const assignRow = <tr key='c-edit'>
            <td colSpan={3}>
              <Stack horizontal>
                <ComboBox autoFocus options={cmdrOptions} selectedKey={assignCmdr} onChange={(_, o) => this.setState({ assignCmdr: `${o?.key}` })} />
                <IconButton title='Assign' iconProps={{ iconName: 'Add' }} onClick={this.onClickAssign} />
                <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ assignCommodity: undefined })} />
              </Stack>
            </td>
          </tr>;
          rows.push(assignRow);
        }
      }
    }

    const sumTotal = Object.values(proj.commodities).reduce((total, current) => total += current, 0);

    return <>
      {editCommodities && <>
        <PrimaryButton text='Save commodities' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectCommodities} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ editCommodities: undefined, })} />
      </>}

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

      {!editCommodities && <CargoRemaining sumTotal={sumTotal} />}
    </>
  }

  private getCommodityRow(proj: Project, key: string, cmdrs: string[], editCommodities: Record<string, number> | undefined, flip: boolean, first: boolean) {
    const assigned = cmdrs
      .filter(k => cmdrs.some(cmdr => proj!.commanders && proj!.commanders[k].includes(key)))
      .map(k => {
        return <span className='removable' key={`$${key}-${k}`}> <span className='glue'>📌{k}</span><button className='btn' title={`Remove assignment of ${key} from ${k}`} onClick={() => { this.onClickUnassign(k, key); }}>x</button></span>;
      });

    const need = proj.commodities![key];
    const className = `${need > 0 ? '' : 'done'} ${flip ? '' : ' odd'}`;
    const inputId = first ? 'auto-focus' : undefined;
    return <tr key={`cc-${key}`} className={className}>
      <td className='commodity-name'>
        <span><CommodityIcon name={key} /> {mapCommodityNames[key]}</span>
        {!editCommodities && <button className='btn-assign' onClick={() => this.setState({ assignCommodity: key })} title={`Assign a commander to commodity: ${key}`}>+</button>}
      </td>
      <td className='commodity-need'>
        {!editCommodities && need.toLocaleString()}
        {editCommodities && <input id={inputId} className='commodity-num' type='number' value={editCommodities[key]} min={0} onChange={(ev) => {
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
      {editProject && <>
        <PrimaryButton text='Save changes' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectDetails} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ editProject: undefined, })} />
      </>}

      {!editProject && <h3>Build:</h3>}
      <table>
        <tbody>
          <tr><td>Build name:</td><td>
            {!editProject && <div className='detail'>{proj?.buildName}</div>}
            {editProject && <input type='text' value={editProject.buildName} onChange={(ev) => this.updateProjData('buildName', ev.target.value)} autoFocus />}
          </td></tr>
          <tr><td>Build type:</td><td><div className='detail'>{proj?.buildType}</div></td></tr>
          <tr><td>System name:</td><td><div className='detail'>{proj?.systemName}</div></td></tr>
          <tr><td>Architect:</td><td>
            {!editProject && <div className='detail'>{proj?.architectName}&nbsp;</div>}
            {editProject && <input type='text' value={editProject.architectName} onChange={(ev) => this.updateProjData('architectName', ev.target.value)} />}
          </td></tr>
          <tr><td>Faction:</td><td>
            {!editProject && <div className='detail'>{proj?.factionName}&nbsp;</div>}
            {editProject && <input type='text' value={editProject.factionName} onChange={(ev) => this.updateProjData('factionName', ev.target.value)} />}
          </td></tr>
          <tr><td>Notes:</td><td>
            {!editProject && <div className='detail notes'>{proj?.notes}&nbsp;</div>}
            {editProject && <textarea className='notes' value={editProject.notes} onChange={(ev) => this.updateProjData('notes', ev.target.value)} />}
          </td></tr>
        </tbody>
      </table>
      {!editProject && this.renderCommanders()}

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
      <div hidden={showAddCmdr}>
        <ActionButton text='Add a new Commander?' onClick={this.onShowAddCmdr} iconProps={{ iconName: 'AddFriend' }} />
      </div>
      <div className='add-cmdr' hidden={!showAddCmdr}>
        <Stack horizontal tokens={horizontalGapStackTokens}>
          <TextField
            id='auto-focus'
            name='cmdr'
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

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(this.state.proj.buildId)}/link/${encodeURIComponent(cmdr)}`;
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
    const cmdrName = Store.getCmdr()?.name;
    const cmdrKnown = cmdrName && this.state.proj && (cmdrName in this.state.proj?.commanders);
    if (!cmdrKnown) {
      this.setState({ newCmdr: cmdrName })
    }
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

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(this.state.proj.buildId)}/link/${encodeURIComponent(newCmdr)}`;
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
    if (!proj?.buildId || !assignCmdr || !assignCommodity) { return; }

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}/assign/${encodeURIComponent(assignCmdr)}/${encodeURIComponent(assignCommodity)}/`;
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
    if (!proj || !proj.buildId || !proj.commanders || !cmdr || !commodity || !proj.commanders[cmdr]) { return; }

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}/assign/${encodeURIComponent(cmdr)}/${encodeURIComponent(commodity)}/`;
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
    console.log('onProjectDelete:');

    const buildId = this.state.proj?.buildId;
    if (buildId) {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}`;
      console.log('onShowAddCmdr:', url);
      const response = await fetch(url, { method: 'DELETE' })

      if (response.status === 202) {
        // success - navigate to home
        Store.removeRecentProject(buildId);
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

    if (!!proj?.commodities && proj.buildId && editCommodities) {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}`;
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

    if (proj?.buildId && editProject) {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}`;
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
        // success
        var savedProj: Project = await response.json();
        console.log('onUpdateProjectDetails: savedProj:', savedProj);
        const cmdrName = Store.getCmdr()?.name;
        this.setState({
          proj: savedProj,
          editProject: undefined,
          disableDelete: !!cmdrName && !!savedProj.architectName && savedProj.architectName.toLowerCase() !== cmdrName.toLowerCase(),
        });
      } else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
      }
    }

  };

  renderMissingMarketId() {
    const { fixMarketId } = this.state;

    return <>
      <MessageBar
        messageBarType={MessageBarType.warning}
        actions={<MessageBarButton onClick={() => this.setState({ fixMarketId: '' })}>Fix it</MessageBarButton>}
      >
        Unfortunately this build project was created without a key piece of information. You can continue to use it as is but the SrvSurvey app cannot auto update commodities needed until this is corrected.
      </MessageBar>
      <Modal isOpen={fixMarketId !== undefined}>
        <div style={{ textAlign: 'left' }}>
          <h3>Set corrected Market ID</h3>
          <div>The <code className='grey'>MarketID</code> value can be found in your journal files once docked at the construction ship or site for this project:</div>
          <ul>
            <li>Open folder: <code className='grey'>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code></li>
            <li>Find the file named with today's date. Something like: <code className='grey'>Journal.{new Date().toISOString().substring(0, 10)}T102030.01.log</code></li>
            <li>Scroll to the bottom and look for the line with <code className='grey'>"event":"Docked"</code></li>
            <li>On that line, copy the value of <code className='grey'>MarketID</code> and paste it here</li>
          </ul>

          <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
            <TextField
              name='marketId'
              value={fixMarketId}
              onChange={(_, v) => {
                this.setState({ fixMarketId: v ?? '' });
              }}
            />
            <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.saveNewMarketId} disabled={!(parseInt(this.state.fixMarketId ?? '').toString().trim() === this.state.fixMarketId?.trim())} />
            <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={() => this.setState({ fixMarketId: undefined })} />
          </Stack>
        </div>
      </Modal>
    </>;
  }

  saveNewMarketId = async () => {
    const { proj, fixMarketId } = this.state;
    if (!proj?.buildId || !fixMarketId) return;

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}`;
    console.log('saveNewMarketId:', url);
    const deltaProj = {
      buildId: proj.buildId,
      marketId: parseInt(fixMarketId),
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(deltaProj)
    })

    if (response.status === 200) {
      // success
      var savedProj: Project = await response.json();
      console.log('saveNewMarketId: savedProj:', savedProj);
      this.setState({
        proj: savedProj,
        fixMarketId: undefined,
      });
    } else {
      const msg = await response.text();
      this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
    }
  };

  renderStats() {
    return <>
      <div>stat!</div>
    </>;
  }
}
