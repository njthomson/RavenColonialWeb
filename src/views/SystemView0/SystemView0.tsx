import './SystemView0.css';
import * as api from '../../api';
import { Component } from "react";
import { ProjectRef } from "../../types";
import { ContextualMenu, DefaultButton, Dialog, DialogFooter, Icon, IconButton, Label, MessageBar, MessageBarType, Modal, Panel, PanelType, PrimaryButton, Stack, Toggle } from "@fluentui/react";
import { ProjectLink } from "../../components";
import { appTheme, cn } from "../../theme";
import { Chevrons, TierPoints } from "../../components/Chevrons";
import { asPosNegTxt, delayFocus, isMobile } from "../../util";
import { BodyMap, buildSystemModel, SiteMap, SysMap, unknown } from "../../system-model";
import { SysEffects, getSiteType, mapName, sysEffects } from "../../site-data";
import { EconomyBlocks, MarketLinkBlocks, MarketLinks } from '../../components/MarketLinks/MarketLinks';
import { BuildType } from '../../components/BuildType/BuildType';
import { ChooseBody } from '../../components/ChooseBody';
import { EditProject } from '../../components/EditProject/EditProject';
import { BuildEffects } from '../../components/BuildEffects';
import { store } from '../../local-storage';
import { FixFromCanonn } from '../../components/FixFromCanonn';
import { MockMin } from '../../api/system';
import { EconomyTable } from '../../components/MarketLinks/EconomyTable';

interface SystemView0Props {
  systemName: string;
  projects: ProjectRef[]
}

interface SystemView0State extends SysMap {
  systemAddress: number;
  showPortLinks?: SiteMap;
  showInlineMarketLinks?: boolean;
  editMockSite?: SiteMap;
  editRealSite?: SiteMap;
  editFieldHighlight?: string;
  useIncomplete: boolean;
  showFixMissingTypes?: boolean;
  showBuildOrder?: boolean;

  networking?: boolean;
  etagMocks?: string;
  showLoadMocksDialog?: boolean;
  saveConflict?: boolean;
}

export class SystemView0 extends Component<SystemView0Props, SystemView0State> {
  static countNew = 0;
  static lastBuildType = 'vulcan';
  lastBodyName = '';

  constructor(props: SystemView0Props) {
    super(props);

    const useIncomplete = store.useIncomplete;
    const sysMap = buildSystemModel(props.projects, useIncomplete);

    // const mockSite = this.createMockSite(props.projects[0]);
    // mockSite.buildType = 'vulcan';
    // mockSite.bodyName = props.projects[0].bodyName;
    // const sysMap = buildSystemModel([...props.projects, mockSite], store.useIncomplete);

    this.state = {
      ...sysMap,
      showInlineMarketLinks: true,
      useIncomplete: useIncomplete,
    };
  }

  componentDidMount(): void {
    window.addEventListener('keyup', this.onKeyPress);
  }

  componentWillUnmount(): void {
    window.removeEventListener('keyup', this.onKeyPress);
  }

  onKeyPress = (ev: KeyboardEvent) => {
    if (ev.altKey && ev.key === 'c') {
      // Use key combination ALT + C to toggle between using incomplete sites or not
      this.toggleUseIncomplete();
    }
  };

  toggleUseIncomplete = () => {
    const newUseIncomplete = !this.state.useIncomplete;
    store.useIncomplete = newUseIncomplete;
    this.setState({
      ...buildSystemModel(this.state.allSites, newUseIncomplete),
      useIncomplete: newUseIncomplete
    });
  };

  componentDidUpdate(prevProps: Readonly<SystemView0Props>, prevState: Readonly<SystemView0State>, snapshot?: any): void {
    if (prevProps.projects !== this.props.projects) {
      this.setState({
        ...buildSystemModel(this.props.projects, this.state.useIncomplete)
      });
    }
  }

