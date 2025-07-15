import './SystemView2.css';
import * as api from '../../api';
import { ActionButton, CommandBar, ContextualMenuItemType, DefaultButton, Dialog, DialogFooter, DirectionalHint, Icon, IconButton, IContextualMenuItem, Link, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble } from '@fluentui/react';
import { Component, createRef, FunctionComponent } from "react";
import { CopyButton } from '../../components/CopyButton';
import { appTheme, cn } from '../../theme';
import { buildSystemModel2, getMaxOrbitalSiteCount, getMaxSurfaceSiteCount, SiteMap2, SysMap2, unknown } from '../../system-model2';
import { TierPoint } from '../../components/TierPoints';
import { SiteLink } from '../../components/ProjectLink/ProjectLink';
import { SystemStats } from './SystemStats';
import { BothTierPoints, BuildOrder } from './BuildOrder';
import { ViewSite } from './ViewSite';
import { SitesTableView } from './SitesTableView';
import { Site, Sys } from '../../types2';
import { GetRealEconomies, SitesPut, SysSnapshot } from '../../api/v2-system';
import { SitesBodyView } from './SitesBodyView';
import { SiteCard } from './SiteCard';
import { store } from '../../local-storage';
import { SystemCard } from './SystemCard';
import { FindSystemName } from '../../components';
import { createRandomPhoneticName, delayFocus, isMobile } from '../../util';
import { ShowMySystems } from './ShowMySystems';
import { ShowManyCoachingMarks } from '../../components/ShowCoachingMarks';
import { BodyFeature, Project } from '../../types';
import { AuditTestWholeSystem } from './AuditTestWholeSystem';
import { ArchitectSummery } from './ArchitectSummary';

interface SystemView2Props {
  systemName: string;
}

interface SystemView2State {
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
  invalidSite?: Site;
  dirtySites: Record<string, Site>;
  deletedIDs: string[];
  viewType: string;
  orderIDs: string[];
  originalSiteIDs: string[];
  showEditSys?: boolean;
  showConfirmAction?: () => void;
  activeProjects: Record<string, Project | null>
  realEconomies?: GetRealEconomies[];
  auditWholeSystem?: boolean;
}

const viewTypes = [
  'body',
  'table',
];

const anonymous = !store.cmdrName;

export class SystemView2 extends Component<SystemView2Props, SystemView2State> {
  static countNew = 0;
  static lastBuildType?: string;
  static lastBodyNum?: number;
  private snapshotRef = createRef<HTMLDivElement>();
  private sysStatsRef = createRef<HTMLDivElement>();

  constructor(props: SystemView2Props) {
    super(props);

    this.state = {
      ...this.getResetState(),
      processingMsg: 'Loading ...',
      useIncomplete: store.useIncomplete,
      viewType: store.sysViewView,
    };
  }

  componentDidMount(): void {
    if (!!this.props.systemName) {
      // reload a new system
      window.document.title = 'Sys: ' + this.props.systemName;
      this.loadData();
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
        // reload a new system
        window.document.title = 'Sys: ' + this.props.systemName;
        this.loadData(true);
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
      invalidSite: undefined,
      dirtySites: {},
      deletedIDs: [],
      // skip: viewType,
      orderIDs: [],
      originalSiteIDs: [],
      showEditSys: false,
      showConfirmAction: undefined,
      activeProjects: {},
      realEconomies: [],
      auditWholeSystem: false,
    } as Omit<SystemView2State, 'useIncomplete' | 'viewType'>;
  }

  doSystemSearch() {
    // reset/clear everything, ready to search for a new system
    window.document.title = 'Sys: ?';
    this.setState({
      ...this.getResetState()
    });
    delayFocus('find-system-input');
  }

