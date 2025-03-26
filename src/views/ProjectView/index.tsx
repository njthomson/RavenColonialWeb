import './index.css';

import { ActionButton, CommandBar, ContextualMenu, ContextualMenuItemType, DefaultButton, Dropdown, ICommandBarItemProps, Icon, IconButton, IContextualMenuItem, IStackTokens, MessageBar, MessageBarButton, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { HorizontalBarChart } from '@fluentui/react-charting';
import { Component, CSSProperties } from 'react';
import { BuildTypeDisplay, CargoRemaining, ChartByCmdrs, ChartByCmdrsOverTime, CommodityIcon, ProjectCreate, ProjectQuery } from '../../components';
import { Store } from '../../local-storage';
import { delayFocus, flattenObj, getColorTable, getTypeForCargo } from '../../misc';
import { appTheme } from '../../theme';
import { apiSvcUrl, mapCommodityNames, Project, SupplyStatsSummary } from '../../types';

interface ProjectViewProps {
  buildId?: string;
  cmdr?: string;
}

interface ProjectViewState {
  proj?: Project;
  mode: Mode;
  sort: SortMode;
  sortChanging: boolean;
  loading: boolean;
  showAddCmdr: boolean;
  newCmdr?: string;
  confirmDelete?: boolean;
  confirmComplete?: boolean;
  errorMsg?: string;
  assignCommodity?: string;
  assignCmdr?: string;
  editCommodities?: Record<string, number>;
  editReady: Set<string>;
  editProject?: Partial<Project>;
  disableDelete?: boolean;
  fixMarketId?: string;
  summary?: SupplyStatsSummary;
  sumTotal: number;

  showBubble: boolean;
  hideDoneRows: boolean;

  nextDelivery: Record<string, number>;
  nextCommodity?: string;
  submitting: boolean;
  cargoContextItems?: IContextualMenuItem[];
  cargoContext?: string;
}

enum Mode {
  view,
  editCommodities,
  editProject,
  deliver,
}

enum SortMode {
  alpha = 'Alpha sort',
  group = 'Group by type',
}

export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  constructor(props: ProjectViewProps) {
    super(props);

    const sortMode = Store.getCommoditySort();
    this.state = {
      loading: true,
      mode: Mode.view,
      sort: sortMode as SortMode ?? SortMode.group,
      sortChanging: false,
      newCmdr: '',
      showAddCmdr: false,
      disableDelete: true,
      sumTotal: 0,

      editReady: new Set<string>(),
      hideDoneRows: Store.getCommodityHideCompleted(),
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

    try {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}`;
      console.log('fetchProject: begin buildId:', url);
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 200) {
        const newProj: Project = await response.json();

        console.log('Project.fetch: end buildId:', newProj);
        Store.addRecentProject(newProj);

        const cmdrName = Store.getCmdr()?.name;
        this.setState({
          proj: newProj,
          editReady: new Set(newProj.ready),
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
    } catch (err: any) {
      this.setState({
        loading: false,
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  }

  async fetchProjectStats(buildId: string | undefined) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    try {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/stats`;
      console.log('fetchProjectStats:', url);
      const response = await fetch(url, { method: 'GET' });
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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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
        delayFocus('deliver-commodity');
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
        delayFocus('first-commodity-edit');
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
        {(mode === Mode.editCommodities || (mode === Mode.view && !proj.complete)) && <div className='half'>
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
        <p>
          Are you sure?
          <br />
          <br />
          This project will no longer be findable once marked as complete.
          <br />
          It will remain visible for Commanders linked to it.
        </p>
        <PrimaryButton text='Yes' onClick={this.onProjectComplete} disabled={submitting} />
        &nbsp;
        <DefaultButton text='No' onClick={() => this.setState({ confirmComplete: false })} disabled={submitting} />
      </Modal>

      {mode === Mode.deliver && this.renderDeliver()}
    </>;
  }

  getGroupedCommodities(): Record<string, string[]> {
    const { proj, sort, hideDoneRows } = this.state;
    if (!proj?.commodities) throw new Error("Why no commodities?");

    const sorted = Object.keys(proj.commodities)
      .filter(k => !hideDoneRows || proj.commodities[k] > 0 || proj.complete);
    sorted.sort();

    // just alpha sort
    if (sort === SortMode.alpha) {
      return { alpha: sorted };
    }

    const dd = sorted.reduce((d, c) => {
      const t = getTypeForCargo(c);
      if (!d[t]) d[t] = [];
      d[t].push(c);

      return d;
    }, {} as Record<string, string[]>);
    return dd;
  }

  renderCommodities() {
    const { proj, assignCommodity, editCommodities, sumTotal, submitting, mode, sort, sortChanging, hideDoneRows } = this.state;
    if (!proj?.commodities) { return <div />; }

    // do not render list if nothing left to deliver
    if (sumTotal === 0 && mode !== Mode.editCommodities) {
      return <>
        <div>Congratulations!</div>
        <br />
        <PrimaryButton iconProps={{ iconName: 'Completed' }} onClick={() => this.setState({ confirmComplete: true })}>Mark project complete</PrimaryButton>
      </>;
    }

    const rows = [];
    const cmdrs = proj.commanders ? Object.keys(proj.commanders) : [];

    let flip = false;
    const groupedCommodities = this.getGroupedCommodities();
    const groupsAndCommodityKeys = flattenObj(groupedCommodities);

    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        // group row
        if (sort !== SortMode.alpha) {
          rows.push(<tr key={`group-${key}`} className='group' style={{ background: appTheme.palette.themeDark, color: appTheme.palette.themeLighter }}>
            <td colSpan={3} className='hint'> {key}</td>
          </tr>)
        }
        continue;
      }

      flip = !flip;
      var row: JSX.Element = mode === Mode.editCommodities
        ? this.getCommodityEditRow(proj, key, cmdrs, editCommodities!, flip, rows.length === 0)
        : this.getCommodityRow(proj, key, cmdrs, flip, rows.length === 0);
      rows.push(row)

      // show extra row to assign a commodity to a cmdr?
      if (assignCommodity === key && proj.commanders && !editCommodities) {
        rows.push(this.getCommodityAssignmentRow(key, proj, cmdrs));
      }
    }

    return <>
      {mode === Mode.view && <h3>
        Commodities:&nbsp;
        <ActionButton
          id='menu-sort'
          iconProps={{ iconName: 'Sort' }}
          onClick={(ev) => {
            this.setState({ sortChanging: true });
          }}
        >
          {sort}
        </ActionButton>
        <ActionButton
          id='menu-sort'
          iconProps={{ iconName: hideDoneRows ? 'ThumbnailViewMirrored' : 'AllAppsMirrored' }}
          title={hideDoneRows ? 'Hiding completed commodies' : 'Showing all commodities'}
          text={hideDoneRows ? 'Active' : 'All'}
          onClick={() => {
            this.setState({ hideDoneRows: !hideDoneRows });
            Store.setCommodityHideCompleted(!hideDoneRows);
          }}
        />

        <ContextualMenu
          target='#menu-sort'
          hidden={!sortChanging}
          onDismiss={() => this.setState({ sortChanging: false })}
          items={[{
            key: SortMode.alpha,
            text: SortMode.alpha,
            onClick: () => { this.setState({ sort: SortMode.alpha }); Store.setCommoditySort(SortMode.alpha); },
          },
          {
            key: SortMode.group,
            text: SortMode.group,
            onClick: () => { this.setState({ sort: SortMode.group }); Store.setCommoditySort(SortMode.group); },
          }]}
        />
      </h3>}

      {editCommodities && !submitting && <div className='button-pair'>
        <PrimaryButton text='Save commodities' iconProps={{ iconName: 'Save' }} onClick={this.onUpdateProjectCommodities} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ mode: Mode.view, editCommodities: undefined, })} />
      </div>}

      {submitting && mode === Mode.editCommodities && <Spinner
        className='submitting'
        label="Updating commodities ..."
        labelPosition="right"
      />}

      <table className={`commodities ${sort}`} cellSpacing={0} cellPadding={0}>
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

  getCommodityAssignmentRow(key: string, proj: Project, cmdrs: string[]) {
    if (Object.keys(proj.commanders).length === 0) {
      // show a warning when there's no cmdrs to add
      return <tr key={`c${key}`}>
        <td colSpan={3}>
          <MessageBar messageBarType={MessageBarType.warning} onDismiss={() => this.setState({ assignCommodity: undefined })} >You need to add commanders first</MessageBar>
        </td>
      </tr>;
    } else {
      const cmdrOptions = cmdrs
        .filter(cmdr => proj.commanders && proj.commanders[cmdr] && !proj.commanders[cmdr].includes(key))
        .map(k => ({ key: k, text: k }))
        .sort();

      const assignRow = <tr key='c-edit'>
        <td colSpan={3}>
          <Stack horizontal>
            <Dropdown
              id='assign-cmdr'
              openOnKeyboardFocus
              placeholder='Assign a commander'
              options={cmdrOptions}
              selectedKey={this.state.assignCmdr}
              onChange={(_, o) => this.onClickAssign(`${o?.key}`)}
              onDismiss={() => this.setState({ assignCommodity: undefined })}
            />
            <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ assignCommodity: undefined })} />
          </Stack>
        </td>
      </tr>;
      return assignRow;
    }
  }

  getCommodityEditRow(proj: Project, key: string, cmdrs: string[], editCommodities: Record<string, number>, flip: boolean, first: boolean): JSX.Element {

    const displayName = mapCommodityNames[key];
    const need = proj.commodities![key];
    const className = `${need > 0 ? '' : 'done'} ${flip ? '' : ' odd'}`;
    const inputId = first ? 'first-commodity-edit' : undefined;
    const isReady = this.state.editReady.has(key);

    return <tr key={`cc-${key}`} className={className}>
      <td className='commodity-name'>
        <span><CommodityIcon name={key} /> {displayName} </span>
        {isReady && <Icon iconName='SkypeCircleCheck' title={`${displayName} is ready`} />}
      </td>
      <td className='commodity-need'>
        <input id={inputId} className='commodity-num' type='number' value={editCommodities[key]} min={0} onChange={(ev) => {
          const ec2 = this.state.editCommodities!;
          ec2[key] = ev.target.valueAsNumber;
          this.setState({ editCommodities: ec2 });
        }} />
      </td>
    </tr>;
  }

  getCommodityRow(proj: Project, key: string, cmdrs: string[], flip: boolean, first: boolean): JSX.Element {
    const displayName = mapCommodityNames[key];

    const assigned = cmdrs
      .filter(k => cmdrs.some(cmdr => proj!.commanders && proj!.commanders[k].includes(key)))
      .map(k => {
        return <span className='removable' key={`$${key}-${k}`}> <span className='glue'>📌{k}</span>
          <Icon
            className='btn'
            iconName='Delete'
            title={`Remove assignment of ${displayName} from ${k}`}
            style={{ color: appTheme.palette.themePrimary }}
            onClick={() => this.onClickUnassign(k, key)}
          />
        </span>;
      });

    const need = proj.commodities![key];
    const className = `${need > 0 ? '' : 'done'} ${flip ? '' : ' odd'}`;

    const style: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };

    const isContextTarget = this.state.cargoContext === key;
    const isReady = this.state.editReady.has(key);

    const menuItems: IContextualMenuItem[] = [
      {
        key: 'assign-cmdr',
        text: 'Assign to a commander ...',
        onClick: () => {
          this.setState({ assignCommodity: key });
          delayFocus('assign-cmdr');
        },
      },
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider, },
      {
        key: 'toggle-ready',
        text: isReady ? 'Clear ready' : 'Set ready',
        onClick: () => this.onToggleReady(this.state.proj!.buildId, key, isReady),
      }
    ];

    if (need > 0 && false) {
      menuItems.push({
        key: 'set-to-zero',
        text: 'Set need to zero',
        onClick: () => {
          // this.setState({ assignCommodity: key });
          // delayFocus('assign-cmdr');
        },
      });
    }

    return <tr key={`cc-${key}`} className={className} style={style}>
      <td className='commodity-name' id={`cargo-${key}`}>
        <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
        &nbsp;
        {isReady && <Icon iconName='SkypeCircleCheck' title={`${displayName} is ready`} />}

        {isContextTarget && <ContextualMenu
          target={`#cn-${key}`}
          onDismiss={() => this.setState({ cargoContext: undefined })}
          items={menuItems}
        />}

        <Icon
          className='btn-assign'
          iconName='ContextMenu'
          title={`Commands for: ${key}`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ cargoContext: key });
          }}
        />
      </td>
      <td className='commodity-need'>
        <span className='t'>{need.toLocaleString()}</span>
      </td>
      <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>
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
              {!editProject && <div className='detail'>{proj.buildName}</div>}
              {editProject && <input type='text' value={editProject.buildName} onChange={(ev) => this.updateProjData('buildName', ev.target.value)} autoFocus />}
            </td></tr>
            <tr><td>Build type:</td><td><div className='detail'><BuildTypeDisplay buildType={proj.buildType} /></div></td></tr>
            <tr><td>System name:</td><td><div className='detail'>{proj.systemName}</div></td></tr>
            <tr><td>Architect:</td><td>
              {!editProject && <div className='detail'>{proj.architectName}&nbsp;</div>}
              {editProject && <input type='text' value={editProject.architectName} onChange={(ev) => this.updateProjData('architectName', ev.target.value)} />}
            </td></tr>
            <tr><td>Faction:</td><td>
              {!editProject && <div className='detail'>{proj.factionName}&nbsp;</div>}
              {editProject && <input type='text' value={editProject.factionName} onChange={(ev) => this.updateProjData('factionName', ev.target.value)} />}
            </td></tr>
            <tr><td>Notes:</td><td>
              {!editProject && <div className='detail notes'>{proj.notes}&nbsp;</div>}
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
          <Icon className='btn' iconName='Delete' title={`Assign a commander to commodity: ${key}`} style={{ color: appTheme.palette.themePrimary, paddingTop: 80 }} onClick={() => { this.onClickCmdrRemove(key); }} />
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

    try {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(this.state.proj.buildId)}/link/${encodeURIComponent(cmdr)}`;
      console.log('onClickCmdrRemove:', url);
      const response = await fetch(url, { method: 'DELETE' });
      console.log('onClickCmdrRemove:', response);

      if (response.status === 202) {
        // success - remove from in-memory data
        const { proj } = this.state;
        if (!proj.commanders) { proj.commanders = {}; }
        delete proj.commanders[cmdr];
        this.setState({ proj });
      }
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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
    delayFocus('new-cmdr-edit');
  }

  onClickAddCmdr = async () => {
    if (!this.state.proj?.buildId || !this.state.newCmdr) {
      this.setState({
        showAddCmdr: false,
        newCmdr: '',
      });
      return;
    }
    try {
      const { newCmdr } = this.state;

      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(this.state.proj.buildId)}/link/${encodeURIComponent(newCmdr)}`;
      console.log('onShowAddCmdr:', url);
      const response = await fetch(url, { method: 'PUT' });
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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  }

  onClickAssign = async (assignCmdr: string) => {
    const { proj, assignCommodity } = this.state;
    if (!proj?.buildId || !assignCmdr || !assignCommodity) { return; }
    try {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(proj.buildId)}/assign/${encodeURIComponent(assignCmdr)}/${encodeURIComponent(assignCommodity)}/`;
      console.log('onClickAssign:', url);
      const response = await fetch(url, { method: 'PUT' });
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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  }

  onClickUnassign = async (cmdr: string, commodity: string) => {
    const { proj } = this.state;
    if (!proj || !proj.buildId || !proj.commanders || !cmdr || !commodity || !proj.commanders[cmdr]) { return; }
    try {
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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  }

  onToggleReady = async (buildId: string, commodity: string, isReady: boolean) => {
    try {

      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/ready`;
      console.log('onToggleReady:', url);
      const response = await fetch(url, {
        method: isReady ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify([commodity])
      });
      console.log('onToggleReady:', response);

      if (response.status === 202) {
        // success - remove from in-memory data
        const editReady = this.state.editReady;
        if (isReady)
          editReady.delete(commodity)
        else
          editReady.add(commodity)
        this.setState({ editReady });
      }
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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

    try {
      const response = await fetch(url, { method: 'DELETE' });

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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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

    try {
      const response = await fetch(url, { method: 'POST' });

      if (response.status === 202) {
        window.location.reload();
      }
      else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}`, submitting: false });
      }
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify(deltaProj)
        });

        if (response.status === 200) {
          // success - apply new commodity count
          var savedProj: Project = await response.json();
          console.log('onUpdateCommodities: savedProj:', savedProj);
          this.setState({
            proj: savedProj,
            editReady: new Set(savedProj.ready),
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
      } catch (err: any) {
        this.setState({
          errorMsg: err.message,
        });
        console.error(err.stack);
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

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', },
          body: JSON.stringify(deltaProj)
        });

        if (response.status === 200) {
          // success
          var savedProj: Project = await response.json();
          console.log('onUpdateProjectDetails: savedProj:', savedProj);
          const cmdrName = Store.getCmdr()?.name;
          this.setState({
            proj: savedProj,
            editReady: new Set(savedProj.ready),
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
      } catch (err: any) {
        this.setState({
          errorMsg: err.message,
        });
        console.error(err.stack);
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

    try {
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
      });

      if (response.status === 200) {
        // success
        var savedProj: Project = await response.json();
        console.log('saveNewMarketId: savedProj:', savedProj);
        this.setState({
          proj: savedProj,
          editReady: new Set(savedProj.ready),
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          fixMarketId: undefined,
        });
      } else {
        const msg = await response.text();
        this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
      }
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
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
        <div className='stats-cmdr-over-time'>Cargo deliveries per hour:</div>
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
      .filter(k => !(k in nextDelivery) && proj.commodities[k] > 0)
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
            min={0}
            max={Math.min(proj.commodities[k], Store.getCmdr()?.largeMax ?? 800)}
            style={{ backgroundColor: nextDelivery[k] > proj.commodities[k] ? 'yellow' : '' }}
            onFocus={(ev) => {
              ev.target.type = 'text';
              ev.target.setSelectionRange(0, 10);
              ev.target.type = 'number';
            }}
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
                delayFocus('deliver-commodity');
              } else if (ev.key === 'Escape') {
                this.setState({ mode: Mode.view });
              }
            }}
          />
        </td>
        <td>
          <ActionButton
            title='Set max value'
            iconProps={{ iconName: 'CirclePlus' }}
            onClick={() => {
              const newNextDelivery = { ...this.state.nextDelivery };
              newNextDelivery[k] = Math.min(proj.commodities[k], Store.getCmdr()?.largeMax ?? 800)
              this.setState({
                nextDelivery: newNextDelivery,
              });
              delayFocus(`deliver-${k}-input`);
            }} >{proj.commodities[k]}
          </ActionButton>
          <IconButton
            title={`Remove ${mapCommodityNames[k]}`}
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
            <td className='total-num'><input value={sumTotal} readOnly tabIndex={-1} /></td>
          </tr>
        </tfoot>
      </table>}

      {addingCommidity && <Stack horizontal verticalAlign='end'>
        <Dropdown
          id='deliver-commodity'
          openOnKeyboardFocus
          className='deliver-commodity'
          label='New commodity:'
          placeholder='Choose a commodity...'
          style={{ width: 200 }}
          options={cargoOptions}
          selectedKey={nextCommodity}
          onChange={(_, o) => {
            this.addNextCommodity(`${o?.key}`);
            document.getElementById('deliver-amount')?.focus();
          }}
          onDismiss={() => this.setState({ nextCommodity: undefined })}
        />
        <IconButton
          title='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => this.setState({ nextCommodity: undefined })}
        />
      </Stack>}

      {!addingCommidity && <ActionButton text='Add commodity?' iconProps={{ iconName: 'Add' }} onClick={() => { this.setState({ nextCommodity: '' }); delayFocus('deliver-commodity'); }} />}

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

  addNextCommodity = (nextCommodity: string) => {
    if (!nextCommodity) return;

    // append current
    const newNextDelivery = { ...(this.state.nextDelivery ?? {}) };
    newNextDelivery[nextCommodity] = 0;
    this.setState({
      nextDelivery: newNextDelivery,
      nextCommodity: undefined,
    });
    delayFocus(`deliver-${nextCommodity}-input`);
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(nextDelivery),
      });

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
          editReady: new Set(updateProj.ready),
          sumTotal: Object.values(updateProj.commodities).reduce((total, current) => total += current, 0),
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
    } catch (err: any) {
      this.setState({
        errorMsg: err.message,
      });
      console.error(err.stack);
    }
  };
}

