import './SystemView2.css';
import * as api from '../../api';
import { ActionButton, CommandBar, DefaultButton, Dialog, DialogFooter, Icon, IconButton, Link, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component, createRef, FunctionComponent } from "react";
import { CopyButton } from '../../components/CopyButton';
import { appTheme, cn } from '../../theme';
import { buildSystemModel2, SiteMap2, SysMap2, unknown } from '../../system-model2';
import { TierPoints } from '../../components/TierPoints';
import { SiteLink } from '../../components/ProjectLink/ProjectLink';
import { SystemStats } from './SystemStats';
import { BuildOrder } from './BuildOrder';
import { ViewSite } from './ViewSite';
import { SitesTableView } from './SitesTableView';
import { Site, Sys } from '../../types2';
import { SitesPut } from '../../api/v2-system';
import { SitesBodyView } from './SitesBodyView';
import { SiteCard } from './SiteCard';
import { store } from '../../local-storage';
import { SystemCard } from './SystemCard';
import { FindSystemName } from '../../components';
import { createRandomPhoneticName, delayFocus } from '../../util';
import { ShowMySystems } from './ShowMySystems';

interface SystemView2Props {
  systemName: string;
}

interface SystemView2State {
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
}

const viewTypes = [
  'table',
  'body',
];

export class SystemView2 extends Component<SystemView2Props, SystemView2State> {
  static countNew = 0;
  static lastBuildType?: string;
  static lastBodyNum?: number;
  private snapshotRef = createRef<HTMLDivElement>();
  private sysStatsRef = createRef<HTMLDivElement>();

