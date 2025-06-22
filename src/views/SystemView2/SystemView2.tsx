import './SystemView2.css';
import * as api from '../../api';
import { ActionButton, CommandBar, ContextualMenuItemType, Icon, IconButton, Link, MessageBar, MessageBarType, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component, FunctionComponent } from "react";
import { CopyButton } from '../../components/CopyButton';
import { appTheme, cn } from '../../theme';
import { buildSystemModel2, SiteMap2, SysMap2, unknown } from '../../system-model2';
import { TierPoints } from '../../components/Chevrons';
import { SiteLink } from '../../components/ProjectLink/ProjectLink';
import { SystemStats } from './SystemStats';
import { BuildOrder } from './BuildOrder';
import { ViewSite } from './ViewSite';
import { SitesTableView } from './SitesTableView';
import { Site, Sys } from '../../types2';
import { SitesPut } from '../../api/v2-system';
import { SitesBodyView } from './SitesBodyView';
import { SiteCard } from './SiteCard';

interface SystemView2Props {
  systemName: string;
}

interface SystemView2State {
  errorMsg?: string;
  loading: boolean;
  saving?: boolean;
  useIncomplete: boolean;
  sysOriginal: Sys;
  sysMap: SysMap2;
  showBuildOrder?: boolean;
  pinnedSite?: Site;
  selectedSite?: Site;
  invalidSite?: Site;
  dirtySites: Record<string, Site>;
  deletedIDs: string[];
  viewType: string;
}

const viewTypes = [
  'table',
  'body',
];

export class SystemView2 extends Component<SystemView2Props, SystemView2State> {
  static countNew = 0;
  static lastBuildType?: string;
  static lastBodyNum?: number;

  constructor(props: SystemView2Props) {
    super(props);

    this.state = {
      loading: true,
      useIncomplete: true,
      sysMap: undefined!,
      sysOriginal: undefined!,
      dirtySites: {},
      deletedIDs: [],
      viewType: viewTypes[1], // TODO: make this a setting
    };
  }

  componentDidMount(): void {
    this.loadData();
  }

  componentDidUpdate(prevProps: Readonly<SystemView2Props>, prevState: Readonly<SystemView2State>, snapshot?: any): void {
    if (prevProps.systemName !== this.props.systemName) {
      // reload a new system
      this.loadData(true);
    }
  }