  loadMocks = async (resolution?: 'merge' | 'replace' | undefined) => {
    try {
      // warn before loading?
      if (!resolution && this.state.allSites.some(s => s.isMock)) {
        this.setState({ showLoadMocksDialog: true });
        return;
      } else {
        this.setState({ showLoadMocksDialog: false, networking: true })
      }

      // request the mocks
      const payload = await api.system.loadMocks(this.state.systemName);

      // rehydrate ...
      const newMockProjects = payload.mocks.map(mock => {
        return {
          // use what we are given
          ...mock,
          // plus default values
          architectName: this.state.architect!,
          systemAddress: this.state.systemAddress,
          systemName: this.state.systemName,
          starPos: [0, 0, 0],
          marketId: 0,
          maxNeed: 0,
          complete: false,
          isMock: true,
        } as SiteMap;
      });

      // remove all mocks or only those that collide?
      const newAllSites = resolution === 'replace'
        ? this.state.allSites.filter(s => !s.isMock)
        : this.state.allSites.filter(s => !newMockProjects.some(m => m.buildId === s.buildId));
      newAllSites.push(...newMockProjects);

      this.setState({
        ...buildSystemModel(newAllSites, this.state.useIncomplete),
        etagMocks: payload.etag,
        networking: false,
      });
    } catch (err: any) {
      console.error(`loadMocks failed:`, err);
      this.setState({ networking: false });
    }
  };

  saveMocks = async (force: boolean = false) => {
    try {
      this.setState({ networking: true, saveConflict: false });

      const fieldsToSave = [
        'buildId',
        'buildType',
        'buildName',
        'bodyName',
        'timeCompleted',
        'isPrimaryPort',
      ];

      // reduce mocks to minimal fields
      const minMocks = this.state.allSites
        .filter(s => s.isMock)
        .map(s => {
          const mock: any = {};
          for (const key of fieldsToSave) {
            mock[key] = s[key as keyof SiteMap];
          }
          return mock as MockMin;
        });

      const etag = await api.system.saveMocks(this.state.systemName, {
        etag: force ? "*" : this.state.etagMocks ?? '',
        mocks: minMocks,
      });
      this.setState({
        networking: false,
        etagMocks: etag,
      });
    } catch (err: any) {
      if (err.statusCode === 409) {
        this.setState({ networking: false, saveConflict: true });
      } else {
        console.error(`saveMocks failed:`, err);
        this.setState({ networking: false });
      }
    }
  };

