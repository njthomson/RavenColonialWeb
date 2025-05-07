import './ProjectView.css';
import * as api from '../../api';
import { ActionButton, CommandBar, ContextualMenu, ContextualMenuItemType, DefaultButton, Dropdown, DropdownMenuItemType, ICommandBarItemProps, Icon, IconButton, IContextualMenuItem, IDropdownOption, Label, Link, MessageBar, MessageBarButton, MessageBarType, Modal, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { BuildTypeDisplay, CargoRemaining, ChartByCmdrs, ChartByCmdrsOverTime, ChartGeneralProgress, CommodityIcon, EditCargo, FindFC } from '../../components';
import { store } from '../../local-storage';
import { appTheme, cn } from '../../theme';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, mapCommodityNames, Project, ProjectFC, SortMode, SupplyStatsSummary } from '../../types';
import { asPosNegTxt, delayFocus, fcFullName, flattenObj, getCargoCountOnHand, getColorTable, getTypeForCargo, mergeCargo, openDiscordLink, sumCargo } from '../../util';
import { CopyButton } from '../../components/CopyButton';
import { FleetCarrier } from '../FleetCarrier';
import { LinkSrvSurvey } from '../../components/LinkSrvSurvey';
import { TimeRemaining } from '../../components/TimeRemaining';
import { EditProject } from '../../components/EditProject/EditProject';
import { getSiteType, mapName, SysEffects } from '../../site-data';
import { Chevrons, TierPoints } from '../../components/Chevrons';

interface ProjectViewProps {
  buildId?: string;
}

interface ProjectViewState {
  buildId?: string;
  proj?: Project;
  lastTimestamp?: string;
  autoUpdateUntil: number;
  mode: Mode;
  sort: SortMode;
  loading: boolean;
  primaryBuildId?: string;
  refreshing?: boolean;
  showAddCmdr: boolean;
  newCmdr?: string;
  confirmDelete?: boolean;
  confirmComplete?: boolean;
  errorMsg?: string;

  assignCommodity?: string;
  assignCmdr?: string;
  hasAssignments?: boolean;

  editCommodities?: Cargo;
  editReady: Set<string>;
  editProject: boolean;
  disableDelete?: boolean;
  fixMarketId?: string;
  summary?: SupplyStatsSummary;
  sumTotal: number;

  showBubble: boolean;
  hideDoneRows: boolean;
  hideFCColumns: boolean;

  nextDelivery: Cargo;
  deliverMarketId: string;
  submitting: boolean;
  cargoContext?: string;

  showAddFC: boolean;

  fcCargo: Record<string, Cargo>;
  fcEditMarketId?: string;
}

enum Mode {
  view,
  deliver,
}

