import './ProjectView.css';
import * as api from '../../api';
import inara16 from '../../assets/inara-16x16.png';
import { ActionButton, Callout, CommandBar, ContextualMenu, DefaultButton, Dialog, DialogFooter, DirectionalHint, Dropdown, DropdownMenuItemType, ICommandBarItemProps, Icon, IconButton, IContextualMenuItem, IDropdownOption, Label, Link, MessageBar, MessageBarButton, MessageBarType, Modal, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { BuildTypeDisplay, CargoRemaining, ChartByCmdrs, ChartByCmdrsOverTime, ChartGeneralProgress, CommodityIcon, EditCargo, FindFC } from '../../components';
import { store } from '../../local-storage';
import { appTheme, cn } from '../../theme';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, CmdrShip, fc_loading, mapCommodityNames, mapShipNames, Project, ProjectFC, SortMode, SupplyStatsSummary } from '../../types';
import { delay, delayFocus, fcFullName, flattenObj, getCargoCountOnHand, getColorTable, getGroupedCommodities, getRelativeDuration, iconForSort, isMatchingCmdr, isMobile, mergeCargo, nextSort, openDiscordLink, parseIntLocale, sumCargo } from '../../util';
import type { PrepDeliverHistMap, PrepDeliverHistoryEntry, PrepFcAdjustMap } from '../../prep-deliver-history';
import { fcAdjustKey, histKey, prunePrepDeliverData, writePrepDeliverHist, writePrepFcAdjust } from '../../prep-deliver-history';
import { resolvePrepDeliverUiPrefs, writePrepDeliverUiPrefs } from '../../prep-deliver-ui-prefs';
import { CopyButton } from '../../components/CopyButton';
import { FleetCarrier } from '../FleetCarrier';
import { LinkSrvSurvey } from '../../components/LinkSrvSurvey';
import { TimeRemaining } from '../../components/TimeRemaining';
import { EditProject } from '../../components/EditProject/EditProject';
import { MarketLinks } from '../../components/MarketLinks/MarketLinks';
import { BuildEffects } from '../../components/BuildEffects';
import { WhereToBuy } from '../../components/WhereToBuy/WhereToBuy';
import { getSiteType, mapName } from '../../site-data';
import { EconomyBlock } from '../../components/EconomyBlock';
import { ShowCoachingMarks } from '../../components/ShowCoachingMarks';
import { ViewEditBuildType } from '../SystemView2/ViewEditBuildType';
import { getAvgHaulCosts } from '../../avg-haul-costs';
import { EconomyTable2 } from '../SystemView2/EconomyTable2';
import { buildSystemModel2, SysMap2 } from '../../system-model2';
import { App } from '../../App';
import { getPrepSlotDeliverMap, normalizeDeliverMap, prepSlotDeliverKey, setPrepSlotDeliverMap } from '../../prep-slot-deliver';
import { nextPrepSlotIds, readPrepSlotMeta, readServerBaseline, writePrepSlotMeta, writeServerBaseline } from '../../prep-slot-ids';
import { prunePrepBuildNicknames, setPrepBuildNicknameForSlot } from '../../prep-build-nicknames';
import { PrepLoadHistoryEntry, readPrepLoadHistory, writePrepLoadHistory } from '../../prep-load-history';
import { clearLoadFcDraft, readLoadFcDraft, writeLoadFcDraft } from '../../prep-load-fc-draft';
import { writeLoadFcDiag } from '../../prep-load-fc-diag';
import { CmdrShipMode, pruneCmdrShipMode, writeCmdrShipMode } from '../../cmdr-ship-mode';

/** Expand API prepBuild counts into an ordered slot list (sorted type keys, repeated). */
function prepBuildRecordToSlots(prepBuilds: Record<string, number>): string[] {
  const slots: string[] = [];
  Object.keys(prepBuilds)
    .sort((a, b) => a.localeCompare(b))
    .forEach(bt => {
      const n = prepBuilds[bt] ?? 0;
      for (let i = 0; i < n; i++) { slots.push(bt); }
    });
  return slots;
}

function prepBuildSlotsToRecord(slots: string[]): Record<string, number> {
  return slots.reduce((m, bt) => {
    m[bt] = (m[bt] ?? 0) + 1;
    return m;
  }, {} as Record<string, number>);
}

/** Slots from API: use prepBuildOrder when it matches prepBuilds counts; else expand record alphabetically. */
function slotsFromProject(proj: Pick<Project, 'prepBuilds' | 'prepBuildOrder'>): string[] {
  const rec = proj.prepBuilds ?? {};
  const order = proj.prepBuildOrder;
  if (order && order.length > 0) {
    const fromOrder = prepBuildSlotsToRecord(order);
    if (JSON.stringify(fromOrder) === JSON.stringify(rec)) {
      return [...order];
    }
  }
  return prepBuildRecordToSlots(rec);
}

/** After GET: keep local slot order when server omits prepBuildOrder but counts still match (same build). */
function mergePrepSlotsAfterFetch(prevBuildId: string | undefined, prevSlots: string[], fetchedProj: Project): string[] {
  if (prevBuildId !== fetchedProj.buildId) {
    return slotsFromProject(fetchedProj);
  }
  if (fetchedProj.prepBuildOrder && fetchedProj.prepBuildOrder.length > 0) {
    return slotsFromProject(fetchedProj);
  }
  const rec = fetchedProj.prepBuilds ?? {};
  if (JSON.stringify(prepBuildSlotsToRecord(prevSlots)) === JSON.stringify(rec)) {
    return prevSlots;
  }
  return prepBuildRecordToSlots(rec);
}

/** After PATCH save: prefer server prepBuildOrder; else keep local order if counts match. */
function mergePrepSlotsAfterSave(localSlots: string[], savedProj: Project): string[] {
  if (savedProj.prepBuildOrder && savedProj.prepBuildOrder.length > 0) {
    return slotsFromProject(savedProj);
  }
  const rec = savedProj.prepBuilds ?? {};
  if (JSON.stringify(prepBuildSlotsToRecord(localSlots)) === JSON.stringify(rec)) {
    return localSlots;
  }
  return prepBuildRecordToSlots(rec);
}

/** Persist stable slot ids + deliver map; returns state fields for prep columns. */
function hydratePrepSlotStorage(
  buildId: string,
  mergedSlots: string[],
  serverSlots: string[],
): { mergedIds: string[]; serverIds: string[]; subsPruned: Record<string, number> } {
  const basePrev = readServerBaseline(buildId);
  const serverIds = nextPrepSlotIds(basePrev.slots, basePrev.ids, serverSlots);
  writeServerBaseline(buildId, serverSlots, serverIds);

  const workPrev = readPrepSlotMeta(buildId);
  const wConsistent = !!(workPrev && workPrev.ids.length === workPrev.slots.length);
  const mergedIds = JSON.stringify(mergedSlots) === JSON.stringify(serverSlots)
    ? serverIds
    : nextPrepSlotIds(wConsistent ? workPrev!.slots : [], wConsistent ? workPrev!.ids : [], mergedSlots);

  const subsRaw = getPrepSlotDeliverMap(buildId);
  const subsPruned = normalizeDeliverMap(subsRaw, mergedIds);
  if (JSON.stringify(subsPruned) !== JSON.stringify(subsRaw)) {
    setPrepSlotDeliverMap(buildId, subsPruned);
  }
  writePrepSlotMeta(buildId, mergedSlots, mergedIds);
  return { mergedIds, serverIds, subsPruned };
}

interface ProjectViewProps {
  buildId?: string;
}

interface ProjectViewState {
  buildId?: string;
  proj?: Project;
  sysMap?: SysMap2;
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
  /** Shown after Load FC closes (e.g. server applied only part of the request). Dismissible; not cleared by refresh. */
  loadFcNotice?: string;
  /** Blocking explanation when the API stores less cargo than requested (always paired with `loadFcLastDiag` in localStorage). */
  loadFcPartialDialog?: { title: string; body: string };

  assignCommodity?: string;
  assignCmdr?: string;
  hasAssignments?: boolean;

  editCommodities?: Cargo;
  /** Prep: which building column is being edited in the commodities panel (slot index). */
  editCommoditiesSlotIndex?: number;
  editReady: Set<string>;
  editProject: boolean;
  disableDelete?: boolean;
  fixMarketId?: string;
  summary?: SupplyStatsSummary;
  sumTotal: number;
  /** Per-commander selected ship class for cargo-cap references in this build. */
  cmdrShipMode: Record<string, CmdrShipMode>;

  showBubble: boolean;
  hideDoneRows: boolean;
  hideFCColumns: boolean;

  nextDelivery: Cargo;
  /** After closing Load FC without submitting, reopen restores `nextDelivery` exactly (including zero rows). */
  loadFcReuseLastClosedDraft: boolean;
  deliverMarketId: string;
  /**
   * Prep Load FC: which building(s) MAX REQ uses as its template (not a cap on manual amounts).
   * `-1` = all buildings (sum of #1..#N remaining); `0..n-1` = single building column.
   */
  deliverReferenceSlotIndex: number;
  submitting: boolean;
  cargoContext?: string;

  showAddFC: boolean;
  savingFC?: boolean;

  fcCargo: Record<string, Cargo>;
  fcEditMarketId?: string;
  ships?: CmdrShip[];
  showShips?: boolean;
  showShipsTargetId?: string;
  showShipsTargetCargo?: string;

  showWhereToBuy?: boolean;

  notAgain: string[];
  notAgainPending?: string;

  // specific for prepation projects
  isPrep?: boolean;
  prepBuildSlots: string[];
  /** Last persisted prep slot order from server (for unsaved navigation guard). */
  lastServerPrepSlots: string[];
  /** Stable id per server slot row (Undo restores this with lastServerPrepSlots). */
  lastServerPrepSlotIds: string[];
  originalCargo?: Cargo;
  savingPrepBuilds?: boolean;
  prepBuildsDiffer?: boolean;
  /** When set, user confirmed leaving with unsaved prep buildings; assign this URL. */
  pendingNavUrl?: string;

  /** Stable slot id per prep column (same length as prepBuildSlots when prep UI is active). */
  prepSlotIds: string[];
  /** Per-slot commodity subtracted amounts for prep # columns (localStorage-backed). */
  prepSlotDeliverSubs: Record<string, number>;
  /** Prep deliver popup audit log keyed `slotId::commodity`. */
  prepDeliverHistory: PrepDeliverHistMap;
  /** Amount to hide from each FC commodity cell (`marketId::commodity`). */
  prepDeliverFcAdjust: PrepFcAdjustMap;
  /** Local "Load FC" history entries (last 20), used by deliver panel side column. */
  prepLoadHistory: PrepLoadHistoryEntry[];
  /** Prep building display names keyed by stable slot id (localStorage). */
  prepBuildNicknames: Record<string, string>;
  prepNicknameCallout?: {
    slotIndex: number;
    anchor: HTMLElement;
    draft: string;
  };
  prepDeliverCallout?: {
    slotIndex: number;
    commodity: string;
    anchor: HTMLElement;
    draft: string;
    selectedCommander: string;
    /** `ship` or FC `marketId` string. */
    selectedFromKey: string;
    /** When true, amount field tracks max subtractable; toggling off clears draft to 0. */
    allToggleActive?: boolean;
  };
}

enum Mode {
  view,
  deliver,
}

export class ProjectView extends Component<ProjectViewProps, ProjectViewState> {
  private timer?: NodeJS.Timeout;
  /** Prevents overlapping deliverToSite2 runs (double Primary or rapid re-entry races). */
  private deliverInFlight = false;
  /** The count of needed cargo already loaded on Fleet Carriers */
  private countReadyOnFCs: number = 0;

  private onPrepPreNavigate = (url: string): boolean => {
    this.setState({ pendingNavUrl: url });
    return true;
  };