  loadData = (reset?: boolean) => {
    this.setState({
      loading: true,
      errorMsg: '',
      sysMap: reset ? undefined! : this.state.sysMap,
    });

    api.systemV2.getSys(this.props.systemName)
      .then(sys => {
        const sysMap = buildSystemModel2(sys, this.state.useIncomplete);
        this.setState({
          sysOriginal: sys,
          sysMap: sysMap,
          dirtySites: {},
          deletedIDs: [],
          loading: false,
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
    this.setState({ loading: true, errorMsg: '' });

    api.systemV2.import(this.props.systemName)
      .then(sys => {
        const sysMap = buildSystemModel2(sys, this.state.useIncomplete);
        this.setState({
          sysOriginal: sys,
          sysMap: sysMap,
          dirtySites: {},
          deletedIDs: [],
          loading: false,
        });
      })
      .catch(err => {
        console.error(err.message);
        this.setState({ errorMsg: err?.message ?? 'Something failed' });
      });
  };

  saveData = () => {
    this.setState({ saving: true, errorMsg: '' });

    api.systemV2.saveSites(
      this.state.sysMap.id64.toString(),
      {
        update: Object.values(this.state.dirtySites),
        delete: this.state.deletedIDs,
      } as SitesPut
    )
      .then(newSites => {
        const { sysOriginal } = this.state;
        sysOriginal.sites = newSites;


        const newSysMap = buildSystemModel2(sysOriginal, this.state.useIncomplete);
        this.setState({
          sysOriginal: sysOriginal,
          sysMap: newSysMap,
          dirtySites: {},
          deletedIDs: [],
          saving: false,
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
      bodyNum: -1, //SystemView2.lastBodyNum ?? -1,
      name: `New #${++SystemView2.countNew}`,
      buildType: SystemView2.lastBuildType ?? '',
    } as Site;

    const { sysMap, dirtySites } = this.state;

    // make sure we don't reuse a name
    while (sysMap.sites.some(s => s.name === newSite.name)) {
      newSite.name = `New #${++SystemView2.countNew}`;
    }

    sysMap.sites.push(newSite);
    dirtySites[newSite.id] = newSite;

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
    this.setState({
      dirtySites,
      sysMap: newSysMap,
      selectedSite: newSite,
    });
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

  siteDeleted = (id: string) => {

    const idx = this.state.sysMap.sites.findIndex(s => s.id === id);
    if (idx < 0) {
      console.error(`Why not found? ID: ${id}`);
      return;
    }

    const { sysMap, deletedIDs } = this.state;

    sysMap.sites.splice(idx, 1);
    deletedIDs.push(id);

    const newSysMap = buildSystemModel2(this.state.sysMap, this.state.useIncomplete);
    this.setState({
      deletedIDs,
      sysMap: newSysMap,
      pinnedSite: this.state.pinnedSite?.id === id ? undefined : this.state.pinnedSite,
      selectedSite: this.state.selectedSite?.id === id ? undefined : this.state.selectedSite,
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

  render() {
    if (!this.props.systemName) { return <h1>Why no system name?</h1> }

    const { errorMsg, loading, sysMap, showBuildOrder } = this.state;

    return <div className='sys'>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      {this.renderTitleAndCommands()}

      {(loading || !sysMap) && <Spinner size={SpinnerSize.large} label='Loading ...' style={{ marginTop: 20 }} />}

      {sysMap && this.renderSys()}

      {showBuildOrder && <BuildOrder sysMap={sysMap} onClose={() => this.setState({ showBuildOrder: false })} />}
    </div>;
  }

  renderTitleAndCommands() {
    const { systemName } = this.props;
    const { loading, saving, sysMap, dirtySites, deletedIDs } = this.state;

    // prepare rich copy link
    const pageLink = `${window.location.origin}/#sys=${systemName}`;
    var copyLink = new ClipboardItem({
      'text/plain': pageLink,
      'text/html': new Blob([`<a href='${pageLink}'>${systemName}</a>`], { type: 'text/html' }),
    });

    return <>
      <h2 style={{ margin: 10 }}>
        <Stack horizontal verticalAlign='baseline'>
          <CopyButton text={copyLink} title='Copy a link to this page' fontSize={16} />
          <Link href={pageLink} style={{ marginLeft: 4 }}>{systemName}</Link>

          <IconButton
            title='Search for a different system'
            iconProps={{ iconName: "Search" }}
          />
          {sysMap && <>
            <span style={{ width: 20 }} />
            <span
              className='bubble'
              style={sysMap.tierPoints.tier2 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : undefined}
            >
              <TierPoints tier={2} count={sysMap.tierPoints.tier2} />
            </span>
            <span style={{ width: 4 }} />
            <span
              className='bubble'
              style={sysMap.tierPoints.tier3 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : undefined}
            >
              <TierPoints tier={3} count={sysMap.tierPoints.tier3} />
            </span>
          </>}
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
            text: 'Add ...',
            iconProps: { iconName: 'Add' },
            split: true,
            onClick: () => this.createNewSite(),

            subMenuProps: {
              calloutProps: { style: { border: '1px solid ' + appTheme.palette.themePrimary } },
              items: [
                {
                  key: 'sys-add1',
                  text: 'Plan a new site',
                  iconProps: { iconName: 'WebAppBuilderFragmentCreate' },
                  onClick: () => this.createNewSite(),
                },
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
                {
                  key: 'sys-add4',
                  itemType: ContextualMenuItemType.Divider,
                },
                {
                  key: 'sys-add5',
                  text: 'Re-import from Spansh',
                  iconProps: { iconName: 'CityNext' },
                  onClick: () => this.doImport(),
                }
              ]
            }
          },

          {
            key: 'sys-change-view',
            title: 'Change view type',
            iconProps: { iconName: this.state.viewType === 'body' ? 'Nav2DMapView' : 'GridViewSmall' },
            onClick: () => {
              this.setState({ viewType: viewTypes[viewTypes.indexOf(this.state.viewType) + 1] ?? viewTypes[0] })
            }
          },

          {
            key: 'sys-save',
            title: 'Save changes to this system',
            disabled: !Object.keys(dirtySites).length && !deletedIDs.length,
            iconProps: { iconName: 'Save' },
            onClick: this.saveData,
          },

          {
            key: 'sys-load',
            title: 'Re-load this system, abandoning your current changes',
            iconProps: { iconName: 'OpenFolderHorizontal' },
            onClick: () => this.loadData(),
          },

          {
            key: 'sys-build-order',
            iconProps: { iconName: 'SortLines' },
            onClick: () => this.setState({ showBuildOrder: true }),
          },

          {
            key: 'open-in',
            iconProps: { iconName: 'OpenInNewWindow' },
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
            onRender: (item, dismissMenu) => {
              return !loading && !saving ? null : <div>
                <Spinner
                  size={SpinnerSize.medium}
                  labelPosition='right'
                  label={saving ? 'Saving ...' : 'Loading ...'}
                  style={{ marginTop: 12, cursor: 'default' }}
                />
              </div>
            },
          },
        ]}
      />
    </>;
  }

  renderSys() {
    const { sysMap, pinnedSite, viewType } = this.state;

    return <div className='system-view2'>
      <Stack horizontal wrap>
        {viewType === 'table' && this.renderBasicTable()}
        {viewType === 'body' && this.renderByBody()}

        {pinnedSite && <RightSide>
          <ViewSite
            site={pinnedSite}
            sysMap={sysMap}
            onChange={site => this.siteChanged(site)}
            onClose={() => this.sitePinned()}
          />
        </RightSide>}

        <RightSide>
          <SystemStats sysMap={this.state.sysMap} />
          {this.renderSystemValidationWarnings()}
        </RightSide>

      </Stack>
    </div>;
  }

  renderSystemValidationWarnings() {
    const { tierPoints, bodyMap, primaryPortId, siteMaps, reserveLevel } = this.state.sysMap;

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

    if (!primaryPortId) {
      validations.push(<div key={`valNoPrimary`}>No station has been marked as the system primary port <Icon className='icon-inline' iconName='CrownSolid' style={{ fontWeight: 'bold' }} /></div>);
    }

    if (!reserveLevel) {
      validations.push(<div key={`valNoReserve`}>
        » System reserve level unknown - set in <b>Advanced</b> on any site
        {!!siteMaps[0] && siteMaps[0].status === 'plan' && <IconButton
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
          style={{ width: 14, height: 14, marginLeft: 4 }}
        // onClick={() => this.setState({ editRealSite: { ...siteMaps[0] }, editFieldHighlight: 'reserveLevel' })}
        />}
      </div>);
    }

    if (tierPoints.tier2 < 0) {
      validations.push(<div key={`valTier2`}>» System needs <TierPoints tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div key={`valTier3`}>» System needs <TierPoints tier={3} count={-tierPoints.tier3} /></div>);
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