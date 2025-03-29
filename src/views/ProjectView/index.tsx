import './index.css';

import { ActionButton, CommandBar, ContextualMenu, ContextualMenuItemType, DefaultButton, Dropdown, DropdownMenuItemType, ICommandBarItemProps, Icon, IconButton, IContextualMenuItem, IDropdownOption, IStackTokens, Label, MessageBar, MessageBarButton, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { HorizontalBarChart } from '@fluentui/react-charting';
import { Component, CSSProperties } from 'react';
import * as api from '../../api';
import { BuildTypeDisplay, CargoRemaining, ChartByCmdrs, ChartByCmdrsOverTime, CommodityIcon, FindFC, ProjectCreate, ProjectQuery } from '../../components';
import { store } from '../../local-storage';
import { appTheme } from '../../theme';
import { mapCommodityNames, Project, ProjectFC, SortMode, SupplyStatsSummary } from '../../types';
import { delayFocus, fcFullName, flattenObj, getColorTable, getTypeForCargo } from '../../util';

interface ProjectViewProps {
  buildId?: string;
  cmdr?: string;
}

interface ProjectViewState {
  proj?: Project;
  mode: Mode;
  sort: SortMode;
  loading: boolean;
  showAddCmdr: boolean;
  newCmdr?: string;
  confirmDelete?: boolean;
  confirmComplete?: boolean;
  errorMsg?: string;

  assignCommodity?: string;
  assignCmdr?: string;
  hasAssignments?: boolean;

  editCommodities?: Record<string, number>;
  editReady: Set<string>;
  editProject?: Partial<Project>;
  disableDelete?: boolean;
  fixMarketId?: string;
  summary?: SupplyStatsSummary;
  sumTotal: number;

  showBubble: boolean;
  hideDoneRows: boolean;
  hideFCColumns: boolean;

  nextDelivery: Record<string, number>;
  nextCommodity?: string;
  deliverMarketId: string;
  submitting: boolean;
  cargoContextItems?: IContextualMenuItem[];
  cargoContext?: string;

  showAddFC: boolean;
  fcMatchMarketId?: string;
  fcMatchError?: string;

  fcCargo: Record<string, Record<string, number>>;
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

    const sortMode = store.commoditySort;
    this.state = {
      loading: true,
      mode: Mode.view,
      sort: sortMode as SortMode ?? SortMode.group,
      newCmdr: '',
      showAddCmdr: false,
      disableDelete: true,
      sumTotal: 0,

      editReady: new Set<string>(),
      hideDoneRows: store.commodityHideCompleted,
      hideFCColumns: store.commodityHideFCColumns,
      showBubble: !props.cmdr,
      nextDelivery: store.deliver,
      deliverMarketId: store.deliverDestination,
      submitting: false,

      showAddFC: false,
      fcCargo: {},
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

  getFullFCName(marketId: string) {
    const fc = this.state.proj?.linkedFC.find(fc => fc.marketId.toString() === marketId);
    if (fc)
      return fcFullName(fc.name, fc.displayName);
    else
      return '?';
  }

  async fetchProject(buildId: string | undefined) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    try {
      this.setState({ loading: true });

      // (not awaiting)
      this.fetchProjectStats(buildId);
      this.fetchCargoFC(buildId);


      const newProj = await api.project.get(buildId);
      // console.log('Project.fetch: end buildId:', newProj);
      store.addRecentProject(newProj);

      // last destination not in this build project
      let deliverMarketId = this.state.deliverMarketId;
      if (!newProj.linkedFC.find(fc => fc.marketId.toString() === store.deliverDestination)) {
        deliverMarketId = 'site';
      }

      this.setState({
        proj: newProj,
        editReady: new Set(newProj.ready),
        sumTotal: Object.values(newProj.commodities).reduce((total, current) => total += current, 0),
        hasAssignments: Object.keys(newProj.commanders).reduce((s, c) => s += newProj.commanders[c].length, 0) > 0,
        loading: false,
        disableDelete: !!store.cmdrName && (!newProj.architectName || newProj.architectName.toLowerCase() !== store.cmdrName.toLowerCase()),
        deliverMarketId: deliverMarketId,
      });

      window.document.title = `Build: ${newProj.buildName} in ${newProj.systemName}`;
      if (newProj.complete) window.document.title += ' (completed)';

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message, });
    }
  }

  fetchProjectStats(buildId: string) {
    api.project.getStats(buildId)
      .then(stats => this.setState({ summary: stats }))
      .catch(err => this.setState({ errorMsg: err.message }));
  }

  fetchCargoFC(buildId: string) {
    // don't bother calling when we know there are zero FCs
    if (this.state.proj && Object.keys(this.state.proj.linkedFC).length === 0) return;

    api.project.getCargoFC(buildId)
      .then(fcCargo => this.setState({ fcCargo: fcCargo }))
      .catch(err => this.setState({ errorMsg: err.message }));
  }

  render() {
    const { mode, proj, loading, confirmDelete, confirmComplete, errorMsg, editProject, disableDelete, submitting } = this.state;

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
    const commands: ICommandBarItemProps[] = [
      {
        key: 'deliver-cargo',
        text: 'Deliver',
        iconProps: { iconName: 'DeliveryTruck' },
        disabled: proj.complete,
        onClick: () => {
          this.setState({ mode: Mode.deliver });
          delayFocus('deliver-commodity');
        },
      },
      {
        key: 'btn-edit',
        text: 'Edit project',
        iconProps: { iconName: 'Edit' },
        onClick: () => this.setState({ mode: Mode.editProject, editProject: { ...this.state.proj } }),
      },
      {
        key: 'edit-commodities',
        text: 'Edit commodities',
        iconProps: { iconName: 'AllAppsMirrored' },
        onClick: () => {
          this.setState({ mode: Mode.editCommodities, editCommodities: { ...this.state.proj?.commodities } });
          delayFocus('first-commodity-edit');
        }
      },
      {
        key: 'btn-refresh',
        text: 'Refresh',
        iconProps: { iconName: 'Refresh' },
        onClick: () => this.fetchProject(proj.buildId),
      },
      {
        key: 'btn-delete', text: 'Delete',
        iconProps: { iconName: 'Delete' },
        disabled: disableDelete,
        onClick: () => this.setState({ confirmDelete: true }),
      }
    ];

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
    const { proj, assignCommodity, editCommodities, sumTotal, submitting, mode, sort, hideDoneRows, hideFCColumns, hasAssignments, fcCargo } = this.state;
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

    let colSpan = 0;
    const fcCount = Object.keys(fcCargo).length;
    if (fcCount > 0) colSpan += fcCount + 1;
    if (hasAssignments) colSpan++;

    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        // group row
        if (sort !== SortMode.alpha) {
          rows.push(<tr key={`group-${key}`} className='group' style={{ background: appTheme.palette.themeDark, color: appTheme.palette.themeLighter }}>
            <td colSpan={2 + colSpan} className='hint'> {key}</td>
          </tr>)
        }
        continue;
      }

      // TODO: Entirely split commodity edit and view rendering
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
          onClick={() => {
            const newSort = sort === SortMode.alpha ? SortMode.group : SortMode.alpha;
            this.setState({ sort: newSort });
            store.commoditySort = newSort;
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
            store.commodityHideCompleted = !hideDoneRows;
          }}
        />
        {fcCount > 0 && <ActionButton
          id='menu-sort'
          iconProps={{ iconName: hideFCColumns ? 'AirplaneSolid' : 'Airplane' }}
          title={hideFCColumns ? 'Hiding FC columns' : 'Showing FC columns'}
          onClick={() => {
            this.setState({ hideFCColumns: !hideFCColumns });
            store.commodityHideFCColumns = !hideFCColumns;
          }}
        />}
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
            <th className='commodity-name'>Commodity</th>
            <th className='commodity-need' title='Total needed for this commodity'>Need</th>
            {!editCommodities && !hideFCColumns && colSpan > 0 && this.getCargoFCHeaders()}
            {!editCommodities && hasAssignments && <th className='commodity-assigned'>Assigned</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      {!editCommodities && <CargoRemaining sumTotal={sumTotal} />}
    </>
  }

  getCargoFCHeaders() {
    return [
      <th key={`fcc-have`} className='commodity-need' title='Difference between amount needed and sum total across linked Fleet Carriers'>FC Diff</th>,
      ...Object.keys(this.state.fcCargo).map(k => {
        const fc = this.state.proj!.linkedFC.find(fc => fc.marketId.toString() === k);
        return fc && <th key={`fcc${k}`} className='commodity-need' title={`${fc.displayName} (${fc.name})`} >{fc.name}</th>;
      })
    ];
  }

  getCommodityAssignmentRow(key: string, proj: Project, cmdrs: string[]) {
    if (Object.keys(proj.commanders).length === 0) {
      // show a warning when there's no cmdrs to add
      return <tr key={`c${key}`}>
        <td colSpan={2}>
          <MessageBar messageBarType={MessageBarType.warning} onDismiss={() => this.setState({ assignCommodity: undefined })} >You need to add commanders first</MessageBar>
        </td>
      </tr>;
    } else {
      const cmdrOptions = cmdrs
        .filter(cmdr => proj.commanders && proj.commanders[cmdr] && !proj.commanders[cmdr].includes(key))
        .map(k => ({ key: k, text: k }))
        .sort();

      const assignRow = <tr key='c-edit'>
        <td colSpan={2}>
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
    const currentCmdr = store.cmdrName;

    const assigned = cmdrs
      .filter(k => cmdrs.some(() => proj!.commanders && proj!.commanders[k].includes(key)))
      .map(k => {
        return <span className='removable bubble' key={`$${key}-${k}`} style={{ backgroundColor: k === currentCmdr ? 'lightcyan' : undefined }}>
          <span className={`glue ${k === currentCmdr ? 'active-cmdr' : ''}`} >📌{k}</span>
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
        text: isReady ? 'Clear ready' : 'Mark ready',
        onClick: () => this.onToggleReady(this.state.proj!.buildId, key, isReady),
      }
    ];

    const fcCargoKeys = Object.keys(this.state.fcCargo);
    const sumCargoFC = fcCargoKeys.reduce((sum, marketId) => sum += this.state.fcCargo[marketId][key] ?? 0, 0);
    let diffCargoFC = (sumCargoFC - need).toLocaleString();
    if (!diffCargoFC.startsWith('-')) diffCargoFC = '+' + diffCargoFC;

    if (need > 0) {
      menuItems.push({
        key: 'set-to-zero',
        text: 'Set to zero',
        onClick: () => this.deliverToZero(key, need),
      });
    }

    let fcDiffCellColor = '';
    if (need > 0) {
      fcDiffCellColor = sumCargoFC >= need
        ? 'lime'
        : appTheme.palette.yellow;
    }

    return <tr key={`cc-${key}`} className={className} style={style}>
      <td className='commodity-name' id={`cargo-${key}`}>
        <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
        &nbsp;
        {isReady && <Icon iconName='CompletedSolid' title={`${displayName} is ready`} />}
        &nbsp;
        {sumCargoFC >= need && <Icon iconName='AirplaneSolid' title={`Enough ${displayName} loaded on FCs`} />}

        {isContextTarget && <ContextualMenu
          target={`#cn-${key}`}
          onDismiss={() => this.setState({ cargoContext: undefined })}
          items={menuItems}
        />}

        <Icon
          className='btn'
          iconName='ContextMenu'
          title={`Commands for: ${key}`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ cargoContext: key });
          }}
        />
      </td>

      <td className='commodity-need' >
        <span className='t'>{need.toLocaleString()}</span>
      </td>

      {fcCargoKeys.length > 0 && !this.state.hideFCColumns && <>
        {/* The FC Diff cell, then a cell for each FC */}
        <td key='fcc-have' className='commodity-diff'  >
          <div className='bubble' style={{ backgroundColor: fcDiffCellColor }} >
            {sumCargoFC > 0 ? diffCargoFC : ''}
          </div>
        </td>
        {fcCargoKeys.map(marketId => <td key={`fcc${marketId}`} className='commodity-need' >
          <span className='t'>{this.state.fcCargo[marketId][key]?.toLocaleString()}</span>
        </td>)}
      </>}

      {this.state.hasAssignments && <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>}
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
        {!editProject && this.renderLinkedFC()}
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
      var row = <li key={`@${key}`}>
        <span className='removable'>
          {key}
          <Icon
            className='btn'
            iconName='Delete'
            title={`Remove commander: ${key}`}
            style={{ color: appTheme.palette.themePrimary, paddingTop: 80 }}
            onClick={() => { this.onClickCmdrRemove(key); }}
          />
        </span>
      </li>;
      rows.push(row)
    }

    return <>
      <h3>{Object.keys(proj.commanders).length ?? 0} Commanders:</h3>
      <ul>
        {rows}
      </ul>
      <div hidden={showAddCmdr}>
        <ActionButton text='Add a new Commander?' onClick={this.onShowAddCmdr} iconProps={{ iconName: 'AddFriend' }} />
      </div>
      {showAddCmdr && <div className='add-cmdr'>
        <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
          <TextField
            id='new-cmdr-edit'
            name='cmdr'
            value={newCmdr}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { this.onClickAddCmdr(); }
              if (ev.key === 'Escape') { this.setState({ showAddCmdr: false }); }
            }}
            onChange={(_, v) => this.setState({ newCmdr: v })}
          />
          <PrimaryButton text='Add' onClick={this.onClickAddCmdr} iconProps={{ iconName: 'Add' }} />
          <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showAddCmdr: false })} />
        </Stack>
      </div>}
    </>
  }

  renderLinkedFC() {
    const { proj, showAddFC, fcMatchMarketId, fcMatchError } = this.state;
    if (!proj) { return <div />; }

    const rows = proj.linkedFC.map(item => (<li key={`@${item.marketId}`}>
      <span className='removable'>
        <a href={`#fc=${item.marketId}`}>{fcFullName(item.name, item.displayName)}</a>
        <Icon
          className='btn'
          iconName='Delete'
          title={`Unlink FC: ${item.displayName} (${item.name})`}
          style={{ color: appTheme.palette.themePrimary, paddingTop: 80 }}
          onClick={() => { this.onClickUnlinkFC(proj.buildId, item.marketId); }}
        />
      </span>
    </li>));

    return <>
      <h3>{proj.linkedFC.length ?? 0} Linked Fleet Carriers:</h3>
      <ul>
        {rows}
      </ul>
      <div hidden={showAddFC}>
        <ActionButton text='Link to a Fleet Carrier?' onClick={() => {
          this.setState({
            showAddFC: true,
            fcMatchError: undefined
          });
          delayFocus('add-fc-combo-input');
        }}
          iconProps={{ iconName: 'AddLink' }} />
      </div>

      {showAddFC && <div>
        <Label>Enter Fleet Carrier name:</Label>
        <Stack className='add-fc' horizontal tokens={{ childrenGap: 10, padding: 10, }}>
          <FindFC
            errorMsg={fcMatchError}
            onMarketId={(marketId) => {

              if (marketId) {
                if (this.state.proj?.linkedFC.find(fc => fc.marketId.toString() === marketId)) {
                  this.setState({ fcMatchMarketId: undefined, fcMatchError: `FC already linked` });
                } else {
                  this.setState({ fcMatchMarketId: marketId, fcMatchError: undefined });
                }
              } else {
                this.setState({ fcMatchMarketId: undefined, fcMatchError: undefined });
              }
            }}
          />

          <PrimaryButton text='Link' onClick={this.onClickLinkFC} iconProps={{ iconName: 'Airplane' }} disabled={!fcMatchMarketId || !!fcMatchError} />
          <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showAddFC: false, fcMatchError: undefined })} />
        </Stack>
      </div>}
    </>
  }

  onClickCmdrRemove = async (cmdr: string) => {
    if (!this.state.proj?.buildId || !cmdr) { return; }

    try {
      await api.project.unlinkCmdr(this.state.proj.buildId, cmdr);

      // success - remove from in-memory data
      const { proj } = this.state;
      if (!proj.commanders) { proj.commanders = {}; }
      delete proj.commanders[cmdr];
      this.setState({ proj });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onShowAddCmdr = () => {
    console.log('onShowAddCmdr:', this.state.showAddCmdr);
    const cmdrName = store.cmdrName;
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
      await api.project.linkCmdr(this.state.proj.buildId, newCmdr);

      // success - add to in-memory data
      const { proj } = this.state;
      if (!proj.commanders) { proj.commanders = {}; }
      proj.commanders[newCmdr] = [];
      this.setState({
        showAddCmdr: false,
        newCmdr: '',
        proj
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onClickLinkFC = async () => {
    const buildId = this.state.proj?.buildId;
    const marketId = this.state.fcMatchMarketId;
    if (buildId && marketId) {
      try {
        const linkedFCs = await api.project.linkFC(buildId, marketId);

        this.updateLinkedFC(buildId, linkedFCs);

      } catch (err: any) {
        this.setState({ errorMsg: err.message });
      }
    }
  }

  onClickUnlinkFC = async (buildId: string, marketId: number) => {
    try {
      // remove cargo counts before making the API call
      const fcCargoTemp = { ...this.state.fcCargo };
      delete fcCargoTemp[marketId];
      this.setState({ fcCargo: fcCargoTemp });

      const linkedFCs = await api.project.unlinkFC(buildId, marketId);

      this.updateLinkedFC(buildId, linkedFCs);

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  updateLinkedFC(buildId: string, linkedFCs: ProjectFC[]) {
    const updatedProj = {
      ...this.state.proj!,
      linkedFC: linkedFCs,
    };
    this.setState({
      proj: updatedProj,
      showAddFC: false,
      deliverMarketId: linkedFCs.find(fc => fc.marketId.toString() === this.state.deliverMarketId)?.marketId.toString() ?? 'site',
      fcMatchError: undefined,
      errorMsg: undefined,
    });
    this.fetchCargoFC(buildId);
  }

  onClickAssign = async (assignCmdr: string) => {
    const { proj, assignCommodity } = this.state;
    if (!proj?.buildId || !assignCmdr || !assignCommodity) { return; }
    try {
      await api.project.assignCmdr(proj.buildId, assignCmdr, assignCommodity);

      // success - add to in-memory data
      if (!proj.commanders) { proj.commanders = {}; }
      if (!proj.commanders[assignCmdr]) { proj.commanders[assignCmdr] = []; }

      proj.commanders[assignCmdr].push(assignCommodity)
      this.setState({
        assignCommodity: undefined,
        hasAssignments: Object.keys(proj.commanders).reduce((s, c) => s += proj.commanders[c].length, 0) > 0,
        proj
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onClickUnassign = async (cmdr: string, commodity: string) => {
    const { proj } = this.state;
    if (!proj || !proj.buildId || !proj.commanders || !cmdr || !commodity || !proj.commanders[cmdr]) { return; }
    try {
      await api.project.unAssignCmdr(proj.buildId, cmdr, commodity);

      // success - remove from to in-memory data
      const idx = proj.commanders[cmdr].indexOf(commodity)
      proj.commanders[cmdr].splice(idx, 1);
      this.setState({
        proj,
        hasAssignments: Object.keys(proj.commanders).reduce((s, c) => s += proj.commanders[c].length, 0) > 0,
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onToggleReady = async (buildId: string, commodity: string, isReady: boolean) => {
    try {
      await api.project.setReady(buildId, [commodity], isReady);

      // success - remove from in-memory data
      const editReady = this.state.editReady;
      if (isReady)
        editReady.delete(commodity)
      else
        editReady.add(commodity)
      this.setState({ editReady });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onProjectDelete = async () => {
    const buildId = this.state.proj?.buildId;
    if (!buildId) return;

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await api.project.delete(buildId);

      // success - navigate to home
      store.removeRecentProject(buildId);
      window.location.assign(`#`);
      window.location.reload();

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onProjectComplete = async () => {
    const buildId = this.state.proj?.buildId;
    if (!buildId) return;

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await api.project.complete(buildId);

      window.location.reload();

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

  onUpdateProjectCommodities = async () => {
    const { proj, editCommodities } = this.state;

    if (!!proj?.commodities && proj.buildId && editCommodities) {
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
        const savedProj = await api.project.update(proj.buildId, deltaProj);

        // success - apply new commodity count
        this.setState({
          proj: savedProj,
          editReady: new Set(savedProj.ready),
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
          editCommodities: undefined,
          mode: Mode.view,
          submitting: false,
        });

      } catch (err: any) {
        this.setState({ errorMsg: err.message });
      }
    }
  };

  onUpdateProjectDetails = async () => {
    const { proj, editProject } = this.state;

    if (proj?.buildId && editProject) {
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
        const savedProj = await api.project.update(proj.buildId, deltaProj);

        // success
        const cmdrName = store.cmdrName;
        this.setState({
          proj: savedProj,
          editReady: new Set(savedProj.ready),
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
          editProject: undefined,
          disableDelete: !!cmdrName && !!savedProj.architectName && savedProj.architectName.toLowerCase() !== cmdrName.toLowerCase(),
          mode: Mode.view,
          submitting: false,
        });

      } catch (err: any) {
        this.setState({ errorMsg: err.message });
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
      const deltaProj = {
        buildId: proj.buildId,
        marketId: parseInt(fixMarketId),
      };
      const savedProj = await api.project.update(proj.buildId, deltaProj);

      // success
      console.log('saveNewMarketId: savedProj:', savedProj);
      this.setState({
        proj: savedProj,
        editReady: new Set(savedProj.ready),
        sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
        hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
        fixMarketId: undefined,
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
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
    const { proj, nextDelivery, nextCommodity, showBubble, submitting, fcCargo, deliverMarketId } = this.state;
    if (!proj) return;

    const deliveries = Object.keys(nextDelivery)
      .map(k => <tr key={`dk${k}`}>
        <td>{mapCommodityNames[k]}</td>
        <td>
          <input
            id={`deliver-${k}-input`}
            className='deliver-amount-edit'
            type='number'
            value={nextDelivery[k]}
            min={0}
            max={Math.min(proj.commodities[k], store.cmdr?.largeMax ?? 800)}
            style={{ backgroundColor: deliverMarketId === 'site' && nextDelivery[k] > proj.commodities[k] ? appTheme.palette.yellowLight : '' }}
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
          <ActionButton
            title='Set ship max or amount needed'
            iconProps={{ iconName: 'CirclePlus' }}
            onClick={() => {
              const newNextDelivery = { ...this.state.nextDelivery };
              newNextDelivery[k] = Math.min(proj.commodities[k], store.cmdr?.largeMax ?? 800)
              this.setState({
                nextDelivery: newNextDelivery,
              });
              delayFocus(`deliver-${k}-input`);
            }} >{proj.commodities[k]}
          </ActionButton>

        </td>
      </tr>)

    const sumTotal = Object.values(nextDelivery).reduce((sum, v) => sum += v, 0);
    const noNextCommodities = Object.values(nextDelivery).length === 0;
    const addingCommidity = nextCommodity !== undefined || noNextCommodities;

    // build up delivery options if there are FCs we can deliver to
    const fcCargoKeys = Object.keys(fcCargo);
    const cargoOptions = Object.keys(proj.commodities)
      .filter(k => !(k in nextDelivery) && proj.commodities[k] > 0)
      .map(k => ({ key: k, text: mapCommodityNames[k] }));

    const destinationOptions: IDropdownOption[] = [
      { key: 'site', text: 'Construction site', data: { icon: 'Manufacturing' } },
      { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
      ...fcCargoKeys.map(marketId => ({ key: marketId, text: this.getFullFCName(marketId) }))
    ];

    const destinationPicker = <Dropdown
      id='deliver-destination'
      openOnKeyboardFocus
      placeholder='Choose a destination...'
      style={{ width: 200 }}
      options={destinationOptions}
      onRenderOption={(o) => { return <><Icon iconName={o?.data?.icon ?? 'Airplane'} />&nbsp;{o?.text}</>; }}
      dropdownWidth='auto'
      selectedKey={deliverMarketId}
      onChange={(_, o) => this.setState({ deliverMarketId: o!.key.toString() })}
    />;

    return <div className='delivery'>
      {!submitting && <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
        <PrimaryButton
          text='Deliver'
          disabled={sumTotal === 0 || submitting || !deliverMarketId}
          iconProps={{ iconName: 'DeliveryTruck' }}
          onClick={this.deliverToSite}
        />
        {fcCargoKeys.length > 0 && destinationPicker}
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => {
          this.setState({ mode: Mode.view });
        }} />
      </Stack>}

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

      {
        showBubble && <TeachingBubble
          target={'#current-cmdr'}
          headline='Who are you?'
          hasCloseButton={true}
          onDismiss={() => { this.setState({ showBubble: false }) }}
        >
          Enter your cmdr's name to get credit for this delivery.
        </TeachingBubble>
      }

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

  deliverToZero(commodity: string, count: number) {
    // update local count state before API call
    const updateProj = this.state.proj!;
    updateProj.commodities[commodity] = 0;
    this.setState({ proj: updateProj });

    const cargo: Record<string, number> = {};
    cargo[commodity] = count;
    this.deliverToSite2(
      this.state.proj?.buildId!,
      cargo,
      'site'
    );
  }

  deliverToSite = async () => {
    const { proj, nextDelivery, deliverMarketId } = this.state;
    this.deliverToSite2(proj?.buildId!, nextDelivery, deliverMarketId);
  }

  deliverToSite2 = async (buildId: string, nextDelivery: Record<string, number>, deliverMarketId: string) => {
    try {
      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

      const nextState: Partial<ProjectViewState> = {
        submitting: false,
        mode: Mode.view,
        deliverMarketId: deliverMarketId,
      }
      if (deliverMarketId === 'site') {
        // deliver to the construction site
        const newCommodities = await api.project.deliverToSite(buildId, store.cmdrName ?? 'unknown', nextDelivery);

        // update commodity counts on current project
        const updateProj = this.state.proj!;
        for (const k in newCommodities) {
          updateProj.commodities[k] = newCommodities[k];
        }

        // update state and re-fetch stats
        nextState.proj = updateProj;
        nextState.editReady = new Set(updateProj.ready);
        nextState.sumTotal = Object.values(updateProj.commodities).reduce((total, current) => total += current, 0);
        this.fetchProjectStats(buildId);
      } else {
        // deliver to some FC
        const newCommodities = await api.fc.deliverToFC(deliverMarketId, nextDelivery);

        // update commodity counts on the FC project
        const fcCargoUpdate = this.state.fcCargo;
        const fcCargo = fcCargoUpdate[deliverMarketId];
        for (const k in newCommodities) { fcCargo[k] = newCommodities[k]; }
        nextState.fcCargo = fcCargoUpdate;
      }

      this.setState(nextState as ProjectViewState);
      store.deliver = nextDelivery;
      store.deliverDestination = deliverMarketId;
    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  };

  async deliverToFC() {
    try {
      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  }

}

