import './SystemView.css';
import { Component } from "react";
import { ProjectRef } from "../../types";
import { Icon, IconButton, Label, Link, Modal } from "@fluentui/react";
import { ProjectLink } from "../../components";
import { appTheme, cn } from "../../theme";
import { Chevrons, TierPoints } from "../../components/Chevrons";
import { asPosNegTxt } from "../../util";
import { BodyMap, buildSystemModel, SiteMap, SysMap } from "../../system-model";
import { SysEffects, mapName, sysEffects } from "../../site-data";
import { MarketLinks } from '../../components/MarketLinks/MarketLinks';


interface SystemViewProps {
  systemName: string;
  projects: ProjectRef[]
}

interface SystemViewState extends SysMap {
  showPortLinks?: SiteMap;
}

export class SystemView extends Component<SystemViewProps, SystemViewState> {

  constructor(props: SystemViewProps) {
    super(props);

    const sysMap = buildSystemModel(props.projects);
    this.state = {
      ...sysMap
    };
  }

  render() {
    const { bodies, architect, primaryPort, countSites, tierPoints, showPortLinks } = this.state;


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

      <br />
      <h3 className={cn.h3}>
        {Object.keys(bodies).length} Colonised bodies:
      </h3>
      <ul>
        {Object.values(bodies).map(b => this.renderBody(b))}
      </ul>
      <br />

      {!!showPortLinks && this.renderPortLinks(showPortLinks)}
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
    let maxKeys = Object.keys(economies)
      // .filter(k => sysInf[k] === max)
      .map(k => `${mapName[k]}: ${economies[k]}`)
      .join(', ');

    return <>
      <div>Economies:</div>
      <div style={{ gridColumn: '2 / span 3' }}>{maxKeys}</div>
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
    const isBodyPrimary = body.orbitalPrimary === site;
    // 
    return <div key={site.buildId}>
      {!site.complete && <Icon iconName='ConstructionCone' style={{ marginRight: 8, fontWeight: 'bold' }} title='Under construction' />}

      <ProjectLink proj={site} noSys noBold iconName={site.complete ? 'Communications' : ''} />
      {/* {!site.complete && <Icon iconName='ConstructionCone' style={{ marginLeft: 8, fontWeight: 'bold' }} title='Under construction' />} */}
      &nbsp;
      {isBodyPrimary && <Link onClick={() => this.setState({ showPortLinks: site })} title={`Market links for: ${site.buildName}`}>
        {/* <Icon iconName='Crown' style={{ marginLeft: 8, fontWeight: 'bold' }} title='Body primary port' /> */}
        {/* Market */}
        <Icon iconName='Link' style={{ marginLeft: 8, fontWeight: 'bold' }} />
      </Link>}
    </div>;
  }

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
}