  render() {
    const { allSites, bodies, architect, countSites, tierPoints, showPortLinks, editMockSite, editRealSite, useIncomplete, showBuildOrder, networking, showLoadMocksDialog, saveConflict } = this.state;
    const showClearAllMocks = allSites.some(s => s.isMock);
    const canLoadSaveMocks = !!store.cmdrName;

    return <div className='half system-view'>
      <h3 className={cn.h3}>
        <Stack horizontal verticalAlign='baseline' tokens={{ childrenGap: 8 }}>
          <span>Summary: {countSites} sites</span>
          <span title='(ALT + C) Toggles inclusion of incomplete site in system calculations.'>
            <Toggle
              onText='Include incomplete projects'
              offText='Include incomplete projects'
              checked={useIncomplete}
              style={{ marginLeft: 100 }}
              styles={{ container: { margin: 0 } }}
              onClick={this.toggleUseIncomplete}
            />
          </span>
        </Stack>
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'max-content min-content min-content auto',
        gap: '2px 10px',
        fontSize: '14px',
      }}>

        <div>System architect:</div>
        <div style={{ gridColumn: '2 / span 3' }}>{architect}</div>

        <div>Tier points:</div>
        <div style={{ gridColumn: '2 / span 3' }}>
          <TierPoints tier={2} count={tierPoints.tier2} />
          &nbsp;
          <TierPoints tier={3} count={tierPoints.tier3} />
        </div>

        {this.renderSysEconomies()}

        {this.renderSysEffects2()}
      </div>

      {/* {this.renderSysEffects()} */}

      {this.renderSystemValidationWarnings()}

      <h3 className={cn.h3}>
        {Object.keys(bodies).length} Colonised bodies:
      </h3>

      <Stack horizontal verticalAlign='baseline' tokens={{ childrenGap: 8 }}>
        <IconButton
          iconProps={{ iconName: 'SortLines', className: cn.dibi }}
          title='View the order of sites for calculations'
          style={{ color: appTheme.palette.black, border: `1px solid ${appTheme.palette.black}` }}
          disabled={networking}
          onClick={() => this.setState({ showBuildOrder: true })}
        />

        <DefaultButton
          iconProps={{ iconName: 'WebAppBuilderFragmentCreate' }}
          text='What if ... ?'
          style={{ height: 22, }}
          disabled={networking}
          onClick={() => {
            this.setState({ editMockSite: this.createMockSite(this.props.projects[0]) });
            delayFocus('mock-site-name-input');
          }}
        />

        {canLoadSaveMocks && <IconButton
          title='Load saved mock "What if" sites'
          iconProps={{ iconName: 'OpenFolderHorizontal', className: cn.dibi }}
          style={{ color: appTheme.palette.black, border: `1px solid ${appTheme.palette.black}` }}
          disabled={networking}
          onClick={() => this.loadMocks()}
        />}

        {showClearAllMocks && <>
          {canLoadSaveMocks && <IconButton
            title='Save mock "What if" sites for a future session'
            iconProps={{ iconName: 'Save', className: cn.dibi }}
            style={{ color: appTheme.palette.black, border: `1px solid ${appTheme.palette.black}` }}
            disabled={networking}
            onClick={() => this.saveMocks()}
          />}

          <DefaultButton
            iconProps={{ iconName: 'RecycleBin' }}
            text='Reset...'
            style={{ height: 22 }}
            disabled={networking}
            onClick={() => {
              // remove all mocks
              const newAllSites: ProjectRef[] = this.state.allSites.filter(s => !s.isMock);
              this.setState({
                ...buildSystemModel(newAllSites, useIncomplete),
              });
            }}
          />
        </>}
      </Stack>

      <ul>
        {Object.values(bodies).map(b => this.renderBody(b))}
      </ul>
      <br />

      {!!showPortLinks && this.renderPortLinks(showPortLinks)}
      {!!editMockSite && this.renderEditMockSite()}
      {!!editRealSite && this.renderEditRealSite()}
      {!!showBuildOrder && this.renderBuildOrder()}

      {canLoadSaveMocks && <>
        {!!showLoadMocksDialog && <Dialog
          hidden={false}
          dialogContentProps={{ title: 'Load mock sites' }}
          minWidth={420}
        >
          You already have some mock "What if" sites. Would you like to replace or merge with them?
          <DialogFooter>
            <PrimaryButton text="Merge" iconProps={{ iconName: 'Merge' }} onClick={() => this.loadMocks('merge')} />
            <DefaultButton text="Replace" iconProps={{ iconName: 'Warning' }} onClick={() => this.loadMocks('replace')} />
            <DefaultButton text="Cancel" iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showLoadMocksDialog: false })} />
          </DialogFooter>
        </Dialog>}


        {!!saveConflict && <Dialog
          hidden={false}
          dialogContentProps={{ title: 'Caution' }}
          minWidth={420}
        >
          <Icon iconName='Warning' style={{ fontSize: 40, float: 'left', marginRight: 10 }} />
          <div>
            This system already has saved mock "What if" sites.
            Do you want to overwrite them?
          </div>
          <DialogFooter>
            <PrimaryButton text="Yes" iconProps={{ iconName: 'CheckMark' }} onClick={() => this.saveMocks(true)} />
            <DefaultButton text="No" iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ saveConflict: false })} />
          </DialogFooter>
        </Dialog>}
      </>}
    </div >;
  }

  renderSysEconomies() {
    const { economies } = this.state;

    // let rows = Object.keys(sysInf)
    //   .filter(k => k !== 'none' && sysInf[k as Economy] > 0)
    //   .map(k => <span key={`se${k}`} style={{ margin: 8 }}>
    //     {k}: {sysInf[k as Economy]}
    //   </span>);

    // let max = Math.max(...Object.values(sysInf));
    let econTxt = Object.keys(economies)
      // .filter(k => sysInf[k] === max)
      .map(k => `${mapName[k] ?? k}: ${economies[k]}`)
      .join(', ');

    return <>
      <div>Economies:</div>
      <div style={{ gridColumn: '2 / span 3' }}>
        <div>{econTxt}</div>
        <EconomyBlocks economies={economies} width={200} height={10} />
      </div>
    </>;
  }

  renderSysEffects2() {
    const { sumEffects } = this.state;

    return sysEffects.map(key => {
      const actual = sumEffects[key as keyof SysEffects] ?? 0;
      if (key === 'pop' || key === 'mpop') return null;

      return [
        <div key={`se${key}1`}>{mapName[key]}:</div>,
        <div key={`se${key}2`}>
          {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} />}
        </div>,
        <div key={`se${key}3`}>{asPosNegTxt(actual)}</div>,
        <div key={`se${key}4`}>
          {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} />}
        </div>,
      ]
    });
  }

  renderSystemValidationWarnings() {
    const { tierPoints, bodies, primaryPort, allSites } = this.state;

    const validations = [];

    const getMiniLink = (s: SiteMap, fieldHighlight: string, key: string) => {
      return <div
        key={key}
        style={{ marginLeft: 10 }}
      >
        <ProjectLink proj={s} noSys noBold noType iconName={s.complete ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />
        <IconButton
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
          style={{ width: 14, height: 14, marginLeft: 4 }}
          onClick={() => {
            if (s.isMock) {
              this.setState({ editMockSite: { ...s } });
            } else {
              this.setState({ editRealSite: { ...s }, editFieldHighlight: fieldHighlight });
            }
          }}
        />
      </div>;
    };

    if (!primaryPort) {
      validations.push(<div key={`valNoPrimary`}>No station has been marked as the system primary port <Icon className='icon-inline' iconName='CrownSolid' style={{ fontWeight: 'bold' }} /></div>);
    }

    if (!allSites[0]?.reserveLevel) {
      validations.push(<div key={`valNoReserve`}>
        » System reserve level unknown - set in <b>Advanced</b> on any site
        {!!allSites[0] && !allSites[0].isMock && <IconButton
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
          style={{ width: 14, height: 14, marginLeft: 4 }}
          onClick={() => this.setState({ editRealSite: { ...allSites[0] }, editFieldHighlight: 'reserveLevel' })}
        />}
      </div>);
    }

    if (tierPoints.tier2 < 0) {
      validations.push(<div key={`valTier2`}>» System needs <TierPoints tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div key={`valTier3`}>» System needs <TierPoints tier={3} count={-tierPoints.tier3} /></div>);
    }

    if (unknown in bodies) {
      validations.push(<div key={`valNoBody`}>
        » There are {bodies.Unknown.sites.length} site(s) on unknown bodies:
        <br />
        {bodies.Unknown.sites.map(s => getMiniLink(s, 'bodyName', `noBody${s.buildName}`))}
      </div>);
    }

    const countTaxable = allSites.filter(s => s.type.buildClass === 'starport' && s.type.tier > 1);
    const taxableMissingDate = countTaxable.filter(s => !s.timeCompleted);
    if (countTaxable.length > 3 && taxableMissingDate.length > 0) {
      validations.push(<div key={`valShouldSetDates`}>
        » Set <b>Date Complete</b> on the following to ensure tier points are scaled correctly:
        <br />
        {taxableMissingDate.map(s => getMiniLink(s, 'timeCompleted', `noDate${s.buildName}`))}
      </div>);
    }

    // TODO: check for missing preReq's?

    // do we have any sites with body name but not type?
    const missingType = this.state.allSites.filter(s => !s.bodyType && s.bodyName && !s.isMock);
    const showFixMissingTypes = this.state.systemAddress > 0 && missingType.length > 0;

    return <>
      {showFixMissingTypes && <FixFromCanonn sites={this.state.allSites} />}
      {validations.length > 0 && <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { margin: '8px 0', maxWidth: 600 } }}> {validations}</MessageBar>}
      <br />
    </>;
  }

  // renderSysEffects() {
  //   const { potentialEffects } = this.state;

  //   const rows = Object.keys(potentialEffects).map(key => {
  //     const value = potentialEffects[key as keyof SysEffects];
  //     if (!value || key === 'pop' || key === 'mpop') return null;

  //     return <tr key={`se${key}`} title={`${mapName[key]}: ${asPosNegTxt(value)}`}>
  //       <td>{mapName[key]}:</td>
  //       <td>
  //         {value < 0 && <Chevrons name={`sys${key}l`} count={value} />}
  //       </td>
  //       <td>
  //         <span>{asPosNegTxt(value)}</span>
  //       </td>
  //       <td>
  //         {value > 0 && <Chevrons name={`sys${key}r`} count={value} />}
  //       </td>
  //     </tr>
  //   });

  //   return <div>
  //     <table cellPadding={0} cellSpacing={0} >
  //       <tbody>
  //         {rows}
  //       </tbody>
  //     </table>
  //   </div>;
  // }

  renderPortLinks(site: SiteMap) {
    const { useIncomplete } = this.state;
    return <Modal
      isOpen
      allowTouchBodyScroll={isMobile()}
      dragOptions={{
        moveMenuItemText: 'Move',
        closeMenuItemText: 'Close',
        menu: ContextualMenu,
        keepInBounds: false,
        dragHandleSelector: '#market-links',
      }}
      onDismiss={() => this.setState({ showPortLinks: undefined })}
    >
      <IconButton
        iconProps={{ iconName: 'ChromeClose' }}
        style={{ position: 'absolute', right: 4, top: 4 }}
        onClick={() => this.setState({ showPortLinks: undefined })}
      />
      <MarketLinks site={site} showName />
      {(site.complete || useIncomplete) && <EconomyTable site={site} />}
    </Modal>;
  }

  renderBody(body: BodyMap) {
    return <li key={`li${body.name}`} style={{ marginBottom: 8 }}>
      <Label style={{ fontSize: 18 }}>{body.name}</Label>

      {!!body.orbital.length && body.orbital.map(site => this.renderSite(body, site))}
      {!body.orbital.length && <>
        <span key={`b${body.name}-noo`} style={{ color: 'grey', fontSize: 12 }}><Icon iconName='ProgressRingDots' /> No orbital sites</span>
      </>}

      <div style={{ margin: '4px 40px 4px -10px', height: 1, borderBottom: `1px dashed ${appTheme.palette.neutralTertiaryAlt}` }}></div>

      {!!body.surface.length && body.surface.map(site => this.renderSite(body, site))}
      {!body.surface.length && <>
        <span key={`b${body.name}-nos`} style={{ color: 'grey', fontSize: 12 }}><Icon iconName='GlobeFavorite' /> No surface sites</span>
      </>}

    </li>;
  }

  renderSite(body: BodyMap, site: SiteMap) {
    const { showInlineMarketLinks, useIncomplete } = this.state;
    const isBodyPrimary = body.orbitalPrimary === site;

    const viewMarketLink = <IconButton
      className={`icon-inline ${cn.btn}`}
      iconProps={{ iconName: 'Link' }}
      style={{ width: 22, height: 22, marginLeft: 8, fontWeight: 'bold' }}
      title={`Market links for: ${site.buildName}`}
      onClick={() => this.setState({ showPortLinks: site })}
    />;

    return <div
      key={`li${body.name}${site.buildName}`}
      className={`removable ${cn.removable}`}
    >
      <Stack key={site.buildId} horizontal verticalAlign='center' style={{ height: 22 }}>
        <ProjectLink proj={site} noSys noBold iconName={site.complete ? (site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} greyIncomplete={!useIncomplete} />

        {!site.complete && !site.isMock && <Icon iconName='ConstructionCone' style={{ marginLeft: 8 }} title='Under construction' />}
        {!site.complete && site.isMock && <Icon iconName='WebAppBuilderFragmentCreate' style={{ marginLeft: 8 }} title='A "What if" site' />}

        {isBodyPrimary && !showInlineMarketLinks && viewMarketLink}

        {/* {site.isMock && <IconButton
          title={`Edit mock site: ${site.buildName}`}
          iconProps={{ iconName: 'Edit' }}
          onClick={() => this.setState({ editMockSite: { ...site } })}
        >
          <Icon iconName='Edit' style={{ marginLeft: 8, fontWeight: 'bold' }} />
        </IconButton>} */}

        <IconButton
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit' }}
          style={{ width: 22, height: 22, marginLeft: 4 }}
          onClick={() => {
            if (site.isMock) {
              this.setState({ editMockSite: { ...site } });
            } else {
              this.setState({ editRealSite: { ...site } });
            }
          }}
        />
      </Stack>

      {showInlineMarketLinks && !!site.links && <Stack
        horizontal verticalAlign='baseline'
        tokens={{ childrenGap: 8 }}
        style={{ marginLeft: 20 }}
      >
        <MarketLinkBlocks site={site} width={200} height={10} />
        {viewMarketLink}
      </Stack>}

    </div>;
  }

  createMockSite(proj: ProjectRef) {
    const site: SiteMap = {
      architectName: proj?.architectName,
      systemAddress: proj?.systemAddress,
      systemName: proj?.systemName,
      starPos: proj?.starPos,
      marketId: 0,
      maxNeed: 0,

      isMock: true,
      complete: false,
      isPrimaryPort: false,

      buildType: SystemView0.lastBuildType,
      type: getSiteType(SystemView0.lastBuildType),
      timeCompleted: '9999' + new Date().toISOString().substring(4),
      buildName: `New #${++SystemView0.countNew}`,
      bodyName: this.lastBodyName,

      buildId: Date.now().toString(),
    };
    return site;
  }

  renderEditMockSite() {
    const { editMockSite, tierPoints, allSites } = this.state;
    if (!editMockSite) return;

    const original = allSites.find(s => s.buildId === editMockSite.buildId);

    // is this valid for the current system?
    const validations = [];
    const needs = editMockSite.type.needs;
    if (needs.count > 0) {
      let deficit = needs.count - (needs.tier === 2 ? tierPoints.tier2 : tierPoints.tier3);
      if (editMockSite.buildType === original?.buildType) deficit -= needs.count;

      if (deficit > 0) {
        validations.push(<div key={`valTierPoints`}>System needs <TierPoints tier={needs.tier} count={deficit} /></div>);
      }
    }

    return <Modal
      isOpen
      onDismiss={() => this.setState({ editMockSite: undefined })}
    >
      <h3 className={cn.h3}>
        What if ... ?
      </h3>
      <div style={{ color: appTheme.palette.themeSecondary }}>A theoretical site to observe impact upon system economies</div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'max-content auto',
        gap: '2px 10px',
        fontSize: '14px',
        margin: '8px 0 8px 0',
      }}>

        <Label required>Name:</Label>
        <div>
          <input
            id='mock-site-name-input'
            className='tinput'
            type='text'
            value={editMockSite?.buildName}
            style={{
              backgroundColor: appTheme.palette.white,
              color: appTheme.palette.black,
              border: '1px solid ' + appTheme.palette.black,
              width: 300,
            }}
            onChange={(ev) => {
              const editMockSite = this.state.editMockSite;
              if (editMockSite) {
                editMockSite.buildName = ev.target.value;
                this.setState({ editMockSite: editMockSite });
              }
            }}
          />
        </div>

        <Label>Body:</Label>
        <ChooseBody
          systemName={this.props.systemName}
          bodyName={this.state.editMockSite?.bodyName}
          onChange={(name, num) => {
            const editMockSite = this.state.editMockSite;
            if (editMockSite) {
              this.lastBodyName = name;
              editMockSite.bodyName = name;
              editMockSite.bodyNum = num;
              this.setState({ editMockSite: editMockSite });
            }
          }}
        />

        <Label required>Type:</Label>
        <div>
          <span style={{ fontWeight: 'bold' }}>
            <BuildType
              sysMap={this.state}
              buildType={this.state.editMockSite?.buildType}
              onChange={(newBuildType) => {
                const editMockSite = this.state.editMockSite;
                if (editMockSite) {
                  SystemView0.lastBuildType = newBuildType;
                  editMockSite.buildType = newBuildType;
                  editMockSite.type = getSiteType(newBuildType);
                  this.setState({ editMockSite: editMockSite });
                }
              }}
            />
          </span>
          <BuildEffects buildType={editMockSite.buildType} noTitle />
        </div>

      </div>

      {validations.length > 0 && <MessageBar messageBarType={MessageBarType.warning}>{validations}</MessageBar>}

      <div className='small' style={{ color: appTheme.palette.themeSecondary, margin: '8px 0' }}>These are temporary unless explicitly saved for future sessions</div>

      <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} horizontalAlign='end' verticalAlign='baseline' >
        <PrimaryButton
          text='Okay'
          iconProps={{ iconName: 'WebAppBuilderFragmentCreate' }}
          onClick={() => this.onApplyMockSite(this.state.editMockSite)}
        />
        <DefaultButton
          text='Remove'
          iconProps={{ iconName: 'Delete' }}
          onClick={() => this.onApplyMockSite(this.state.editMockSite, true)}
        />
        <DefaultButton
          text='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => this.setState({ editMockSite: undefined })}
        />
      </Stack>

    </Modal>;
  }

  onApplyMockSite = (editMockSite: SiteMap | undefined, remove: boolean = false) => {
    const { allSites, useIncomplete } = this.state;
    if (!editMockSite) return;

    // remove old instance of the mock site, before adding it back
    const newAllSites = allSites.filter(s => s.buildId !== editMockSite.buildId);

    if (!remove) {
      newAllSites.push(editMockSite);
    }

    this.setState({
      ...buildSystemModel(newAllSites, useIncomplete),
      editMockSite: undefined
    });
  };

  renderEditRealSite() {
    const { editRealSite, useIncomplete, editFieldHighlight } = this.state;
    if (!editRealSite) return null;

    const showAdvanced = editFieldHighlight === 'reserveLevel';

    return <EditProject
      proj={editRealSite}
      sysMap={this.state}
      showAdvanced={showAdvanced}
      fieldHighlight={editFieldHighlight}
      onChange={updatedProj => {

        // remove old instance of the site, before adding it back
        const newAllSites: ProjectRef[] = this.state.allSites.filter(s => s.buildId !== updatedProj?.buildId);
        if (updatedProj) {
          // and apply system level fields to all sites
          newAllSites.forEach(s => {
            s.systemFeatures = updatedProj.systemFeatures;
            s.reserveLevel = updatedProj.reserveLevel;
          });

          newAllSites.push(updatedProj);
        }

        this.setState({
          ...buildSystemModel(newAllSites, useIncomplete),
          editRealSite: undefined,
          editFieldHighlight: undefined,
        });
      }}
    />;
  }

  renderBuildOrder() {
    const { allSites, systemName } = this.state;

    const rows = allSites.map((s, i) => <tr key={`bol${s.buildId}`} style={{ backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined }}>
      <td className={`cr ${cn.br}`}>{i + 1}</td>

      <td className={`cl`}>
        <ProjectLink proj={s} noSys noBold iconName={s.complete ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />
      </td>

      <td className={`c3 ${cn.br}`}>
        <IconButton
          className={`btn ${cn.btn}`}
          iconProps={{ iconName: 'Edit', style: { fontSize: 12 } }}
          style={{ width: 14, height: 14, marginLeft: 4 }}
          onClick={() => {
            if (s.isMock) {
              this.setState({ editMockSite: { ...s } });
            } else {
              this.setState({ editRealSite: { ...s }, editFieldHighlight: 'timeCompleted' });
            }
          }}
        />
      </td>

      <td className={`cr ${cn.br}`}>{s.bodyName?.replace(systemName, '')}</td>

      <td className={`cr`}>{s.timeCompleted && !s.timeCompleted.startsWith('9999') ? new Date(s.timeCompleted).toLocaleDateString() : <div style={{ textAlign: 'center', color: 'grey' }}>-</div>}</td>
    </tr>);

    return <>
      <Panel
        isOpen
        isLightDismiss
        className='build-order'
        headerText='Order for calculations:'
        allowTouchBodyScroll={isMobile()}
        type={PanelType.medium}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={(ev) => {
          // closing  EditProject triggers this - so we'll ignore it if there is a site to be edited
          if (!this.state.editRealSite && !this.state.editMockSite) {
            this.setState({ showBuildOrder: false });
          }
        }}
      >
        <div style={{ marginBottom: 8, color: appTheme.palette.themeDark }}>
          Calculations are performed on sites ordered by their <b>Date Completed</b> value.
          <br />
          Change these dates to adjust the order of calculations.
        </div>

        <table cellPadding={0} cellSpacing={0}>
          <colgroup>
            <col width='5%' />
            <col width='70%' />
            <col width='5%' />
            <col width='8%' />
            <col width='12%' />
          </colgroup>

          <thead>
            <tr>
              <th className={`cr ${cn.bb} ${cn.br}`}>#</th>
              <th className={`cl ${cn.bb} ${cn.br}`} colSpan={2}>Site</th>
              <th className={`${cn.bb} ${cn.br}`}>Body</th>
              <th className={`${cn.bb}`}>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </Panel>
    </>;
  }
}