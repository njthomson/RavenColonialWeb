import './SystemView2.css';
import * as api from '../../api';
import spansh16 from '../../assets/spansh-16x16.png';
import inara16 from '../../assets/inara-16x16.png';
import canonn16 from '../../assets/canonn-16x16.png';
import { ActionButton, CommandBar, ContextualMenuItemType, DefaultButton, Dialog, DialogFooter, DirectionalHint, Icon, IconButton, IContextualMenuItem, Link, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { Component, createRef, FunctionComponent, useState } from "react";
import { CopyButton } from '../../components/CopyButton';
import { appTheme, cn } from '../../theme';
import { buildSystemModel2, getSnapshot, hasPreReq2, SiteMap2, SysMap2, unknown } from '../../system-model2';
import { TierPoint } from '../../components/TierPoints';
import { SystemStats } from './SystemStats';
import { BothTierPoints, BuildOrder } from './BuildOrder';
import { ViewSite } from './ViewSite';
import { SitesTableView } from './SitesTableView';
import { Bod, BT, NamedSave, Pop, Site, SiteGraphType, Sys } from '../../types2';
import { GetRealEconomies, SitesPut } from '../../api/v2-system';
import { SitesBodyView } from './SitesBodyView';
import { store } from '../../local-storage';
import { SystemCard } from './SystemCard';
import { FindSystemName, ProjectCreate } from '../../components';
import { createRandomPhoneticName, delayFocus, getRelativeDuration, isMatchingCmdr, isMobile } from '../../util';
import { ShowMySystems } from './ShowMySystems';
import { ShowCoachingMarks, ShowManyCoachingMarks } from '../../components/ShowCoachingMarks';
import { BodyFeature, Project } from '../../types';
import { AuditTestWholeSystem } from './AuditTestWholeSystem';
import { ArchitectSummary } from './ArchitectSummary';
import { getSiteType, mapName } from '../../site-data';
import { BodyPill, SitePill } from './SitePill';
import { apiSvcUrl } from '../../api/api-util';
import { App } from '../../App';

interface SystemView2Props {
  systemName: string;
}

interface SystemView2State {
  systemName: string;
  hideLoginPrompt?: boolean;
  errorMsg?: string;
  processingMsg?: string;
  useIncomplete: boolean;
  sysOriginal: Sys;
  sysMap: SysMap2;
  showBuildOrder?: boolean;
  pinnedSite?: Site;
  pinnedSnapshot?: string;
  sysStatsSnapshot?: string;
  selectedSite?: Site;
  dirtySites: Record<string, Site>;
  deletedIDs: string[];
  viewType: string;
  orderIDs: string[];
  originalSiteIDs: string[];
  bodySlots: Record<number, number[]>;
  originalBodySlots: string;
  showEditSys?: boolean;
  showConfirmAction?: () => void;
  showConfirmMessage?: string;
  activeProjects: Record<string, Project | null>
  realEconomies?: GetRealEconomies[];
  auditWholeSystem?: boolean;
  showCreateBuildProject?: boolean;
  siteGraphType: SiteGraphType;
  fssNeeded?: boolean;
  canEditAsArchitect: boolean;
  buffNerf: boolean;
  showEditNotes?: boolean;
  showSaveAs?: boolean;
}

const viewTypes = [
  'body',
  'table',
];

const anonymous = !store.cmdrName;

export class SystemView2 extends Component<SystemView2Props, SystemView2State> {
  public static nextID64 = 0;
  static countNew = 0;
  static lastBuildType?: string;
  static lastBodyNum?: number;
  private snapshotRef = createRef<HTMLDivElement>();
  private sysStatsRef = createRef<HTMLDivElement>();
  private sitesBodyViewRef = createRef<SitesBodyView>();

  constructor(props: SystemView2Props) {
    super(props);

    this.state = {
      systemName: props.systemName,
      ...this.getResetState(),
      processingMsg: 'Loading ...',
      useIncomplete: store.useIncomplete,
      viewType: store.sysViewView,
      buffNerf: store.applyBuffNerf,
    };
  }

  componentDidMount(): void {
    if (!!this.props.systemName) {
      // reload a new system
      window.document.title = 'Sys: ' + this.props.systemName;
      const promise = this.loadData(this.props.systemName);
      if (store.autoCheckSpanshEconomies) {
        promise.then(() => {
          this.doGetRealEconomies();
          this.setState({ auditWholeSystem: true });
        });
      }
    } else {
      this.doSystemSearch();
    }
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  componentWillUnmount(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.isDirty()) {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
      return '';
    }
  };

  componentDidUpdate(prevProps: Readonly<SystemView2Props>, prevState: Readonly<SystemView2State>, snapshot?: any): void {
    if (prevProps.systemName !== this.props.systemName) {
      if (!!this.props.systemName) {
        // use the nextID64? Clear it regardless
        const nameOrNum = !!SystemView2.nextID64
          ? SystemView2.nextID64.toString()
          : this.props.systemName
        SystemView2.nextID64 = 0;
        // reload a new system
        window.document.title = 'Sys: ' + this.props.systemName;
        this.loadData(nameOrNum, true, undefined, this.props.systemName);
      } else {
        this.doSystemSearch();
      }
    }
  }

  getResetState() {
    return {
      errorMsg: '',
      processingMsg: undefined,
      // skip: useIncomplete
      sysOriginal: undefined!,
      sysMap: undefined!,
      showBuildOrder: false,
      pinnedSite: undefined,
      pinnedSnapshot: undefined,
      sysStatsSnapshot: undefined,
      selectedSite: undefined,
      dirtySites: {},
      deletedIDs: [],
      // skip: viewType,
      orderIDs: [],
      originalSiteIDs: [],
      bodySlots: {},
      originalBodySlots: '{}',
      showEditSys: false,
      showConfirmAction: undefined,
      activeProjects: {},
      realEconomies: undefined,
      auditWholeSystem: false,
      showCreateBuildProject: false,
      siteGraphType: store.siteGraphType,
      canEditAsArchitect: false,
      showEditNotes: false,
      showSaveAs: false,
    } as Omit<SystemView2State, 'useIncomplete' | 'viewType' | 'systemName' | 'buffNerf'>;
  }

  doSystemSearch() {
    // reset/clear everything, ready to search for a new system
    window.document.title = 'Sys: ?';
    this.setState({
      ...this.getResetState()
    });
    delayFocus('find-system-input');
  }

  doLoad = (revOrSaveName?: string) => {
    if (this.isDirty()) {
      this.setState({ showConfirmAction: () => this.loadData(this.props.systemName, false, revOrSaveName) });
    } else {
      this.loadData(this.props.systemName, false, revOrSaveName);
    }
  };

  loadData = (nameOrNum: string, reset?: boolean, revOrSaveName?: string, sysName?: string) => {
    this.setState({
      ...(reset ? this.getResetState() : {} as any),
      systemName: sysName || nameOrNum,
      processingMsg: 'Loading ...',
      showConfirmAction: undefined,
      errorMsg: '',
      showEditNotes: false,
    });

    return api.systemV2.getSys(nameOrNum, true, revOrSaveName)
      .then(newSys => {

        if (newSys.v < api.systemV2.currentSchemaVersion && !newSys.saveName) {
          console.warn(`System schema: ${newSys.v} ... re-import is needed`);
          return this.doImport('bodies');
        }

        return this.useLoadedData(newSys, true);
      })
      .catch(err => {
        if (err.statusCode === 404 && !revOrSaveName && !apiSvcUrl.includes('localhost')) {
          console.error(`No data for: ${this.props.systemName} ... trying import ...`);
          this.doImport();
        } else if (err.statusCode === 404) {
          console.error(err.stack);
          this.setState({ errorMsg: 'Please try again', processingMsg: undefined });
        } else {
          console.error(err.stack);
          this.setState({ errorMsg: err?.message ?? 'Something failed', processingMsg: undefined });
        }
      });
  };

  useLoadedData = (newSys: Sys, updateSnapshot: boolean) => {
    if (newSys.idxCalcLimit === undefined) {
      // default to ALL sites if no value is set
      newSys.idxCalcLimit = newSys.sites.length;
    }
    const newSysMap = buildSystemModel2(newSys, this.state.useIncomplete, this.state.buffNerf);
    const orderIDs = newSysMap.sites.map(s => s.id);

    const dirties: Record<string, Site> = {};
    if (newSys.updateIDs) {
      for (const id of newSys.updateIDs) {
        const ds = newSys.sites.find(s => s.id === id)
        if (ds) dirties[ds.id] = ds;
      }
    }

    const isArchitect = !!newSys.architect && isMatchingCmdr(newSys.architect, store.cmdrName);
    const canEditAsArchitect = newSys.open || !newSys.architect || isArchitect; // || !!newSys.editors?.includes(store.cmdrName);

    this.setState({
      systemName: newSys.name,
      processingMsg: undefined,
      sysOriginal: newSys,
      sysMap: newSysMap,
      dirtySites: dirties,
      deletedIDs: [...newSys.deleteIDs ?? []],
      orderIDs: orderIDs,
      originalSiteIDs: [...orderIDs],
      bodySlots: newSys.slots,
      originalBodySlots: JSON.stringify(newSys.slots),
      canEditAsArchitect: canEditAsArchitect,
      showEditNotes: false,
    });
    window.document.title = 'Sys: ' + newSys.name;

    // Should we create or update the snapshot for this system?
    if (!newSys.architect || !updateSnapshot) { return; }

    let genSnapshot = false;
    let newSnapshot = getSnapshot(newSys, undefined);
    return api.systemV2.getSnapshot(newSys.id64, newSys.architect)
      .then(currentSnapshot => {
        genSnapshot = currentSnapshot.stale || newSnapshot.score !== currentSnapshot.score;
        newSnapshot.fav = currentSnapshot.fav;
        // if system effects have changed, save a new snapshot
        if (JSON.stringify(currentSnapshot.sumEffects) !== JSON.stringify(newSnapshot.sumEffects)) {
          genSnapshot = true;
        }
      })
      .catch(err => {
        if (err.statusCode === 404) {
          genSnapshot = true;
        } else {
          console.error(err.stack);
          this.setState({ errorMsg: err?.message ?? 'Something failed checking the system snapshot', processingMsg: undefined });
        }
      })
      .finally(() => {
        if (genSnapshot && !!store.apiKey) {
          // clear this cache any time we add a snapshot
          api.systemV2.cache.snapshots = {};
          // save a new snapshot
          return api.systemV2.saveSnapshot(newSys.id64, newSnapshot);
        }
      });
  }

  doDeleteNamedSave = (saveName: string) => {
    this.setState({
      processingMsg: 'Deleting ...',
      showConfirmAction: undefined,
      errorMsg: '',
    });

    // delete this named save
    return api.systemV2.deleteNamedSave(this.state.systemName, saveName)
      .then(() => {
        const { sysMap } = this.state;
        if (sysMap.saveName === saveName) {
          // reload current if we just deleted what we're looking at
          this.doLoad();
        } else {
          // otherwise just remove from the list
          sysMap.savedNames = sysMap.savedNames?.filter(s => s.name !== saveName);
          this.setState({
            processingMsg: undefined,
            sysMap: sysMap,
          });
        }
      })
      .catch(err => {
        if (err.statusCode === 404) {
          console.error(`No data for: ${this.props.systemName} / ${saveName}...`);
        } else {
          console.error(err.stack);
          this.setState({ errorMsg: err?.message ?? 'Something failed', processingMsg: undefined });
        }
      });
  };

  doGetRealEconomies = () => {
    api.systemV2.getRealEconomies(this.state.sysMap.id64.toString())
      .then(realEconomies => {
        this.setState({ realEconomies });
      });
  };

  doImport = (type?: string) => {
    if (!store.cmdrName && this.state.sysOriginal !== undefined) {
      console.warn('You need to sign in in for this');
      this.setState({ errorMsg: 'You need to sign in in for this', processingMsg: undefined });
      return;
    }

    this.setState({ processingMsg: 'Importing ...', errorMsg: '', fssNeeded: false });

    api.systemV2.import(this.props.systemName, type)
      .then(newSys => {
        return this.useLoadedData(newSys, true);
      })
      .catch(err => {
        console.error(err.stack);
        this.setState({ errorMsg: err?.message ?? 'Something failed importing the system', processingMsg: undefined });
      });
  };

  confirmDoSaveData = () => {
    this.doSaveData();
  }

  doSaveData = (saveName?: string) => {

    if (!store.cmdrName) {
      console.warn('You need to sign in in for this');
      window.alert('You need to sign-in to Raven Colonial to save data.');
      document.getElementById('current-cmdr')?.click();
      return;
    }

    if (!this.state.canEditAsArchitect && !saveName) {
      console.warn('Edit permission is denied');
      return;
    }

    // warn before lockout
    const aboutToLock = !this.state.sysMap.open && !!this.state.sysMap?.architect && !isMatchingCmdr(this.state.sysMap?.architect, store.cmdrName);
    if (aboutToLock && !saveName) {
      if (this.state.showConfirmAction !== this.confirmDoSaveData) {
        this.setState({
          showConfirmMessage: 'You are about to lose permission to save future changes.',
          showConfirmAction: this.confirmDoSaveData,
        });
        return;
      } else {
        this.setState({
          showConfirmMessage: undefined,
          showConfirmAction: undefined,
        });
      }
    }

    this.setState({ processingMsg: 'Saving ...', errorMsg: '', showEditNotes: false });

    const payload: SitesPut = {
      update: Object.values(this.state.dirtySites),
      delete: this.state.deletedIDs,
      orderIDs: this.state.orderIDs,
      idxCalcLimit: this.state.sysMap.idxCalcLimit,
      snapshot: this.state.sysMap.architect ? getSnapshot(this.state.sysMap, undefined) : undefined,
      slots: this.state.bodySlots,
      notes: this.state.sysMap.notes,
      saveName: saveName,
    };

    if (this.state.sysOriginal.architect !== this.state.sysMap.architect) {
      payload.architect = this.state.sysMap.architect;
    }
    if (this.state.sysOriginal.reserveLevel !== this.state.sysMap.reserveLevel) {
      payload.reserveLevel = this.state.sysMap.reserveLevel;
    }
    if (this.state.sysOriginal.open !== this.state.sysMap.open) {
      payload.open = this.state.sysMap.open;
    }
    if (this.state.sysOriginal.nickname !== this.state.sysMap.nickname) {
      payload.nickname = this.state.sysMap.nickname;
    }
    if (this.state.sysOriginal.notes !== this.state.sysMap.notes) {
      payload.notes = this.state.sysMap.notes;
    }
    // if (JSON.stringify(this.state.sysOriginal.editors) !== JSON.stringify(this.state.sysMap.editors)) {
    //   payload.editors = this.state.sysMap.editors;
    // }

    api.systemV2.saveSites(
      this.state.sysMap.id64.toString(), payload)
      .then(newSys => {
        // clear this cache any time we save a system
        api.systemV2.cache.snapshots = {};

        return this.useLoadedData(newSys, false);
      })
      .catch(err => {
        console.error(`saveData failed:`, err.stack);
        if (err.statusCode === 401) {
          this.setState({ errorMsg: 'Edit permission is denied.', processingMsg: undefined });
        } else {
          this.setState({ errorMsg: err.message, processingMsg: undefined });
        }
      });
  };

  updatePop = (newPop: Pop) => {
    const { sysMap } = this.state;
    sysMap.pop = newPop;
    this.setState({ sysMap });
  };

  updateOpen = (newOpen: boolean) => {
    const { sysMap } = this.state;
    sysMap.open = newOpen;
    this.setState({ sysMap });
  };

  recalc = () => {
    // console.log(this.state.sysMap);
    const sysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete, this.state.buffNerf);
    this.setState({
      sysMap: sysMap,
    });
  };

  toggleUseIncomplete = () => {
    const newValue = !this.state.useIncomplete;
    const sysMap = buildSystemModel2(this.state.sysMap, newValue, this.state.buffNerf);
    this.setState({
      sysMap: sysMap,
      useIncomplete: newValue,
    });
    store.useIncomplete = newValue;
  };

  doOnScrollEnd(action: () => void) {

    const tim = setTimeout(() => {
      // scrolling is not happening - kill the event handlers and do the thing
      document.removeEventListener("scrollend", funcEnd);
      document.removeEventListener("scroll", funcScroll);
      action();
    }, 150);

    const funcEnd = () => {
      // we scrolled some, now we stopped scrolling
      document.removeEventListener("scroll", funcScroll);
      document.removeEventListener("scrollend", funcEnd);
      action();
    };

    const funcScroll = () => {
      // we scrolled some - no need for timeout
      clearTimeout(tim);
      document.removeEventListener("scroll", funcScroll);
    };

    document.addEventListener("scroll", funcScroll);
    document.addEventListener("scrollend", funcEnd);
  }

  createNewSite = (bodyNum?: number) => {
    const newSite = {
      id: `x${Date.now()}`,
      status: 'plan',
      bodyNum: bodyNum ?? -1, // SystemView2.lastBodyNum
      name: createRandomPhoneticName(),
      buildType: '', // SystemView2.lastBuildType ?? '',
    } as Site;

    const { sysMap, dirtySites } = this.state;

    // make sure we don't reuse a name
    while (sysMap.sites.some(s => s.name === newSite.name)) {
      newSite.name = createRandomPhoneticName();
    }

    sysMap.sites.push(newSite);
    dirtySites[newSite.id] = newSite;

    const newOrderIDs = [...this.state.orderIDs];
    if (sysMap.idxCalcLimit === sysMap.sites.length || sysMap.idxCalcLimit === null || sysMap.idxCalcLimit === undefined) {
      newOrderIDs.push(newSite.id);
    } else {
      newOrderIDs.splice(sysMap.idxCalcLimit, 0, newSite.id);
    }
    if (sysMap.idxCalcLimit !== null && sysMap.idxCalcLimit !== undefined) {
      sysMap.idxCalcLimit++;
    }

    const newSysMap = buildSystemModel2(sysMap, this.state.useIncomplete, this.state.buffNerf);
    this.setState({
      dirtySites,
      sysMap: newSysMap,
      orderIDs: newOrderIDs,
    });

    const id = `id-sbv-${newSite.id}-div`;
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        // when scrolling ends - do this
        this.doOnScrollEnd(() => {
          element.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        });

        // start scrolling
        element.parentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

    }, 100);
  };

  siteChanged = (site: Site) => {
    // console.log(`siteChanged: ${site.name} (${site.buildType} on body #${site.bodyNum} / ${site.id})`);
    SystemView2.lastBodyNum = site.bodyNum;
    SystemView2.lastBuildType = site.buildType;

    // track which sites have changed
    const { dirtySites } = this.state;
    dirtySites[site.id] = site;

    // unless it changed back to original?
    const originalSite = this.state.sysOriginal.sites.find(s => s.id === site.id);
    if (originalSite) {
      const json1 = JSON.stringify(originalSite);
      const json2 = JSON.stringify(site);
      // mark as no longer dirty
      if (json1 === json2) {
        delete dirtySites[site.id];
      }
    }

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete, this.state.buffNerf);
    this.setState({
      dirtySites,
      sysMap: newSysMap,
    });
  };

  siteDeleted = (targetId: string) => {

    const idx = this.state.sysMap.sites.findIndex(s => s.id === targetId);
    if (idx < 0) {
      console.error(`Why not found? ID: ${targetId}`);
      return;
    }

    const { sysMap, deletedIDs } = this.state;

    sysMap.sites.splice(idx, 1);
    if (this.state.originalSiteIDs.includes(targetId)) {
      deletedIDs.push(targetId);
    }

    if (targetId in this.state.dirtySites) {
      delete this.state.dirtySites[targetId];
    }

    const orderIdx = this.state.orderIDs.indexOf(targetId);
    if (sysMap.idxCalcLimit != null && orderIdx < sysMap.idxCalcLimit) {
      sysMap.idxCalcLimit--;
    }

    const newSysMap = buildSystemModel2(sysMap, this.state.useIncomplete, this.state.buffNerf);
    this.setState({
      deletedIDs,
      sysMap: newSysMap,
      dirtySites: this.state.dirtySites,
      pinnedSite: this.state.pinnedSite?.id === targetId ? undefined : this.state.pinnedSite,
      selectedSite: this.state.selectedSite?.id === targetId ? undefined : this.state.selectedSite,
      orderIDs: this.state.orderIDs.filter(id => id !== targetId),
    });
  };

  sitePinned = (id?: string) => {
    if (!id || this.state.pinnedSite?.id === id) {
      this.setState({ pinnedSite: undefined });
    } else {
      const pinnedSite = this.state.sysMap.sites.find(s => s.id === id);
      this.setState({ pinnedSite });
    }
  };

  siteBuilding = (siteId: string, newProject: Project) => {
    // console.log(`siteChanged: ${site.name} (${site.buildType} on body #${site.bodyNum} / ${site.id})`);
    const { sysMap, sysOriginal } = this.state;

    const site = sysMap.sites.find(s => s.id === siteId);
    if (!site) { return; }

    // TODO: handle the order changing?

    site.status = 'build';
    site.name = newProject.buildName;
    site.buildId = newProject.buildId;
    if (newProject.marketId > 4_200_000_000) {
      site.marketId = newProject.marketId;
    }

    const originalSite = this.state.sysOriginal.sites.find(s => s.id === siteId);
    if (originalSite) {
      originalSite.status = 'build';
      originalSite.name = newProject.buildName;
      originalSite.buildId = newProject.buildId;
      if (newProject.marketId > 4_200_000_000) {
        originalSite.marketId = newProject.marketId;
      }
    }

    const newSysMap = buildSystemModel2(sysMap, this.state.useIncomplete, this.state.buffNerf);
    this.setState({
      sysMap: newSysMap,
      sysOriginal: sysOriginal,
    });
  };

  siteSelected = (selectedSite?: Site) => {
    this.setState({ selectedSite });
  };

  isDirty() {
    const { sysMap, dirtySites, deletedIDs, sysOriginal, orderIDs, bodySlots, originalBodySlots } = this.state;

    // we cannot be dirty if either of these are missing
    if (!sysMap || !sysOriginal) return false;

    const dirty = Object.keys(dirtySites).length !== sysOriginal.updateIDs?.length
      || deletedIDs.length !== sysOriginal.deleteIDs?.length
      || orderIDs.length !== sysOriginal.sites?.length
      || sysMap.architect !== sysOriginal.architect
      || sysMap.nickname !== sysOriginal.nickname
      || sysMap.notes !== sysOriginal.notes
      || sysMap.open !== sysOriginal.open
      || sysMap.reserveLevel !== sysOriginal.reserveLevel
      || sysMap.idxCalcLimit !== sysOriginal.idxCalcLimit
      // consider any other revision to be dirty (if not named)
      || (!sysMap.saveName && sysMap.rev !== sysMap.revs.reduce((m, r) => Math.max(r.rev, m), 0))
      || JSON.stringify(bodySlots) !== originalBodySlots
      || JSON.stringify(orderIDs) !== JSON.stringify(sysOriginal.sites.map(s => s.id))
      || JSON.stringify(Object.values(dirtySites)) !== JSON.stringify(sysOriginal.updateIDs.map(id => sysOriginal.sites.find(s => s.id === id)))
      // || JSON.stringify(sysMap.editors) !== JSON.stringify(sysOriginal.editors)
      ;

    App.preNav = dirty
      ? (url) => {
        this.setState({ showConfirmAction: () => window.location.assign(url) });
        return true;
      }
      : undefined;
    return dirty;
  };

  doToggleBuffNerf = () => {
    const newBuffNerf = !this.state.buffNerf;

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete, newBuffNerf);
    this.setState({
      sysMap: newSysMap,
      buffNerf: newBuffNerf,
    });
  }

  setBodySlot(num: number, newCount: number, isOrbital: boolean) {
    const bodySlots = this.state.bodySlots;

    if (!bodySlots[num]) { bodySlots[num] = [-1, -1]; }
    const body = bodySlots[num];

    if (isOrbital) {
      body[0] = newCount;
    } else {
      body[1] = newCount;
    }

    // remove entry if both are unknown
    if (body[0] === -1 && body[1] === -1) {
      delete bodySlots[num];
    }

    this.setState({ bodySlots });
  }

  render() {
    if (!this.props.systemName) {
      return this.renderFindSystem();
    }

    const { errorMsg, sysMap, processingMsg, showBuildOrder, showCreateBuildProject } = this.state;

    return <div className='sys' style={{ position: 'relative' }}>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      {this.renderTitleAndCommands()}

      {!sysMap && processingMsg?.includes('Loading') && <Spinner size={SpinnerSize.large} label={processingMsg} style={{ marginTop: 20 }} />}

      {sysMap && this.renderSys()}

      {showBuildOrder && <>
        <BuildOrder
          sysMap={sysMap}
          orderIDs={this.state.orderIDs}
          onClose={(orderIDs, idxCalcLimit) => {
            if (orderIDs) {
              sysMap.primaryPortId = orderIDs[0];
              sysMap.sites = orderIDs.map(id => sysMap.sites.find(s => s.id === id)!);
              sysMap.idxCalcLimit = idxCalcLimit;
              const newSysMap = buildSystemModel2(sysMap, this.state.useIncomplete, this.state.buffNerf);
              this.setState({ sysMap: newSysMap, orderIDs, showBuildOrder: false });
            } else {
              this.setState({ showBuildOrder: false });
            }
          }}
        />
      </>}

      {!anonymous && this.renderCoachmarks()}
      {anonymous && this.renderLoginPrompt()}
      {showCreateBuildProject && this.renderCreateBuildProject()}
    </div>;
  }

  renderLoginPrompt() {
    if (this.state.hideLoginPrompt) { return null; }

    return <>
      <TeachingBubble
        target={'#current-cmdr'}
        headline='Greetings'
        isWide
        calloutProps={{
          preventDismissOnResize: true,
          directionalHint: DirectionalHint.bottomLeftEdge,
        }}
        onDismiss={() => this.setState({ hideLoginPrompt: true })}
        primaryButtonProps={{
          text: 'Okay',
          onClick: () => {
            document.getElementById('current-cmdr')?.click();
            this.setState({ hideLoginPrompt: true });
          }
        }}
        secondaryButtonProps={{
          text: 'Maybe later',
          onClick: () => this.setState({ hideLoginPrompt: true }),
        }}
      >
        You must login through Frontier to save and fully use this tool.
      </TeachingBubble >
    </>;
  }

  renderFindSystem() {
    return <div className='sys'>
      <div style={{ marginLeft: 24 }}>
        <h2 style={{ margin: 10, color: appTheme.palette.accent }}>Search for a system:</h2>
        <br />
        <FindSystemName
          noLabel
          text=''
          onMatch={(text) => {
            if (!!text?.trim()) {
              window.location.assign(`/#sys=${encodeURIComponent(text.trim())}`);
            }
          }}
        />
        {!anonymous && <>
          <ArchitectSummary sysView={this} />
          <ShowMySystems />
        </>}
        {!store.cmdrName && this.renderLoginPrompt()}
      </div>
    </div>;
  }

  renderTitleAndCommands() {
    const { systemName, processingMsg, sysMap, useIncomplete, showEditSys, showConfirmAction, showConfirmMessage, auditWholeSystem, siteGraphType, bodySlots, canEditAsArchitect, showEditNotes, showSaveAs } = this.state;

    // prepare rich copy link
    const pageLink = `${window.location.origin}/#sys=${encodeURIComponent(systemName)}`;

    const isAllowed = canEditAsArchitect;
    const isDirty = this.isDirty();
    const enableSave = isAllowed && isDirty && !processingMsg && !anonymous;
    const noSplitAddButton = isMobile();

    const itemAddNewSite = {
      id: 'sysView2_AddSaveLoad',
      key: 'sys-add1',
      title: 'Add a planned or "what if" site',
      text: 'Add',
      className: anonymous ? undefined : cn.bBox,
      iconProps: { iconName: 'Add' },
      split: !noSplitAddButton,
      disabled: !!processingMsg || anonymous,
      onClick: () => this.createNewSite(),
    } as IContextualMenuItem;

    const splitItemsAddNewSite = [
      {
        key: 'sys-do-import',
        text: 'Import bodies and stations',
        className: anonymous ? undefined : cn.bBox,
        iconProps: { iconName: 'Build' },
        disabled: !!processingMsg || anonymous,
        style: { height: 72 },
        onRenderContent: ((p, d) => {
          return <div style={{ justifyContent: 'left' }}>
            <span>
              {d.renderItemIcon(p)}
              {d.renderItemName(p)}
            </span>
            <div style={{ color: anonymous ? appTheme.palette.themeTertiary : appTheme.palette.themeSecondary }}>Update bodies and stations from external sources</div>
          </div>;
        }),
        onClick: () => this.doImport(),
      },
      {
        key: 'sys-do-import-bodies',
        text: 'Import bodies only',
        className: anonymous ? undefined : cn.bBox,
        iconProps: { iconName: 'Build' },
        disabled: !!processingMsg || anonymous,
        style: { height: 72 },
        onRenderContent: ((p, d) => {
          return <div style={{ justifyContent: 'left' }}>
            <span>
              {d.renderItemIcon(p)}
              {d.renderItemName(p)}
            </span>
            <div style={{ color: anonymous ? appTheme.palette.themeTertiary : appTheme.palette.themeSecondary }}>Update bodies from spansh.co.uk</div>
          </div>;
        }),
        onClick: () => this.doImport('bodies'),
      },
      {
        key: 'sys-add-div',
        itemType: ContextualMenuItemType.Divider,
      },
      {
        key: 'sys-add-manual',
        text: 'New construction ...',
        className: anonymous ? undefined : cn.bBox,
        iconProps: { iconName: 'Manufacturing' },
        disabled: !!processingMsg || anonymous,
        style: { height: 72 },
        onRenderContent: ((p, d) => {
          return <div style={{ justifyContent: 'left' }}>
            <span>
              {d.renderItemIcon(p)}
              {d.renderItemName(p)}
            </span>
            <div style={{ color: anonymous ? appTheme.palette.themeTertiary : appTheme.palette.themeSecondary }}>Manually start a new build project</div>
          </div>;
        }),
        onClick: () => this.setState({ showCreateBuildProject: true }),
      },
    ] as IContextualMenuItem[];

    if (noSplitAddButton) {
      // split buttons don't work properly on mobile devices, so we'll add the default button as the first of the split items
      splitItemsAddNewSite.unshift(
        {
          ...itemAddNewSite,
          text: 'Add a new site'
        },
        {
          key: 'sys-add-div2',
          itemType: ContextualMenuItemType.Divider,
        },
      );
    }

    const setGraphType = (newGraphType: SiteGraphType) => {
      this.setState({ siteGraphType: newGraphType });
      store.siteGraphType = newGraphType;
    };

    const onMobile = isMobile();

    const loadRevisionItems = sysMap?.revs?.map(r => {
      const d = new Date(r.time);
      return {
        key: `load-rev-${r.rev}`,
        text: `#${r.rev} by ${r.cmdr} ${getRelativeDuration(d)}`,
        title: `#${r.rev} by ${r.cmdr} - ${d.toLocaleString()}`,
        className: anonymous ? undefined : cn.bBox,
        disabled: !!processingMsg || anonymous,
        canCheck: true,
        checked: sysMap.rev === r.rev && !sysMap.saveName,
        onClick: () => this.doLoad(r.rev.toString()),
        onRenderContent(props, defaultRenders) {
          props.item.text = `#${r.rev} by ${r.cmdr} ${getRelativeDuration(new Date(r.time))}`;
          return <>
            {defaultRenders.renderCheckMarkIcon(props)}
            {defaultRenders.renderItemName(props)}
          </>;
        },
      } as IContextualMenuItem;
    }) ?? [];
    // inject a header row between the first 2 entries
    if (loadRevisionItems.length > 1) {
      loadRevisionItems.splice(1, 0, {
        key: `load-rev-header`,
        itemType: ContextualMenuItemType.Header,
        disabled: !!processingMsg || anonymous,
        text: `Prior revisions:`,
      } as IContextualMenuItem);
    }
    if (sysMap?.savedNames?.length) {
      loadRevisionItems.push({
        key: `load-named-header`,
        itemType: ContextualMenuItemType.Header,
        disabled: !!processingMsg || anonymous,
        text: `Named saves:`,
      });
      for (const ns of sysMap.savedNames) {
        const d = new Date(ns.time);
        const isCurrent = sysMap.saveName === ns.name;
        const canDelete = canEditAsArchitect || isMatchingCmdr(ns.cmdr, store.cmdrName);
        const btnDelete = canDelete ? <Icon
          className={cn.bBox}
          iconName='Delete'
          title={`Delete named save "${ns.name}"`}
          style={{ width: 24, textAlign: 'center', borderWidth: 2 }}
          onClick={ev => {
            ev.preventDefault();
            this.doDeleteNamedSave(ns.name);
          }
          }
        /> : undefined;

        loadRevisionItems.push({
          key: `load-named-${ns.name}`,
          text: `"${ns.name}" by ${ns.cmdr} ${getRelativeDuration(d)}`,
          title: `"${ns.name}" by ${ns.cmdr} - ${d.toLocaleString()}`,
          className: anonymous ? undefined : cn.bBox,
          disabled: !!processingMsg || anonymous,
          canCheck: true,
          checked: isCurrent,
          onClick: ev => {
            if (!ev?.defaultPrevented) {
              this.doLoad(ns.name);
            }
          },
          onRenderContent(props, defaultRenders) {
            props.item.text = `"${ns.name}" by ${ns.cmdr} ${getRelativeDuration(new Date(ns.time))}`;
            return <>
              {defaultRenders.renderCheckMarkIcon(props)}
              {defaultRenders.renderItemName(props)}
              {btnDelete}
            </>;
          },
        } as IContextualMenuItem);
      }
    }

    // get total count of orbital and surface slots
    let orbitalSlots = 0;
    let orbitalSlotsAllKnown = true;
    let surfaceSlots = 0;
    let surfaceSlotsAllKnown = true;
    for (const b of sysMap?.bodies ?? []) {
      if (b.type === BT.bc) { continue; } // ignore barycenters
      const slots = bodySlots[b.num] ?? [-1, -1];
      if (slots[0] >= 0) {
        orbitalSlots += slots[0];
      } else {
        orbitalSlotsAllKnown = false;
      }
      if (b.features.includes(BodyFeature.landable)) {
        if (slots[1] >= 0) {
          surfaceSlots += slots[1];
        } else
          surfaceSlotsAllKnown = false;
      }
    }
    const countOrbital = sysMap?.sites.filter(s => (sysMap.calcIds?.includes(s.id)) && getSiteType(s?.buildType)?.orbital).length ?? 0;
    const countSurface = sysMap?.sites.filter(s => (sysMap.calcIds?.includes(s.id)) && !getSiteType(s?.buildType)?.orbital).length ?? 0;
    const orbitalSlotsTitle = `Total orbital slots: ${orbitalSlots}` + (orbitalSlotsAllKnown ? `, remaining: ${orbitalSlots - countOrbital}` : '+?');
    const surfaceSlotsTitle = `Total surface slots: ${surfaceSlots}` + (surfaceSlotsAllKnown ? `, remaining: ${surfaceSlots - countSurface}` : '+?');

    // make Save button colours really dark if user has no permission to save
    const saveTextColor = !canEditAsArchitect
      ? appTheme.palette.themeLight
      : !enableSave || anonymous ? 'grey' : appTheme.palette.yellowDark;
    const saveIconColor = !canEditAsArchitect
      ? appTheme.palette.themeLight
      : enableSave ? appTheme.palette.yellowDark : undefined;
    const saveAsIconColor = isDirty
      ? appTheme.palette.yellowDark
      : undefined;

    const nicknameDiffers = !!sysMap?.nickname && sysMap.nickname !== systemName;
    return <>
      {!onMobile && <span style={{ marginRight: 20, fontSize: 10, color: 'grey', float: 'right' }}>id64: {sysMap?.id64} <CopyButton text={`${sysMap?.id64}`} /></span>}
      <h2 style={{ margin: 10, height: 32, fontSize: onMobile ? 18 : undefined }}>
        <Stack horizontal verticalAlign='baseline'>
          {nicknameDiffers && <Link href={pageLink} style={{ marginRight: 4 }}>{sysMap.nickname}</Link>}
          <CopyButton text={systemName} fontSize={nicknameDiffers ? 12 : 16} />
          <Link href={pageLink} style={{ marginLeft: 4, fontSize: nicknameDiffers ? 12 : undefined, color: nicknameDiffers ? appTheme.palette.themeTertiary : undefined }}>{systemName}</Link>

          <BothTierPoints disable={!this.state.sysMap} tier2={this.state.sysMap?.tierPoints.tier2 ?? 0} tier3={this.state.sysMap?.tierPoints.tier3 ?? 0} fontSize={onMobile ? 18 : 24} />

          <IconButton
            id='sysView2_SearchNew'
            title='Search for a different system'
            iconProps={{ iconName: "Search", style: { cursor: 'pointer' } }}
            style={{ marginLeft: 10 }}
            className={cn.bBox}
            onClick={() => {
              // if needed, prompt to save first
              if (isDirty) {
                this.setState({ showConfirmAction: () => window.location.assign('/#sys') });
              } else {
                window.location.assign('/#sys')
              }
            }}
          />

          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ marginLeft: 20, color: appTheme.palette.themeTertiary, fontSize: 18, cursor: 'default' }}>
            <Icon iconName='ProgressRingDots' title={orbitalSlotsTitle} />
            <span title={orbitalSlotsTitle}>{orbitalSlots}{!orbitalSlotsAllKnown && <>?</>}&nbsp;</span>
            <Icon iconName='GlobeFavorite' title={surfaceSlotsTitle} />
            <span title={surfaceSlotsTitle}>{surfaceSlots}{!surfaceSlotsAllKnown && <>?</>}</span>
          </Stack>
        </Stack>
      </h2>

      <CommandBar
        className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`}
        style={{ position: 'sticky', zIndex: 2, top: 0, }}
        styles={{ root: { paddingLeft: 10, } }}
        items={[
          {
            ...itemAddNewSite,
            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: splitItemsAddNewSite,
            }
          },

          {
            key: 'sys-load',
            title: 'Abandon your current changes and reload',
            text: 'Load',
            split: !onMobile,
            className: anonymous ? undefined : cn.bBox,
            iconProps: { iconName: 'OpenFolderHorizontal' },
            disabled: !!processingMsg || anonymous,
            onClick: () => this.doLoad(),
            subMenuProps: loadRevisionItems.length < 2 ? undefined : {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: loadRevisionItems,
            }
          },

          {
            key: `sys-save-as`,
            iconProps: { iconName: 'SaveAs', style: { color: saveAsIconColor } },
            text: canEditAsArchitect ? undefined : 'Save as',
            title: `Save a named copy of this system`,
            className: anonymous ? undefined : cn.bBox,
            disabled: !!processingMsg || anonymous,
            style: {
              border: !isDirty || anonymous ? '2px solid transparent' : `2px solid ${appTheme.palette.yellowDark}`,
            },
            onClick: () => this.setState({ showSaveAs: true }),
          },

          {
            key: 'sys-save',
            title: isAllowed ? 'Save changes to this system' : 'Save permission is denied',
            text: canEditAsArchitect ? 'Save' : undefined,
            className: anonymous ? undefined : cn.bBox,
            iconProps: { iconName: 'Save', style: { color: saveIconColor } },
            disabled: !enableSave || anonymous,
            style: {
              color: saveTextColor,
              border: !enableSave || anonymous ? '2px solid transparent' : `2px solid ${appTheme.palette.yellowDark}`,
            },
            onClick: () => this.doSaveData(),
          },

          {
            id: 'sysView2_MapType',
            key: 'sys-change-view',
            title: 'Toggle view between a table or a map',
            text: this.state.viewType === 'body' ? 'Table' : 'Map',
            className: cn.bBox,
            iconProps: { iconName: this.state.viewType === 'body' ? 'GridViewSmall' : 'Nav2DMapView' },
            disabled: !!processingMsg,
            onClick: () => {
              const nextView = viewTypes[viewTypes.indexOf(this.state.viewType) + 1] ?? viewTypes[0];
              this.setState({ viewType: nextView });
              store.sysViewView = nextView;
            }
          },

          {
            key: 'sys-graph-type1',
            title: `Toggle showing charts between ratios of:\n- Market links\n- Primary site economies\n- All site economies\n- No charts`,
            className: cn.bBox,
            iconProps: { iconName: mapSiteGraphTypeIcon[siteGraphType] },
            disabled: !!processingMsg,
            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                {
                  key: 'sys-graph-type-header',
                  text: 'Show in-line charts of:',
                  itemType: ContextualMenuItemType.Header,
                },
                {
                  key: 'sys-graph-type-links',
                  text: 'Market links',
                  iconProps: { iconName: mapSiteGraphTypeIcon.links },
                  className: cn.bBox,
                  onClick: () => setGraphType('links'),
                },
                {
                  key: 'sys-graph-type-major',
                  text: 'Economy ratios for primary sites',
                  iconProps: { iconName: mapSiteGraphTypeIcon.major },
                  className: cn.bBox,
                  onClick: () => setGraphType('major'),
                },
                {
                  key: 'sys-graph-type-all',
                  text: 'Economy ratios for all sites',
                  iconProps: { iconName: mapSiteGraphTypeIcon.all },
                  className: cn.bBox,
                  onClick: () => setGraphType('all'),
                },
                {
                  key: 'sys-graph-type-none',
                  text: 'Hide charts',
                  iconProps: { iconName: mapSiteGraphTypeIcon.none },
                  className: cn.bBox,
                  onClick: () => setGraphType('none'),
                },
              ]
            }
          },

          {
            key: 'sys-build-order',
            title: 'Adjust order of site calculations',
            text: 'Order',
            className: cn.bBox,
            iconProps: { iconName: 'SortLines' },
            disabled: !!processingMsg,
            onClick: () => this.setState({ showBuildOrder: true }),
          },

          {
            id: 'sysView2_UseIncomplete',
            key: 'toggle-use-incomplete',
            title: 'Include incomplete sites in calculations?',
            className: cn.bBox,
            iconProps: { iconName: useIncomplete ? 'TestBeakerSolid' : 'TestBeaker' },
            disabled: !!processingMsg,
            onClick: () => this.toggleUseIncomplete(),
          },

          {
            key: 'sys-audit-all',
            title: 'Compare audit of whole system',
            className: cn.bBox,
            iconProps: { iconName: 'FabricFolderSearch' },
            disabled: !!processingMsg,
            onClick: () => {
              this.doGetRealEconomies();
              this.setState({ auditWholeSystem: true });
            }
          },

          {
            id: 'sys-card-target',
            key: 'sys-edit',
            title: 'Edit system data',
            className: cn.bBox,
            iconProps: { iconName: 'Edit' },
            disabled: !!processingMsg,
            onClick: () => {
              this.setState({ showEditSys: !showEditSys });
            }
          },

          {
            key: 'sys-edit-notes',
            title: 'Edit system notes',
            className: cn.bBox,
            iconProps: { iconName: !!sysMap?.notes ? 'QuickNoteSolid' : 'QuickNote' },
            disabled: !!processingMsg,
            onClick: () => {
              this.setState({ showEditNotes: !showEditNotes });
              delayFocus('edit-system-notes');
            }
          },

          {
            key: 'open-in',
            title: 'View this site in other websites',
            iconProps: { iconName: 'OpenInNewWindow' },
            className: cn.bBox,
            disabled: !!processingMsg,
            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                {
                  key: 'btn-open-inara',
                  text: 'View on Inara',
                  iconProps: { imageProps: { src: inara16 } },
                  className: cn.bBox,
                  onClick: () => {
                    window.open(`https://inara.cz/elite/starsystem/?search=${systemName}`, 'Inara');
                  },
                },
                {
                  key: 'btn-open-spansh',
                  text: 'View on Spansh',
                  iconProps: { imageProps: { src: spansh16 } },
                  className: cn.bBox,
                  onClick: () => {
                    window.open(`https://spansh.co.uk/system/${this.state.sysMap.id64}`, 'Spansh');
                  },
                },
                {
                  key: 'btn-open-canonn',
                  text: 'View on Canonn',
                  iconProps: { imageProps: { src: canonn16 } },
                  className: cn.bBox,
                  onClick: () => {
                    window.open(`https://signals.canonn.tech/index.html?system=${systemName}`, 'Canonn');
                  },
                }
              ]
            }
          },

          {
            key: 'sys-loading',
            title: 'Networking ...',
            iconProps: { iconName: 'Nav2DMapView' },
            onRender: () => {
              return !processingMsg ? null : <div>
                <Spinner
                  size={SpinnerSize.medium}
                  labelPosition='right'
                  label={processingMsg}
                  style={{ marginTop: 12, cursor: 'default' }}
                />
              </div>
            },
          },
        ]}
      />

      {showEditSys && <SystemCard targetId='sys-card-target' sysView={this} onClose={() => {
        this.setState({
          showEditSys: false,
          sysMap: { ...this.state.sysMap }
        });
      }} />}

      {!!showConfirmAction && <Dialog
        hidden={false}
        dialogContentProps={{ title: 'Caution' }}
        minWidth={420}
      >
        <Icon iconName='Warning' style={{ fontSize: 40, float: 'left', marginRight: 10 }} />
        <div>
          {showConfirmMessage ?? 'You have unsaved changed.'}
          <div style={{ marginTop: 10 }}>Are you sure you want to proceed?</div>
        </div>
        <DialogFooter>
          <DefaultButton text='Yes' iconProps={{ iconName: 'CheckMark' }} onClick={() => showConfirmAction()} />
          <PrimaryButton text='No' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showConfirmAction: undefined })} />
        </DialogFooter>
      </Dialog>}

      {auditWholeSystem && !!sysMap && <>
        <AuditTestWholeSystem
          sysView={this}
          onClose={() => {
            this.setState({ auditWholeSystem: false });
          }}
        />
      </>}

      {sysMap && showSaveAs && <SystemSaveAs
        saveName={sysMap?.saveName ?? `Copy of #${sysMap.rev}`}
        priorSaves={sysMap.savedNames}
        architect={sysMap.architect}
        onDismiss={(saveName) => {
          if (saveName === undefined) {
            this.setState({ showSaveAs: false });
            return;
          }
          this.doSaveData(saveName);
          this.setState({ showSaveAs: false });
        }} />}
    </>;
  }

  renderSys() {
    const { sysMap, pinnedSite, viewType, pinnedSnapshot, sysStatsSnapshot, showEditNotes } = this.state;

    const pinnedSitePanel = pinnedSite && <div ref={this.snapshotRef}>
      <ViewSite
        site={pinnedSite}
        sysView={this}
        onChange={site => this.siteChanged(site)}
      />
    </div>;

    const sysStatsPanel = <div ref={this.sysStatsRef}>
      <SystemStats sysMap={this.state.sysMap} useIncomplete={this.state.useIncomplete} sysView={this} />
      {this.renderSystemValidationWarnings()}
    </div>;

    return <div className='system-view2' style={{}}>
      {showEditNotes && <EditSystemNotes systemNotes={sysMap.notes ?? ''} onChange={(newNotes) => {
        if (newNotes === undefined) {
          this.setState({ showEditNotes: false });
        } else {
          sysMap.notes = newNotes;
          this.setState({ sysMap, showEditNotes: false });
        }
      }} />}

      <Stack horizontal>
        {viewType === 'table' && this.renderBasicTable()}
        {viewType === 'body' && this.renderByBody()}

        {pinnedSite && <RightSide>
          <IconButton
            title='Make a comparison snapshot of this panel'
            iconProps={{ iconName: 'Camera' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 44, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
            }}
            className={cn.bBox2}
            onClick={() => this.setState({ pinnedSnapshot: this.snapshotRef.current?.outerHTML })}
          />
          <IconButton
            title='Remove this panel'
            iconProps={{ iconName: 'Clear' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 10, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
            }}
            className={cn.bBox2}
            onClick={() => this.setState({ pinnedSite: undefined })}
          />
          {pinnedSitePanel}
        </RightSide>}

        {pinnedSnapshot && <RightSide>
          <IconButton
            title='Remove this snapshot'
            iconProps={{ iconName: 'Clear' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 10, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
            }}
            className={cn.bBox2}
            onClick={() => this.setState({ pinnedSnapshot: undefined, })}
          />

          <div style={{ position: 'relative', color: 'grey' }}>
            <div dangerouslySetInnerHTML={{ __html: pinnedSnapshot }} />

            <div
              style={{
                backgroundColor: 'rgb(255,255,255,0.1)',
                position: 'absolute',
                left: -4, top: -4, right: -4, bottom: -4,
              }}
            >
              <span style={{
                fontSize: 36, fontWeight: 'bolder',
                position: 'absolute', rotate: '45deg',
                top: 40, right: -15,
                color: appTheme.palette.white,
                textShadow: `${appTheme.palette.black} 0 0 10px`,
              }}
              >
                snap shot
              </span>
            </div>
          </div>
        </RightSide>}

        <RightSide>
          <IconButton
            id='sysView2_Snapshot'
            title='Make a comparison snapshot of this panel'
            iconProps={{ iconName: 'Camera' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 10, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
            }}
            className={cn.bBox2}
            onClick={() => this.setState({ sysStatsSnapshot: this.sysStatsRef.current?.outerHTML })}
          />
          {sysStatsPanel}
        </RightSide>

        {sysStatsSnapshot && <RightSide>
          <IconButton
            title='Remove this snapshot'
            iconProps={{ iconName: 'Clear' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 10, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
            }}
            className={cn.bBox2}
            onClick={() => this.setState({ sysStatsSnapshot: undefined, })}
          />

          <div style={{ position: 'relative', color: 'grey' }}>
            <div dangerouslySetInnerHTML={{ __html: sysStatsSnapshot }} />

            <div
              style={{
                backgroundColor: 'rgb(255,255,255,0.1)',
                position: 'absolute',
                left: -4, top: -4, right: -4, bottom: -4,
              }}
            >
              <span style={{
                fontSize: 36, fontWeight: 'bolder',
                position: 'absolute', rotate: '45deg',
                top: 40, right: -15,
                color: appTheme.palette.white,
                textShadow: `${appTheme.palette.black} 0 0 10px`,
              }}
              >
                snap shot
              </span>
            </div>
          </div>
        </RightSide>}

      </Stack>
    </div>;
  }

  renderSystemValidationWarnings() {
    const { sysMap, orderIDs } = this.state;
    const { tierPoints, bodyMap, architect, reserveLevel, sites, siteMaps } = sysMap;

    const validations = [];

    // archiect is unknown and there are some non-planning sites
    if (!architect && sites.some(s => s.status !== 'plan')) {
      validations.push(<div key={`valNoArchitect`}>
        » System architect unknown - <Link onClick={() => this.setState({ showEditSys: true })}>Fix it</Link>
      </div>);
    }

    // reserve level is unknown
    if (!reserveLevel) {
      validations.push(<div key={`valNoReserve`}>
        » System reserve level unknown - <Link onClick={() => this.setState({ showEditSys: true })}>Fix it</Link>
      </div>);
    }

    const primaryPort = siteMaps[0];
    if (primaryPort) {
      // the primary port must be an orbital Outpost or Starport
      if (!primaryPort.type.orbital || !['outpost', 'starport'].includes(primaryPort.type.buildClass)) {
        validations.push(<div key={`valInvalidPrimary`}>
          » Primary port <SitePill site={primaryPort} fieldHighlight='buildType' keyPrefix='noBuildType' sysView={this} /> is invalid - <Link onClick={() => this.setState({ showBuildOrder: true })}>Fix it</Link>
        </div>);
      }
    }

    // there are incomplete sites ahead of completed ones
    let foundIncomplete = false;
    let invalidOrdering = false;
    for (const s of sites) {
      if (s.status !== 'complete') {
        foundIncomplete = true;
      } else if (foundIncomplete) {
        invalidOrdering = true;
        break;
      }
    }
    if (invalidOrdering) {
      validations.push(<div key={`valInvalidOrdering`}>
        » Site ordering is invalid - <Link onClick={() => this.setState({ showBuildOrder: true })}>Fix it</Link>
      </div>);
    }

    // not enough tier points
    if (tierPoints.tier2 < 0) {
      validations.push(<div key={`valTier2`}>» System needs <TierPoint tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div key={`valTier3`}>» System needs <TierPoint tier={3} count={-tierPoints.tier3} /></div>);
    }

    // process each body, checking if slot-counts are known
    let slotCountUnknown = [];
    const slotTooMany = new Set<Bod>();
    for (const b of sysMap.bodies) {
      if (b.type === BT.bc) { continue; }
      const isLandable = b.features.includes(BodyFeature.landable);
      const bodySlots = sysMap.slots[b.num];

      // warn if a body has some unknown slots
      let slotsUnknown = !bodySlots || bodySlots[0] === -1 || (isLandable && bodySlots[1] === -1);
      if (slotsUnknown && b.num !== -1) {
        slotCountUnknown.push(b);
      }

      // stop here if no sites on this body
      const bm = bodyMap[b.name];
      if (!bm) { continue; }

      const bodyShortName = bm.name.replace(this.state.systemName + ' ', '');

      // warn if a non-landable body has surface sites
      if (bm.surface.length > 0 && !isLandable) {
        const key = `valBodyNotLandable-${bm.num}`;
        validations.push(<div key={key}>
          » <b>{bodyShortName}</b> has surface sites but it is not landable:
          <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
            {bm.surface.map(s => <SitePill key={`notlandable-${s.id.slice(1)}`} site={s} fieldHighlight='bodyName' keyPrefix='notlandable' sysView={this} />)}
          </Stack>
        </div>);
      }

      // warn if there are more sites than slots
      if (bodySlots) {
        let diff = bm.orbital.length - bodySlots[0];
        if (diff === 1 && bm.sites.some(s => s.id === orderIDs[0])) { diff -= 1; } // allow off by one, if we have the primary port
        if (bodySlots[0] >= 0 && diff > 0) {
          slotTooMany.add(b);
        }
        if (bodySlots[1] >= 0 && bm.surface.length > bodySlots[1]) {
          slotTooMany.add(b);
        }
      }
    }

    if (slotCountUnknown.length > 0 && !anonymous) {
      slotCountUnknown.sort((ba, bb) => ba.num - bb.num);
      validations.push(<div key={`valSlotsUnknown`} id={`valSlotsUnknown`}>
        » There are {slotCountUnknown.length} bodies with unknown slot counts:
        <Stack horizontal wrap tokens={{ childrenGap: 4 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {slotCountUnknown.map(b => <BodyPill key={`valNoBody-${b.num}`} bod={b} sysView={this} sitesBodyViewRef={this.sitesBodyViewRef} />)}
        </Stack>
        <ShowCoachingMarks id='sysView2_BodySlots' target='#valSlotsUnknown' />
      </div>);
    }

    if (slotTooMany.size > 0) {
      const sorted = Array.from(slotTooMany).sort((ba, bb) => ba.num - bb.num);
      validations.push(<div key={`valBodyTooManySites`}>
        » There are {sorted.length} bodies with too many sites:
        <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {sorted.map(b => <BodyPill key={`valTooManySites-${b.num}`} bod={b} sysView={this} sitesBodyViewRef={this.sitesBodyViewRef} />)}
        </Stack>
      </div>);
    }

    if (unknown in bodyMap) {
      validations.push(<div key={`valNoBody`}>
        » There are {bodyMap.Unknown.sites.length} site(s) on unknown bodies:
        <Stack horizontal wrap tokens={{ childrenGap: 4 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {bodyMap.Unknown.sites.map(s => <SitePill key={`noBody-${s.id.slice(1)}`} site={s} fieldHighlight='bodyName' keyPrefix='noBody' sysView={this} />)}
        </Stack>
      </div>);
    }

    // do we have any sites with no build type?
    const missingType = this.state.sysMap.siteMaps.filter(s => !s.buildType);
    const showFixMissingTypes = this.state.sysMap.id64 > 0 && missingType.length > 0;
    if (showFixMissingTypes) {
      validations.push(<div key={`valNoBuildType}`}>
        » There are {missingType.length} site(s) without a build type:
        <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {missingType.map(s => <SitePill key={`noBuildType-${s.id.slice(1)}`} site={s} fieldHighlight='buildType' keyPrefix='noBuildType' sysView={this} />)}
        </Stack>
      </div>);
    }

    // check for missing preReq's - grouping them by what they are missing
    const mapMissingPreReq: Record<string, SiteMap2[]> = {};
    for (const s of siteMaps) {
      if (s.type.preReq && !hasPreReq2(sysMap.siteMaps, s.type)) {
        mapMissingPreReq[s.type.preReq] = [...(mapMissingPreReq[s.type.preReq] ?? []), s];
      }
    }
    for (const [preReq, sites] of Object.entries(mapMissingPreReq)) {
      validations.push(<div key={`valNoPreReq-${preReq}`}>
        » Pre req: Missing {mapName[preReq]}:
        <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {sites.map(s => <SitePill key={`noBuildType-${s.id.slice(1)}`} site={s} fieldHighlight='buildType' keyPrefix='noBuildType' sysView={this} />)}
        </Stack>
      </div>);
    }

    // check for asteroid starports in invalid locations
    const badAsteroids = sysMap.siteMaps.filter(sm => sm.buildType === 'asteroid' && sm.body?.type !== 'ac' && !sm.body?.features.includes(BodyFeature.rings));
    if (badAsteroids.length > 0) {
      validations.push(<div key={`valBadAsteroids}`}>
        » There are Asteroid Starports in invalid locations:
        <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {badAsteroids.map(s => <SitePill key={`badAstroid-${s.id.slice(1)}`} site={s} keyPrefix='badAstroid' sysView={this} />)}
        </Stack>
      </div>);
    }

    // confirm only asteroid starports are in asteroid clusters, but allow completed sites, as the game allowed this for a while and people still have them
    const badInAsteroids = sysMap.siteMaps.filter(sm => sm.body?.type === 'ac' && sm.buildType !== 'asteroid' && sm.status !== 'complete');
    if (badInAsteroids.length > 0) {
      validations.push(<div key={`valBadAsteroids}`}>
        » Asteroid clusters may only contains Asteroid Starports:
        <Stack horizontal wrap tokens={{ childrenGap: 2 }} style={{ marginLeft: 10, marginTop: 2 }}>
          {badInAsteroids.map(s => <SitePill key={`badInAstroid-${s.id.slice(1)}`} site={s} keyPrefix='badInAstroid' sysView={this} />)}
        </Stack>
      </div>);
    }

    return <>
      {validations.length > 0 && <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { margin: '8px 0', maxWidth: 600, backgroundColor: appTheme.palette.themeLight } }}>
        <Stack tokens={{ childrenGap: 4 }} style={{ marginLeft: 10 }}>
          {validations}
        </Stack>
      </MessageBar>}
      <br />
    </>;
  }

  renderBasicTable() {
    const { sysMap, pinnedSite } = this.state;

    return <div
      style={{
        width: 'max-content',
      }}>
      <SitesTableView
        systemName={this.state.systemName}
        sysMap={sysMap}
        sysView={this}
        pinnedId={pinnedSite?.id}
        onPin={id => this.sitePinned(id)}
        onChange={site => this.siteChanged(site)}
        onRemove={id => this.siteDeleted(id)}
      />
      <ActionButton
        iconProps={{ iconName: 'Add' }}
        style={{ marginBottom: 10 }}
        onClick={() => this.createNewSite()}
        className={cn.bBox}
        disabled={!store.cmdrName}
      >
        Add new
      </ActionButton>
    </div>;
  }

  renderByBody() {
    const { sysMap, pinnedSite } = this.state;

    return <div
      style={{
        width: 'max-content',
      }}>
      <SitesBodyView
        ref={this.sitesBodyViewRef}
        systemName={this.state.systemName}
        sysMap={sysMap}
        sysView={this}
        pinnedId={pinnedSite?.id}
        selectedSite={this.state.selectedSite}
        onPin={id => this.sitePinned(id)}
        onChange={site => this.siteChanged(site)}
        onRemove={id => this.siteDeleted(id)}
      />
    </div>;
  }

  renderCoachmarks() {
    return <ShowManyCoachingMarks targets={[
      'sysView2_AddSaveLoad',
      'sysView2_MapType',
      'sysView2_UseIncomplete',
      'sysView2_Snapshot',
      'sysView2_SearchNew',
    ]} />;
  }

  renderCreateBuildProject() {
    const knownMarketIDs = this.state.sysMap?.sites
      .filter(s => !!s.marketId && !s.buildId)
      .map(s => s.marketId.toString());

    const knownNames = this.state.sysMap?.sites
      .filter(s => s.status === 'complete' || s.buildId)
      .map(s => s.name);

    return <>
      <Panel
        isOpen
        type={PanelType.medium}
        headerText={`Start a new project`}
        allowTouchBodyScroll={isMobile()}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => {
          this.setState({ showCreateBuildProject: false });
        }}
      >
        <ProjectCreate
          noTitle
          systemName={this.state.systemName}
          knownMarketIds={knownMarketIDs}
          knownNames={knownNames}
          bodies={this.state.sysMap.bodies}
          bodyMap={this.state.sysMap.bodyMap}
          onCancel={() => {
            this.setState({ showCreateBuildProject: false });
          }}
        />
      </Panel >
    </>;
  }
}

