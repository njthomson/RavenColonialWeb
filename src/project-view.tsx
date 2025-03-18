import { ActionButton, ComboBox, CommandBar, DefaultButton, ICommandBarItemProps, IconButton, IStackTokens, MessageBar, MessageBarButton, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { ProjectQuery } from './project-query';
import { apiSvcUrl, mapCommodityNames, Project, SupplyStatsSummary } from './types'
import { Component } from 'react';
import { ProjectCreate } from './project-create';
import './project-view.css';
import { Store } from './local-storage';
import { CargoRemaining, CommodityIcon } from './misc';
import { HorizontalBarChart } from '@fluentui/react-charting';
import { ChartByCmdrs, ChartByCmdrsOverTime, getColorTable } from './charts';

interface ProjectViewProps {
  buildId?: string;
  cmdr?: string;
}

interface ProjectViewState {
  proj?: Project;
  mode: Mode;
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
  summary?: SupplyStatsSummary;
  sumTotal: number;

  showBubble: boolean;

  nextDelivery: Record<string, number>;
  nextCommodity?: string;
  submitting: boolean;
}

enum Mode {
  view,
  editCommodities,
  editProject,
  deliver,
}

export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  constructor(props: ProjectViewProps) {
    super(props);
    this.state = {
      loading: true,
      mode: Mode.view,
      newCmdr: '',
      showAddCmdr: false,
      disableDelete: true,
      sumTotal: 0,

      showBubble: !props.cmdr,
      nextDelivery: Store.getDeliver(),
      submitting: false,
    };
  }

  componentDidMount() {
    this.fetchProject(this.props.buildId);
  }

  componentDidUpdate(prevProps: Readonly<ProjectViewProps>, prevState: Readonly<ProjectViewState>, snapshot?: any): void {
    if (this.props.buildId && prevState.proj?.buildId && prevState.proj.buildId !== this.props.buildId) {
      this.fetchProject(this.props.buildId);
    }

    if (!prevProps.cmdr && !!this.props.cmdr) {
      this.setState({ showBubble: !!this.props.cmdr });
    }
  }

  async fetchProject(buildId: string | undefined) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    // (not awaiting)
    this.fetchProjectStats(buildId);

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}`;
    console.log('fetchProject: begin buildId:', url);
    const response = await fetch(url, { method: 'GET' })
    if (response.status === 200) {
      const newProj: Project = await response.json();

      console.log('Project.fetch: end buildId:', newProj);
      Store.addRecentProject(newProj);

      const cmdrName = Store.getCmdr()?.name;
      this.setState({
        proj: newProj,
        sumTotal: Object.values(newProj.commodities).reduce((total, current) => total += current, 0),
        loading: false,
        disableDelete: !!cmdrName && (!newProj.architectName || newProj.architectName.toLowerCase() !== cmdrName.toLowerCase()),
      });
      window.document.title = `Build: ${newProj.buildName} in ${newProj.systemName}`;
      if (newProj.complete)
        window.document.title += ' (completed)';

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

  async fetchProjectStats(buildId: string | undefined) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/stats`;
    console.log('fetchProjectStats:', url);
    const response = await fetch(url, { method: 'GET' })
    if (response.status === 200) {
      const stats: SupplyStatsSummary = await response.json();

      this.setState({
        summary: stats,
      });
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
    const { mode, proj, loading, confirmDelete, confirmComplete, errorMsg, editProject, disableDelete, sumTotal, submitting } = this.state;

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

    // prep CommandBar buttons
    const commands: ICommandBarItemProps[] = [{
      key: 'deliver-cargo', text: 'Deliver',
      iconProps: { iconName: 'DeliveryTruck' },
      onClick: () => {
        this.setState({ mode: Mode.deliver });
        setTimeout(() => document.getElementById('deliver-commodity-input')?.focus(), 10);
      },
      disabled: proj.complete,
    }, {
      key: 'btn-edit', text: 'Edit project',
      iconProps: { iconName: 'Edit' },
      onClick: () => this.setState({ mode: Mode.editProject, editProject: { ...this.state.proj } }),
    }, {
      key: 'edit-commodities', text: 'Edit commodities',
      iconProps: { iconName: 'AllAppsMirrored' },
      onClick: () => {
        this.setState({ mode: Mode.editCommodities, editCommodities: { ...this.state.proj?.commodities } });
        setTimeout(() => document.getElementById('first-commodity-edit')?.focus(), 10);
      }
    }, {
      key: 'btn-complete', text: 'Complete',
      iconProps: { iconName: 'Completed' },
      disabled: sumTotal !== 0 || proj.complete,
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
        <h2 className='project-title'><a href={`#find=${proj.systemName}`}>{proj.systemName}</a>: {proj.buildName} {proj.complete && <span> (completed)</span>}</h2>
        {proj.marketId <= 0 && this.renderMissingMarketId()}
        {mode === Mode.view && <CommandBar className='top-bar' items={commands} />}
      </div >

      <div className='contain-horiz'>
        {(mode === Mode.view || mode === Mode.editCommodities) && <div className='half'>
          {mode === Mode.view && <h3>Commodities:</h3>}
          {this.renderCommodities()}
        </div>}

        {(mode === Mode.view || mode === Mode.editProject) && this.renderProjectDetails(proj, editProject!)}

        {mode === Mode.view && this.renderStats()}
      </div>

      <Modal isOpen={confirmDelete} onDismiss={() => this.setState({ confirmDelete: false })}>
        <h3>Are you sure you want to delete?</h3>
        <p>This cannot be undone.</p>
        <DefaultButton text='Yes' onClick={this.onProjectDelete} style={{ backgroundColor: '#FF8844' }} disabled={submitting} />
        &nbsp;
        <DefaultButton text='No' onClick={() => this.setState({ confirmDelete: false })} disabled={submitting} autoFocus />
      </Modal>

      <Modal isOpen={confirmComplete}>
        <h3>Congratulations!</h3>
        <p>
          This project will no longer be findable once marked as complete, but remain visible for Commanders linked to it.
          <br />
          <br />
          Are you sure?
        </p>
        <PrimaryButton text='Yes' onClick={this.onProjectComplete} disabled={submitting} />
        &nbsp;
        <DefaultButton text='No' onClick={() => this.setState({ confirmComplete: false })} disabled={submitting} />
      </Modal>

      {mode === Mode.deliver && this.renderDeliver()}
    </>;
  }

  renderCommodities() {
    const { proj, assignCommodity, assignCmdr, editCommodities, sumTotal, submitting, mode } = this.state;
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

    return <>
      {editCommodities && !submitting && <div className='button-pair'>
        <PrimaryButton text='Save commodities' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectCommodities} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ mode: Mode.view, editCommodities: undefined, })} />
      </div>}
      {submitting && mode === Mode.editCommodities && <Spinner
        className='submitting'
        label="Updating commodities ..."
        labelPosition="right"
      />}

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
    const inputId = first ? 'first-commodity-edit' : undefined;
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

    return <div className='half'>
      <div className={className}>
        {editProject && !this.state.submitting && <div className='button-pair'>
          <PrimaryButton text='Save changes' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectDetails} />
          <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ mode: Mode.view, editProject: undefined, })} />
        </div>}
        {this.state.submitting && <Spinner
          className='submitting'
          label="Updating project ..."
          labelPosition="right"
        />}


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
      </div>
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
            id='new-cmdr-edit'
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
    setTimeout(() => document.getElementById('new-cmdr-edit')?.focus(), 10);
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
    const buildId = this.state.proj?.buildId;
    if (!buildId) return;

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}`;
    console.log('onProjectDelete:', url);

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(url, { method: 'DELETE' })

    if (response.status === 202) {
      // success - navigate to home
      Store.removeRecentProject(buildId);
      window.location.assign(`#`);
      window.location.reload();
    }
    else {
      const msg = await response.text();
      this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}`, submitting: false });
    }
  }

  onProjectComplete = async () => {
    const buildId = this.state.proj?.buildId;
    if (!buildId) return;

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/complete`;
    console.log('onProjectComplete:', url);

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(url, { method: 'POST' })

    if (response.status === 202) {
      window.location.reload();
    }
    else {
      const msg = await response.text();
      this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}`, submitting: false });
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

      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

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
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          editCommodities: undefined,
          mode: Mode.view,
          submitting: false,
        });
      }
      else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}`, submitting: false });
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

      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

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
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          editProject: undefined,
          disableDelete: !!cmdrName && !!savedProj.architectName && savedProj.architectName.toLowerCase() !== cmdrName.toLowerCase(),
          mode: Mode.view,
          submitting: false,
        });
      } else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}`, submitting: false });
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
        sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
        fixMarketId: undefined,
      });
    } else {
      const msg = await response.text();
      this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
    }
  };

  renderStats() {
    const { summary, proj, sumTotal } = this.state;
    if (!summary || !proj) return;

    // roughly calculate progress by the curremt sum from the highest value known
    const approxProgress = proj.maxNeed - sumTotal;

    const cmdrColors = getColorTable(Object.keys(summary.cmdrs));
    return <div className='half'>
      <h3>Progress:</h3>
      {!!summary.totalDeliveries && <div className='stats-header'>
        Total cargo delivered: <span className='grey'>{summary.totalCargo.toLocaleString()}</span> from <span className='grey'>{summary.totalDeliveries.toLocaleString()}</span> deliveries
      </div>}

      {approxProgress > 0 && <HorizontalBarChart
        className="chart"
        data={[{
          chartTitle: 'Total progress:',
          chartData: [{ horizontalBarChartdata: { x: approxProgress, y: proj.maxNeed } },],
        }]}
        chartDataMode={'percentage'} enableGradient
      />}

      <ChartByCmdrs summary={summary} cmdrColors={cmdrColors} />

      {!!summary.totalDeliveries && <>
        <div className='stats-cmdr-over-time'>Deliveries per hour:</div>
        <ChartByCmdrsOverTime summary={summary} complete={proj.complete} />
      </>}

      {!summary.totalDeliveries && <div>
        No tracked deliveries yet.
        <br />
        Use <a href='https://github.com/njthomson/SrvSurvey/wiki'>SrvSurvey</a> to track deliveries automatically.
      </div>}

    </div>;
  }

  renderDeliver() {
    const { proj, nextDelivery, nextCommodity, showBubble, submitting } = this.state;
    if (!proj) return;

    const cargoOptions = Object.keys(proj.commodities)
      .filter(k => !(k in nextDelivery))
      .map(k => ({ key: k, text: mapCommodityNames[k] }))
      .sort();

    const deliveries = Object.keys(nextDelivery)
      .map(k => <tr key={`dk${k}`}>
        <td>{mapCommodityNames[k]}</td>
        <td>
          <input
            id={`deliver-${k}-input`}
            className='deliver-amount-edit'
            type='number'
            value={nextDelivery[k].toLocaleString()}
            onChange={(ev) => {
              const newNextDelivery = { ...this.state.nextDelivery };
              newNextDelivery[k] = parseInt(ev.target.value);
              this.setState({
                nextDelivery: newNextDelivery,
              });
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                this.setState({ nextCommodity: '', });
                setTimeout(() => document.getElementById(`deliver-commodity-input`)?.focus(), 10);
              }
            }}
          />
        </td>
        <td>
          <IconButton
            title='Remove'
            iconProps={{ iconName: 'Delete' }}
            onClick={() => {
              const newNextDelivery = { ...this.state.nextDelivery };
              delete newNextDelivery[k];
              this.setState({
                nextDelivery: newNextDelivery,
              });
            }}
          />
        </td>
      </tr>)

    const sumTotal = Object.values(nextDelivery).reduce((sum, v) => sum += v, 0);
    const noNextCommodities = Object.values(nextDelivery).length === 0;
    const addingCommidity = nextCommodity !== undefined || noNextCommodities;

    return <div className='delivery'>
      {!submitting && <div className='button-pair'>
        <PrimaryButton text='Deliver' iconProps={{ iconName: 'DeliveryTruck' }} onClick={this.submitDelivery} disabled={sumTotal === 0 || submitting} hidden={true} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => {
          this.setState({ mode: Mode.view });
          //Store.setDeliver(nextDelivery);
        }} />
      </div>}
      {submitting && <Spinner
        className='submitting'
        label="Submitting delivery ..."
        labelPosition="right"
      />}

      {!noNextCommodities && <table cellSpacing={0}>
        <thead>
          <tr>
            <th className='commodity-name'>Commodity:</th>
            <th className='commodity-need'>Amount:</th>
          </tr>
        </thead>
        <tbody>
          {deliveries}
        </tbody>
        <tfoot>
          <tr className='hint'>
            <td className='total-txt'>Total:</td>
            <td className='total-num'><input value={sumTotal} readOnly /></td>
          </tr>
        </tfoot>
      </table>}

      {/* <ComboBox autoFocus options={cargoOptions} selectedKey={assignCmdr} onChange={(_, o) => this.setState({ assignCmdr: `${o?.key}` })} /> */}
      {addingCommidity && <Stack horizontal verticalAlign='end'>
        <ComboBox
          id='deliver-commodity'
          autoFocus
          className='deliver-commodity'
          label='New commodity:'
          style={{ width: 200 }}
          options={cargoOptions}
          selectedKey={nextCommodity}
          onChange={(_, o) => {
            this.setState({ nextCommodity: `${o?.key}` });
            document.getElementById('deliver-amount')?.focus();
          }}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { this.addNextCommodity(); } }}
        />
        <IconButton
          title='Add'
          iconProps={{ iconName: 'Add' }}
          style={{ alignContent: 'end' }}
          onClick={this.addNextCommodity}
          disabled={!nextCommodity}
        />
        <IconButton
          title='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => this.setState({ nextCommodity: undefined })}
        />
      </Stack>}

      {!addingCommidity && <ActionButton text='Add commodity?' iconProps={{ iconName: 'Add' }} onClick={() => this.setState({ nextCommodity: '' })} />}

      {showBubble && <TeachingBubble
        target={'#current-cmdr'}
        headline='Who are you?'
        hasCloseButton={true}
        onDismiss={() => { this.setState({ showBubble: false }) }}
      >
        Enter your cmdr's name to get credit for this delivery.
      </TeachingBubble>}

    </div>;
  }

  addNextCommodity = () => {
    const { nextCommodity } = this.state;
    if (!nextCommodity) return;

    // append current
    const newNextDelivery = { ...(this.state.nextDelivery ?? {}) };
    newNextDelivery[nextCommodity] = 0;
    this.setState({
      nextDelivery: newNextDelivery,
      nextCommodity: undefined,
    });
    setTimeout(() => document.getElementById(`deliver-${nextCommodity}-input`)?.focus(), 10);
  };

  submitDelivery = async () => {
    const buildId = this.state.proj?.buildId;
    const nextDelivery = this.state.nextDelivery;
    const cmdr = Store.getCmdr()?.name ?? 'unknown';
    if (!buildId || !nextDelivery || !this.state.proj) return;

    const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/supply/${encodeURIComponent(cmdr)}`;
    console.log('submitDelivery:', url);

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(nextDelivery),
    })

    if (response.status === 200) {
      // success
      var newCommodities: Record<string, number> = await response.json();
      console.log('submitDelivery: newCommodities:', newCommodities);

      // update commodity counts on current project
      const updateProj = this.state.proj;
      for (const k in newCommodities) {
        updateProj.commodities[k] = newCommodities[k];
      }

      // update state and re-fetch stats
      this.setState({
        proj: updateProj,
        sumTotal: Object.values(newCommodities).reduce((total, current) => total += current, 0),
        submitting: false,
        mode: Mode.view,
      });
      Store.setDeliver(nextDelivery);
      this.fetchProjectStats(buildId);
    }
    else {
      const msg = await response.text();
      this.setState({
        errorMsg: `${response.status}: ${response.statusText} ${msg}`,
        submitting: false,
      });
    }
  };
}

