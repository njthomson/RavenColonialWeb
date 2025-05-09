import './SystemView.css';
import { Component } from "react";
import { ProjectRef } from "../../types";
import { DefaultButton, Icon, IconButton, Label, Link, MessageBar, MessageBarType, Modal, PrimaryButton, Stack, Toggle } from "@fluentui/react";
import { ProjectLink } from "../../components";
import { appTheme, cn } from "../../theme";
import { Chevrons, TierPoints } from "../../components/Chevrons";
import { asPosNegTxt, delayFocus } from "../../util";
import { BodyMap, buildSystemModel, SiteMap, SysMap, unknown } from "../../system-model";
import { SysEffects, getSiteType, mapName, sysEffects } from "../../site-data";
import { EconomyBlocks, MarketLinkBlocks, MarketLinks } from '../../components/MarketLinks/MarketLinks';
import { BuildType } from '../../components/BuildType';
import { ChooseBody } from '../../components/ChooseBody';
import { EditProject } from '../../components/EditProject/EditProject';
import { BuildEffects } from '../../components/BuildEffects';

interface SystemViewProps {
  systemName: string;
  projects: ProjectRef[]
}

interface SystemViewState extends SysMap {
  showPortLinks?: SiteMap;
  showInlineMarketLinks?: boolean;
  editMockSite?: SiteMap;
  editRealSite?: SiteMap;
}

export class SystemView extends Component<SystemViewProps, SystemViewState> {
  static countNew = 0;
  static lastBuildType = 'vulcan';
  lastBodyName = '';

  constructor(props: SystemViewProps) {
    super(props);

    const sysMap = buildSystemModel(props.projects);

    // const mockSite = this.createMockSite(props.projects[0]);
    // mockSite.buildType = 'dodona';
    // const sysMap = buildSystemModel([...props.projects, mockSite]);

    this.state = {
      ...sysMap,
      showInlineMarketLinks: true,
    };
  }

  componentDidUpdate(prevProps: Readonly<SystemViewProps>, prevState: Readonly<SystemViewState>, snapshot?: any): void {
    if (prevProps.projects !== this.props.projects) {
      this.setState({
        ...buildSystemModel(this.props.projects)
      });
    }
  }