export const mapSiteGraphTypeIcon = {
  links: 'Link12',
  major: 'FinancialSolid',
  all: 'Financial',
  none: 'Cancel',
}

export const RightSide: FunctionComponent<{}> = (props) => {
  return <div style={{ position: 'relative' }}>
    <div style={{
      border: `1px solid ${appTheme.palette.themeDarker}`,
      backgroundColor: appTheme.palette.themeLighter,
      padding: 4,
      width: 400,
      position: 'sticky',
      top: 46,
      zIndex: 1,
      overflow: 'hidden',
    }}>
      {props.children}
    </div>
  </div>;
}

export interface SitesViewProps {
  systemName: string;
  sysMap: SysMap2;
  sysView: SystemView2;
  pinnedId?: string;
  selectedSite?: Site;
  onPin: (id?: string) => void;
  onChange: (site: Site) => void;
  onRemove: (id: string) => void;
}


const EditSystemNotes: FunctionComponent<{ systemNotes: string, onChange: (notes: string | undefined) => void }> = (props) => {
  const [editNotes, setEditNotes] = useState(props.systemNotes);

  return <div
    style={{
      position: 'sticky',
      zIndex: 2,
      right: 20,
      top: 46,
      width: 280,
      float: 'right',
      border: `1px solid ${appTheme.palette.themeDarker}`,
      backgroundColor: appTheme.palette.themeLighter,
      padding: '10px 10px 5px 10px',
      fontSize: 14,
    }}
  >
    <div>
      <span>System notes:</span>


      <IconButton
        className={cn.bBox}
        title='Cancel changes'
        iconProps={{ iconName: 'Cancel' }}
        style={{ float: 'right', marginRight: 4 }}
        onClick={() => props.onChange(undefined)}
      />
      <IconButton
        className={cn.bBox}
        title='Accept changes'
        iconProps={{ iconName: 'Accept' }}
        style={{ float: 'right', marginRight: 4 }}
        onClick={() => props.onChange(editNotes)}
      />
    </div>

    <textarea
      id='edit-system-notes'
      value={editNotes}
      onChange={(ev) => setEditNotes(ev.target.value)}
      style={{
        width: 275,
        height: 225,
        marginTop: 5,
        backgroundColor: appTheme.palette.themeLight,
        color: appTheme.palette.black,
      }}
      maxLength={2000}
    />
    <div style={{ fontSize: 10, color: appTheme.palette.themeTertiary }}>Max length: 2000. Remaining: {2000 - editNotes.length}</div>
  </div>;
}