  loadData = (reset?: boolean) => {
    this.setState({
      ...(reset ? this.getResetState() : {} as any),
      processingMsg: 'Loading ...',
      showConfirmAction: undefined,
      errorMsg: '',
    });

    api.systemV2.getSys(this.props.systemName, true)
      .then(newSys => {

        if (newSys.v < api.systemV2.currentSchemaVersion) {
          console.warn(`System schema: ${newSys.v} ... re-import is needed`);
          return this.doImport('no-sites');
        }

        const newSysMap = buildSystemModel2(newSys, this.state.useIncomplete);
        const orderIDs = newSysMap.sites.map(s => s.id);
        this.setState({
          processingMsg: undefined,
          sysOriginal: newSys,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
          orderIDs: orderIDs,
          originalSiteIDs: [...orderIDs],
        });

        // Temporary - until current users have visited their sites?
        if (!!store.cmdrName && !!newSys.architect) {
          return api.systemV2.getSnapshot(newSys.id64)
            .catch(err => {
              if (err.statusCode === 404) {
                console.log(`Generate a snapshot for: ${this.props.systemName} ... `);
                // clear this cache any time we add a snapshot
                api.systemV2.cache.snapshots = {};
                // save a new snapshot
                const snapshot = this.getSnapshot(newSys);
                return api.systemV2.saveSnapshot(newSys.id64, snapshot);
              } else {
                console.error(err.stack);
                this.setState({ errorMsg: err?.message ?? 'Something failed' });
              }
            });
        }
      })
      .catch(err => {
        if (err.statusCode === 404) {
          console.error(`No data for: ${this.props.systemName} ... trying import ...`);
          this.doImport();
        } else {
          console.error(err.stack);
          this.setState({ errorMsg: err?.message ?? 'Something failed' });
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
    if (!store.cmdrName) {
      console.warn('You need to sign in in for this');
      return;
    }

    this.setState({ processingMsg: 'Importing ...', errorMsg: '' });

    api.systemV2.import(this.props.systemName, type)
      .then(newSys => {
        const newSysMap = buildSystemModel2(newSys, this.state.useIncomplete);
        const orderIDs = newSysMap.sites.map(s => s.id);
        this.setState({
          processingMsg: undefined,
          sysOriginal: newSys,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
          orderIDs: orderIDs,
          originalSiteIDs: [...orderIDs],
        });
      })
      .catch(err => {
        console.error(err.stack);
        this.setState({ errorMsg: err?.message ?? 'Something failed' });
      });
  };

  saveData = () => {

    if (!store.cmdrName) {
      console.warn('You need to sign in in for this');
      window.alert('You need to sign-in to Raven Colonial to save data.');
      document.getElementById('current-cmdr')?.click();
      return;
    }

    this.setState({ processingMsg: 'Saving ...', errorMsg: '' });

    const payload: SitesPut = {
      update: Object.values(this.state.dirtySites),
      delete: this.state.deletedIDs,
      orderIDs: this.state.orderIDs,
      snapshot: this.state.sysMap.architect ? this.getSnapshot(this.state.sysMap) : undefined,
    };

    if (this.state.sysOriginal.architect !== this.state.sysMap.architect) {
      payload.architect = this.state.sysMap.architect;
    }
    if (this.state.sysOriginal.reserveLevel !== this.state.sysMap.reserveLevel) {
      payload.reserveLevel = this.state.sysMap.reserveLevel;
    }

    api.systemV2.saveSites(
      this.state.sysMap.id64.toString(), payload)
      .then(newSys => {
        const newSysMap = buildSystemModel2(newSys, this.state.useIncomplete);
        this.setState({
          processingMsg: undefined,
          sysOriginal: newSys,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
        });

        // clear this cache any time we save a system
        api.systemV2.cache.snapshots = {};
      })
      .catch(err => {
        console.error(`saveData failed:`, err.stack);
        this.setState({ errorMsg: err.message });
      });
  };

  getSnapshot(newSys: Sys) {
    // prepare a snapshot without using incomplete sites
    const snapshotFull = buildSystemModel2(newSys, false, true);
    const snapshot: SysSnapshot = {
      architect: newSys.architect,
      id64: newSys.id64,
      v: newSys.v,
      name: newSys.name,
      pos: newSys.pos,
      tierPoints: snapshotFull.tierPoints,
      sumEffects: snapshotFull.sumEffects,
      sites: newSys.sites,
    };
    return snapshot;
  }

  recalc = () => {
    // console.log(this.state.sysMap);
    const sysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
    this.setState({
      sysMap: sysMap,
    });
  };

  doOnScrollEnd(action: () => void) {

    const func = () => {
      action();
      document.removeEventListener("scrollend", func);
    };

    document.addEventListener("scrollend", func);
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

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
    this.setState({
      dirtySites,
      sysMap: newSysMap,
      orderIDs: [...this.state.orderIDs, newSite.id],
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

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
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

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
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

  siteSelected = (selectedSite?: Site) => {
    this.setState({ selectedSite });
  };

  isDirty() {
    const { sysMap, dirtySites, deletedIDs, sysOriginal, orderIDs } = this.state;

    // we cannot be dirty if either of these are missing
    if (!sysMap || !sysOriginal) return false;

    const dirty = !!Object.keys(dirtySites).length
      || deletedIDs.length > 0
      || orderIDs.length !== sysOriginal.sites?.length
      || sysMap.architect !== sysOriginal.architect
      || sysMap.reserveLevel !== sysOriginal.reserveLevel
      || JSON.stringify(orderIDs) !== JSON.stringify(sysOriginal.sites.map(s => s.id))
      ;
    return dirty;
  };

  render() {
    if (!this.props.systemName) {
      return this.renderFindSystem();
    }

    const { errorMsg, sysMap, processingMsg, showBuildOrder } = this.state;

    return <div className='sys'>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      {this.renderTitleAndCommands()}

      {!sysMap && processingMsg?.includes('Loading') && <Spinner size={SpinnerSize.large} label={processingMsg} style={{ marginTop: 20 }} />}

      {sysMap && this.renderSys()}

      {showBuildOrder && <>
        <BuildOrder
          sysMap={sysMap}
          orderIDs={this.state.orderIDs}
          useIncomplete={this.state.useIncomplete}
          onClose={(orderIDs) => {
            if (orderIDs) {
              sysMap.primaryPortId = orderIDs[0];
              sysMap.sites = orderIDs.map(id => sysMap.sites.find(s => s.id === id)!);
              const newSysMap = buildSystemModel2(sysMap, this.state.useIncomplete);
              this.setState({ sysMap: newSysMap, orderIDs, showBuildOrder: false });
            } else {
              this.setState({ showBuildOrder: false });
            }
          }}
        />
      </>}

      {!anonymous && this.renderCoachmarks()}
      {anonymous && this.renderLoginPrompt()}
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
        You must enter a Commander name to save and fully use this tool.
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
              window.location.assign(`/#sys=${text.trim()}`);
            }
          }}
        />
        {!anonymous && <>
          <ArchitectSummery sysView={this} />
          <ShowMySystems />
        </>}
        {!store.cmdrName && this.renderLoginPrompt()}
      </div>
    </div>;
  }

  renderTitleAndCommands() {
    const { systemName } = this.props;
    const { processingMsg, sysMap, useIncomplete, showEditSys, showConfirmAction, auditWholeSystem } = this.state;

    // prepare rich copy link
    const pageLink = `${window.location.origin}/#sys=${systemName}`;

    const enableSave = this.isDirty() && !processingMsg;

    const itemAddNewSite = {
      id: 'sysView2_AddSaveLoad',
      key: 'sys-add1',
      title: 'Add a planned or "what if" site',
      text: 'Add',
      iconProps: { iconName: 'Add' },
      split: !isMobile(),
      disabled: !!processingMsg || anonymous,
      onClick: () => this.createNewSite(),
    } as IContextualMenuItem;

    const splitItemsAddNewSite = [
      {
        key: 'sys-add5',
        text: 'Import existing bodies and stations',
        iconProps: { iconName: 'Build' },
        onClick: () => this.doImport(),
        disabled: !!processingMsg || anonymous,
        style: { height: 60 },
        onRenderContent: ((p, d) => {
          return <div style={{ justifyContent: 'left' }}>
            <span>
              {d.renderItemIcon(p)}
              {d.renderItemName(p)}
            </span>
            <div style={{ color: anonymous ? appTheme.palette.themeTertiary : appTheme.palette.themeSecondary }}>Use to update bodies and new stations from Spansh and RavenColonial</div>
          </div>;
        })
      }
    ] as IContextualMenuItem[];

    if (isMobile()) {
      // split buttons don't work properly on mobile devices, so we'll add the default button as the first of the split items
      splitItemsAddNewSite.unshift({
        ...itemAddNewSite,
        text: 'Add a new site'
      });
    }

    return <>
      <span style={{ marginRight: 20, fontSize: 10, color: 'grey', float: 'right' }}>id64: {sysMap?.id64} <CopyButton text={`${sysMap?.id64}`} /></span>
      <h2 style={{ margin: 10, height: 32 }}>
        <Stack horizontal verticalAlign='baseline'>
          <CopyButton text={systemName} fontSize={16} />
          <Link href={pageLink} style={{ marginLeft: 4 }}>{systemName}</Link>

          <BothTierPoints disable={!this.state.sysMap} tier2={this.state.sysMap?.tierPoints.tier2 ?? 0} tier3={this.state.sysMap?.tierPoints.tier3 ?? 0} fontSize={24} />

          <IconButton
            id='sysView2_SearchNew'
            title='Search for a different system'
            iconProps={{ iconName: "Search", style: { cursor: 'pointer' } }}
            style={{ marginLeft: 10 }}
            onClick={() => {
              // if needed, prompt to save first
              if (this.isDirty()) {
                this.setState({ showConfirmAction: () => window.location.assign('/#sys') });
              } else {
                window.location.assign('/#sys')
              }
            }}
          />

          <Stack horizontal verticalAlign='center' style={{ marginLeft: 40, fontWeight: 'normal', width: 240, color: 'grey' }}>
            <Icon iconName='ProcessMetaTask' style={{ fontSize: 20 }} />
            <div style={{ marginLeft: 8, fontSize: 12, }}>
              This page and calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
            </div>
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
            iconProps: { iconName: 'OpenFolderHorizontal' },
            disabled: !!processingMsg || anonymous,
            onClick: () => {
              if (this.isDirty()) {
                this.setState({ showConfirmAction: () => this.loadData() });
              } else {
                this.loadData();
              }
            },
          },

          {
            key: 'sys-save',
            title: 'Save changes to this system',
            text: 'Save',
            iconProps: { iconName: 'Save', style: { color: enableSave ? appTheme.palette.yellowDark : undefined } },
            disabled: !enableSave || anonymous,
            style: {
              color: !enableSave || anonymous ? 'grey' : appTheme.palette.yellowDark,
              border: !enableSave || anonymous ? '2px solid transparent' : `2px solid ${appTheme.palette.yellowDark}`,
            },
            onClick: this.saveData,
          },

          {
            id: 'sysView2_MapType',
            key: 'sys-change-view',
            title: 'Toggle view between a table or a map',
            text: this.state.viewType === 'body' ? 'Map' : 'Table',
            iconProps: { iconName: this.state.viewType === 'body' ? 'Nav2DMapView' : 'GridViewSmall' },
            disabled: !!processingMsg,
            onClick: () => {
              const nextView = viewTypes[viewTypes.indexOf(this.state.viewType) + 1] ?? viewTypes[0];
              this.setState({ viewType: nextView });
              store.sysViewView = nextView;
            }
          },


          {
            key: 'sys-build-order',
            title: 'Adjust order of site calculations',
            text: 'Order',
            iconProps: { iconName: 'SortLines' },
            disabled: !!processingMsg,
            onClick: () => this.setState({ showBuildOrder: true }),
          },

          {
            id: 'sysView2_UseIncomplete',
            key: 'toggle-use-incomplete',
            title: 'Include incomplete sites in calculations?',
            iconProps: { iconName: useIncomplete ? 'TestBeakerSolid' : 'TestBeaker' },
            disabled: !!processingMsg,
            onClick: () => {
              const sysMap = buildSystemModel2(this.state.sysMap, !this.state.useIncomplete);
              this.setState({
                sysMap: sysMap,
                useIncomplete: !useIncomplete,
              });
              store.useIncomplete = !useIncomplete;
            },
          },

          {
            key: 'sys-audit-all',
            title: 'Compare audit of whole system',
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
            iconProps: { iconName: 'Edit' },
            disabled: !!processingMsg,
            onClick: () => {
              this.setState({ showEditSys: !showEditSys });
            }
          },

          {
            key: 'open-in',
            title: 'View this site in other websites',
            iconProps: { iconName: 'OpenInNewWindow' },
            disabled: !!processingMsg,
            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                {
                  key: 'btn-open-inara',
                  text: 'View on Inara',
                  onClick: () => {
                    window.open(`https://inara.cz/elite/starsystem/?search=${systemName}`, 'Inara');
                  },
                },
                {
                  key: 'btn-open-spansh',
                  text: 'View on Spansh',
                  onClick: () => {
                    window.open(`https://spansh.co.uk/system/${this.state.sysMap.id64}`, 'Spansh');
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
          You have unsaved changed.
          <br />
          Are you sure you want to proceed?
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
    </>;
  }

  renderSys() {
    const { pinnedSite, viewType, pinnedSnapshot, sysStatsSnapshot } = this.state;

    const pinnedSitePanel = pinnedSite && <div ref={this.snapshotRef}>
      <ViewSite
        site={pinnedSite}
        sysView={this}
        onChange={site => this.siteChanged(site)}
      />
    </div>;

    const sysStatsPanel = <div ref={this.sysStatsRef}>
      <SystemStats sysMap={this.state.sysMap} useIncomplete={this.state.useIncomplete} />
      {this.renderSystemValidationWarnings()}
    </div>;

    return <div className='system-view2' style={{ position: 'relative' }}>
      <Stack horizontal wrap>
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
              border: `1px solid ${appTheme.palette.themePrimary}`
            }}
            onClick={() => this.setState({ pinnedSnapshot: this.snapshotRef.current?.outerHTML })}
          />
          <IconButton
            title='Remove this panel'
            iconProps={{ iconName: 'Clear' }}
            style={{
              position: 'absolute', zIndex: 1,
              top: 10, right: 10, width: 32, height: 32,
              backgroundColor: appTheme.palette.white,
              border: `1px solid ${appTheme.palette.themePrimary}`
            }}
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
              border: `1px solid ${appTheme.palette.themePrimary}`
            }}
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
              border: `1px solid ${appTheme.palette.themePrimary}`
            }}
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
              border: `1px solid ${appTheme.palette.themePrimary}`
            }}
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
    const { tierPoints, bodyMap, architect, reserveLevel, sites } = this.state.sysMap;

    const validations = [];

    const getMiniLink = (s: SiteMap2, fieldHighlight: string, key: string) => {
      const isTarget = this.state.invalidSite?.id === s.id;
      const id = `invalid-${s.id.replace('&', '')}`;
      return <div
        key={key}
        style={{ marginLeft: 10 }}
      >
        <SiteLink site={s} noSys noBold noType iconName={s.status === 'complete' ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />
        <IconButton
          id={id}
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
          style={{ width: 14, height: 14, marginLeft: 4 }}
          onClick={() => {
            this.setState({ invalidSite: s });
          }}
        />
        {isTarget && <SiteCard targetId={id} site={s} sysView={this} onClose={() => this.setState({ invalidSite: undefined })} />}
      </div>;
    };

    if (!architect && sites.some(s => s.status !== 'plan')) {
      validations.push(<div key={`valNoArchitect`}>
        » System architect unknown - <Link onClick={() => this.setState({ showEditSys: true })}>Fix it</Link>
      </div>);
    }

    if (!reserveLevel) {
      validations.push(<div key={`valNoReserve`}>
        » System reserve level unknown - <Link onClick={() => this.setState({ showEditSys: true })}>Fix it</Link>
      </div>);
    }

    if (tierPoints.tier2 < 0) {
      validations.push(<div key={`valTier2`}>» System needs <TierPoint tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div key={`valTier3`}>» System needs <TierPoint tier={3} count={-tierPoints.tier3} /></div>);
    }

    for (const bm of Object.values(bodyMap)) {

      // warn if a non-landable body has surface sites
      if (bm.surface.length > 0 && !bm.features.includes(BodyFeature.landable)) {
        const key = `valBodyNotLandable-${bm.num}`;
        validations.push(<div key={key}>
          » <b>{bm.name}</b> has surface sites but it is not landable:
          <br />
          {bm.surface.map(s => getMiniLink(s, 'bodyName', key + s.id.slice(1)))}
        </div>);
      }

      // warn if a body has 4+ orbitals // TODO: figure out the logic for this
      const maxOrbitalSites = getMaxOrbitalSiteCount(this.state.sysMap, bm);
      if (bm.orbital.length > maxOrbitalSites) {
        validations.push(<div key={`valBodyTooManyOribtals-${bm.num}`}>
          » <b>{bm.name}</b> has too many orbital sites
        </div>);
      }

      // warn if there's too many surface sites on a body? (Assuming we can know how that is determines)
      const maxSurfaceSites = getMaxSurfaceSiteCount(this.state.sysMap, bm);
      if (bm.surface.length > maxSurfaceSites) {
        validations.push(<div key={`valBodyTooManyOribtals-${bm.num}`}>
          » <b>{bm.name}</b> has too many surface sites
        </div>);
      }
    }

    if (unknown in bodyMap) {
      validations.push(<div key={`valNoBody`}>
        » There are {bodyMap.Unknown.sites.length} site(s) on unknown bodies:
        <br />
        {bodyMap.Unknown.sites.map(s => getMiniLink(s, 'bodyName', `noBody${s.name}`))}
      </div>);
    }

    // const countTaxable = siteMaps.filter(s => s.type.buildClass === 'starport' && s.type.tier > 1);
    // const taxableMissingDate = countTaxable.filter(s => !s.timeCompleted);
    // if (countTaxable.length > 3 && taxableMissingDate.length > 0) {
    //   validations.push(<div key={`valShouldSetDates`}>
    //     » Set <b>Date Complete</b> on the following to ensure tier points are scaled correctly:
    //     <br />
    //     {taxableMissingDate.map(s => getMiniLink(s, 'timeCompleted', `noDate${s.name}`))}
    //   </div>);
    // }

    // TODO: check for missing preReq's?

    // do we have any sites with body name but not type?
    // const missingType = this.state.sysMap.siteMaps.filter(s => !s.body!.type && s.name && s.status !== 'plan');
    // const showFixMissingTypes = this.state.sysMap.id64 > 0 && missingType.length > 0;

    return <>
      {/* {showFixMissingTypes && <FixFromCanonn sites={this.state.sysMap.siteMaps} />} */}
      {validations.length > 0 && <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { margin: '8px 0', maxWidth: 600 } }}> {validations}</MessageBar>}
      <br />
    </>;
  }

  renderBasicTable() {
    const { sysMap, pinnedSite } = this.state;

    return <div
      style={{
        width: '45%',
      }}>
      <SitesTableView
        systemName={this.props.systemName}
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
        width: '45%',
      }}>
      <SitesBodyView
        systemName={this.props.systemName}
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
}

export const RightSide: FunctionComponent<{ foo?: string }> = (props) => {
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