  constructor(props: SystemView2Props) {
    super(props);

    this.state = {
      processingMsg: 'Loading ...',
      useIncomplete: store.useIncomplete,
      sysMap: undefined!,
      sysOriginal: undefined!,
      originalSiteIDs: [],
      dirtySites: {},
      deletedIDs: [],
      orderIDs: [],
      viewType: store.sysViewView || viewTypes[1],
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
  }

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

  doSystemSearch() {
    // reset/clear everything, ready to search for a new system
    window.document.title = 'Sys: ?';
    this.setState({
      errorMsg: '',
      processingMsg: undefined,
      sysOriginal: undefined!,
      sysMap: undefined!,
      showBuildOrder: false,
      pinnedSite: undefined,
      selectedSite: undefined,
      invalidSite: undefined,
      dirtySites: {},
      deletedIDs: [],
      orderIDs: [],
      showEditSys: false,
    });
    delayFocus('find-system-input');
  }

  loadData = (reset?: boolean) => {
    this.setState({
      processingMsg: 'Loading ...',
      showConfirmAction: undefined,
      errorMsg: '',
      sysMap: reset ? undefined! : this.state.sysMap,
    });

    api.systemV2.getSys(this.props.systemName)
      .then(sys => {

        const sysMap = buildSystemModel2(sys, this.state.useIncomplete);
        const orderIDs = sysMap.sites.map(s => s.id);
        this.setState({
          processingMsg: undefined,
          sysOriginal: sys,
          sysMap: sysMap,
          dirtySites: {},
          deletedIDs: [],
          orderIDs: orderIDs,
          originalSiteIDs: [...orderIDs],
        });
      })
      .catch(err => {
        if (err.statusCode === 404) {
          console.error(`No data for: ${this.props.systemName} ... trying import ...`);
          this.doImport();
        } else {
          console.error(err.message);
          this.setState({ errorMsg: err?.message ?? 'Something failed' });
        }
      });
  };

  doImport = () => {
    this.setState({ processingMsg: 'Importing ...', errorMsg: '' });

    api.systemV2.import(this.props.systemName)
      .then(sys => {
        const newSysMap = buildSystemModel2(sys, this.state.useIncomplete);
        this.setState({
          processingMsg: undefined,
          sysOriginal: sys,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
          orderIDs: newSysMap.sites.map(s => s.id),
        });
      })
      .catch(err => {
        console.error(err.message);
        this.setState({ errorMsg: err?.message ?? 'Something failed' });
      });
  };

  saveData = () => {
    this.setState({ processingMsg: 'Saving ...', errorMsg: '' });

    const payload = {
      update: Object.values(this.state.dirtySites),
      delete: this.state.deletedIDs,
      orderIDs: this.state.orderIDs,
    } as SitesPut;

    if (this.state.sysOriginal.architect !== this.state.sysMap.architect) {
      payload.architect = this.state.sysMap.architect;
    }
    if (this.state.sysOriginal.reserveLevel !== this.state.sysMap.reserveLevel) {
      payload.reserveLevel = this.state.sysMap.reserveLevel;
    }

    api.systemV2.saveSites(
      this.state.sysMap.id64.toString(), payload)
      .then(sys => {
        const newSysMap = buildSystemModel2(sys, this.state.useIncomplete);
        this.setState({
          processingMsg: undefined,
          sysOriginal: sys,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
        });
      })
      .catch(err => {
        console.error(`saveData failed:`, err.stack);
        this.setState({ errorMsg: err.message });
      });
  };

  recalc = () => {
    // console.log(this.state.sysMap);
    const sysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
    this.setState({
      sysMap: sysMap,
    });
  };

  createNewSite = () => {
    const newSite = {
      id: `x${Date.now()}`,
      status: 'plan',
      bodyNum: SystemView2.lastBodyNum ?? -1,
      name: createRandomPhoneticName(),
      buildType: SystemView2.lastBuildType ?? '',
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
      selectedSite: newSite,
      orderIDs: [...this.state.orderIDs, newSite.id],
    });

    const id = `id-sbv-${newSite.id}-div`;
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        // start scrolling
        element.parentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // then make the card appear
        setTimeout(() => {
          element.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        }, 500);
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
  }

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
  }

  siteSelected = (selectedSite?: Site) => {
    this.setState({ selectedSite });
  }

  isDirty() {
    const { sysMap, dirtySites, deletedIDs, sysOriginal, orderIDs } = this.state;

    const dirty = !!Object.keys(dirtySites).length
      || deletedIDs.length > 0
      || orderIDs.length !== sysOriginal?.sites?.length
      || sysMap?.architect !== sysOriginal?.architect
      || sysMap?.reserveLevel !== sysOriginal?.reserveLevel
      || (sysOriginal && JSON.stringify(orderIDs) !== JSON.stringify(sysOriginal.sites.map(s => s.id)))
      ;
    return dirty;
  }

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
    </div>;
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
              window.location.replace(`/#sys=${text.trim()}`);
            }
          }}
        />
        <br />
        <ShowMySystems />
      </div>
    </div>;
  }

  renderTitleAndCommands() {
    const { systemName } = this.props;
    const { processingMsg, sysMap, useIncomplete, showEditSys, showConfirmAction } = this.state;

    // prepare rich copy link
    const pageLink = `${window.location.origin}/#sys=${systemName}`;

    const enableSave = this.isDirty() && !processingMsg;

    return <>
      <span style={{ marginRight: 20, fontSize: 10, color: 'grey', float: 'right' }}>id64: {sysMap?.id64} <CopyButton text={`${sysMap?.id64}`} /></span>
      <h2 style={{ margin: 10, height: 32 }}>
        <Stack horizontal verticalAlign='baseline'>
          <CopyButton text={systemName} fontSize={16} />
          <Link href={pageLink} style={{ marginLeft: 4 }}>{systemName}</Link>

          <div style={{ marginLeft: 10, color: sysMap ? undefined : 'grey' }}>
            <span style={{ width: 20 }} />
            <span
              className='bubble'
              style={sysMap?.tierPoints.tier2 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
            >
              <TierPoints tier={2} count={sysMap?.tierPoints.tier2} disabled={!sysMap} />
            </span>
            <span style={{ width: 4 }} />
            <span
              className='bubble'
              style={sysMap?.tierPoints.tier3 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
            >
              <TierPoints tier={3} count={sysMap?.tierPoints.tier3} disabled={!sysMap} />
            </span>
          </div>

          <IconButton
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

        </Stack>
      </h2>

      <CommandBar
        className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`}
        style={{
          position: 'sticky',
          zIndex: 2,
          top: 0,
        }}
        styles={{
          root: {
            paddingLeft: 10,
          }
        }}
        items={[
          {
            key: 'sys-add1',
            text: 'Add',
            iconProps: { iconName: 'Add' },
            split: true,
            disabled: !!processingMsg,
            onClick: () => this.createNewSite(),

            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                // {
                //   key: 'sys-add1',
                //   text: 'Plan a new site',
                //   iconProps: { iconName: 'WebAppBuilderFragmentCreate' },
                //   onClick: () => this.createNewSite(),
                // },
                // {
                //   key: 'sys-add2',
                //   text: 'Start building a site',
                //   iconProps: { iconName: 'Manufacturing' },
                // },
                // {
                //   key: 'sys-add3',
                //   text: 'Add a completed site',
                //   iconProps: { iconName: 'CityNext2' },
                // },
                // {
                //   key: 'sys-add4',
                //   itemType: ContextualMenuItemType.Divider,
                // },
                {
                  key: 'sys-add5',
                  title: 'Re-import bodies and stations from Spansh.',
                  text: 'Import from Spansh',
                  iconProps: { iconName: 'Build' },
                  onClick: () => this.doImport(),
                  style: { height: 60 },
                  onRenderContent: ((p, d) => {
                    return <div style={{ justifyContent: 'left' }}>
                      <span>
                        {d.renderItemIcon(p)}
                        {d.renderItemName(p)}
                      </span>
                      <div style={{ color: appTheme.palette.themeSecondary }}>Use to update bodies and new stations.</div>
                    </div>;
                  })
                }
              ]
            }
          },

          {
            key: 'sys-change-view',
            title: 'Change view type',
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
            key: 'sys-save',
            title: 'Save changes to this system',
            text: 'Save',
            iconProps: { iconName: 'Save', style: { color: enableSave ? appTheme.palette.yellowDark : undefined } },
            disabled: !enableSave,
            onClick: this.saveData,
          },

          {
            key: 'sys-load',
            title: 'Abandon your current changes and reload',
            text: 'Load',
            iconProps: { iconName: 'OpenFolderHorizontal' },
            disabled: !!processingMsg,
            onClick: () => {
              if (this.isDirty()) {
                this.setState({ showConfirmAction: () => this.loadData() });
              } else {
                this.loadData();
              }
            },
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
            key: 'toggle-use-incomplete',
            title: 'Include incomplete sites in calculations?',
            // text: 'Include all',
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
            iconProps: { iconName: 'OpenInNewWindow' },
            disabled: !!processingMsg,
            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                {
                  key: 'btn-open-inara',
                  text: 'View on Inara',
                  // disabled: refreshing,
                  // style: {color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
                  onClick: () => {
                    window.open(`https://inara.cz/elite/starsystem/?search=${systemName}`, 'Inara');
                  },
                },
                {
                  key: 'btn-open-spansh',
                  text: 'View on Spansh',
                  // disabled: refreshing,
                  // style: {color: refreshing ? appTheme.palette.neutralTertiaryAlt : undefined },
                  onClick: () => {
                    window.open(`https://spansh.co.uk/system/${this.state.sysMap.id64}`, 'Spansh');
                  },
                },
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
          <DefaultButton text="Yes" iconProps={{ iconName: 'CheckMark' }} onClick={() => showConfirmAction()} />
          <PrimaryButton text="No" iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showConfirmAction: undefined })} />
        </DialogFooter>
      </Dialog>}

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
      validations.push(<div key={`valTier2`}>» System needs <TierPoints tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div key={`valTier3`}>» System needs <TierPoints tier={3} count={-tierPoints.tier3} /></div>);
    }

    // TODO: warn if a body has 4+ orbitals

    // TODO: warn if a non-landable body has surface sites

    // TODO: warn if there's too many surface sites on a body? (Assuming we can know how that is determines)

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
      >
        Add new ...
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