const SystemSaveAs: FunctionComponent<{ saveName: string, priorSaves?: NamedSave[], architect: string, onDismiss: (saveName?: string) => void }> = (props) => {
  const [saveName, setSaveName] = useState(props.saveName);

  const match = props.priorSaves?.find(s => s.name.toLowerCase() === saveName.toLowerCase());
  const nameClobber = !!match;
  const wrongCmdr = match && !isMatchingCmdr(match?.cmdr, store.cmdrName);
  const emptyButNotArchitect = !saveName && !isMatchingCmdr(props.architect, store.cmdrName);

  return <>
    <Dialog
      hidden={false}
      dialogContentProps={{ title: 'Save as:' }}
      onDismiss={() => props.onDismiss()}
      minWidth={420}
      styles={{ main: { border: '1px solid ' + appTheme.palette.themePrimary, } }}
    >
      <TextField
        value={saveName}
        onChange={(_, newValue) => setSaveName(newValue || '')}
      />
      <div style={{ marginTop: 4, color: appTheme.palette.themeSecondary, fontSize: 12 }}>
        <div>Anyone is allowed to save a named copy of a system.</div>
        <div>Only the architect can save without a name.</div>
        {nameClobber && <div style={{ color: appTheme.palette.yellowDark }}><Icon className='icon-inline' iconName='Warning' /> Overwriting a prior named save.</div>}
        {wrongCmdr && <div style={{ color: appTheme.palette.yellowDark }}><Icon className='icon-inline' iconName='Warning' /> Cannot overwrite saves by other Commanders.</div>}
      </div>
      <DialogFooter>
        <PrimaryButton text="Save as" iconProps={{ iconName: 'Save' }} onClick={() => props.onDismiss(saveName)} disabled={emptyButNotArchitect || wrongCmdr} />
        <DefaultButton text="Cancel" iconProps={{ iconName: 'Cancel' }} onClick={() => props.onDismiss()} />
      </DialogFooter>
    </Dialog>
  </>;
}