  render() {
    const { allSites, bodies, architect, primaryPort, countSites, tierPoints, showPortLinks, showInlineMarketLinks, editMockSite, editRealSite } = this.state;
    const showClearAllMocks = allSites.some(s => s.isMock);

    return <div className='half'>
      <h3 className={cn.h3}>
        Summary: {countSites} sites
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'max-content min-content min-content auto',
        gap: '2px 10px',
        fontSize: '14px',
      }}>

        {!primaryPort && <>
          <div />
          <div style={{ gridColumn: '2 / span 3' }}>⚑ No Primary port?</div>
        </>}

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
        <Toggle
          onText='Show market bars'
          offText='Show market bars'
          checked={showInlineMarketLinks}
          styles={{ container: { justifyContent: 'flex-end', margin: 0 } }}
          onClick={() => this.setState({ showInlineMarketLinks: !this.state.showInlineMarketLinks })}
        />

        <DefaultButton
          iconProps={{ iconName: 'WebAppBuilderFragmentCreate' }}
          text='What if ... ?'
          style={{ height: 22, }}
          onClick={() => {
            this.setState({ editMockSite: this.createMockSite(this.props.projects[0]) });
            delayFocus('mock-site-name-input');
          }}
        />

        {showClearAllMocks && <DefaultButton
          iconProps={{ iconName: 'RecycleBin' }}
          text='Reset...'
          style={{ height: 22 }}
          onClick={() => {
            // remove all mocks
            const newAllSites: ProjectRef[] = this.state.allSites.filter(s => !s.isMock);
            this.setState({
              ...buildSystemModel(newAllSites),
            });
          }}
        />}
      </Stack>

      <ul>
        {Object.values(bodies).map(b => this.renderBody(b))}
      </ul>
      <br />

      {!!showPortLinks && this.renderPortLinks(showPortLinks)}
      {!!editMockSite && this.renderEditMockSite()}
      {!!editRealSite && this.renderEditRealSite()}
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
      .map(k => `${mapName[k]}: ${economies[k]}`)
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


      return <>
        <div key={`se${key}1`}>{mapName[key]}:</div>
        <div key={`se${key}2`}>
          {actual < 0 && <Chevrons name={`sys${key}l`} count={actual} />}
        </div>
        <div key={`se${key}3`}>{asPosNegTxt(actual)}</div>
        <div key={`se${key}4`}>
          {actual > 0 && < Chevrons name={`sys${key}r`} count={actual} />}
        </div>
      </>
    });
  }

  renderSystemValidationWarnings() {
    const { tierPoints, bodies } = this.state;

    const validations = [];
    if (tierPoints.tier2 < 0) {
      validations.push(<div>System needs <TierPoints tier={2} count={-tierPoints.tier2} /></div>);
    }
    if (tierPoints.tier3 < 0) {
      validations.push(<div>System needs <TierPoints tier={3} count={-tierPoints.tier3} /></div>);
    }

    if (unknown in bodies) {
      validations.push(<div>{bodies.Unknown.sites.length} sites on unknown body</div>);
    }

    // TODO: check for missing preReq's?

    if (validations.length === 0) return <br />;

    return <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { margin: '8px 0' } }}> {validations}</MessageBar >;
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
    return <Modal
      isOpen
      onDismiss={() => this.setState({ showPortLinks: undefined })}
    >
      <IconButton
        iconProps={{ iconName: 'ChromeClose' }}
        style={{ position: 'absolute', right: 4, top: 4 }}
        onClick={() => this.setState({ showPortLinks: undefined })}
      />
      <MarketLinks site={site} showName />
    </Modal>;
  }

  renderBody(body: BodyMap) {
    return <li key={`li${body.name}`} style={{ marginBottom: 8 }}>
      <Label>{body.name}</Label>

      {!!body.orbital.length && body.orbital.map(site => this.renderSite(body, site))}
      {!body.orbital.length && <>
        <span key={`b${body.name}-noo`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='Communications' /> No orbital sites</span>
      </>}

      <div style={{ margin: '4px 40px 4px -10px', height: 1, borderBottom: `1px dashed ${appTheme.palette.neutralTertiaryAlt}` }}></div>

      {!!body.surface.length && body.surface.map(site => this.renderSite(body, site))}
      {!body.surface.length && <>
        <span key={`b${body.name}-nos`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='MountainClimbing' /> No surface sites</span>
      </>}

    </li>;
  }

  renderSite(body: BodyMap, site: SiteMap) {
    const { showInlineMarketLinks } = this.state;
    const isBodyPrimary = body.orbitalPrimary === site;

    const viewMarketLink = <Link
      title={`Market links for: ${site.buildName}`}
      onClick={() => this.setState({ showPortLinks: site })}
    >
      <Icon className='icon-inline' iconName='Link' style={{ marginLeft: 8, fontWeight: 'bold' }} />
    </Link>;

    return <div>
      <Stack key={site.buildId} horizontal verticalAlign='baseline'>
        <ProjectLink proj={site} noSys noBold iconName={site.complete ? 'Communications' : ''} />

        {!site.complete && !site.isMock && <Icon iconName='ConstructionCone' style={{ marginLeft: 8 }} title='Under construction' />}

        {isBodyPrimary && !showInlineMarketLinks && viewMarketLink}

        {/* {site.isMock && <IconButton
          title={`Edit mock site: ${site.buildName}`}
          iconProps={{ iconName: 'Edit' }}
          onClick={() => this.setState({ editMockSite: { ...site } })}
        >
          <Icon iconName='Edit' style={{ marginLeft: 8, fontWeight: 'bold' }} />
        </IconButton>} */}

        <IconButton
          iconProps={{ className: 'icon-inline', iconName: 'Edit' }}
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

      {isBodyPrimary && showInlineMarketLinks && <Stack
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
      architectName: proj.architectName,
      systemAddress: proj.systemAddress,
      systemName: proj.systemName,
      starPos: proj.starPos,
      marketId: 0,
      maxNeed: 0,

      isMock: true,
      complete: true,
      isPrimaryPort: false,

      buildType: SystemView.lastBuildType,
      type: getSiteType(SystemView.lastBuildType),
      buildName: `New #${++SystemView.countNew}`,
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
        validations.push(<div>System needs <TierPoints tier={needs.tier} count={deficit} /></div>);
      }

    }

    return <Modal
      isOpen
      onDismiss={() => this.setState({ editMockSite: undefined })}
    >
      <h3 className={cn.h3}>
        What if ... ?
      </h3>
      <div style={{ color: appTheme.palette.themeSecondary }}>Use a theoretical site to observe it's impact upon system economies.</div>

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
              buildType={this.state.editMockSite?.buildType}
              onChange={(newBuildType) => {
                const editMockSite = this.state.editMockSite;
                if (editMockSite) {
                  SystemView.lastBuildType = newBuildType;
                  editMockSite.buildType = newBuildType;
                  editMockSite.type = getSiteType(newBuildType);
                  this.setState({ editMockSite: editMockSite });
                }
              }}
            />
          </span>
          <BuildEffects proj={editMockSite} noTitle />
        </div>

      </div>

      {validations.length > 0 && <MessageBar messageBarType={MessageBarType.warning}>{validations}</MessageBar>}

      <div className='small' style={{ color: appTheme.palette.themeSecondary, margin: '8px 0' }}>These are temporary and will not be saved for future sessions</div>

      <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} horizontalAlign='end' verticalAlign='baseline' >
        <PrimaryButton
          text='Save'
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
    const { allSites } = this.state;
    if (!editMockSite) return;

    // remove old instance of the mock site, before adding it back
    const newAllSites = allSites.filter(s => s.buildId !== editMockSite.buildId);

    if (!remove) {
      newAllSites.push(editMockSite);
    }

    this.setState({
      ...buildSystemModel(newAllSites),
      editMockSite: undefined
    });
  };

  renderEditRealSite() {
    const { editRealSite } = this.state;
    if (!editRealSite) return null;

    return <EditProject
      proj={editRealSite}
      onChange={updatedProj => {

        // remove old instance of the site, before adding it back
        const newAllSites: ProjectRef[] = this.state.allSites.filter(s => s.buildId !== updatedProj?.buildId);
        if (updatedProj) {
          newAllSites.push(updatedProj);
        }

        this.setState({
          ...buildSystemModel(newAllSites),
          editRealSite: undefined
        });
      }}
    />;
  }
}