  private prepBuildBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.hasUnsavedPrepBuildings()) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  private hasUnsavedPrepBuildings(): boolean {
    const { isPrep, proj, prepBuildSlots, lastServerPrepSlots } = this.state;
    return !!(isPrep && proj && JSON.stringify(prepBuildSlots) !== JSON.stringify(lastServerPrepSlots));
  }

  private syncPrepPreNavGuard() {
    if (this.hasUnsavedPrepBuildings()) {
      App.preNav = this.onPrepPreNavigate;
    } else if (App.preNav === this.onPrepPreNavigate) {
      App.preNav = undefined;
    }
  }

  constructor(props: ProjectViewProps) {
    super(props);

    const sortMode = store.commoditySort;
    this.state = {
      loading: true,
      autoUpdateUntil: Date.now() + autoUpdateStopDuration,
      primaryBuildId: store.primaryBuildId,
      mode: Mode.view,
      sort: sortMode ?? SortMode.group,
      newCmdr: '',
      editProject: false,
      showAddCmdr: false,
      disableDelete: true,
      sumTotal: 0,
      cmdrShipMode: {},

      editReady: new Set<string>(),
      hideDoneRows: store.commodityHideCompleted,
      hideFCColumns: store.commodityHideFCColumns,
      showBubble: !store.cmdr,
      nextDelivery: {},
      loadFcReuseLastClosedDraft: false,
      deliverMarketId: store.deliverDestination,
      deliverReferenceSlotIndex: 0,
      submitting: false,

      showAddFC: false,
      fcCargo: {},

      notAgain: store.notAgain,

      prepBuildSlots: [],
      lastServerPrepSlots: [],
      lastServerPrepSlotIds: [],
      prepSlotIds: [],
      prepSlotDeliverSubs: {},
      prepDeliverHistory: {},
      prepDeliverFcAdjust: {},
      prepLoadHistory: [],
      prepBuildNicknames: {},
    };
  }

  componentDidMount() {
    window.addEventListener('beforeunload', this.prepBuildBeforeUnload);
    // fetch initial data, which starts auto-updating as necessary
    if (this.props.buildId) {
      this.doNextPoll(this.props.buildId);
    }
  }

  componentWillUnmount(): void {
    if (this.timer) { clearTimeout(this.timer); }
    window.removeEventListener('beforeunload', this.prepBuildBeforeUnload);
    if (App.preNav === this.onPrepPreNavigate) {
      App.preNav = undefined;
    }
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
        autoUpdateUntil: Date.now() + autoUpdateStopDuration,
        primaryBuildId: store.primaryBuildId,
        mode: Mode.view,
        newCmdr: '',
        editProject: false,
        showAddCmdr: false,
        disableDelete: true,
        sumTotal: 0,
        cmdrShipMode: {},

        editReady: new Set<string>(),
        hideDoneRows: store.commodityHideCompleted,
        hideFCColumns: store.commodityHideFCColumns,
        showBubble: !store.cmdr,
        nextDelivery: {},
        loadFcReuseLastClosedDraft: false,
        deliverMarketId: store.deliverDestination,
        deliverReferenceSlotIndex: 0,
        submitting: false,

        showAddFC: false,
        fcCargo: {},

        prepBuildSlots: [],
        lastServerPrepSlots: [],
        lastServerPrepSlotIds: [],
        prepSlotIds: [],
        prepSlotDeliverSubs: {},
        prepDeliverHistory: {},
        prepDeliverFcAdjust: {},
        prepLoadHistory: [],
        prepBuildNicknames: {},
        prepNicknameCallout: undefined,
        editCommoditiesSlotIndex: undefined,
      });
    }

    // buildId changed from above
    if (prevState.buildId !== this.state.buildId && this.state.buildId) {
      if (this.timer) { clearTimeout(this.timer); }
      if (!this.state.proj) {
        this.fetchProject(this.state.buildId, false);
      }
    }

    const prepN = this.state.prepBuildSlots.length;
    const refSi = this.state.deliverReferenceSlotIndex;
    if (this.state.mode === Mode.deliver && this.state.isPrep && prepN > 0 && refSi !== -1 && refSi >= prepN) {
      this.setState({ deliverReferenceSlotIndex: prepN - 1 });
    }

    // Prep deliver callout: keep a valid commander when the project roster changes (otherwise Submit / All stay disabled with no obvious reason).
    const pd = this.state.prepDeliverCallout;
    const pProj = this.state.proj;
    if (pd && pProj?.commanders) {
      const roster = Object.keys(pProj.commanders).sort((a, b) => a.localeCompare(b));
      if (roster.length > 0) {
        const sel = String(pd.selectedCommander ?? '').trim();
        if (!sel || !roster.includes(sel)) {
          this.patchPrepDeliverCalloutState({ selectedCommander: roster[0] });
        }
      }
    }

    this.syncPrepPreNavGuard();
  }

  getPrepSlotSub(slotIndex: number, commodity: string): number {
    const sid = this.state.prepSlotIds[slotIndex];
    if (!sid) { return 0; }
    return this.state.prepSlotDeliverSubs[prepSlotDeliverKey(sid, commodity)] ?? 0;
  }

  /** Displayed remaining need per commodity for one prep slot column (template minus subs). */
  buildPrepColumnEditCargo(slotIndex: number): Cargo {
    const bt = this.state.prepBuildSlots[slotIndex];
    if (!bt) { return {}; }
    const haul = getAvgHaulCosts(bt);
    const cargo: Cargo = {};
    for (const key of Object.keys(haul)) {
      if (!(key in mapCommodityNames)) { continue; }
      const base = haul[key] ?? 0;
      const sub = this.getPrepSlotSub(slotIndex, key);
      if (base > 0 || sub > 0) {
        cargo[key] = Math.max(0, base - sub);
      }
    }
    return cargo;
  }

  getPrepSlotEditValidKeys(slotIndex: number): string[] {
    return Object.keys(this.buildPrepColumnEditCargo(slotIndex)).sort();
  }

  prepBuildingDropdownLabel(slotIndex: number): string {
    const { prepBuildSlots, prepSlotIds, prepBuildNicknames } = this.state;
    const buildType = prepBuildSlots[slotIndex];
    if (!buildType) { return `#${slotIndex + 1}`; }
    const type = getSiteType(buildType);
    const slotId = prepSlotIds[slotIndex];
    const defaultMiddle = type ? `${type.displayName2} : ${buildType}` : buildType;
    const nick = slotId && prepBuildNicknames[slotId]?.trim();
    const middle = nick || defaultMiddle;
    return `#${slotIndex + 1} ${middle}`;
  }

  getPrimaryCommanderKey(): string | undefined {
    const cmdrs = this.state.proj?.commanders;
    if (!cmdrs) { return undefined; }
    const keys = Object.keys(cmdrs);
    return keys.length > 0 ? keys[0] : undefined;
  }

  /**
   * Load FC total cap should follow the active CMDR first.
   * Falls back to first project commander when active name isn't on the roster.
   */
  getCmdrCargoCapForLoad(): number {
    const large = store.cmdr?.largeMax ?? 800;
    const med = store.cmdr?.medMax ?? 400;
    const cmdrKeys = Object.keys(this.state.proj?.commanders ?? {});
    const active = store.cmdrName;
    const selected = active
      ? (cmdrKeys.find(k => isMatchingCmdr(k, active)) ?? this.getPrimaryCommanderKey())
      : this.getPrimaryCommanderKey();
    if (!selected) { return large; }
    const mode = this.state.cmdrShipMode[selected] ?? 'large';
    return mode === 'medium' ? med : large;
  }

  /** Remove draft lines for commodities no longer on the project. */
  private pruneDeliveryDraftForProject(proj: Project, draft: Cargo): Cargo {
    const out = { ...draft };
    for (const k of Object.keys(out)) {
      if (!(k in proj.commodities)) {
        delete out[k];
      }
    }
    return out;
  }

  /**
   * Opening Load FC: reuse any in-memory draft (including from localStorage after reload, or rows at 0).
   * Only seed from `store.deliver` when there is no staged draft yet.
   */
  private getLoadFcOpenState(proj: Project): { nextDelivery: Cargo; resetReferenceSlot: boolean } {
    const pruned = this.pruneDeliveryDraftForProject(proj, this.state.nextDelivery);
    const hasLocalDraft =
      this.state.loadFcReuseLastClosedDraft
      || Object.keys(pruned).length > 0
      || sumCargo(pruned) > 0;
    if (hasLocalDraft) {
      return {
        nextDelivery: pruned,
        resetReferenceSlot: false,
      };
    }
    return {
      nextDelivery: this.pruneDeliveryDraftForProject(proj, { ...store.deliver }),
      resetReferenceSlot: true,
    };
  }

  private persistLoadFcDraft = (): void => {
    const proj = this.state.proj;
    const bid = proj?.buildId;
    if (!bid || proj.complete) { return; }
    const { nextDelivery, deliverMarketId, deliverReferenceSlotIndex, loadFcReuseLastClosedDraft } = this.state;
    writeLoadFcDraft(bid, {
      v: 1,
      nextDelivery: this.pruneDeliveryDraftForProject(proj, nextDelivery),
      deliverMarketId,
      deliverReferenceSlotIndex,
      loadFcReuseLastClosedDraft,
    });
  };

  private appendPrepLoadHistory(buildId: string, entry: PrepLoadHistoryEntry) {
    const merged = [...this.state.prepLoadHistory, entry].slice(-20);
    writePrepLoadHistory(buildId, merged);
    this.setState({ prepLoadHistory: merged });
  }

  private removePrepLoadHistory = (entryId: string) => {
    const bid = this.state.proj?.buildId;
    if (!bid) { return; }
    const entry = this.state.prepLoadHistory.find(e => e.id === entryId);
    if (!entry) { return; }
    const nextHist = this.state.prepLoadHistory.filter(e => e.id !== entryId);
    writePrepLoadHistory(bid, nextHist);
    // Undo persistently via FC display adjustment map, so server refresh/poll doesn't re-apply removed lines visually.
    const rollback = entry.deltas ?? entry.items;
    const nextFcAdjust = { ...this.state.prepDeliverFcAdjust };
    for (const [k, v] of Object.entries(rollback)) {
      if (!v || v <= 0) { continue; }
      const fk = fcAdjustKey(entry.marketId, k);
      const nv = (nextFcAdjust[fk] ?? 0) + v;
      if (nv <= 0) { delete nextFcAdjust[fk]; }
      else { nextFcAdjust[fk] = nv; }
    }
    writePrepFcAdjust(bid, nextFcAdjust);
    this.setState({ prepLoadHistory: nextHist, prepDeliverFcAdjust: nextFcAdjust });
  };

  commitPrepSlotSubs(next: Record<string, number>) {
    const bid = this.state.proj?.buildId;
    if (bid) {
      setPrepSlotDeliverMap(bid, next);
    }
    this.setState({ prepSlotDeliverSubs: next });
  }

  setPrepSlotDeliverSub(slotIndex: number, commodity: string, subtracted: number) {
    const sid = this.state.prepSlotIds[slotIndex];
    if (!sid) { return; }
    const k = prepSlotDeliverKey(sid, commodity);
    const next = { ...this.state.prepSlotDeliverSubs };
    const v = Math.max(0, Math.floor(subtracted));
    if (v <= 0) {
      delete next[k];
    } else {
      next[k] = v;
    }
    this.commitPrepSlotSubs(next);
  }

  getPrepFcDeliverDisplay(marketId: string, commodity: string): number {
    const raw = this.state.fcCargo[marketId]?.[commodity] ?? 0;
    const adj = this.state.prepDeliverFcAdjust[fcAdjustKey(marketId, commodity)] ?? 0;
    return Math.max(0, raw - adj);
  }

  /** Max units that can be delivered in one submission (slot remaining ∩ FC stock if a carrier is selected). */
  getPrepDeliverMaxDraft(
    slotIndex: number,
    commodity: string,
    selectedFromKey: string,
    curSubOverride?: number,
    fcAdjustOverride?: PrepFcAdjustMap,
  ): number {
    const sid = this.state.prepSlotIds[slotIndex];
    if (!sid) { return 0; }
    const bt = this.state.prepBuildSlots[slotIndex];
    const base = bt ? (getAvgHaulCosts(bt)[commodity] ?? 0) : 0;
    const curSub = curSubOverride !== undefined ? curSubOverride : this.getPrepSlotSub(slotIndex, commodity);
    const remainingSlot = Math.max(0, base - curSub);
    let n = remainingSlot;
    const fromKey = !selectedFromKey || selectedFromKey === 'ship' ? 'ship' : selectedFromKey;
    if (fromKey !== 'ship') {
      const raw = this.state.fcCargo[fromKey]?.[commodity] ?? 0;
      const fcAdj = fcAdjustOverride ?? this.state.prepDeliverFcAdjust;
      const adj = fcAdj[fcAdjustKey(fromKey, commodity)] ?? 0;
      const avail = Math.max(0, raw - adj);
      n = Math.min(n, avail);
    }
    return Math.max(0, Math.floor(n));
  }

  submitPrepDeliverAmount = (slotIndex: number, commodity: string, want: number) => {
    const c = this.state.prepDeliverCallout;
    if (!c || c.slotIndex !== slotIndex || c.commodity !== commodity) { return; }
    const proj = this.state.proj;
    if (!proj?.buildId) { return; }
    const cmdrs = proj.commanders ? Object.keys(proj.commanders) : [];
    if (cmdrs.length > 0 && !c.selectedCommander.trim()) { return; }

    const sid = this.state.prepSlotIds[slotIndex];
    if (!sid) { return; }
    const bt = this.state.prepBuildSlots[slotIndex];
    const base = bt ? (getAvgHaulCosts(bt)[commodity] ?? 0) : 0;
    const curSub = this.getPrepSlotSub(slotIndex, commodity);
    const remainingSlot = Math.max(0, base - curSub);

    let n = Math.max(0, Math.floor(want));
    n = Math.min(n, remainingSlot);
    if (n <= 0) { return; }

    const fromKey = !c.selectedFromKey || c.selectedFromKey === 'ship' ? 'ship' : c.selectedFromKey;
    if (fromKey !== 'ship') {
      const raw = this.state.fcCargo[fromKey]?.[commodity] ?? 0;
      const adj = this.state.prepDeliverFcAdjust[fcAdjustKey(fromKey, commodity)] ?? 0;
      const avail = Math.max(0, raw - adj);
      n = Math.min(n, avail);
    }
    if (n <= 0) { return; }

    const fromLabel = fromKey === 'ship'
      ? 'Ship Only'
      : this.getFullFCName(fromKey);

    const entry: PrepDeliverHistoryEntry = {
      id: crypto.randomUUID(),
      amount: n,
      commander: cmdrs.length > 0 ? c.selectedCommander : '—',
      fromKey,
      fromLabel,
    };

    const hk = histKey(sid, commodity);
    const nextHist = { ...this.state.prepDeliverHistory };
    nextHist[hk] = [...(nextHist[hk] ?? []), entry];

    const nextSubs = { ...this.state.prepSlotDeliverSubs };
    const sk = prepSlotDeliverKey(sid, commodity);
    const nv = curSub + n;
    if (nv <= 0) { delete nextSubs[sk]; }
    else { nextSubs[sk] = nv; }

    const nextFc = { ...this.state.prepDeliverFcAdjust };
    if (fromKey !== 'ship') {
      const fk = fcAdjustKey(fromKey, commodity);
      nextFc[fk] = (nextFc[fk] ?? 0) + n;
    }

    setPrepSlotDeliverMap(proj.buildId, nextSubs);
    writePrepDeliverHist(proj.buildId, nextHist);
    writePrepFcAdjust(proj.buildId, nextFc);

    writePrepDeliverUiPrefs(proj.buildId, {
      commander: cmdrs.length > 0 ? c.selectedCommander : '',
      fromKey,
    });

    this.setState({
      prepSlotDeliverSubs: nextSubs,
      prepDeliverHistory: nextHist,
      prepDeliverFcAdjust: nextFc,
      prepDeliverCallout: { ...c, draft: '0', allToggleActive: false },
    });
  };

  removePrepDeliverLine = (slotIndex: number, commodity: string, entryId: string) => {
    const sid = this.state.prepSlotIds[slotIndex];
    const bid = this.state.proj?.buildId;
    if (!sid || !bid) { return; }
    const hk = histKey(sid, commodity);
    const list = [...(this.state.prepDeliverHistory[hk] ?? [])];
    const idx = list.findIndex(e => e.id === entryId);
    if (idx < 0) { return; }
    const e = list[idx];
    list.splice(idx, 1);
    const nextHist = { ...this.state.prepDeliverHistory };
    if (list.length === 0) { delete nextHist[hk]; }
    else { nextHist[hk] = list; }

    const curSub = this.getPrepSlotSub(slotIndex, commodity);
    const applied = e.slotSubDelta !== undefined ? e.slotSubDelta : e.amount;
    const newSub = Math.max(0, curSub - applied);
    const nextSubs = { ...this.state.prepSlotDeliverSubs };
    const sk = prepSlotDeliverKey(sid, commodity);
    if (newSub <= 0) { delete nextSubs[sk]; }
    else { nextSubs[sk] = newSub; }

    const nextFc = { ...this.state.prepDeliverFcAdjust };
    if (e.fromKey && e.fromKey !== 'ship' && e.fromKey !== 'editor') {
      const fk = fcAdjustKey(e.fromKey, commodity);
      const v = (nextFc[fk] ?? 0) - e.amount;
      if (v <= 0) { delete nextFc[fk]; }
      else { nextFc[fk] = v; }
    }

    setPrepSlotDeliverMap(bid, nextSubs);
    writePrepDeliverHist(bid, nextHist);
    writePrepFcAdjust(bid, nextFc);

    const cc = this.state.prepDeliverCallout;
    const calloutPatch =
      cc && cc.slotIndex === slotIndex && cc.commodity === commodity && cc.allToggleActive
        ? {
          prepDeliverCallout: {
            ...cc,
            draft: String(this.getPrepDeliverMaxDraft(slotIndex, commodity, cc.selectedFromKey || 'ship', newSub, nextFc)),
          },
        }
        : {};

    this.setState({ prepSlotDeliverSubs: nextSubs, prepDeliverHistory: nextHist, prepDeliverFcAdjust: nextFc, ...calloutPatch });
  };

  resetPrepDeliverSlotCommodity = (slotIndex: number, commodity: string) => {
    const sid = this.state.prepSlotIds[slotIndex];
    const bid = this.state.proj?.buildId;
    if (!sid || !bid) { return; }
    const hk = histKey(sid, commodity);
    const entries = this.state.prepDeliverHistory[hk] ?? [];
    const nextFc = { ...this.state.prepDeliverFcAdjust };
    for (const e of entries) {
      if (e.fromKey && e.fromKey !== 'ship' && e.fromKey !== 'editor') {
        const fk = fcAdjustKey(e.fromKey, commodity);
        const v = (nextFc[fk] ?? 0) - e.amount;
        if (v <= 0) { delete nextFc[fk]; }
        else { nextFc[fk] = v; }
      }
    }
    const nextHist = { ...this.state.prepDeliverHistory };
    delete nextHist[hk];
    const nextSubs = { ...this.state.prepSlotDeliverSubs };
    delete nextSubs[prepSlotDeliverKey(sid, commodity)];

    setPrepSlotDeliverMap(bid, nextSubs);
    writePrepDeliverHist(bid, nextHist);
    writePrepFcAdjust(bid, nextFc);

    const curCallout = this.state.prepDeliverCallout;
    this.setState({
      prepSlotDeliverSubs: nextSubs,
      prepDeliverHistory: nextHist,
      prepDeliverFcAdjust: nextFc,
      prepDeliverCallout: curCallout ? { ...curCallout, draft: '0', allToggleActive: false } : undefined,
    });
  };

  private patchPrepDeliverCalloutState = (partial: Partial<NonNullable<ProjectViewState['prepDeliverCallout']>>) => {
    const cur = this.state.prepDeliverCallout;
    if (!cur) { return; }
    const next = { ...cur, ...partial };
    this.setState({ prepDeliverCallout: next });
    const bid = this.state.proj?.buildId;
    if (bid && ('selectedCommander' in partial || 'selectedFromKey' in partial)) {
      writePrepDeliverUiPrefs(bid, {
        commander: next.selectedCommander,
        fromKey: next.selectedFromKey || 'ship',
      });
    }
  };

  sumSlotDisplayedUnits(haul: Cargo, si: number): number {
    return Object.keys(haul)
      .filter(ck => ck in mapCommodityNames)
      .reduce((s, ck) => {
        const base = haul[ck] ?? 0;
        const sub = this.getPrepSlotSub(si, ck);
        return s + Math.max(0, base - sub);
      }, 0);
  }

  /**
   * Prep + one or more tracked buildings: sum of per-column remainings (matches each #N cell).
   * Non-prep or no buildings: not used (caller keeps project `commodities` total).
   */
  getPrepMultiSlotRemainingForCommodity(key: string): number | 'unknown' {
    const slots = this.state.prepBuildSlots;
    if (!this.state.isPrep || slots.length < 1) {
      return 0;
    }
    let sum = 0;
    for (let si = 0; si < slots.length; si++) {
      const bt = slots[si];
      const slotNeed = getAvgHaulCosts(bt)[key] ?? 0;
      if (slotNeed === -1) {
        return 'unknown';
      }
      sum += Math.max(0, slotNeed - this.getPrepSlotSub(si, key));
    }
    return sum;
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
      clearTimeout(this.timer);
      this.setState({
        loading: !refreshing,
        refreshing: refreshing,
      });

      const newProj = await api.project.get(buildId);
      // console.log('Project.fetch: end buildId:', newProj);
      store.addRecentProject(newProj);

      // last destination not in this build project
      let deliverMarketId = this.state.deliverMarketId;
      if (!newProj.linkedFC.find(fc => fc.marketId.toString() === store.deliverDestination)) {
        deliverMarketId = 'site';
      }

      // shift end of auto-updating to be +1 hour from now
      const isPrep = newProj.buildType === fc_loading;
      let newAutoUpdateUntil = Date.now() + autoUpdateStopDuration;
      window.document.title = isPrep ? `Build: ${newProj.buildName}` : `Build: ${newProj.buildName} in ${newProj.systemName}`;
      if (newProj.complete) {
        window.document.title += ' (completed)';
        newAutoUpdateUntil = 0;
      }

      let ships: CmdrShip[] = [];
      let showShips = false;
      if (newProj.buildType !== fc_loading) {
        // (not awaiting)
        this.fetchProjectStats(buildId);
      }

      if (!newProj.complete) {
        if (Object.keys(newProj.linkedFC).length > 0) {
          this.fetchCargoFC(buildId); // (not awaiting)
        }

        ships = await api.project.getShips([buildId]);
        showShips = ships.some(ship => Object.keys(ship.cargo).some(c => ship.cargo[c] > 0 && newProj.commodities[c] > 0));
      }

      const prepBuildsDiffer = isPrep && newProj.prepBuilds && sumCargo(newProj.commodities) !== sumCargo(this.calcCargoNeedsForPrepProject(newProj));

      const mergedSlots = mergePrepSlotsAfterFetch(this.state.buildId, this.state.prepBuildSlots, newProj);
      const bid = newProj.buildId;
      const serverSlots = slotsFromProject(newProj);
      const { mergedIds, serverIds, subsPruned } = hydratePrepSlotStorage(bid, mergedSlots, serverSlots);
      const prunedDel = prunePrepDeliverData(bid, new Set(mergedIds));

      if (newProj.complete) {
        clearLoadFcDraft(bid);
      }

      // First paint often comes from doNextPoll → fetchProject(..., true, true); still hydrate LS draft once proj is bound.
      const shouldHydrateLoadFc =
        !newProj.complete &&
        ((!refreshing && !polling) || !this.state.proj);
      let deliverMarketIdHydrated = deliverMarketId;
      const fetchState: Partial<ProjectViewState> = {
        buildId: newProj.buildId,
        proj: newProj,
        originalCargo: { ...newProj.commodities },
        editProject: window.location.hash.startsWith('#edit'),
        editReady: new Set(newProj.ready),
        sumTotal: Object.values(newProj.commodities).reduce((total, current) => total += current, 0),
        hasAssignments: Object.keys(newProj.commanders).reduce((s, c) => s += newProj.commanders[c].length, 0) > 0,
        loading: false,
        refreshing: false,
        disableDelete: !!store.cmdrName && (!newProj.architectName || newProj.architectName.toLowerCase() !== store.cmdrName.toLowerCase()),
        deliverMarketId: deliverMarketId,
        autoUpdateUntil: newAutoUpdateUntil,
        ships,
        showShips,
        cmdrShipMode: pruneCmdrShipMode(bid, Object.keys(newProj.commanders ?? {})),
        isPrep,
        prepBuildSlots: mergedSlots,
        prepSlotIds: mergedIds,
        lastServerPrepSlots: serverSlots,
        lastServerPrepSlotIds: serverIds,
        prepSlotDeliverSubs: subsPruned,
        prepDeliverHistory: prunedDel.history,
        prepDeliverFcAdjust: prunedDel.fcAdjust,
        prepLoadHistory: readPrepLoadHistory(bid),
        prepBuildNicknames: prunePrepBuildNicknames(bid, mergedIds),
        prepBuildsDiffer,
      };

      if (shouldHydrateLoadFc) {
        const persisted = readLoadFcDraft(bid);
        if (persisted) {
          fetchState.nextDelivery = this.pruneDeliveryDraftForProject(newProj, persisted.nextDelivery);
          const pMid = persisted.deliverMarketId;
          const fcHas = (mid: string) => newProj.linkedFC.some(fc => String(fc.marketId) === mid);
          if (!isPrep && (pMid === 'site' || fcHas(pMid))) {
            deliverMarketIdHydrated = pMid;
          } else if (isPrep && fcHas(pMid)) {
            deliverMarketIdHydrated = pMid;
          }
          const pn = mergedSlots.length;
          const pRef = persisted.deliverReferenceSlotIndex;
          fetchState.deliverReferenceSlotIndex = pn > 0
            ? (pRef === -1 ? -1 : Math.min(Math.max(0, pRef), pn - 1))
            : 0;
          fetchState.loadFcReuseLastClosedDraft = persisted.loadFcReuseLastClosedDraft;
        }
      }
      fetchState.deliverMarketId = deliverMarketIdHydrated;

      this.setState(fetchState as ProjectViewState);

      if (newProj.complete) {
        const sys = await api.systemV2.getSys(newProj.systemAddress.toString());
        const sysMap = buildSystemModel2(sys, false, store.applyBuffNerf);
        this.setState({ sysMap });
      } else if (!isPrep) {
        // if ALL commodities have a count of -1 ... it means the project is brand new and we want people to edit them to real numbers
        if (Object.values(newProj.commodities).every(v => v === 10 || v === -1)) {
          this.setState({
            editCommodities: { ...newProj.commodities },
          });
          delayFocus('first-commodity-edit');
        }
      }

      // schedule next poll? (if project is incomplete)
      if (!newProj.complete && newAutoUpdateUntil > 0 && Date.now() < this.state.autoUpdateUntil) {
        //schedule next poll
        this.timer = setTimeout(() => this.doNextPoll(buildId), autoUpdateFrequency);
      }

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

  doNextPoll = async (buildId: string) => {
    try {
      // skip polling when prep slot list differs from last server snapshot (do not use proj — applyPrepSlots patches proj.prepBuildOrder and would hide dirty state)
      if (this.state.isPrep && this.state.proj) {
        const prepBuildsDirty = JSON.stringify(this.state.prepBuildSlots) !== JSON.stringify(this.state.lastServerPrepSlots);
        if (prepBuildsDirty) {
          // just schedule the next poll
          this.timer = setTimeout(() => this.doNextPoll(buildId), autoUpdateFrequency);
          console.debug(`skip polling when editing prepBuilds...`);
          return;
        }
      }

      // call server to see if anything changed
      const pollData = await api.project.poll([buildId, ...Object.keys(this.state.fcCargo)]);
      const timestamp = pollData.max;

      console.debug(`pollTimestamp at ${new Date().toISOString()}: changed? ${timestamp !== this.state.lastTimestamp} (${timestamp} vs ${this.state.lastTimestamp}) Will stop after: ${new Date(this.state.autoUpdateUntil).toISOString()}`);
      if (timestamp !== this.state.lastTimestamp) {
        // something has changed
        this.setState({ lastTimestamp: timestamp });
        await this.fetchProject(buildId, true, true);
      } else if (Date.now() < this.state.autoUpdateUntil) {
        // nothing changed, schedule next poll
        this.timer = setTimeout(() => this.doNextPoll(buildId), autoUpdateFrequency);
      } else {
        console.log(`Stopping auto-update after one hour of no changes at: ${new Date().toISOString()}`);
        this.setState({ autoUpdateUntil: 0 });
      }
    } catch (err: any) {
      console.error(`doNextPoll:`, err.stack);
      this.setState({ autoUpdateUntil: 0 });
    }
  };

  fetchProjectStats(buildId: string) {
    if (this.state.isPrep) { return; }

    api.project.getStats(buildId)
      .then(stats => this.setState({ summary: stats }))
      .catch(err => this.setState({ errorMsg: err.message }));
  }

  fetchCargoFC(buildId: string) {
    // don't bother calling when we know there are zero FCs or the project is complete
    if (this.state.proj && Object.keys(this.state.proj.linkedFC).length === 0) return;
    if (this.state.proj && this.state.proj.complete) return;

    api.project.getCargoFC(buildId)
      .then(fcCargo => this.setState({ fcCargo: fcCargo }))
      .catch(err => this.setState({ errorMsg: err.message }));
  }

  async setAsPrimary(buildId: string) {
    // add a little artificial delay so UI doesn't flicker
    this.setState({ refreshing: true })
    await delay(500);

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
    await delay(500);

    api.cmdr.clearPrimary(store.cmdrName)
      .then(() => {
        store.primaryBuildId = '';
        this.setState({ refreshing: false, primaryBuildId: '' });
      })
      .catch(err => this.setState({ refreshing: false, errorMsg: err.message }));
  }

  render() {
    const { mode, proj, loading, refreshing, confirmDelete, confirmComplete, errorMsg, loadFcNotice, loadFcPartialDialog, editProject, disableDelete, submitting, primaryBuildId, editCommodities, autoUpdateUntil, showWhereToBuy, fcCargo, isPrep, pendingNavUrl } = this.state;

    if (loading) {
      return <div className='project-view'>
        <Spinner size={SpinnerSize.large} label={`Loading build project...`} />
      </div>;
    }

    if (!proj) {
      return <div className='project-view'>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      </div>;
    }

    // prep CommandBar buttons
    const hasDiscordLink = !!this.state.proj?.discordLink;
    let discordTitle = 'Edit the project to set a Discord link';
    if (hasDiscordLink)
      discordTitle = store.useNativeDiscord
        ? `Open link in Discord app:\n${this.state.proj?.discordLink}`
        : `Open Discord link in a tab:\n${this.state.proj?.discordLink}`;

    let refreshTitle = !!autoUpdateUntil ? 'Click to stop auto updating' : 'Click to refresh now and auto update every 30 seconds';
    if (proj.complete) refreshTitle = '';
    const commands: ICommandBarItemProps[] = [
      {
        className: cn.bBox,
        key: 'deliver-cargo',
        text: 'Load FC',
        title: (isPrep && !proj.linkedFC.length) ? 'Add Fleet Carriers to enable deliveries' : undefined,
        iconProps: { iconName: 'DeliveryTruck' },
        disabled: proj.complete || refreshing || (isPrep && !proj.linkedFC.length),
        style: { color: proj.complete || refreshing || (isPrep && !proj.linkedFC.length) ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          const { nextDelivery, resetReferenceSlot } = this.getLoadFcOpenState(proj);
          const validCargoKeys = Object.keys(proj.commodities).filter(k => proj.commodities[k] > 0);
          const prepN = this.state.prepBuildSlots.length;
          const curRef = this.state.deliverReferenceSlotIndex;
          const deliverReferenceSlotIndex = resetReferenceSlot || prepN <= 0
            ? 0
            : (curRef === -1 ? -1 : Math.min(Math.max(0, curRef), prepN - 1));
          this.setState({ mode: Mode.deliver, nextDelivery, submitting: false, deliverReferenceSlotIndex }, () => {
            this.persistLoadFcDraft();
            // Focus first amount field; avoid #deliver-destination — programmatic focus opens the FC dropdown (openOnKeyboardFocus).
            if (validCargoKeys.length > 0) {
              delayFocus(`edit-${validCargoKeys[0]}`);
            }
          });
        },
      },
      {
        className: cn.bBox,
        key: 'btn-edit',
        text: 'Edit project',
        iconProps: { iconName: 'Edit' },
        disabled: refreshing,
        style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => this.setState({ editProject: true }),
      },
      {
        className: cn.bBox,
        key: 'edit-commodities',
        text: 'Edit commodities',
        iconProps: { iconName: 'AllAppsMirrored' },
        disabled: proj.complete || refreshing,
        style: { color: proj.complete || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          if (this.state.isPrep && this.state.prepBuildSlots.length >= 1) {
            const si = 0;
            this.setState({
              editCommodities: this.buildPrepColumnEditCargo(si),
              editCommoditiesSlotIndex: si,
            });
          } else {
            this.setState({
              editCommodities: { ...this.state.proj!.commodities },
              editCommoditiesSlotIndex: undefined,
            });
          }
          delayFocus('first-commodity-edit');
        }
      },
      {
        className: cn.bBox,
        key: 'btn-refresh',
        text: 'Refresh',
        title: refreshTitle,
        iconProps: { iconName: !!autoUpdateUntil ? 'PlaybackRate1x' : 'Refresh' },
        disabled: refreshing,
        style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        onClick: () => {
          this.toggleAutoRefresh();
        }
      },
      {
        className: cn.bBox,
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
        className: cn.bBox,
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
        className: cn.bBox,
        key: 'discord-link',
        text: 'Discord',
        title: discordTitle,
        disabled: !hasDiscordLink || refreshing,
        style: { color: !hasDiscordLink || refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        iconProps: { iconName: 'OfficeChatSolid' },
        onClick: () => openDiscordLink(this.state.proj?.discordLink)
      },
      {
        className: cn.bBox,
        key: 'btn-open',
        iconProps: { iconName: 'OpenInNewWindow' },
        disabled: refreshing,
        style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
        subMenuProps: {
          calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
          items: [
            {
              className: cn.bBox,
              key: 'btn-open-inara',
              text: 'View on Inara',
              iconProps: { imageProps: { src: inara16 } },
              disabled: refreshing,
              style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
              onClick: () => {
                window.open(`https://inara.cz/elite/station/?search=${proj.buildName} [${proj.systemName}]`, 'Inara');
              },
            },
            // {
            //   key: 'btn-open-spansh',
            //   text: 'View on Spansh',
            //   disabled: refreshing,
            //   style: { color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
            //   onClick: () => {
            //     window.open(`https://spansh.co.uk/station/${proj.marketId}`, 'Spansh');
            //   },
            // }
          ],
        },
      },
    ];

    if (proj.complete) {
      // remove buttons from completed projects: Deliver and Edit Commodities
      commands.splice(0, 1); // Deliver
      commands.splice(1, 1); // Edit commodities
      commands.splice(3, 1); // Set primary
    }

    // prepare rich copy link
    var copyLink = new ClipboardItem({
      'text/plain': `https://ravencolonial.com/#build=${proj.buildId}`,
      'text/html': new Blob([`<a href='${`https://ravencolonial.com/#build=${proj.buildId}`}'>${proj.buildName}</a>`], { type: 'text/html' }),
    });

    const fcMergedCargo = mergeCargo(Object.values(fcCargo))
    return <div className='project-view'>
      {loadFcNotice && <MessageBar
        messageBarType={MessageBarType.severeWarning}
        onDismiss={() => this.setState({ loadFcNotice: undefined })}
        dismissButtonAriaLabel='Dismiss'
      >
        {loadFcNotice}
      </MessageBar>}
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      <div className='full'>
        <h2 className='project-title'>
          {isPrep && <>
            <Icon className='icon-inline' iconName='AddToShoppingList' style={{ color: appTheme.palette.themeTertiary, fontSize: 20, marginRight: 10 }} />
            {proj.buildName}
          </>}
          {!isPrep && <>
            <CopyButton text={proj.systemName} fontSize={16} />
            <Link href={`#sys=${encodeURIComponent(proj.systemName)}`} style={{ marginLeft: 4 }}>{proj.systemName}</Link>: {proj.buildName} {proj.complete && <span> (completed)</span>}
            <span style={{ fontSize: 16 }}><CopyButton text={copyLink} title='Copy a link to this page' /></span>
          </>}
        </h2>
        {proj.marketId <= 0 && this.renderMissingMarketId()}
        {mode === Mode.view && <CommandBar className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`} items={commands} />}
      </div >

      <div className='contain-horiz'>
        {!proj.complete && mode === Mode.view && <div className='half'>
          {this.renderCommodities(fcMergedCargo)}
        </div>}

        {!isPrep && mode === Mode.view && proj.complete && this.renderSystemEffects(proj)}

        <WhereToBuy
          visible={!!showWhereToBuy}
          buildIds={[this.state.buildId!]}
          systemName={this.state.proj!.systemName}
          need={this.state.proj!.commodities}
          have={this.state.hideFCColumns ? undefined : fcMergedCargo}
          onClose={() => this.setState({ showWhereToBuy: false })}
        />

        {!!editCommodities && !proj.complete && this.renderEditCommodities()}

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
            const prepPatch = savedProj.buildType === fc_loading && savedProj.buildId
              ? (() => {
                const mergedSlots = mergePrepSlotsAfterFetch(this.state.buildId, this.state.prepBuildSlots, savedProj);
                const serverSlots = slotsFromProject(savedProj);
                const { mergedIds, serverIds, subsPruned } = hydratePrepSlotStorage(savedProj.buildId, mergedSlots, serverSlots);
                const prunedDel = prunePrepDeliverData(savedProj.buildId, new Set(mergedIds));
                return {
                  prepBuildSlots: mergedSlots,
                  prepSlotIds: mergedIds,
                  lastServerPrepSlots: serverSlots,
                  lastServerPrepSlotIds: serverIds,
                  prepSlotDeliverSubs: subsPruned,
                  prepDeliverHistory: prunedDel.history,
                  prepDeliverFcAdjust: prunedDel.fcAdjust,
                  prepLoadHistory: readPrepLoadHistory(savedProj.buildId),
                  prepBuildNicknames: prunePrepBuildNicknames(savedProj.buildId, mergedIds),
                  cmdrShipMode: savedProj.buildId ? pruneCmdrShipMode(savedProj.buildId, Object.keys(savedProj.commanders ?? {})) : this.state.cmdrShipMode,
                };
              })()
              : {
                prepBuildSlots: this.state.prepBuildSlots,
                prepSlotIds: this.state.prepSlotIds,
                lastServerPrepSlots: this.state.lastServerPrepSlots,
                lastServerPrepSlotIds: this.state.lastServerPrepSlotIds,
                prepSlotDeliverSubs: this.state.prepSlotDeliverSubs,
                prepDeliverHistory: this.state.prepDeliverHistory,
                prepDeliverFcAdjust: this.state.prepDeliverFcAdjust,
                prepLoadHistory: this.state.prepLoadHistory,
                prepBuildNicknames: this.state.prepBuildNicknames,
                cmdrShipMode: this.state.cmdrShipMode,
              };

            this.setState({
              proj: savedProj,
              originalCargo: { ...savedProj.commodities },
              editProject: false,
              lastTimestamp: savedProj.timestamp,
              editReady: new Set(savedProj.ready),
              sumTotal: sumCargo(savedProj.commodities),
              hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
              disableDelete: !!cmdrName && !!savedProj.architectName && savedProj.architectName.toLowerCase() !== cmdrName.toLowerCase(),
              mode: Mode.view,
              submitting: false,
              ...prepPatch,
            });
          }}
        />}

        {mode === Mode.view && !!proj.maxNeed && this.renderStats()}
      </div>

      <ShowCoachingMarks id='whereToShop' target='#btnWhereToBuy' />

      <Modal
        isOpen={confirmDelete}
        onDismiss={() => this.setState({ confirmDelete: false })}
        styles={{ main: { border: '1px solid ' + appTheme.palette.themePrimary, } }}
      >
        <div className='center'>
          <p>
            <h3 className={cn.h3}>Are you sure you want to delete?</h3>
            <br />
            This cannot be undone.</p>
          <DefaultButton
            text='Yes'
            disabled={submitting}
            iconProps={{ iconName: 'Warning' }}
            style={{ backgroundColor: appTheme.palette.yellowDark, color: 'black' }}
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

      <Modal isOpen={confirmComplete} styles={{ main: { border: '1px solid ' + appTheme.palette.themePrimary, } }}>
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

      {!!pendingNavUrl && <Dialog
        hidden={false}
        modalProps={{ isBlocking: true }}
        dialogContentProps={{ title: 'Warning' }}
        styles={{
          main: {
            backgroundColor: appTheme.semanticColors.bodyBackground,
            color: appTheme.semanticColors.bodyText,
            border: `1px solid ${appTheme.palette.themePrimary}`,
            borderRadius: 2,
          },
        }}
        onDismiss={() => this.setState({ pendingNavUrl: undefined })}
      >
        <Icon iconName='Warning' style={{ fontSize: 36, float: 'left', marginRight: 12, color: appTheme.palette.themePrimary }} />
        <div>
          Warning: You have unsaved changes to your Buildings! All changes will be undone. Do you wish to proceed?
        </div>
        <DialogFooter>
          <DefaultButton
            text='Yes'
            iconProps={{ iconName: 'CheckMark', style: { color: appTheme.palette.themePrimary } }}
            onClick={() => {
              const url = this.state.pendingNavUrl;
              if (App.preNav === this.onPrepPreNavigate) {
                App.preNav = undefined;
              }
              this.setState({ pendingNavUrl: undefined }, () => {
                if (url) { window.location.assign(url); }
              });
            }}
          />
          <PrimaryButton
            text='No'
            iconProps={{ iconName: 'Cancel' }}
            onClick={() => this.setState({ pendingNavUrl: undefined })}
          />
        </DialogFooter>
      </Dialog>}

      {!!loadFcPartialDialog && <Dialog
        hidden={false}
        modalProps={{ isBlocking: true }}
        dialogContentProps={{ title: loadFcPartialDialog.title }}
        styles={{
          main: {
            backgroundColor: appTheme.semanticColors.bodyBackground,
            color: appTheme.semanticColors.bodyText,
            border: `1px solid ${appTheme.palette.themePrimary}`,
            borderRadius: 2,
          },
        }}
        onDismiss={() => this.setState({ loadFcPartialDialog: undefined })}
      >
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{loadFcPartialDialog.body}</div>
        <DialogFooter>
          <PrimaryButton
            text='OK'
            onClick={() => this.setState({ loadFcPartialDialog: undefined })}
          />
        </DialogFooter>
      </Dialog>}

      {mode === Mode.deliver && this.renderDeliver()}
    </div>;
  }

  renderEditCommodities() {
    const { proj, editCommodities, sort, submitting, isPrep, prepBuildSlots, editCommoditiesSlotIndex } = this.state;
    const isDefaultCargo = Object.values(proj!.commodities).every(v => v === 10 || v === -1);
    const prepColumnMode = !!(isPrep && prepBuildSlots.length >= 1 && editCommoditiesSlotIndex !== undefined);
    const slotIndex = prepColumnMode ? (editCommoditiesSlotIndex ?? 0) : 0;
    const haulForSlot = prepColumnMode ? getAvgHaulCosts(prepBuildSlots[slotIndex]) : undefined;

    return <Panel
      isOpen
      allowTouchBodyScroll={isMobile()}
      type={PanelType.custom}
      customWidth={'400px'}
      headerText='Edit commodities'
      onDismiss={() => this.setState({ mode: Mode.view, editCommodities: undefined, editCommoditiesSlotIndex: undefined })}
      onRenderNavigation={prepColumnMode && prepBuildSlots.length >= 1 ? () => (
        <Stack tokens={{ childrenGap: 6 }} styles={{ root: { padding: '8px 16px 12px', width: '100%', boxSizing: 'border-box' } }}>
          <Label style={{ fontSize: 12 }}>Building column</Label>
          <Dropdown
            selectedKey={String(editCommoditiesSlotIndex ?? 0)}
            options={prepBuildSlots.map((_, si) => ({ key: String(si), text: this.prepBuildingDropdownLabel(si) }))}
            onChange={(_, o) => {
              if (!o) { return; }
              const si = parseInt(String(o.key), 10);
              if (Number.isNaN(si) || si < 0 || si >= prepBuildSlots.length) { return; }
              this.setState({
                editCommoditiesSlotIndex: si,
                editCommodities: this.buildPrepColumnEditCargo(si),
              });
            }}
            styles={{ root: { width: '100%' }, dropdown: { width: '100%' } }}
          />
        </Stack>
      ) : undefined}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}

      isFooterAtBottom
      onRenderFooterContent={() => {
        return <>
          {submitting && <Spinner
            className='submitting'
            label={prepColumnMode ? 'Applying column edits ...' : 'Updating commodities ...'}
            labelPosition="right"
          />}

          {!submitting && <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
            <PrimaryButton
              text='Save'
              iconProps={{ iconName: 'Save' }}
              onClick={this.onUpdateProjectCommodities}
            />
            <DefaultButton
              text='Cancel'
              iconProps={{ iconName: 'Cancel' }}
              onClick={() => {
                this.setState({ mode: Mode.view, editCommodities: undefined, editCommoditiesSlotIndex: undefined });
              }}
            />
          </Stack>}
        </>;
      }}
    >
      {isDefaultCargo && !isPrep && <MessageBar
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
        key={prepColumnMode ? `prep-col-${editCommoditiesSlotIndex}` : 'commodities-full'}
        noAdd={prepColumnMode ? true : !isPrep}
        noDelete={prepColumnMode ? true : !isPrep}
        showTotalsRow
        validNames={prepColumnMode ? this.getPrepSlotEditValidKeys(slotIndex) : undefined}
        maxCounts={prepColumnMode && haulForSlot ? haulForSlot : undefined}
        cargo={editCommodities!}
        sort={sort}
        onChange={cargo => this.setState({ editCommodities: cargo })}
      />
    </Panel>;
  }

  renderCommodities(fcMergedCargo: Cargo) {
    const { proj, assignCommodity, sumTotal, mode, sort, hideDoneRows, hideFCColumns, hasAssignments, fcCargo, showWhereToBuy, showShips, showShipsTargetId, showShipsTargetCargo, isPrep, prepDeliverCallout, prepNicknameCallout } = this.state;
    if (!proj?.commodities) { return <div />; }

    // start with commodities from project, adding things on FCs (if they are visible)
    const cargo: Cargo = {
      ...proj.commodities,
    };
    if (!hideFCColumns) {
      for (const fcc of Object.values(fcCargo)) {
        for (const key in fcc) {
          if (key in cargo || fcc[key] === 0 || !mapCommodityNames[key]) { continue; }
          cargo[key] = 0;
        }
      }
    }

    // do not render list if nothing left to deliver
    if (sumTotal === 0) {
      if (isPrep) {
        return <>
          <div style={{ textAlign: 'center', minWidth: 500, marginTop: 40, fontSize: 14 }}>
            <ActionButton
              className={cn.bBox2}
              text='Add a building to track required cargo'
              onClick={() => {
                document.getElementById('bt-add-build-btn')?.click();
              }}
            />

            <div style={{ margin: 40, textAlign: 'center', color: appTheme.palette.themeSecondary }}>
              Loading projects are lighter weight, intended for collecting supplies on Fleet Carriers before placing construction sites.
              <br />
              <br />
              They can track cargo needed for multiple builds.
              <br />
              <br />
              <br />
              <div style={{ color: appTheme.palette.yellowDark, fontSize: 12, margin: '10px 0' }}>
                <Icon className='icon-inline' iconName='Warning' />
                &nbsp;This is an experimental feature - these projects may be hidden or unsupported in older versions of client apps
              </div>
            </div>
          </div>
        </>;
      } else {
        return <>
          <div>Congratulations!</div>
          <br />
          <PrimaryButton iconProps={{ iconName: 'Completed' }} onClick={() => this.setState({ confirmComplete: true })}>Mark project complete</PrimaryButton>
        </>;
      }
    }

    const rows = [];
    const cmdrs = proj.commanders ? Object.keys(proj.commanders) : [];

    let flip = false;
    const validCargoNames = Object.keys(cargo).filter(k => !hideDoneRows || cargo[k] !== 0 || proj.complete);
    const groupedCommodities = getGroupedCommodities(validCargoNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCommodities);

    let colSpan = 0;
    const fcCount = Object.keys(fcCargo).length;
    if (fcCount > 0) colSpan += fcCount + 1;
    if (hasAssignments) colSpan++;
    if (showShips) colSpan++;
    const prepSlotCount = isPrep && this.state.prepBuildSlots.length >= 1 ? this.state.prepBuildSlots.length : 0;

    // calculate sum cargo diff for all FCs per commodity name
    const fcMarketIds = Object.keys(fcCargo);
    const mapSumCargoDiff = Object.keys(mapCommodityNames).reduce((map, key) => {
      const need = cargo[key] ?? 0;
      if (need >= 0) {
        map[key] = fcMarketIds.reduce(
          (sum, marketId) => sum + this.getPrepFcDeliverDisplay(marketId, key),
          0,
        ) - need;
      }
      return map;
    }, {} as Cargo);

    // as we have the FC cargo diff's known here, calculate how much they have ready for the total progress chart. Meaning: count the needs where FCs have a surplus, otherwise count what is on the FC
    this.countReadyOnFCs = getCargoCountOnHand(cargo, fcMergedCargo);

    // calculate sum of diffs that are negative
    const fcSumCargoDeficit = Object.values(mapSumCargoDiff)
      .filter(v => v < 0)
      .reduce((sum, v) => sum += -v, 0);

    let countEnoughOnAnything = 0;
    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        if (sort === SortMode.alpha) { continue; }

        // group row
        let td = <td colSpan={2 + prepSlotCount + colSpan} className='hint'> {key}</td>;
        if (sort === SortMode.econ) {
          const txt = key.split(',').map(t => mapName[t] ?? '??').join(' / ');
          td = <td colSpan={2 + prepSlotCount + colSpan}>
            <Stack horizontal verticalAlign='center'>
              <div><EconomyBlock economy={key} /></div>
              <div className='hint'>{txt}</div>
            </Stack>
          </td>;
        }

        rows.push(<tr key={`group-${key}`} className='group' style={{ background: appTheme.palette.themeSecondary, color: appTheme.palette.neutralLight }}>{td}</tr>);
        continue;
      }

      // TODO: Entirely split view rendering
      flip = !flip;
      var { row, enoughOnShipsOrFC } = this.getCommodityRow(proj, key, cmdrs, flip, mapSumCargoDiff);
      rows.push(row)
      if (enoughOnShipsOrFC) { countEnoughOnAnything++; }

      // show extra row to assign a commodity to a cmdr?
      if (assignCommodity === key && proj.commanders) {
        rows.push(this.getCommodityAssignmentRow(key, proj, cmdrs));
      }
    }

    // generate a totals row at the bottom (prep multi-building: first column sums row Total remainings, not raw project commodities)
    let sumTotalDisplayed = sumTotal;
    if (isPrep && this.state.prepBuildSlots.length >= 1) {
      let s = 0;
      let unk = false;
      for (const key of groupsAndCommodityKeys) {
        if (key in groupedCommodities) { continue; }
        const rem = this.getPrepMultiSlotRemainingForCommodity(key);
        if (rem === 'unknown') { unk = true; break; }
        s += rem;
      }
      sumTotalDisplayed = unk ? NaN : s;
    }
    const totals: string[] = [Number.isNaN(sumTotalDisplayed) ? '?' : sumTotalDisplayed.toLocaleString()];
    if (isPrep && this.state.prepBuildSlots.length >= 1) {
      this.state.prepBuildSlots.forEach((bt, si) => {
        const haul = getAvgHaulCosts(bt);
        totals.push(this.sumSlotDisplayedUnits(haul, si).toLocaleString());
      });
    }
    if (showShips) { totals.push(''); }
    if (!hideFCColumns && Object.keys(fcCargo).length > 0) {
      totals.push('');
      for (const marketId of Object.keys(fcCargo)) {
        const fcc = fcCargo[marketId];
        const adjCargo: Cargo = {};
        for (const ck of Object.keys(fcc)) {
          if (ck in mapCommodityNames) {
            adjCargo[ck] = this.getPrepFcDeliverDisplay(marketId, ck);
          }
        }
        totals.push(sumCargo(adjCargo).toLocaleString() ?? '');
      }
    }
    let nn = 0;
    const totalIsEnough = validCargoNames.length && countEnoughOnAnything === validCargoNames.length;
    const totalsRow = <tr key='tr-sum'>
      <td className={`commodity-name ${cn.br} ${cn.bt}`} style={{ textAlign: 'right' }}>
        <span>Sum total:&nbsp;</span>
        {totalIsEnough && <Icon iconName={'TaskSolid'} style={{ fontSize: 14, height: 16, width: 16, marginRight: 2, marginTop: 4, color: 'lime' }} />}
      </td>
      {totals.map((t, i) => (<td key={`tr-${++nn}`} className={`commodity-need ${i + 1 < totals.length || hasAssignments ? cn.br : ''} ${cn.bt}`}>{t}</td>))}
      {hasAssignments && <td className={cn.bt} style={{ textAlign: 'right' }}>&nbsp;</td>}
    </tr>;

    return <div style={{ cursor: 'default' }}>
      {mode === Mode.view && <h3 className={cn.h3} style={{ marginBottom: 16 }}>
        Commodities:&nbsp;
        <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: iconForSort(sort) }}
          onClick={() => {
            const newSort = nextSort(sort);
            this.setState({ sort: newSort });
            store.commoditySort = newSort;
          }}
        >
          {sort}
        </ActionButton>
        <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: hideDoneRows ? 'ThumbnailViewMirrored' : 'AllAppsMirrored' }}
          title={hideDoneRows ? 'Hiding completed commodies' : 'Showing all commodities'}
          text={hideDoneRows ? 'Active' : 'All'}
          onClick={() => {
            this.setState({ hideDoneRows: !hideDoneRows });
            store.commodityHideCompleted = !hideDoneRows;
          }}
        />
        {fcCount > 0 && <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: hideFCColumns ? 'fleetCarrier' : 'fleetCarrierSolid' }}
          title={hideFCColumns ? 'Hiding FC columns' : 'Showing FC columns'}
          onClick={() => {
            this.setState({ hideFCColumns: !hideFCColumns });
            store.commodityHideFCColumns = !hideFCColumns;
          }}
        />}

        <ActionButton
          id='btnWhereToBuy'
          className={cn.bBox}
          iconProps={{ iconName: showWhereToBuy ? 'ShoppingCartSolid' : 'ShoppingCart' }}
          title='Find markets supplying required commodities'
          onClick={() => {
            this.setState({ showWhereToBuy: !showWhereToBuy });
          }}
        />
      </h3>}

      <table className={`commodities ${sort}`} cellSpacing={0} cellPadding={0} style={{ fontSize: 14 }} >
        <thead>
          <tr>
            <th className={`commodity-name ${cn.bb} ${cn.br}`}>Commodity Needed</th>
            <th className={`commodity-need ${cn.bb} ${cn.br}`} title={prepSlotCount >= 1 ? 'Remaining for this commodity across all tracked buildings (after # column deliveries)' : 'Total needed for this commodity'}>Total</th>
            {isPrep && this.state.prepBuildSlots.length >= 1 && this.state.prepBuildSlots.map((_, si) => (
              <th key={`prep-slot-h-${si}`} className={`commodity-need ${cn.bb} ${cn.br}`} title={`Cargo required for building #${si + 1}`}>
                #{si + 1}
              </th>
            ))}
            {showShips && <th className={`commodity-need ${cn.bb} ${cn.br}`} title='Cargo on tracked ships'>
              <IconButton
                id='show-all-ships'
                iconProps={{ iconName: showShipsTargetId && !showShipsTargetCargo ? 'AirplaneSolid' : 'Airplane' }}
                className={`bubble ${cn.bBox}`}
                style={{ height: 20, padding: 0, }}
                onClick={() => this.setState({ showShipsTargetId: !!showShipsTargetId ? undefined : 'show-all-ships' })}
              />
            </th>}
            {!hideFCColumns && colSpan > 0 && Object.keys(fcCargo).length > 0 && this.getCargoFCHeaders()}
            {hasAssignments && <th className={`commodity-assigned ${cn.bb}`}>Assigned</th>}
          </tr>
        </thead>
        <tbody>
          {rows}
          {totalsRow}
        </tbody>
      </table>

      {sumTotal > 0 && <div className='cargo-remaining'>
        {!isPrep && <CargoRemaining sumTotal={sumTotal} label='Remaining cargo' />}
        {!hideFCColumns && fcSumCargoDeficit > 0 && <CargoRemaining sumTotal={fcSumCargoDeficit} label='Fleet Carrier deficit' />}
      </div>}

      {!!showShipsTargetId && this.renderShipsCallout()}

      {prepDeliverCallout && (() => {
        const c = prepDeliverCallout;
        const sid = this.state.prepSlotIds[c.slotIndex];
        const cmdrNames = proj.commanders ? Object.keys(proj.commanders).sort((a, b) => a.localeCompare(b)) : [];
        const cmdrOptions: IDropdownOption[] = cmdrNames.map(n => ({ key: n, text: n }));
        const fromOptions: IDropdownOption[] = [
          { key: 'ship', text: 'Ship Only' },
          ...proj.linkedFC.map(fc => ({
            key: String(fc.marketId),
            text: fcFullName(fc.name, fc.displayName),
          })),
        ];
        const historyList = sid
          ? [...(this.state.prepDeliverHistory[histKey(sid, c.commodity)] ?? [])].reverse()
          : [];
        const dismiss = () => this.setState({ prepDeliverCallout: undefined });
        const submitDisabled = cmdrNames.length > 0 && !c.selectedCommander.trim();
        const lime = 'rgb(209, 217, 59)';
        const allOn = !!c.allToggleActive;
        const maxDraftHere = this.getPrepDeliverMaxDraft(c.slotIndex, c.commodity, c.selectedFromKey || 'ship');
        return <Callout
          target={c.anchor}
          onDismiss={dismiss}
          setInitialFocus
          directionalHint={DirectionalHint.bottomAutoEdge}
          styles={{
            calloutMain: {
              backgroundColor: appTheme.semanticColors.bodyBackground,
              color: appTheme.semanticColors.bodyText,
              border: `1px solid ${appTheme.palette.themePrimary}`,
              borderRadius: 2,
            },
          }}
        >
          <div style={{ position: 'relative', padding: '8px 40px 12px 12px', minWidth: 360, maxWidth: 440 }}>
            <IconButton
              iconProps={{ iconName: 'Cancel' }}
              title='Close'
              ariaLabel='Close'
              onClick={dismiss}
              styles={{
                root: {
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 1,
                },
              }}
            />
            <Stack horizontal verticalAlign='center' wrap tokens={{ childrenGap: 10 }} styles={{ root: { marginBottom: 12, paddingRight: 8 } }}>
              <span style={{ fontWeight: 600, color: appTheme.semanticColors.bodyText }}>Delivered by:</span>
              <Dropdown
                placeholder='No commanders'
                disabled={cmdrNames.length === 0}
                options={cmdrOptions}
                selectedKey={cmdrNames.length ? c.selectedCommander : undefined}
                onChange={(_, opt) => opt && this.patchPrepDeliverCalloutState({ selectedCommander: String(opt.key) })}
                styles={{
                  dropdown: { width: 200 },
                  title: cmdrNames.length === 0 ? { color: appTheme.palette.neutralTertiary } : undefined,
                }}
              />
            </Stack>
            {submitDisabled && (
              <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { marginBottom: 8 } }}>
                Choose <b>Delivered by</b> (commander) to enable Submit and All.
              </MessageBar>
            )}
            <Stack horizontal verticalAlign='end' wrap tokens={{ childrenGap: 8 }}>
              <TextField
                placeholder='0'
                value={c.draft}
                onChange={(_, v) => {
                  const cur = this.state.prepDeliverCallout;
                  if (cur) {
                    this.setState({ prepDeliverCallout: { ...cur, draft: v ?? '0', allToggleActive: false } });
                  }
                }}
                styles={{ root: { width: 140 } }}
              />
              <IconButton
                disabled={submitDisabled}
                iconProps={{ iconName: 'Accept', style: { color: appTheme.palette.themePrimary } }}
                title={submitDisabled ? 'Choose who delivered first' : 'Submit delivery'}
                onClick={() => {
                  const n = Math.max(0, parseIntLocale(c.draft, true));
                  this.submitPrepDeliverAmount(c.slotIndex, c.commodity, n);
                }}
              />
              <DefaultButton
                disabled={submitDisabled}
                text='All'
                title={submitDisabled ? 'Choose who delivered first' : (allOn ? 'Turn off: clear amount to 0' : 'Turn on: fill amount with the maximum you can deliver from this source for this slot')}
                onClick={() => {
                  if (allOn) {
                    this.patchPrepDeliverCalloutState({ allToggleActive: false, draft: '0' });
                  } else {
                    const max = this.getPrepDeliverMaxDraft(c.slotIndex, c.commodity, c.selectedFromKey || 'ship');
                    this.patchPrepDeliverCalloutState({ allToggleActive: true, draft: String(max) });
                  }
                }}
                styles={allOn ? {
                  root: {
                    backgroundColor: appTheme.palette.themePrimary,
                    color: appTheme.palette.white,
                    borderColor: appTheme.palette.themeDark,
                  },
                  label: { fontWeight: 600 },
                } : undefined}
              />
            </Stack>
            <Stack horizontal verticalAlign='center' wrap tokens={{ childrenGap: 10 }} styles={{ root: { marginTop: 12 } }}>
              <DefaultButton
                text='Reset'
                title='Clear all deliveries for this slot and commodity (restore template and FC display)'
                onClick={() => this.resetPrepDeliverSlotCommodity(c.slotIndex, c.commodity)}
              />
              <span className='t' style={{ color: appTheme.semanticColors.bodyText }}>From:</span>
              <Dropdown
                options={fromOptions}
                selectedKey={c.selectedFromKey || 'ship'}
                onChange={(_, opt) => {
                  if (!opt) { return; }
                  const newKey = String(opt.key);
                  const cur = this.state.prepDeliverCallout;
                  if (!cur) { return; }
                  if (cur.allToggleActive) {
                    const max = this.getPrepDeliverMaxDraft(cur.slotIndex, cur.commodity, newKey);
                    this.patchPrepDeliverCalloutState({ selectedFromKey: newKey, draft: String(max) });
                  } else {
                    this.patchPrepDeliverCalloutState({ selectedFromKey: newKey });
                  }
                }}
                styles={{ dropdown: { width: 220 } }}
              />
            </Stack>
            {!submitDisabled && maxDraftHere <= 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: appTheme.palette.neutralSecondary }}>
                Nothing left to deliver for this building column from the selected source (commodity already satisfied or no stock on that FC).
              </div>
            )}
            {historyList.length > 0 && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${appTheme.palette.neutralTertiaryAlt}`, paddingTop: 8 }}>
                {historyList.map(entry => (
                  <Stack
                    key={entry.id}
                    horizontal
                    verticalAlign='center'
                    tokens={{ childrenGap: 6 }}
                    styles={{ root: { marginBottom: 6, fontSize: 12 } }}
                  >
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>
                      {entry.fromKey === 'editor'
                        ? `${entry.fromLabel} (${entry.commander})`
                        : `${entry.amount.toLocaleString()} - Delivered By: "${entry.commander}" From "${entry.fromLabel}"`}
                    </span>
                    <Icon
                      className='icon-btn'
                      iconName='Delete'
                      tabIndex={0}
                      role='button'
                      title={entry.fromKey === 'editor' ? 'Remove this commodity edit (reverts the change)' : 'Remove this delivery'}
                      style={{ color: lime, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => this.removePrepDeliverLine(c.slotIndex, c.commodity, entry.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          this.removePrepDeliverLine(c.slotIndex, c.commodity, entry.id);
                        }
                      }}
                    />
                  </Stack>
                ))}
              </div>
            )}
          </div>
        </Callout>;
      })()}

      {prepNicknameCallout && (() => {
        const c = prepNicknameCallout;
        const dismiss = () => this.setState({ prepNicknameCallout: undefined });
        const submit = () => {
          const bid = this.state.proj?.buildId;
          const sid = this.state.prepSlotIds[c.slotIndex];
          if (!bid || !sid) {
            dismiss();
            return;
          }
          const next = setPrepBuildNicknameForSlot(bid, this.state.prepSlotIds, sid, c.draft);
          this.setState({ prepBuildNicknames: next, prepNicknameCallout: undefined });
        };
        return <Callout
          target={c.anchor}
          onDismiss={dismiss}
          setInitialFocus
          directionalHint={DirectionalHint.bottomAutoEdge}
          styles={{
            calloutMain: {
              backgroundColor: appTheme.semanticColors.bodyBackground,
              color: appTheme.semanticColors.bodyText,
              border: `1px solid ${appTheme.palette.themePrimary}`,
              borderRadius: 2,
            },
          }}
        >
          <div style={{ padding: '10px 12px 12px', minWidth: 260 }}>
            <TextField
              placeholder='Enter Nickname'
              value={c.draft}
              onChange={(_, v) => {
                const cur = this.state.prepNicknameCallout;
                if (cur) {
                  this.setState({ prepNicknameCallout: { ...cur, draft: v ?? '' } });
                }
              }}
              styles={{
                root: { marginBottom: 10 },
                field: { color: appTheme.semanticColors.bodyText },
              }}
            />
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
              <IconButton
                iconProps={{ iconName: 'Accept', style: { color: appTheme.palette.themePrimary } }}
                title='Save nickname'
                onClick={submit}
              />
              <IconButton
                iconProps={{ iconName: 'Cancel' }}
                title='Cancel'
                onClick={dismiss}
              />
            </Stack>
          </div>
        </Callout>;
      })()}
    </div>
  }

  getCargoFCHeaders() {
    const keys = Object.keys(this.state.fcCargo);
    return [
      <th key={`fcc-have`} className={`commodity-need ${cn.bb} ${cn.br}`} title='Difference between amount needed and sum total across linked Fleet Carriers'>FC Diff</th>,
      ...keys.map((k, i) => {
        const fc = this.state.proj!.linkedFC.find(fc => fc.marketId.toString() === k);
        return fc && <th key={`fcc${k}`} className={`commodity-need ${cn.bb} ${i + 1 < keys.length || this.state.hasAssignments ? cn.br : ''}`} title={`${fc.displayName} (${fc.name})`} >
          <ActionButton
            className={cn.bBox}
            style={{ height: 20, padding: 0, fontWeight: 'bold', color: appTheme.palette.themePrimary }}
            onClick={() => this.setState({ fcEditMarketId: k })}
          >
            {fc.name}
          </ActionButton>
        </th>;
      })
    ];
  }

  getCommodityAssignmentRow(key: string, proj: Project, cmdrs: string[]) {
    const fcCount = Object.keys(this.state.fcCargo).length;
    const { hideFCColumns, showShips, hasAssignments, isPrep, prepBuildSlots } = this.state;
    let assignColSpan = 2 + (isPrep && prepBuildSlots.length >= 1 ? prepBuildSlots.length : 0);
    if (showShips) { assignColSpan++; }
    if (!hideFCColumns && fcCount > 0) { assignColSpan += fcCount + 1; }
    if (hasAssignments) { assignColSpan++; }

    if (Object.keys(proj.commanders).length === 0) {
      // show a warning when there's no cmdrs to add
      return <tr key={`c${key}`}>
        <td colSpan={assignColSpan}>
          <MessageBar messageBarType={MessageBarType.warning} onDismiss={() => this.setState({ assignCommodity: undefined })} >You need to add commanders first</MessageBar>
        </td>
      </tr>;
    } else {
      const cmdrOptions = cmdrs
        .filter(cmdr => proj.commanders && proj.commanders[cmdr] && !proj.commanders[cmdr].includes(key))
        .map(k => ({ key: k, text: k }))
        .sort();

      const assignRow = <tr key='c-edit'>
        <td colSpan={assignColSpan}>
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

  getCommodityRow(proj: Project, key: string, cmdrs: string[], flip: boolean, mapSumCargoDiff: Cargo): { enoughOnShipsOrFC: boolean, row: JSX.Element } {
    const displayName = mapCommodityNames[key] ?? key;
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

    const need = proj.commodities[key] ?? 0;
    const prepMulti = this.state.isPrep && this.state.prepBuildSlots.length >= 1;
    const prepRemain: number | 'unknown' | null = prepMulti ? this.getPrepMultiSlotRemainingForCommodity(key) : null;
    const totalCellText = prepMulti && prepRemain !== null
      ? (prepRemain === 'unknown' ? '?' : prepRemain.toLocaleString())
      : (need === -1 ? '?' : need.toLocaleString());
    const totalForRowStyle = prepMulti && prepRemain !== null && prepRemain !== 'unknown' ? prepRemain : need;

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
      }
    ];

    if (need > 0 || isReady) {
      menuItems.push({
        key: 'toggle-ready',
        text: isReady ? 'Clear ready' : 'Mark ready',
        onClick: () => {
          this.onToggleReady(this.state.proj!.buildId, key, isReady);
        },
        iconProps: { iconName: 'StatusCircleCheckmark' },
      });
    }

    if (need > 0 && !this.state.isPrep) {
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

    const fcTotal = sumCargoDiff + need;
    const diff = 100 / need * fcTotal;

    // prepare an element for the FC diff cell
    const fcSumTitle = sumCargoDiff > 0
      ? `${diff.toFixed(0)}% - FCs have a surplus of: ${sumCargoDiff}`
      : `${diff.toFixed(0)}% - FCs are short by: ${-sumCargoDiff}`;
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

    const { ships, showShips } = this.state;
    const onShips = ships && ships.map(s => s.cargo[key] ?? 0);
    const countOnShips = onShips?.reduce((t, c) => t + c, 0) ?? 0;
    const onShipsElement = !countOnShips
      ? <span style={{ color: 'grey' }}>-</span>
      : <ActionButton
        id={`show-ships-${key}`}
        className={`bubble ${cn.bBox}`}
        style={{ height: 20, padding: 0, minWidth: 28, }}
        text={countOnShips.toLocaleString()}
        onClick={() => this.setState({ showShipsTargetCargo: key, showShipsTargetId: `show-ships-${key}` })}
      />;

    const enoughOnShipsOrFC = need > 0 && (countOnShips + sumCargoDiff >= 0);

    const fcMarketIds = Object.keys(this.state.fcCargo);

    const className = totalForRowStyle !== 0 ? '' : 'done ';
    const style: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };
    return {
      enoughOnShipsOrFC: enoughOnShipsOrFC,
      row: <tr key={`cc-${key}`} className={className} style={style}>
        <td className={`commodity-name ${cn.br}`} id={`cargo-${key}`} style={{ position: 'relative' }}>
          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }}>
            <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
            &nbsp;
            {isReady && <Icon iconName='CompletedSolid' className='icon-inline' style={{ fontSize: 14 }} title={`${displayName} is ready`} />}

            {isContextTarget && <ContextualMenu
              target={`#cn-${key}`}
              onDismiss={() => this.setState({ cargoContext: undefined })}
              items={menuItems}
              styles={{
                container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
              }}
            />}

            <IconButton
              className={`btn ${cn.bBox}`}
              iconProps={{ iconName: 'ContextMenu' }}
              title={`Commands for: ${key}`}
              style={{ position: 'absolute', right: 20, top: 1, color: appTheme.palette.themePrimary, width: 22, height: 20 }}
              onClick={() => {
                this.setState({ cargoContext: key });
              }}
            />
          </Stack>

          {(enoughOnShipsOrFC) && <span style={{ position: 'absolute', right: 0, top: 2 }} title='Enough cargo is available on linked Fleet Carriers or tracked ships'>
            <Icon iconName={'TaskSolid'} style={{ fontSize: 14, height: 16, width: 16, color: 'lime' }} />
          </span>}

        </td>

        <td className={`commodity-need ${cn.br}`} title={prepMulti ? 'Remaining for this commodity across all tracked buildings (after deliveries recorded in # columns)' : undefined}>
          <span className='t'>{totalCellText}</span>
        </td>

        {this.state.isPrep && this.state.prepBuildSlots.length >= 1 && this.state.prepBuildSlots.map((bt, si) => {
          const slotNeed = getAvgHaulCosts(bt)[key] ?? 0;
          const sub = this.getPrepSlotSub(si, key);
          const shown = Math.max(0, slotNeed - sub);
          const dc = this.state.prepDeliverCallout;
          const isDeliverTarget = !!(dc && dc.slotIndex === si && dc.commodity === key);
          /** Keep one DOM node (no wrapper) so Callout `anchor` stays valid after highlight re-render. */
          const prepBubbleStyle: CSSProperties | undefined = isDeliverTarget
            ? {
              backgroundColor: appTheme.palette.yellow,
              color: 'black',
              display: 'inline-block',
            }
            : undefined;
          return <td key={`prep-slot-${key}-${si}`} className={`commodity-need ${cn.br}`}>
            <span
              role='button'
              tabIndex={0}
              className={`prep-slot-deliverable t${isDeliverTarget ? ' bubble prep-slot-deliverable--callout' : ''}`}
              style={prepBubbleStyle}
              title={`Deliver / adjust #${si + 1} for this commodity (original ${slotNeed.toLocaleString()})`}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  (ev.currentTarget as HTMLElement).click();
                }
              }}
              onClick={(e) => {
                const prefs = resolvePrepDeliverUiPrefs(proj.buildId, proj);
                this.setState({
                  prepNicknameCallout: undefined,
                  prepDeliverCallout: {
                    slotIndex: si,
                    commodity: key,
                    anchor: e.currentTarget as HTMLElement,
                    draft: '0',
                    selectedCommander: prefs.commander,
                    selectedFromKey: prefs.fromKey,
                    allToggleActive: false,
                  },
                });
              }}
            >
              {slotNeed === -1 ? '?' : shown.toLocaleString()}
            </span>
          </td>;
        })}

        {showShips && <td className={`${cn.br}`} style={{ textAlign: 'center' }}>{onShipsElement}</td>}

        {fcMarketIds.length > 0 && !this.state.hideFCColumns && <>
          {/* The FC Diff cell, then a cell for each FC */}
          <td key='fcc-have' className={`commodity-diff ${cn.br}`}  >
            <div className='bubble' style={{ backgroundColor: fcDiffCellColor, color: 'black' }} >
              {fcSumElement}
            </div>
          </td>
          {fcMarketIds.map((marketId, i) => {
            const fcShown = this.getPrepFcDeliverDisplay(marketId, key);
            return <td key={`fcc${marketId}`} className={`commodity-need ${i + 1 < fcMarketIds.length || this.state.hasAssignments ? cn.br : ''}`} >
              {fcShown ? <span>{fcShown.toLocaleString()}</span> : <span style={{ color: 'grey' }}>-</span>}
            </td>;
          })}
        </>
        }

        {this.state.hasAssignments && <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>}
      </tr>
    };
  }

  renderProjectDetails(proj: Project) {
    const { isPrep } = this.state;

    return <div className='half'>
      <div className='project'>
        <h3 className={cn.h3}>Project:</h3>
        <table style={{ fontSize: 14 }}>
          <tbody>
            <tr>
              <td>Build name:</td>
              <td>
                <div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight, minWidth: 280 }}>
                  {proj.buildName}
                  {proj.isPrimaryPort && <Icon iconName='CrownSolid' style={{ marginLeft: 8, fontWeight: 'bold' }} title='System primary port' />}
                </div>
              </td>
            </tr>

            {!isPrep && <tr>
              <td>Build type:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}><BuildTypeDisplay buildType={proj.buildType} /></div>
              </td>
            </tr>}

            {!isPrep && <tr>
              <td>System name:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.systemName}</div></td>
            </tr>}

            {!isPrep && !!proj.bodyName && <tr>
              <td>Body name:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.bodyName}&nbsp;</div></td>
            </tr>}

            <tr>
              <td>Architect:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.architectName}&nbsp;</div></td>
            </tr>

            {/* <tr>
              <td>Faction:</td>
              <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{proj.factionName}&nbsp;</div></td>
            </tr> */}

            {proj.timeDue && !proj.complete && <tr>
              <td>Time remaining:</td>
              <td>
                <div id='due-time' className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>
                  <TimeRemaining timeDue={proj.timeDue} />
                </div>
              </td>
            </tr>}

            {!!proj.notes && <tr>
              <td>Notes:</td>
              <td><div className='grey notes' style={{ backgroundColor: appTheme.palette.purpleLight, maxWidth: 400 }}>{proj.notes}&nbsp;</div></td>
            </tr>}

          </tbody>
        </table>

        {isPrep && this.renderPrepBuilds()}
        {this.renderCommanders()}
        {this.renderLinkedFC()}
        {!this.state.isPrep && !proj.complete && <BuildEffects buildType={proj.buildType} />}
      </div>
    </div>;
  };

  renderPrepBuilds() {
    const { prepBuildSlots, lastServerPrepSlots, proj, savingPrepBuilds, prepBuildsDiffer, originalCargo, prepSlotIds, prepBuildNicknames } = this.state;
    if (!proj) { return; }

    const rows = prepBuildSlots.map((buildType, index) => {
      const type = getSiteType(buildType)!;
      const slotId = prepSlotIds[index];
      const defaultMiddle = `${type.displayName2} : ${buildType}`;
      const nick = slotId && prepBuildNicknames[slotId]?.trim();
      const middleShown = nick || defaultMiddle;
      const hoverTitle = nick ? defaultMiddle : undefined;
      return <div key={`pbb-${slotId ?? `i${index}`}-${buildType}`} style={{ width: 'max-content' }}>
        <Stack horizontal verticalAlign='center'>
          <div title={hoverTitle}>#{index + 1} {middleShown}</div>
          <IconButton
            className={`${cn.bBox}`}
            iconProps={{ iconName: 'BoxAdditionSolid' }}
            title={`Add another row with this building at the end (#${this.state.prepBuildSlots.length + 1})`}
            style={{ marginLeft: 8, color: appTheme.palette.themePrimary, width: 22, height: 22 }}
            onClick={() => { this.appendDuplicatePrepSlot(index); }}
          />
          <IconButton
            className={`${cn.bBox}`}
            iconProps={{ iconName: 'Edit' }}
            title='Set nickname for this building (hover shows default name when nicknamed)'
            style={{ marginLeft: 4, color: appTheme.palette.themePrimary, width: 22, height: 22 }}
            onClick={(e) => {
              this.setState({
                prepDeliverCallout: undefined,
                prepNicknameCallout: {
                  slotIndex: index,
                  anchor: e.currentTarget as HTMLElement,
                  draft: slotId && prepBuildNicknames[slotId] ? prepBuildNicknames[slotId] : '',
                },
              });
            }}
          />
          <IconButton
            className={`${cn.bBox}`}
            iconProps={{ iconName: prepBuildSlots.length > 1 ? 'BoxSubtractSolid' : 'BoxMultiplySolid' }}
            title={`Remove building #${index + 1}`}
            style={{ marginLeft: 4, color: appTheme.palette.themePrimary, width: 22, height: 22 }}
            onClick={() => { this.removePrepSlotAt(index); }}
          />
          {buildType.endsWith(' (primary)') && <IconButton
            className={`${cn.bBox}`}
            iconProps={{ iconName: 'Crown' }}
            title={`Use non-primary port costs`}
            style={{ marginLeft: 4, color: appTheme.palette.themePrimary, width: 22, height: 22 }}
            onClick={() => {
              const slots = [...prepBuildSlots];
              slots[index] = buildType.replace(' (primary)', '');
              this.applyPrepSlots(slots);
            }}
          />}
        </Stack>
      </div>;
    });

    const noBuilds = prepBuildSlots.length === 0;
    const slotsDirty = JSON.stringify(prepBuildSlots) !== JSON.stringify(lastServerPrepSlots);
    const isDirty = JSON.stringify(originalCargo) !== JSON.stringify(proj.commodities) || slotsDirty;

    if (!rows.length) {
      rows.push(<div key='pbb-none' style={{ color: appTheme.palette.themeTertiary }}>None</div>);
    }

    return <div style={{ userSelect: 'none' }}>
      <h3 className={cn.h3} style={{ marginTop: 20 }}>

        <Stack horizontal verticalAlign='center'>
          <span>Building:&nbsp;</span>

          {!savingPrepBuilds && <span>
            <ViewEditBuildType
              asAddBtn
              highlightAdd={noBuilds}
              buildType=''
              onChange={bt => {
                if (usePrimaryCosts.includes(bt)) { bt = `${bt} (primary)`; }
                this.applyPrepSlots([...this.state.prepBuildSlots, bt]);
              }}
            />
          </span>}

          {isDirty && !savingPrepBuilds && <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'Save' }}
            text='Save'
            title='Save changes to buildings'
            style={{ height: 22, color: savingPrepBuilds ? 'grey' : undefined, }}
            disabled={savingPrepBuilds}
            onClick={this.onSavePrepBuilds}
          />}

          {isDirty && !savingPrepBuilds && <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'Undo' }}
            text='Undo'
            title='Undo changes to buildings'
            style={{ height: 22, color: savingPrepBuilds ? 'grey' : undefined, }}
            disabled={savingPrepBuilds}
            onClick={() => {
              const slots = [...lastServerPrepSlots];
              const baseline = proj.buildId ? readServerBaseline(proj.buildId) : { slots: [] as string[], ids: [] as string[] };
              const baselineMatchesUndo =
                baseline.slots.length === slots.length &&
                baseline.ids.length === slots.length &&
                baseline.slots.every((s, i) => s === slots[i]);
              let ids = baselineMatchesUndo ? [...baseline.ids] : [...this.state.lastServerPrepSlotIds];
              if (ids.length !== slots.length) {
                ids = nextPrepSlotIds([], [], slots);
              }
              const cargo = originalCargo ?? {};
              const prunedSubs = normalizeDeliverMap(this.state.prepSlotDeliverSubs, ids);
              const prunedDel = proj.buildId ? prunePrepDeliverData(proj.buildId, new Set(ids)) : { history: {} as PrepDeliverHistMap, fcAdjust: {} as PrepFcAdjustMap };
              if (proj.buildId) {
                writePrepSlotMeta(proj.buildId, slots, ids);
                setPrepSlotDeliverMap(proj.buildId, prunedSubs);
              }
              this.setState({
                prepBuildSlots: slots,
                prepSlotIds: ids,
                proj: {
                  ...proj,
                  commodities: cargo,
                  prepBuilds: prepBuildSlotsToRecord(slots),
                  prepBuildOrder: [...slots],
                },
                sumTotal: sumCargo(cargo),
                prepSlotDeliverSubs: prunedSubs,
                prepDeliverHistory: prunedDel.history,
                prepDeliverFcAdjust: prunedDel.fcAdjust,
                prepBuildNicknames: proj.buildId ? prunePrepBuildNicknames(proj.buildId, ids) : {},
              });
            }}
          />}

          {savingPrepBuilds && isDirty && <Spinner
            style={{ marginTop: -2 }}
            size={SpinnerSize.small}
            labelPosition='right'
            label='Saving...'
          />}
        </Stack>
      </h3>

      {prepBuildsDiffer && <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ color: appTheme.palette.yellowDark, fontSize: 12, marginBottom: 4 }}>
        <Icon iconName='Warning' />
        <span>Commodities have been manually adjusted</span>
        <Icon iconName='Warning' />
      </Stack>}

      <div style={{ fontSize: 14, marginLeft: 20 }}>
        {rows}
      </div>
    </div>;
  }

  applyPrepSlots(slots: string[]) {
    const prevSlots = this.state.prepBuildSlots;
    const prevIds = this.state.prepSlotIds;
    const nextIds = nextPrepSlotIds(prevSlots, prevIds, slots);
    const prunedSubs = normalizeDeliverMap(this.state.prepSlotDeliverSubs, nextIds);

    const cargoNeeded = mergeCargo(slots.map(bt => getAvgHaulCosts(bt)));
    const newProj: Project = {
      ...this.state.proj!,
      commodities: cargoNeeded,
      maxNeed: sumCargo(cargoNeeded),
      prepBuilds: prepBuildSlotsToRecord(slots),
      prepBuildOrder: [...slots],
    };
    const bid = this.state.proj?.buildId;
    const prunedDel = bid ? prunePrepDeliverData(bid, new Set(nextIds)) : { history: {} as PrepDeliverHistMap, fcAdjust: {} as PrepFcAdjustMap };
    const nickPruned = bid ? prunePrepBuildNicknames(bid, nextIds) : {};
    if (bid) {
      writePrepSlotMeta(bid, slots, nextIds);
      setPrepSlotDeliverMap(bid, prunedSubs);
    }
    this.setState({
      prepBuildSlots: slots,
      prepSlotIds: nextIds,
      proj: newProj,
      sumTotal: sumCargo(cargoNeeded),
      prepSlotDeliverSubs: prunedSubs,
      prepDeliverHistory: prunedDel.history,
      prepDeliverFcAdjust: prunedDel.fcAdjust,
      prepBuildNicknames: nickPruned,
    }, () => {
      this.syncPrepPreNavGuard();
    });
  }

  appendDuplicatePrepSlot(index: number) {
    const bt = this.state.prepBuildSlots[index];
    if (!bt) { return; }
    this.applyPrepSlots([...this.state.prepBuildSlots, bt]);
  }

  removePrepSlotAt(index: number) {
    const slots = this.state.prepBuildSlots.filter((_, i) => i !== index);
    this.applyPrepSlots(slots);
  }

  calcCargoNeedsForPrepProject(proj: Pick<Project, 'prepBuilds' | 'prepBuildOrder'>) {
    return mergeCargo(slotsFromProject(proj as Project).map(bt => getAvgHaulCosts(bt)));
  }

  onSavePrepBuilds = async () => {
    const { proj, prepBuildSlots } = this.state;
    if (!proj?.buildId) return;

    this.setState({ savingPrepBuilds: true });
    await delay(500);

    try {
      const deltaProj = {
        buildId: proj.buildId,
        prepBuilds: prepBuildSlotsToRecord(prepBuildSlots),
        prepBuildOrder: [...prepBuildSlots],
      };
      const savedProj = await api.project.update(proj.buildId, deltaProj);

      // success
      const prepBuildsDiffer = this.state.isPrep && savedProj.prepBuilds && sumCargo(savedProj.commodities) !== sumCargo(this.calcCargoNeedsForPrepProject(savedProj));
      const bid = proj.buildId;
      const finalSlots = mergePrepSlotsAfterSave(prepBuildSlots, savedProj);
      const serverSlots = slotsFromProject(savedProj);
      const basePrev = readServerBaseline(bid);
      const newBaselineIds = nextPrepSlotIds(basePrev.slots, basePrev.ids, serverSlots);
      writeServerBaseline(bid, serverSlots, newBaselineIds);

      const workIds = nextPrepSlotIds(this.state.prepBuildSlots, this.state.prepSlotIds, finalSlots);
      const prunedSubs = normalizeDeliverMap(this.state.prepSlotDeliverSubs, workIds);
      writePrepSlotMeta(bid, finalSlots, workIds);
      setPrepSlotDeliverMap(bid, prunedSubs);
      const prunedDel = prunePrepDeliverData(bid, new Set(workIds));

      this.setState({
        savingPrepBuilds: false,
        proj: savedProj,
        originalCargo: { ...savedProj.commodities },
        lastTimestamp: savedProj.timestamp,
        editReady: new Set(savedProj.ready),
        sumTotal: sumCargo(savedProj.commodities),
        hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
        prepBuildSlots: finalSlots,
        prepSlotIds: workIds,
        lastServerPrepSlots: serverSlots,
        lastServerPrepSlotIds: newBaselineIds,
        prepSlotDeliverSubs: prunedSubs,
        prepDeliverHistory: prunedDel.history,
        prepDeliverFcAdjust: prunedDel.fcAdjust,
        prepBuildNicknames: prunePrepBuildNicknames(bid, workIds),
        prepBuildsDiffer,
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message, savingPrepBuilds: false });
    }
  }

  renderCommanders() {
    const { proj, showAddCmdr, newCmdr, isPrep, cmdrShipMode } = this.state;
    if (!proj?.commanders) { return <div />; }

    const rows = [];
    const primaryCmdr = this.getPrimaryCommanderKey();
    for (const key in proj.commanders) {
      const hideCmdrRemove = isPrep && isMatchingCmdr(key, proj.architectName);
      const shipMode: CmdrShipMode = cmdrShipMode[key] ?? 'large';
      var row = <li key={`@${key}`}>
        <span className={`removable ${cn.removable}`}>
          {key}
          &nbsp;
          {primaryCmdr === key && <ActionButton
            className={cn.bBox}
            title={shipMode === 'large' ? 'Switch to Medium Ship' : 'Switch to Large Ship'}
            styles={{ root: { height: 18, padding: 0, minWidth: 88 } }}
            onClick={() => {
              const bid = this.state.proj?.buildId;
              if (!bid) { return; }
              const nextMode: CmdrShipMode = shipMode === 'large' ? 'medium' : 'large';
              const next = { ...this.state.cmdrShipMode, [key]: nextMode };
              writeCmdrShipMode(bid, next);
              this.setState({ cmdrShipMode: next });
            }}
          >
            {shipMode === 'large' ? 'Large Ship' : 'Medium Ship'}
          </ActionButton>}
          {!hideCmdrRemove && <Icon
            className={`btn ${cn.btn}`}
            iconName='Delete'
            title={`Remove commander: ${key}`}
            style={{ color: appTheme.palette.themePrimary, }}
            onClick={() => { this.onClickCmdrRemove(key); }}
          />}
        </span>
      </li>;
      rows.push(row)
    }

    return <>
      <h3 className={cn.h3} style={{ marginTop: 20 }}>
        {Object.keys(proj.commanders).length ?? 0} Commanders:
        &nbsp;
        {!showAddCmdr && <ActionButton
          className={cn.bBox}
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

      <ul style={{ fontSize: 14 }}>
        {rows}
      </ul>
    </>
  }

  renderLinkedFC() {
    const { proj, showAddFC, savingFC, fcEditMarketId } = this.state;
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
          iconName='Refresh'
          title='Zero FC Cargo Values'
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.onClickZeroFCCargoValues(item.marketId.toString());
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
          className={cn.bBox}
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
          processing={savingFC}
          onChange={(marketId) => {
            if (marketId) {
              this.onClickLinkFC(marketId)
            } else {
              this.setState({ showAddFC: false });
            }
          }}
        />

      </div>}

      <ul style={{ fontSize: 14 }}>
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

  onClickZeroFCCargoValues = (marketId: string) => {
    const bid = this.state.proj?.buildId;
    if (!bid) { return; }
    const raw = this.state.fcCargo[marketId] ?? {};
    const nextFcAdjust = { ...this.state.prepDeliverFcAdjust };

    // Replace this FC's adjustment set so display becomes exactly zero for all known raw cargo keys.
    for (const k of Object.keys(nextFcAdjust)) {
      if (k.startsWith(`${marketId}::`)) {
        delete nextFcAdjust[k];
      }
    }
    for (const [comm, n] of Object.entries(raw)) {
      if (n > 0) {
        nextFcAdjust[fcAdjustKey(marketId, comm)] = n;
      }
    }

    writePrepFcAdjust(bid, nextFcAdjust);
    this.setState({ prepDeliverFcAdjust: nextFcAdjust });
  };

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
    const cmdrKnown = cmdrName && this.state.proj && Object.keys(this.state.proj?.commanders).some(cmdr => cmdr.toLowerCase() === cmdrName.toLowerCase());
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
        this.setState({ savingFC: true });
        const linkedFCs = await api.project.linkFC(this.state.buildId, marketId);
        this.updateLinkedFC(this.state.buildId, linkedFCs);
      } catch (err: any) {
        this.setState({ errorMsg: err.message, savingFC: false });
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
      originalCargo: { ...updatedProj.commodities },
      lastTimestamp: updatedProj.timestamp,
      showAddFC: false,
      savingFC: false,
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
    await delay(500);

    try {
      await api.project.delete(buildId);

      // success - navigate to home
      store.removeRecentProject(buildId);
      const nextUrl = this.state.proj?.systemName
        ? `#sys=${encodeURIComponent(this.state.proj?.systemName)}`
        : `#build`;
      window.location.assign(nextUrl);
      window.location.reload();

    } catch (err: any) {
      this.setState({ errorMsg: err.message, submitting: false });
    }
  }

  onProjectComplete = async () => {
    const buildId = this.state.proj?.buildId;
    if (!buildId) return;

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true });
    await delay(500);

    try {
      await api.project.complete(buildId);

      window.location.reload();

    } catch (err: any) {
      this.setState({ errorMsg: err.message, submitting: false });
    }
  }

  applyPrepCommodityEditorSave = async () => {
    const { proj, editCommodities, prepBuildSlots, prepSlotIds, editCommoditiesSlotIndex } = this.state;
    const slotIndex = editCommoditiesSlotIndex ?? 0;
    const bid = proj?.buildId;
    const bt = prepBuildSlots[slotIndex];
    const sid = prepSlotIds[slotIndex];
    if (!bid || !bt || !sid || !editCommodities) {
      this.setState({ editCommodities: undefined, editCommoditiesSlotIndex: undefined, mode: Mode.view, submitting: false });
      return;
    }

    const haul = getAvgHaulCosts(bt);
    const keySet = new Set([
      ...this.getPrepSlotEditValidKeys(slotIndex),
      ...Object.keys(editCommodities),
    ]);

    type RowEdit = { key: string; newSub: number; delta: number; effectiveDisplay: number };
    const edits: RowEdit[] = [];
    for (const key of keySet) {
      if (!(key in mapCommodityNames)) { continue; }
      const base = haul[key] ?? 0;
      const curSub = this.getPrepSlotSub(slotIndex, key);
      const rawD = editCommodities[key];
      const D = Math.max(0, Math.floor(typeof rawD === 'number' && !Number.isNaN(rawD) ? rawD : parseIntLocale(String(rawD ?? ''), true)));
      const effectiveDisplay = Math.min(D, base);
      const newSub = Math.max(0, base - effectiveDisplay);
      const delta = newSub - curSub;
      if (delta === 0) { continue; }
      edits.push({ key, newSub, delta, effectiveDisplay });
    }

    if (edits.length === 0) {
      this.setState({ editCommodities: undefined, editCommoditiesSlotIndex: undefined, mode: Mode.view });
      return;
    }

    this.setState({ submitting: true });
    await delay(500);

    let nextHist = { ...this.state.prepDeliverHistory };
    let nextSubs = { ...this.state.prepSlotDeliverSubs };
    const nextFc = { ...this.state.prepDeliverFcAdjust };

    for (const { key, newSub, delta, effectiveDisplay } of edits) {
      const hk = histKey(sid, key);
      const entry: PrepDeliverHistoryEntry = {
        id: crypto.randomUUID(),
        amount: Math.abs(delta),
        commander: 'Commodity editor',
        fromKey: 'editor',
        fromLabel: `Commodity edited to ${effectiveDisplay.toLocaleString()}`,
        slotSubDelta: delta,
      };
      nextHist[hk] = [...(nextHist[hk] ?? []), entry];
      const sk = prepSlotDeliverKey(sid, key);
      if (newSub <= 0) { delete nextSubs[sk]; }
      else { nextSubs[sk] = newSub; }
    }

    setPrepSlotDeliverMap(bid, nextSubs);
    writePrepDeliverHist(bid, nextHist);
    writePrepFcAdjust(bid, nextFc);

    this.setState({
      submitting: false,
      editCommodities: undefined,
      editCommoditiesSlotIndex: undefined,
      mode: Mode.view,
      prepSlotDeliverSubs: nextSubs,
      prepDeliverHistory: nextHist,
      prepDeliverFcAdjust: nextFc,
    });
  };

  onUpdateProjectCommodities = async () => {
    const { proj, editCommodities, isPrep, prepBuildSlots, editCommoditiesSlotIndex } = this.state;

    if (isPrep && prepBuildSlots.length >= 1 && editCommoditiesSlotIndex !== undefined && proj?.buildId && editCommodities) {
      await this.applyPrepCommodityEditorSave();
      return;
    }

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
      // delete anything that was removed?
      for (const key in proj.commodities) {
        if (!!proj.commodities[key] && !editCommodities[key]) {
          deltaProj.commodities[key] = -1;
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
      await delay(500);

      try {
        const savedProj = await api.project.update(proj.buildId, deltaProj);
        const prepBuildsDiffer = this.state.isPrep && savedProj.prepBuilds && sumCargo(savedProj.commodities) !== sumCargo(this.calcCargoNeedsForPrepProject(savedProj));

        // success - apply new commodity count
        this.setState({
          proj: savedProj,
          originalCargo: { ...savedProj.commodities },
          lastTimestamp: savedProj.timestamp,
          editReady: new Set(savedProj.ready),
          sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
          hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
          editCommodities: undefined,
          mode: Mode.view,
          submitting: false,
          prepBuildsDiffer,
        });

      } catch (err: any) {
        this.setState({ errorMsg: err.message, submitting: false });
      }
    }
  };

  setDefaultApproxCargoCounts = async () => {
    try {
      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await delay(500);

      const savedProj = await api.project.setDefaultCargo(this.state.proj?.buildId!)
      // success - apply new commodity count
      this.setState({
        proj: savedProj,
        originalCargo: { ...savedProj.commodities },
        lastTimestamp: savedProj.timestamp,
        editReady: new Set(savedProj.ready),
        sumTotal: Object.values(savedProj.commodities).reduce((total, current) => total += current, 0),
        hasAssignments: Object.keys(savedProj.commanders).reduce((s, c) => s += savedProj.commanders[c].length, 0) > 0,
        editCommodities: undefined,
        mode: Mode.view,
        submitting: false,
      });

    } catch (err: any) {
      this.setState({ errorMsg: err.message, submitting: false });
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
      <Modal isOpen={fixMarketId !== undefined} styles={{ main: { border: '1px solid ' + appTheme.palette.themePrimary, } }}>
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
        originalCargo: { ...savedProj.commodities },
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
    const { summary, proj, sumTotal, ships } = this.state;
    if (!proj) { return; }
    // roughly calculate progress by the curremt sum from the highest value known
    const approxProgress = proj.maxNeed - sumTotal;
    let percent = 100 / proj.maxNeed * approxProgress;

    const shipsCargo = mergeCargo((ships ?? []).map(s => s.cargo).flat());
    const shipsTotal = getCargoCountOnHand(proj.commodities, shipsCargo);

    // TODO: unify "amount delivered" across deliveries and amount remaining

    if (!summary) {
      // for fc_loading projects...
      percent = 100 / proj.maxNeed * this.countReadyOnFCs;
      return <div className='half'>
        <h3 className={cn.h3}>Progress: {Math.floor(percent)}%</h3>
        <div className='stats-header'>
          <>
            Ready on Fleet Carriers: <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{this.countReadyOnFCs.toLocaleString()}</span>
            {!!shipsTotal && <> and on ships: <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{shipsTotal.toLocaleString()}</span></>}
          </>
        </div>
        {(approxProgress > 0 || this.countReadyOnFCs > 0) && <ChartGeneralProgress noProgress progress={approxProgress} onShips={shipsTotal} readyOnFC={this.countReadyOnFCs} maxNeed={proj.maxNeed} />}
      </div>;
    }

    const cmdrColors = getColorTable(Object.keys(summary.cmdrs));
    return <div className='half'>
      <h3 className={cn.h3}>Progress: {Math.floor(percent)}%</h3>
      <div style={{ fontSize: 14 }}>
        {!!summary.totalDeliveries && <div className='stats-header'>
          <span>Total cargo delivered: </span><span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{approxProgress.toLocaleString()}</span>
          <span>&nbsp;Deliveries tracked:&nbsp;</span><span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{summary.totalDeliveries.toLocaleString()}</span>
          <div>
            Ready on Fleet Carriers: <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{this.countReadyOnFCs.toLocaleString()}</span>
            {!!shipsTotal && <> and on ships: <span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{shipsTotal.toLocaleString()}</span></>}
          </div>
        </div>}

        {(approxProgress > 0 || this.countReadyOnFCs > 0) && <ChartGeneralProgress progress={approxProgress} onShips={shipsTotal} readyOnFC={this.countReadyOnFCs} maxNeed={proj.maxNeed} />}

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
      </div>
    </div>;
  }

  renderDeliver() {
    const { proj, sort, nextDelivery, showBubble, submitting, fcCargo, deliverMarketId, isPrep, prepBuildSlots, deliverReferenceSlotIndex, errorMsg } = this.state;
    if (!proj) return;

    // build up delivery options if there are FCs we can deliver to
    const fcCargoKeys = Object.keys(fcCargo);
    const destinationOptions: IDropdownOption[] = [
      { key: 'site', text: 'Construction site', data: { icon: 'Manufacturing' } },
      { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
      ...fcCargoKeys.map(marketId => ({ key: marketId, text: this.getFullFCName(marketId) }))
    ];
    if (isPrep) {
      // remove construction site if isPrep
      destinationOptions.splice(0, 1);
    }

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
      onChange={(_, o) => this.setState({ deliverMarketId: o!.key.toString() }, () => this.persistLoadFcDraft())}
      styles={{ callout: { border: '1px solid ' + appTheme.palette.themePrimary } }}
    />;

    // valid cargo names that can be included on a delivery
    const validCargoKeys = Object.keys(proj.commodities)
      .filter(k => proj.commodities[k] > 0)

    const refSlot = isPrep && prepBuildSlots.length > 0 && deliverReferenceSlotIndex !== -1
      ? Math.min(Math.max(0, deliverReferenceSlotIndex), prepBuildSlots.length - 1)
      : 0;
    const columnRemaining = isPrep && prepBuildSlots.length >= 1 && deliverReferenceSlotIndex !== -1
      ? this.buildPrepColumnEditCargo(refSlot)
      : {};
    const maxCountsForDeliver: Cargo = {};
    const maxReqCap = this.getCmdrCargoCapForLoad();
    const maxTotalCargo = maxReqCap;
    for (const k of validCargoKeys) {
      if (isPrep && prepBuildSlots.length >= 1) {
        if (deliverReferenceSlotIndex === -1) {
          const rem = this.getPrepMultiSlotRemainingForCommodity(k);
          maxCountsForDeliver[k] = rem === 'unknown' ? (proj.commodities[k] ?? 0) : rem;
        } else {
          maxCountsForDeliver[k] = columnRemaining[k] ?? 0;
        }
      } else {
        maxCountsForDeliver[k] = proj.commodities[k] ?? 0;
      }
    }

    return <div className='delivery' style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      <div>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error} styles={{ root: { margin: '8px 10px 0 10px' } }}>
        {errorMsg}
      </MessageBar>}
      {!submitting && <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
        <PrimaryButton
          text='Load FC'
          disabled={submitting || sumCargo(nextDelivery) === 0 || (isPrep && !deliverMarketId)}
          iconProps={{ iconName: 'DeliveryTruck' }}
          onClick={this.deliverToSite}
        />
        {fcCargoKeys.length > 0 && destinationPicker}
        <DefaultButton text='Close' iconProps={{ iconName: 'Cancel' }} onClick={() => {
          this.setState({ mode: Mode.view, submitting: false, loadFcReuseLastClosedDraft: true }, () => this.persistLoadFcDraft());
        }} />
      </Stack>}

      {submitting && <Spinner
        className='submitting'
        label="Submitting delivery ..."
        labelPosition="right"
      />}

      <EditCargo
        beforeTable={isPrep && prepBuildSlots.length >= 1 ? (
          <Stack tokens={{ childrenGap: 6 }} styles={{ root: { padding: '4px 0 10px 0' } }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: appTheme.semanticColors.bodyText }}>Reference Building:</span>
              <Dropdown
                selectedKey={deliverReferenceSlotIndex === -1 ? 'all' : String(refSlot)}
                options={[
                  { key: 'all', text: 'ALL (total across buildings)' },
                  { key: 'divider_ref', text: '-', itemType: DropdownMenuItemType.Divider },
                  ...prepBuildSlots.map((_, si) => ({ key: String(si), text: this.prepBuildingDropdownLabel(si) })),
                ]}
                onChange={(_, o) => {
                  if (!o) { return; }
                  if (o.key === 'all') {
                    this.setState({ deliverReferenceSlotIndex: -1 }, () => this.persistLoadFcDraft());
                    return;
                  }
                  const si = parseInt(String(o.key), 10);
                  if (Number.isNaN(si) || si < 0 || si >= prepBuildSlots.length) { return; }
                  this.setState({ deliverReferenceSlotIndex: si }, () => this.persistLoadFcDraft());
                }}
                styles={{ dropdown: { minWidth: 260, maxWidth: 420 } }}
              />
            </Stack>
            <span style={{ fontSize: 12, color: appTheme.palette.neutralSecondary }}>
              Chooses what <b>MAX REQ</b> fills per line. You can type any amounts within your cargo limits; Load FC uses your entered totals.
            </span>
          </Stack>
        ) : undefined}
        cargo={nextDelivery}
        readyNames={Array.from(this.state.editReady)}
        maxCounts={maxCountsForDeliver}
        useMaxCountsAsRowCap={false}
        resetButtonLabelMode='maxReq'
        maxReqCap={maxReqCap}
        maxTotalCargo={maxTotalCargo}
        validNames={validCargoKeys}
        sort={sort}
        addButtonBelow={true}
        showTotalsRow
        onChange={cargo => this.setState({ nextDelivery: cargo }, () => this.persistLoadFcDraft())}
      />

      {showBubble && <TeachingBubble
        target={'#current-cmdr'}
        headline='Who are you?'
        hasCloseButton={true}
        onDismiss={() => { this.setState({ showBubble: false }) }}
      >
        Enter your cmdr's name to get credit for this delivery.
      </TeachingBubble>}
      </div>

      <div style={{
        minWidth: 360,
        maxWidth: 520,
        border: `1px solid ${appTheme.palette.themePrimary}`,
        padding: 10,
      }}>
        <h3 className={cn.h3} style={{ margin: '0 0 8px 0' }}>Load History</h3>
        {this.state.prepLoadHistory.length === 0 && <div style={{ color: appTheme.palette.neutralTertiary, fontSize: 12 }}>
          No loads recorded yet.
        </div>}
        {this.state.prepLoadHistory.slice().reverse().map(entry => (
          <div key={entry.id} style={{ marginBottom: 8, borderBottom: `1px solid ${appTheme.palette.neutralTertiaryAlt}`, paddingBottom: 6 }}>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 6 }}>
              <details style={{ flex: 1 }}>
                <summary style={{ cursor: 'pointer' }}>
                  {`${entry.commander} loaded ${entry.total.toLocaleString()} commodities into ${entry.marketLabel}`}
                </summary>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {Object.entries(entry.items)
                    .filter(([, n]) => (n ?? 0) > 0)
                    .map(([k, n]) => <li key={`${entry.id}-${k}`}>{`${mapCommodityNames[k] ?? k}: ${(n ?? 0).toLocaleString()}`}</li>)}
                </ul>
              </details>
              <Icon
                className='icon-btn'
                iconName='Delete'
                tabIndex={0}
                role='button'
                title='Delete this load history line and undo its local FC cargo changes'
                style={{ color: appTheme.palette.themePrimary, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => this.removePrepLoadHistory(entry.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    this.removePrepLoadHistory(entry.id);
                  }
                }}
              />
            </Stack>
          </div>
        ))}
      </div>

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
    if (this.deliverInFlight) {
      return;
    }
    this.deliverInFlight = true;
    try {
      // add a little artificial delay so the spinner doesn't flicker in and out
      this.setState({ submitting: true });
      await delay(500);

      const nextState: Partial<ProjectViewState> = {
        submitting: false,
        mode: Mode.view,
        deliverMarketId: deliverMarketId,
        deliverReferenceSlotIndex: 0,
        nextDelivery: {},
        loadFcReuseLastClosedDraft: false,
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
        const loadedItems: Cargo = Object.keys(nextDelivery).reduce((m, k) => {
          const n = Math.max(0, Math.floor(nextDelivery[k] ?? 0));
          if (n > 0) { m[k] = n; }
          return m;
        }, {} as Cargo);
        const loadedTotal = Object.values(loadedItems).reduce((s, v) => s + v, 0);
        const cap = this.getCmdrCargoCapForLoad();
        if (loadedTotal > cap) {
          this.setState({
            submitting: false,
            errorMsg: `Load exceeds selected ship capacity (${cap.toLocaleString()}). Reduce Total before loading.`,
          });
          return;
        }

        const prevFcCargo = { ...(this.state.fcCargo[deliverMarketId] ?? {}) };
        // Server expects the legacy full-draft body (same keys/shape as pre-refactor client), not a positive-only map.
        const patchResult = await api.fc.deliverToFC(deliverMarketId, nextDelivery);

        let fcCargoUpdate: Record<string, Cargo>;
        let refreshedFromServer = false;
        await delay(200);
        try {
          fcCargoUpdate = await api.project.getCargoFC(buildId);
          refreshedFromServer = true;
        } catch {
          fcCargoUpdate = { ...this.state.fcCargo };
          const merged = { ...(fcCargoUpdate[deliverMarketId] ?? {}) };
          for (const k in patchResult) {
            merged[k] = patchResult[k] ?? 0;
          }
          fcCargoUpdate[deliverMarketId] = merged;
        }
        nextState.fcCargo = fcCargoUpdate;
        const fcCargo = { ...(fcCargoUpdate[deliverMarketId] ?? {}) };
        const deltaKeys = new Set<string>([...Object.keys(prevFcCargo), ...Object.keys(fcCargo)]);
        const appliedDelta: Cargo = {};
        for (const k of deltaKeys) {
          const d = (fcCargo[k] ?? 0) - (prevFcCargo[k] ?? 0);
          if (d !== 0) { appliedDelta[k] = d; }
        }
        const partialMisses = Object.keys(loadedItems).reduce((acc, k) => {
          const requested = loadedItems[k] ?? 0;
          const applied = Math.max(0, appliedDelta[k] ?? 0);
          if (applied < requested) {
            acc.push(`${mapCommodityNames[k] ?? k} (added ${applied.toLocaleString()} of ${requested.toLocaleString()})`);
          }
          return acc;
        }, [] as string[]);

        writeLoadFcDiag({
          at: Date.now(),
          buildId,
          marketId: deliverMarketId,
          commander: store.cmdrName,
          loadedItems,
          submittedToApi: { ...nextDelivery },
          patchResult,
          prevFcCargo,
          afterFcCargo: fcCargo,
          appliedDelta,
          partialLines: partialMisses,
          refreshedFromServer,
        });

        if (partialMisses.length > 0) {
          nextState.loadFcNotice = `Load FC: the server only applied part of this haul. ${partialMisses.slice(0, 8).join('; ')}${partialMisses.length > 8 ? '; …' : ''}`;
          nextState.loadFcPartialDialog = {
            title: 'Load FC — incomplete',
            body:
              `${partialMisses.join('\n')}\n\n`
              + `Full technical snapshot (JSON) is in your browser under localStorage key:\n`
              + `loadFcLastDiag\n\n`
              + `Open DevTools → Application → Local Storage, or Console → localStorage.getItem('loadFcLastDiag').`,
          };
          console.warn('Load FC partial apply', { requested: loadedItems, prevFcCargo, after: fcCargo, appliedDelta, refreshedFromServer });
        }

        if (loadedTotal > 0) {
          this.appendPrepLoadHistory(buildId, {
            id: crypto.randomUUID(),
            at: Date.now(),
            commander: store.cmdrName || 'Unknown',
            marketId: deliverMarketId,
            marketLabel: this.getFullFCName(deliverMarketId),
            total: loadedTotal,
            items: loadedItems,
            deltas: appliedDelta,
          });
        }
      }

      clearLoadFcDraft(buildId);
      this.setState(nextState as ProjectViewState);
      store.deliver = nextDelivery;
      store.deliverDestination = deliverMarketId;
    } catch (err: any) {
      // Must clear submitting: otherwise the Cancel row stays hidden and only the spinner shows (no way out).
      this.setState({ errorMsg: err.message, submitting: false });
    } finally {
      this.deliverInFlight = false;
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
      this.fetchProject(this.state.proj?.buildId, true);
    }
  };

  renderSystemEffects(proj: Project) {
    const { sysMap } = this.state;
    const site = sysMap?.siteMaps.find(s => s.buildId === proj.buildId);

    return <div className='half'>
      {site && sysMap && <>
        {site.status === 'complete' && <EconomyTable2 site={site} sysView={undefined!} />}
        <MarketLinks site={site} />
      </>}

      <BuildEffects buildType={proj.buildType} siteMap={site} />
    </div>;
  }

  renderShipsCallout() {
    const { ships, showShipsTargetId, showShipsTargetCargo } = this.state;
    if (!ships) return null;
    const bw = 50;

    const rows = [];
    for (const s of ships) {
      const matchingCargo = Object.keys(s.cargo)
        .filter(c => !showShipsTargetCargo || showShipsTargetCargo === c)
        .sort();
      const sum = matchingCargo.reduce((t, c) => t + s.cargo[c], 0);
      if (sum === 0) { continue; }
      const sumAll = Object.values(s.cargo).reduce((t, c) => t + c, 0);

      const w = 100.0 / s.maxCargo * sumAll;
      // elements for the cmdr
      rows.push(
        <div key={`ship-${s.cmdr}-1`} style={{ marginBottom: 2 }}>{s.cmdr}</div>,
        <div key={`ship-${s.cmdr}-2`} style={{ marginBottom: 2, color: appTheme.palette.themePrimary }}>{mapShipNames[s.type] ?? s.type}</div>,
        <div key={`ship-${s.cmdr}-3`} style={{ marginBottom: 2, gridColumn: 'span 2', fontSize: 10, position: 'relative', minWidth: bw, height: 19 }}>
          <div style={{ textAlign: 'center' }}>{sum} of {s.maxCargo.toLocaleString()}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${w}%`, height: 4, backgroundColor: appTheme.palette.themePrimary }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: `${w}%`, width: `${100 - w}%`, height: 4, backgroundColor: appTheme.palette.neutralQuaternaryAlt }}></div>
          {!!showShipsTargetCargo && <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${100.0 / s.maxCargo * sum}%`, height: 4, backgroundColor: appTheme.palette.orangeLight }}></div>}
        </div>,
        <div key={`ship-${s.cmdr}-cargo-${s.cmdr}-4`} style={{ gridRow: `span ${matchingCargo.length}`, fontSize: 10, color: appTheme.palette.themePrimary }}>{getRelativeDuration(new Date(s.time))}</div>,
      );

      // elements for the cargo
      let flip = true;
      const fontSize = 11;
      for (const key of matchingCargo) {
        flip = !flip;
        const backgroundColor = flip ? appTheme.palette.neutralQuaternaryAlt : undefined
        rows.push(
          <div key={`ship-${s.cmdr}-cargo-${key}-5`} style={{ backgroundColor, gridColumn: 'span 1', textAlign: 'right', fontSize, paddingLeft: 10, marginRight: -10 }}>{mapCommodityNames[key] ?? key}</div>,
          <div key={`ship-${s.cmdr}-cargo-${key}-6`} style={{ backgroundColor, gridColumn: 'span 1', textAlign: 'right', fontSize, marginRight: 0, paddingRight: 10 }}>{s.cargo[key].toLocaleString()}</div>,
          <div key={`ship-${s.cmdr}-cargo-${key}-7`} />
        );
      }
      rows.push(<div key={`ship-${s.cmdr}-cargo-${s.cmdr}-8`} style={{ gridColumn: 'span 4', height: 1, margin: '4px 0', backgroundColor: appTheme.palette.themeTertiary }} />);
    }

    return <>
      <Callout
        target={`#${showShipsTargetId}`}
        setInitialFocus
        alignTargetEdge
        directionalHint={DirectionalHint.rightTopEdge}
        styles={{
          beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
          calloutMain: {
            backgroundColor: appTheme.palette.neutralTertiaryAlt,
            color: appTheme.palette.neutralDark,
            cursor: 'default',
          }
        }}
        onDismiss={() => this.setState({ showShipsTargetCargo: undefined, showShipsTargetId: undefined })}
      >
        <div style={{ marginBottom: 10, color: appTheme.palette.themePrimary }}>Commanders:</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto auto auto',
          gap: '2px 10px',
          fontSize: '14px',
          marginLeft: 10,
          marginBottom: 10,
          alignItems: 'left',
        }}>
          {rows.slice(0, -1)}
        </div>
      </Callout>
    </>
  }
}

const usePrimaryCosts = [
  'plutus',
  'vulcan',
  'dysnomia',
  'vesta',
  'prometheus',
  'nemesis',
  'no_truss',
  'dual_truss',
  'quad_truss',
  'asteroid',
  'ocellus',
  'apollo',
  'artemis',
  'dodec',
  'quint_truss',
  'dec_truss',
];