export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  private timer?: NodeJS.Timeout;
  /** The count of needed cargo already loaded on Fleet Carriers */
  private countReadyOnFCs: number = 0;

  constructor(props: ProjectViewProps) {
    super(props);

    const sortMode = store.commoditySort;
    this.state = {
      loading: true,
      autoUpdateUntil: 0,
      primaryBuildId: store.primaryBuildId,
      mode: Mode.view,
      sort: sortMode ?? SortMode.group,
      newCmdr: '',
      editProject: false,
      showAddCmdr: false,
      disableDelete: true,
      sumTotal: 0,

      editReady: new Set<string>(),
      hideDoneRows: store.commodityHideCompleted,
      hideFCColumns: store.commodityHideFCColumns,
      showBubble: !store.cmdr,
      nextDelivery: store.deliver,
      deliverMarketId: store.deliverDestination,
      submitting: false,

      showAddFC: false,
      fcCargo: {},
    };
  }

  componentDidMount() {
    // fetch initial data, then start auto-updating
    this.fetchProject(this.props.buildId).then(() => {
      this.toggleAutoRefresh();
    })
  }

  componentWillUnmount(): void {
    if (this.timer) { clearTimeout(this.timer); }
  }

  componentDidUpdate(prevProps: Readonly<ProjectViewProps>, prevState: Readonly<ProjectViewState>, snapshot?: any): void {
    // buildId changed from external
    if (prevProps.buildId !== this.props.buildId && this.props.buildId) {
      if (this.timer) { clearTimeout(this.timer); }

      // set new buildId and reset the rest of state
      this.setState({
        buildId: this.props.buildId,
        proj: undefined,
        loading: true,
        autoUpdateUntil: 0,
        primaryBuildId: store.primaryBuildId,
        mode: Mode.view,
        newCmdr: '',
        editProject: false,
        showAddCmdr: false,
        disableDelete: true,
        sumTotal: 0,

        editReady: new Set<string>(),
        hideDoneRows: store.commodityHideCompleted,
        hideFCColumns: store.commodityHideFCColumns,
        showBubble: !store.cmdr,
        nextDelivery: store.deliver,
        deliverMarketId: store.deliverDestination,
        submitting: false,

        showAddFC: false,
        fcCargo: {},
      });
    }

    // buildId changed from above
    if (prevState.buildId !== this.state.buildId && this.state.buildId) {
      if (this.timer) { clearTimeout(this.timer); }
      this.pollLastTimestamp(this.state.buildId, true);
    }
  }

  getFullFCName(marketId: string) {
    const fc = this.state.proj?.linkedFC.find(fc => fc.marketId.toString() === marketId);
    if (fc)
      return fcFullName(fc.name, fc.displayName);
    else
      return '?';
  }

  async fetchProject(buildId: string | undefined, refreshing: boolean = false, polling: boolean = false) {
    if (!buildId) {
      this.setState({ loading: false });
      return;
    }

    try {
      this.setState({
        loading: !refreshing,
        refreshing: refreshing,
      });

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
        buildId: newProj.buildId,
        proj: newProj,
        editProject: window.location.hash.startsWith('#edit'),
        lastTimestamp: newProj.timestamp,
        editReady: new Set(newProj.ready),
        sumTotal: Object.values(newProj.commodities).reduce((total, current) => total += current, 0),
        hasAssignments: Object.keys(newProj.commanders).reduce((s, c) => s += newProj.commanders[c].length, 0) > 0,
        loading: false,
        refreshing: false,
        disableDelete: !!store.cmdrName && (!newProj.architectName || newProj.architectName.toLowerCase() !== store.cmdrName.toLowerCase()),
        deliverMarketId: deliverMarketId,
      });

      // if ALL commodities have a count of 10 - it means the project is brand new and we want people to edit them to real numbers
      if (Object.values(newProj.commodities).every(v => v === 10 || v === -1)) {
        this.setState({
          editCommodities: { ...newProj.commodities },
        });
        delayFocus('first-commodity-edit');
      }

      window.document.title = `Build: ${newProj.buildName} in ${newProj.systemName}`;
      if (newProj.complete) window.document.title += ' (completed)';
      return newProj;

    } catch (err: any) {
      if (polling) {
        console.error(`Stop auto-updating at: ${new Date()} due to:\n`, err?.message);
        this.setState({ loading: false, refreshing: false, autoUpdateUntil: 0 });
      } else {
        this.setState({ loading: false, refreshing: false, errorMsg: err.message, });
      }
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

  async pollLastTimestamp(buildId: string, force: boolean = false) {
    try {
      if (!force) {
        // call server to see if anything changed
        let timestamp = await api.project.last(buildId);

        // use current state if no .last added yet
        if (timestamp === '0001-01-01T00:00:00+00:00' && this.state.lastTimestamp) { timestamp = this.state.lastTimestamp; }

        console.debug(`pollTimestamp: changed? ${timestamp !== this.state.lastTimestamp || force}  (${timestamp} vs ${this.state.lastTimestamp})`);

        if (timestamp !== this.state.lastTimestamp || force) {
          // something has changed
          await this.fetchProject(buildId, true, true);
        }
      } else {
        // forcing...
        await this.fetchProject(buildId, true, true);
      }

      // schedule next poll?
      if (this.state.autoUpdateUntil > 0) {
        if (Date.now() < this.state.autoUpdateUntil) {
          this.timer = setTimeout(() => {
            this.pollLastTimestamp(buildId);
          }, autoUpdateFrequency);
        } else {
          console.log(`Stopping auto-update after one hour of no changes at: ${new Date().toISOString()}`);
          this.setState({ autoUpdateUntil: 0 });
        }
      }
    } catch (err: any) {
      console.error(`Stop auto-updating at: ${new Date()} due to:\n`, err?.message);
      this.setState({ autoUpdateUntil: 0 });
    }
  }

  async setAsPrimary(buildId: string) {
    // add a little artificial delay so UI doesn't flicker
    this.setState({ refreshing: true })
    await new Promise(resolve => setTimeout(resolve, 500))

    api.cmdr.setPrimary(store.cmdrName, buildId)
      .then(() => {
        store.primaryBuildId = buildId;
        this.setState({ refreshing: false, primaryBuildId: buildId });
      })
      .catch(err => this.setState({ refreshing: false, errorMsg: err.message }));
  }

  async clearPrimary() {
    // add a little artificial delay so UI doesn't flicker
    this.setState({ refreshing: true })
    await new Promise(resolve => setTimeout(resolve, 500))

    api.cmdr.clearPrimary(store.cmdrName)
      .then(() => {
        store.primaryBuildId = '';
        this.setState({ refreshing: false, primaryBuildId: '' });
      })
      .catch(err => this.setState({ refreshing: false, errorMsg: err.message }));
  }

  render() {
    const { mode, proj, loading, refreshing, confirmDelete, confirmComplete, errorMsg, editProject, disableDelete, submitting, primaryBuildId, editCommodities, autoUpdateUntil } = this.state;

    if (loading) {
      return <Spinner size={SpinnerSize.large} label={`Loading build project...`} />
    }

    if (!proj) { return null; }

    // prep CommandBar buttons
    const hasDiscordLink = !!this.state.proj?.discordLink;
    let discordTitle = 'Edit the project to set a Discord link';
    if (hasDiscordLink)
      discordTitle = store.useNativeDiscord
        ? `Open link in Discord app:\n${this.state.proj?.discordLink}`
        : `Open Discord link in a tab:\n${this.state.proj?.discordLink}`;

    const commands: ICommandBarItemProps[] = [
      {
        key: 'deliver-cargo',
        text: 'Deliver',
        iconProps: { iconName: 'DeliveryTruck' },
        disabled: proj.complete || refreshing,
        style: { color: proj.complete || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          this.setState({ mode: Mode.deliver });
          delayFocus('deliver-commodity');
        },
      },
      {
        key: 'btn-edit',
        text: 'Edit project',
        iconProps: { iconName: 'Edit' },
        disabled: refreshing,
        style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => this.setState({ editProject: true }),
      },
      {
        key: 'edit-commodities',
        text: 'Edit commodities',
        iconProps: { iconName: 'AllAppsMirrored' },
        disabled: proj.complete || refreshing,
        style: { color: proj.complete || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          this.setState({ editCommodities: { ...this.state.proj!.commodities } });
          delayFocus('first-commodity-edit');
        }
      },
      {
        key: 'btn-refresh',
        text: 'Refresh',
        title: !!autoUpdateUntil ? 'Click to stop auto updating' : 'Click to refresh now and auto update every 30 seconds',
        iconProps: { iconName: !!autoUpdateUntil ? 'PlaybackRate1x' : 'Refresh' },
        disabled: refreshing,
        style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          this.toggleAutoRefresh();
        }
      },
      {
        key: 'btn-delete', text: 'Delete',
        iconProps: { iconName: 'Delete' },
        disabled: disableDelete || refreshing,
        style: { color: disableDelete || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          this.setState({ confirmDelete: true });
          delayFocus('delete-no');
        },
      },
      {
        key: 'btn-primary', text: 'Primary',
        iconProps: { iconName: proj.buildId === primaryBuildId ? 'SingleBookmarkSolid' : 'SingleBookmark' },
        title: proj.buildId === primaryBuildId ? 'This is your current primary project. Click to clear.' : 'Set this as your current primary project',
        disabled: proj.complete || refreshing,
        style: { color: proj.complete || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          if (proj.buildId === primaryBuildId)
            this.clearPrimary();
          else
            this.setAsPrimary(proj.buildId);
        },
      },
      {
        key: 'discord-link',
        text: 'Discord',
        title: discordTitle,
        disabled: !hasDiscordLink || refreshing,
        style: { color: !hasDiscordLink || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        iconProps: { iconName: 'OfficeChatSolid' },
        onClick: () => openDiscordLink(this.state.proj?.discordLink)
      }
    ];

    // prepare rich copy link
    var copyLink = new ClipboardItem({
      'text/plain': `https://ravencolonial.com/#build=${proj.buildId}`,
      'text/html': new Blob([`<a href='${`https://ravencolonial.com/#build=${proj.buildId}`}'>${proj.buildName}</a>`], { type: 'text/html' }),
    });

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      <div className='full'>
        <h2 className='project-title'>
          <span style={{ fontSize: 16 }}><CopyButton text={proj.systemName} /></span>
          <Link href={`#find=${proj.systemName}`}>{proj.systemName}</Link>: {proj.buildName} {proj.complete && <span> (completed)</span>}
          <span style={{ fontSize: 16 }}><CopyButton text={copyLink} title='Copy a link to this page' /></span>
        </h2>
        {proj.marketId <= 0 && this.renderMissingMarketId()}
        {mode === Mode.view && <CommandBar className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`} items={commands} />}
      </div >

      <div className='contain-horiz'>
        {!proj.complete && mode === Mode.view && <div className='half'>
          {this.renderCommodities()}
        </div>}

        {!!editCommodities && this.renderEditCommodities()}

        {mode === Mode.view && this.renderProjectDetails(proj)}

        {editProject && <EditProject proj={proj}
          onChange={savedProj => {
            if (window.location.hash.startsWith('#edit')) {
              window.location.hash = `#build=${proj.buildId}`;
            }

            if (!savedProj) {
              this.setState({ mode: Mode.view, editProject: false, });
              return;
            }

            const cmdrName = store.cmdrName;
            this.setState({
              proj: savedProj,
              editProject: false,
              lastTimestamp: savedProj.timestamp,
              editReady: new Set(savedProj.ready),
              sumTotal: sumCargo(savedProj.commodities),
              hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
              disableDelete: !!cmdrName && !!savedProj.architectName && savedProj.architectName.toLowerCase() !== cmdrName.toLowerCase(),
              mode: Mode.view,
              submitting: false,
            });
          }}
        />}

        {mode === Mode.view && !!proj.maxNeed && this.renderStats()}
      </div>

      <Modal isOpen={confirmDelete} onDismiss={() => this.setState({ confirmDelete: false })}>
        <div className='center'>
          <p>
            <h3 className={cn.h3}>Are you sure you want to delete?</h3>
            <br />
            This cannot be undone.</p>
          <DefaultButton
            text='Yes'
            disabled={submitting}
            iconProps={{ iconName: 'Warning' }}
            style={{ backgroundColor: appTheme.palette.yellowLight }}
            onClick={this.onProjectDelete}
          />
          &nbsp;
          <DefaultButton
            text='No'
            id='delete-no'
            iconProps={{ iconName: 'Cancel' }}
            disabled={submitting}
            onClick={() => this.setState({ confirmDelete: false })}
          />
        </div>
      </Modal>

      <Modal isOpen={confirmComplete}>
        <div className='center'>
          <p>
            <h3 className={cn.h3}>Confirm completion?</h3>
            <br />
            Completed projects can still be found but cannot be made active again.
          </p>
          <PrimaryButton text='Yes' iconProps={{ iconName: 'Accept' }} onClick={this.onProjectComplete} disabled={submitting} />
          &nbsp;
          <DefaultButton text='No' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ confirmComplete: false })} disabled={submitting} />
        </div >
      </Modal>

      {mode === Mode.deliver && this.renderDeliver()}
    </>;
  }

  renderEditCommodities() {
    const { proj, editCommodities, sort, submitting } = this.state;
    const isDefaultCargo = Object.values(proj!.commodities).every(v => v === 10 || v === -1);

    return <Modal
      isOpen
    >
      {isDefaultCargo && <MessageBar
        messageBarType={MessageBarType.warning}
        actions={<MessageBarButton onClick={this.setDefaultApproxCargoCounts}
        >
          Use approximate values
        </MessageBarButton>}
      >
        <div>Please manually enter required cargo numbers:</div>
        <div>Or dock at the construction site running<LinkSrvSurvey /></div>
        <div>Or proceed using approximate default values.</div>
      </MessageBar>}

      <EditCargo
        cargo={editCommodities!}
        sort={sort}
        noAdd noDelete showTotalsRow
        onChange={cargo => this.setState({ editCommodities: cargo })}
      />
      <br />
      <br />
      {submitting && <Spinner
        className='submitting'
        label="Updating commodities ..."
        labelPosition="right"
      />}

      {!submitting && <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
        <PrimaryButton
          text='Update cargo'
          iconProps={{ iconName: 'Save' }}
          onClick={this.onUpdateProjectCommodities}
        />
        <DefaultButton
          text='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => {
            this.setState({ mode: Mode.view, editCommodities: undefined });
          }}
        />
      </Stack>}
    </Modal>;
  }

  getGroupedCommodities(): Record<string, string[]> {
    const { proj, sort, hideDoneRows } = this.state;
    if (!proj?.commodities) throw new Error("Why no commodities?");

    const sorted = Object.keys(proj.commodities)
      .filter(k => !hideDoneRows || proj.commodities[k] !== 0 || proj.complete);
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
    const { proj, assignCommodity, sumTotal, mode, sort, hideDoneRows, hideFCColumns, hasAssignments, fcCargo } = this.state;
    if (!proj?.commodities) { return <div />; }

    // do not render list if nothing left to deliver
    if (sumTotal === 0) {
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

    // calculate sum cargo diff for all FCs per commodity name
    const fcMarketIds = Object.keys(fcCargo);
    const mapSumCargoDiff = Object.keys(mapCommodityNames).reduce((map, key) => {
      const need = proj.commodities[key] ?? 0;
      if (need >= 0) { map[key] = fcMarketIds.reduce((sum, marketId) => sum += fcCargo[marketId][key] ?? 0, 0) - need; }
      return map;
    }, {} as Cargo);

    // as we have the FC cargo diff's known here, calculate how much they have ready for the total progress chart. Meaning: count the needs where FCs have a surplus, otherwise count what is on the FC
    const fcMergedCargo = mergeCargo(Object.values(fcCargo))
    this.countReadyOnFCs = getCargoCountOnHand(proj.commodities, fcMergedCargo);

    // calculate sum of diffs that are negative
    const fcSumCargoDeficit = Object.values(mapSumCargoDiff)
      .filter(v => v < 0)
      .reduce((sum, v) => sum += -v, 0);

    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        // group row
        if (sort !== SortMode.alpha) {
          rows.push(<tr key={`group-${key}`} className='group' style={{ background: appTheme.palette.themeSecondary, color: appTheme.palette.neutralLight }}>
            <td colSpan={2 + colSpan} className='hint'> {key}</td>
          </tr>)
        }
        continue;
      }

      // TODO: Entirely split view rendering
      flip = !flip;
      var row = this.getCommodityRow(proj, key, cmdrs, flip, mapSumCargoDiff);
      rows.push(row)

      // show extra row to assign a commodity to a cmdr?
      if (assignCommodity === key && proj.commanders) {
        rows.push(this.getCommodityAssignmentRow(key, proj, cmdrs));
      }
    }

    return <>
      {mode === Mode.view && <h3 className={cn.h3}>
        Commodities:&nbsp;
        <ActionButton
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
          iconProps={{ iconName: hideDoneRows ? 'ThumbnailViewMirrored' : 'AllAppsMirrored' }}
          title={hideDoneRows ? 'Hiding completed commodies' : 'Showing all commodities'}
          text={hideDoneRows ? 'Active' : 'All'}
          onClick={() => {
            this.setState({ hideDoneRows: !hideDoneRows });
            store.commodityHideCompleted = !hideDoneRows;
          }}
        />
        {fcCount > 0 && <ActionButton
          iconProps={{ iconName: hideFCColumns ? 'fleetCarrier' : 'fleetCarrierSolid' }}
          title={hideFCColumns ? 'Hiding FC columns' : 'Showing FC columns'}
          onClick={() => {
            this.setState({ hideFCColumns: !hideFCColumns });
            store.commodityHideFCColumns = !hideFCColumns;
          }}
        />}
      </h3>}

      <table className={`commodities ${sort}`} cellSpacing={0} cellPadding={0}>
        <thead>
          <tr>
            <th className={`commodity-name ${cn.bb} ${cn.br}`}>Commodity</th>
            <th className={`commodity-need ${cn.bb} ${cn.br}`} title='Total needed for this commodity'>Need</th>
            {!hideFCColumns && colSpan > 0 && this.getCargoFCHeaders()}
            {hasAssignments && <th className={`commodity-assigned ${cn.bb}`}>Assigned</th>}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      {sumTotal > 0 && <div className='cargo-remaining'>
        <CargoRemaining sumTotal={sumTotal} label='Remaining cargo' />
        {!hideFCColumns && fcSumCargoDeficit > 0 && <CargoRemaining sumTotal={fcSumCargoDeficit} label='Fleet Carrier deficit' />}
      </div>}
    </>
  }

  getCargoFCHeaders() {
    return [
      <th key={`fcc-have`} className={`commodity-need ${cn.bb} ${cn.br}`} title='Difference between amount needed and sum total across linked Fleet Carriers'>FC Diff</th>,
      ...Object.keys(this.state.fcCargo).map(k => {
        const fc = this.state.proj!.linkedFC.find(fc => fc.marketId.toString() === k);
        return fc && <th key={`fcc${k}`} className={`commodity-need ${cn.bb} ${cn.br}`} title={`${fc.displayName} (${fc.name})`} >
          <Link
            className='fake-link'
            onClick={() => this.setState({ fcEditMarketId: k })}
          >
            {fc.name}
          </Link>
        </th>;
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
              styles={{ callout: { border: '1px solid ' + appTheme.palette.themePrimary } }}
            />
            <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ assignCommodity: undefined })} />
          </Stack>
        </td>
      </tr>;
      return assignRow;
    }
  }

  getCommodityRow(proj: Project, key: string, cmdrs: string[], flip: boolean, mapSumCargoDiff: Cargo): JSX.Element {
    const displayName = mapCommodityNames[key];
    const currentCmdr = store.cmdrName;

    const assigned = cmdrs
      .filter(k => cmdrs.some(() => proj!.commanders && proj!.commanders[k].includes(key)))
      .map(k => {
        return <span className={`removable bubble ${cn.removable}`} key={`$${key}-${k}`} style={{ backgroundColor: k === currentCmdr ? appTheme.palette.themeLight : undefined }}>
          <span className={`glue ${k === currentCmdr ? 'active-cmdr' : ''}`} >📌{k}</span>
          <Icon
            className={`btn ${cn.btn}`}
            iconName='Delete'
            title={`Remove assignment of ${displayName} from ${k}`}
            style={{ color: appTheme.palette.themePrimary }}
            onClick={() => this.onClickUnassign(k, key)}
          />
        </span>;
      });

    const need = proj.commodities![key];


    const isContextTarget = this.state.cargoContext === key;
    const isReady = this.state.editReady.has(key);

    const menuItems: IContextualMenuItem[] = [
      {
        key: 'assign-cmdr',
        text: 'Assign to a commander ...',
        iconProps: { iconName: 'PeopleAdd' },
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
        iconProps: { iconName: 'StatusCircleCheckmark' },
      }
    ];

    if (need > 0) {
      menuItems.push({
        key: 'set-to-zero',
        text: 'Set to zero',
        onClick: () => this.deliverToZero(key, need),
        iconProps: { iconName: 'Download' },
      });
    }

    const sumCargoDiff = mapSumCargoDiff[key] ?? 0;
    let diffCargoFC = (sumCargoDiff).toLocaleString();
    if (!diffCargoFC.startsWith('-') && diffCargoFC !== '0') diffCargoFC = '+' + diffCargoFC;

    // prepare an element for the FC diff cell
    const fcSumTitle = sumCargoDiff > 0
      ? `FCs have a surplus of: ${sumCargoDiff} ${displayName}`
      : `FCs are short by: ${-sumCargoDiff} ${displayName}`;
    let fcSumElement = <></>;
    if (need > 0 && sumCargoDiff === 0) {
      fcSumElement = <Icon className='icon-inline' iconName='CheckMark' title={`FCs have enough ${displayName}`} style={{ cursor: 'Default', textAlign: 'center', width: '100%' }} />;
    } else if (need > 0 || sumCargoDiff > 0) {
      fcSumElement = <span title={fcSumTitle}>{diffCargoFC}</span>;
    }
    // prepare bubble colour for FC diff cell
    let fcDiffCellColor = '';
    if (need > 0) {
      fcDiffCellColor = sumCargoDiff >= 0 ? 'lime' : appTheme.palette.yellow;
    }

    const fcMarketIds = Object.keys(this.state.fcCargo);

    const className = need !== 0 ? '' : 'done ';
    const style: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };
    return <tr key={`cc-${key}`} className={className} style={style}>
      <td className={`commodity-name ${cn.br}`} id={`cargo-${key}`}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }}>
          <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
          &nbsp;
          {isReady && <Icon iconName='CompletedSolid' title={`${displayName} is ready`} />}
          &nbsp;
          {sumCargoDiff >= 0 && need > 0 && <Icon className='icon-inline' iconName='fleetCarrierBlack' title={fcSumTitle} />}

          {isContextTarget && <ContextualMenu
            target={`#cn-${key}`}
            onDismiss={() => this.setState({ cargoContext: undefined })}
            items={menuItems}
            styles={{
              container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
            }}
          />}

          <Icon
            className={`btn ${cn.btn}`}
            iconName='ContextMenu'
            title={`Commands for: ${key}`}
            style={{ color: appTheme.palette.themePrimary }}
            onClick={() => {
              this.setState({ cargoContext: key });
            }}
          />
        </Stack>
      </td>

      <td className={`commodity-need ${cn.br}`} >
        <span className='t'>{need === -1 ? '?' : need.toLocaleString()}</span>
      </td>

      {fcMarketIds.length > 0 && !this.state.hideFCColumns && <>
        {/* The FC Diff cell, then a cell for each FC */}
        <td key='fcc-have' className={`commodity-diff ${cn.br}`}  >
          <div className='bubble' style={{ backgroundColor: fcDiffCellColor, color: appTheme.palette.teal }} >
            {fcSumElement}
          </div>
        </td>
        {fcMarketIds.map(marketId => <td key={`fcc${marketId}`} className={`commodity-need ${cn.br}`} >
          <span>{this.state.fcCargo[marketId][key]?.toLocaleString()}</span>
        </td>)}
      </>
      }

      {this.state.hasAssignments && <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>}
    </tr>;
  }

  renderProjectDetails(proj: Project) {
    return <div className='half'>
      <div className='project'>
        <h3 className={cn.h3}>Build:</h3>
        <table>
          <tbody>
            <tr>
              <td>Build name:</td>
              <td>
                <div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>
                  {proj.buildName}
                  {proj.isPrimaryPort && <span title='System primary port' style={{ marginLeft: 8, cursor: 'default' }}>⚑</span>}
                </div>
              </td>
            </tr>

            <tr>
              <td>Build type:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}><BuildTypeDisplay buildType={proj.buildType} /></div>
              </td>
            </tr>

            <tr>
              <td>System name:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.systemName}</div></td>
            </tr>

            {!!proj.bodyName && <tr>
              <td>Body name:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.bodyName}&nbsp;</div></td>
            </tr>}

            <tr>
              <td>Architect:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.architectName}&nbsp;</div></td>
            </tr>

            <tr>
              <td>Faction:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.factionName}&nbsp;</div></td>
            </tr>

            {proj.timeDue && <tr>
              <td>Time remaining:</td>
              <td>
                <div id='due-time' className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>
                  <TimeRemaining timeDue={proj.timeDue} />
                </div>
              </td>
            </tr>}

            {!!proj.notes && <tr>
              <td>Notes:</td>
              <td><div className='grey notes' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.notes}&nbsp;</div></td>
            </tr>}

          </tbody>
        </table>
        {this.renderCommanders()}
        {this.renderLinkedFC()}
        {this.renderBuildEffects(proj)}
      </div>
    </div>;
  };

  renderBuildEffects(proj: Project) {

    const st = getSiteType(proj.buildType);

    const effectRows = Object.keys(st.effects).map(key => {
      const value = st.effects[key as keyof SysEffects] ?? 0;
      const displayName = mapName[key];
      let displayVal = asPosNegTxt(value);

      return <tr key={`se${key}`} title={`${displayName}: ${asPosNegTxt(value)}`}>
        <td>{displayName}:</td>
        <td>
          {value < 0 && <Chevrons name={displayName} count={value} />}
        </td>
        <td>
          {displayVal}
        </td>
        <td>
          {value > 0 && <Chevrons name={displayName} count={value} />}
        </td>
      </tr>
    });

    let needs = <span style={{ color: appTheme.palette.neutralTertiaryAlt }}>None</span>;
    if (st.needs.count > 0) {
      needs = <TierPoints tier={st.needs.tier} count={st.needs.count} />
    }
    let gives = null;
    if (st.gives.count > 0) {
      gives = <TierPoints tier={st.gives.tier} count={st.gives.count} />
    }

    return <>
      <br />
      <h3 className={cn.h3}>System effects:</h3>
      <table style={{ fontSize: '14px' }}>
        <tbody>

          {st.inf !== 'none' && <tr>
            <td>Economy:</td>
            <td colSpan={3}><div className='grey'>{mapName[st.inf]}</div>
            </td>
          </tr>}

          {effectRows}

          {<tr>
            <td colSpan={4}>
              <span>Needs: {needs}</span>
              &nbsp;
              <span>Provides: {gives}</span>
            </td>
          </tr>}

        </tbody>
      </table>
    </>;
  }

  renderCommanders() {
    const { proj, showAddCmdr, newCmdr } = this.state;
    if (!proj?.commanders) { return <div />; }

    const rows = [];
    for (const key in proj.commanders) {
      var row = <li key={`@${key}`}>
        <span className={`removable ${cn.removable}`}>
          {key}
          <Icon
            className={`btn ${cn.btn}`}
            iconName='Delete'
            title={`Remove commander: ${key}`}
            style={{ color: appTheme.palette.themePrimary, }}
            onClick={() => { this.onClickCmdrRemove(key); }}
          />
        </span>
      </li>;
      rows.push(row)
    }

    return <>
      <br />
      <h3 className={cn.h3}>
        {Object.keys(proj.commanders).length ?? 0} Commanders:
        &nbsp;
        {!showAddCmdr && <ActionButton
          iconProps={{ iconName: 'Add' }}
          text='Add'
          title='Add a new Commander to this project'
          style={{ marginLeft: 10, padding: 0, height: 22, }}
          onClick={this.onShowAddCmdr}
        />}
      </h3>

      {showAddCmdr && <div className='add-cmdr'>
        <Stack horizontal tokens={{ childrenGap: 4, padding: 4, }}>
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

      <ul>
        {rows}
      </ul>
    </>
  }

  renderLinkedFC() {
    const { proj, showAddFC, fcEditMarketId } = this.state;
    if (!proj) { return <div />; }

    const rows = proj.linkedFC.map(item => (<li key={`@${item.marketId}`}>
      <span className={`removable ${cn.removable}`}>
        {fcFullName(item.name, item.displayName)}
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Edit'
          title={`Edit FC: ${item.displayName} (${item.name})`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ fcEditMarketId: item.marketId.toString() });
          }}
        />
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Delete'
          title={`Unlink FC: ${item.displayName} (${item.name})`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => { this.onClickUnlinkFC(proj.buildId, item.marketId); }}
        />
      </span>
    </li>));

    let preMatches: Record<string, string> | undefined = undefined;
    if (showAddFC) {
      const cmdrLinkedFCs = store.cmdrLinkedFCs;
      preMatches = Object.keys(store.cmdrLinkedFCs)
        .filter(marketId => proj.linkedFC.every(fc => fc.marketId.toString() !== marketId))
        .reduce((map, marketId) => {
          map[marketId] = cmdrLinkedFCs[marketId];
          return map;
        }, {} as Record<string, string>);
    }

    const linkedMarketIds = this.state.proj?.linkedFC.map(fc => fc.marketId.toString()) ?? [];
    return <>
      <h3 className={cn.h3}>
        {proj.linkedFC.length ?? 0} Linked Fleet Carriers:
        &nbsp;
        {!showAddFC && <ActionButton
          iconProps={{ iconName: 'Add' }}
          text='Add'
          title='Link a new Fleet Carrier to this project'
          style={{ marginLeft: 10, padding: 0, height: 22, }}
          onClick={() => {
            this.setState({
              showAddFC: true,
              showAddCmdr: false,
            });
            delayFocus('add-fc-combo-input');
          }}
        />}
      </h3>
      {showAddFC && <div>
        <Label>Enter Fleet Carrier name:</Label>
        <FindFC
          preMatches={preMatches}
          notThese={linkedMarketIds}
          onChange={(marketId) => {

            if (marketId) {
              this.onClickLinkFC(marketId)
            } else {
              this.setState({ showAddFC: false });
            }
          }}
        />

      </div>}

      <ul>
        {rows}
      </ul>

      {fcEditMarketId && <FleetCarrier
        marketId={fcEditMarketId}
        onClose={() => {
          this.setState({ fcEditMarketId: undefined });
          this.fetchCargoFC(this.state.proj!.buildId);
        }}
      />}
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
    this.setState({ showAddCmdr: true, showAddFC: false, })
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
      await api.project.linkCmdr(this.state.proj.buildId, newCmdr.trim());

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

  onClickLinkFC = async (marketId: string) => {
    if (this.state.buildId && marketId) {
      try {
        const linkedFCs = await api.project.linkFC(this.state.buildId, marketId);
        this.updateLinkedFC(this.state.buildId, linkedFCs);
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
      lastTimestamp: updatedProj.timestamp,
      showAddFC: false,
      deliverMarketId: linkedFCs.find(fc => fc.marketId.toString() === this.state.deliverMarketId)?.marketId.toString() ?? 'site',
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
        commodities: {} as Cargo
      };

      // only send deltas
      for (const key in editCommodities) {
        if (proj.commodities[key] !== editCommodities[key]) {
          deltaProj.commodities[key] = editCommodities[key];
        }
      }

      // stop here if nothing changed
      if (Object.keys(deltaProj.commodities).length === 0) {
        this.setState({
          mode: Mode.view,
          editCommodities: undefined,
        });
        return;
      }

      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const savedProj = await api.project.update(proj.buildId, deltaProj);

        // success - apply new commodity count
        this.setState({
          proj: savedProj,
          lastTimestamp: savedProj.timestamp,
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

  setDefaultApproxCargoCounts = async () => {
    try {
      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await new Promise(resolve => setTimeout(resolve, 500));

      const savedProj = await api.project.setDefaultCargo(this.state.proj?.buildId!)
      // success - apply new commodity count
      this.setState({
        proj: savedProj,
        lastTimestamp: savedProj.timestamp,
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
          <h3 className={cn.h3}>Set corrected Market ID</h3>
          <div>The <code className={cn.navy}>MarketID</code> value can be found in your journal files once docked at the construction ship or site for this project:</div>
          <ul>
            <li>Open folder: <code className={cn.navy}>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code></li>
            <li>Find the file named with today's date. Something like: <code className={cn.navy}>Journal.{new Date().toISOString().substring(0, 10)}T102030.01.log</code></li>
            <li>Scroll to the bottom and look for the line with <code className={cn.navy}>"event":"Docked"</code></li>
            <li>On that line, copy the value of <code className={cn.navy}>MarketID</code> and paste it here</li>
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
        lastTimestamp: savedProj.timestamp,
        editReady: new Set(savedProj.ready),
        sumTotal: sumCargo(savedProj.commodities),
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
    const percent = 100 / proj.maxNeed * approxProgress;

    const cmdrColors = getColorTable(Object.keys(summary.cmdrs));
    return <div className='half'>
      <h3 className={cn.h3}>Progress: {percent.toFixed(0)}%</h3>
      {!!summary.totalDeliveries && <div className='stats-header'>
        Total cargo delivered: <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{summary.totalCargo.toLocaleString()}</span> from <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{summary.totalDeliveries.toLocaleString()}</span> deliveries
      </div>}

      {(approxProgress > 0 || this.countReadyOnFCs > 0) && <ChartGeneralProgress progress={approxProgress} readyOnFC={this.countReadyOnFCs} maxNeed={proj.maxNeed} />}

      <ChartByCmdrs summary={summary} cmdrColors={cmdrColors} />

      {!!summary.totalDeliveries && <>
        <div className='stats-cmdr-over-time'>Cargo deliveries per hour:</div>
        <ChartByCmdrsOverTime summary={summary} complete={proj.complete} />
      </>}

      {!summary.totalDeliveries && <div>
        <br />
        No tracked deliveries yet.
        <br />
        Use <LinkSrvSurvey /> to track deliveries automatically.
      </div>}

    </div>;
  }

  renderDeliver() {
    const { proj, sort, nextDelivery, showBubble, submitting, fcCargo, deliverMarketId } = this.state;
    if (!proj) return;

    // build up delivery options if there are FCs we can deliver to
    const fcCargoKeys = Object.keys(fcCargo);
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
      onRenderOption={(o) => {
        return <>
          <Icon className='icon-inline' iconName={o?.key === 'site' ? 'Manufacturing' : 'fleetCarrierBlack'} />
          &nbsp;{o?.text}
        </>;
      }}
      dropdownWidth='auto'
      selectedKey={deliverMarketId}
      onChange={(_, o) => this.setState({ deliverMarketId: o!.key.toString() })}
      styles={{ callout: { border: '1px solid ' + appTheme.palette.themePrimary } }}
    />;

    // valid cargo names that can be included on a delivery
    const validCargoKeys = Object.keys(proj.commodities)
      .filter(k => proj.commodities[k] > 0)

    return <div className='delivery'>
      {!submitting && <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
        <PrimaryButton
          text='Deliver'
          disabled={submitting || !deliverMarketId || sumCargo(nextDelivery) === 0}
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

      <EditCargo
        cargo={nextDelivery}
        readyNames={Array.from(this.state.editReady)}
        maxCounts={proj.commodities}
        validNames={validCargoKeys}
        sort={sort}
        addButtonBelow={true}
        showTotalsRow
        onChange={cargo => this.setState({ nextDelivery: cargo })}
      />

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

  deliverToZero(commodity: string, count: number) {
    // update local count state before API call
    const updateProj = this.state.proj!;
    updateProj.commodities[commodity] = 0;
    this.setState({ proj: updateProj });

    const cargo: Cargo = {};
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

  deliverToSite2 = async (buildId: string, nextDelivery: Cargo, deliverMarketId: string) => {
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

  toggleAutoRefresh = () => {
    if (this.state.autoUpdateUntil > 0) {
      // stop auto-refresh poll and don't refresh at this time.
      console.log(`Stopping timer at: ${new Date().toISOString()}`);
      clearTimeout(this.timer);
      this.setState({ autoUpdateUntil: 0 });
    } else if (this.state.proj?.buildId) {
      // start polling (which causes an immediate refresh)
      console.log(`Starting timer at: ${new Date().toISOString()}`);
      this.setState({ autoUpdateUntil: Date.now() + autoUpdateStopDuration });
      this.pollLastTimestamp(this.state.proj?.buildId, true);
    }
  };
}

