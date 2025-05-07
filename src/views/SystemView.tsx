import { Component } from "react";
import { ProjectRef } from "../types";
import { Icon, Label } from "@fluentui/react";
import { ProjectLink } from "../components";
import { appTheme, cn } from "../theme";
import { getSiteType, mapName, SiteType, SysEffects, sysEffectsNames } from "../site-data";
import { Chevrons, TierPoints } from "../components/Chevrons";
import { asPosNegTxt } from "../util";


interface ProjectRef2 extends ProjectRef {
  siteType: SiteType;
  // linkStrong: Projec
}
interface BodyData {
  name: string;
  surface: ProjectRef2[];
  orbital: ProjectRef2[];
}

interface SystemViewProps {
  systemName: string;
  projects: ProjectRef[]
}

interface SystemViewState {
  siteCount: number;
  activeCount: number;
  bodies: Record<string, BodyData>;
  architectName: string;
  primaryPort: ProjectRef | undefined;
  tierPoints: [number, number]

  actualEffects: SysEffects;
  potentialEffects: SysEffects;
  sysInf: Record<string, number>
}

export class SystemView extends Component<SystemViewProps, SystemViewState> {

  constructor(props: SystemViewProps) {
    super(props);

    this.state = {
      ...this.prepStateFromProjects(props.projects)
    };

  }

  prepStateFromProjects(projects: ProjectRef[]): SystemViewState {
    // build map of sites per body and location
    const projects2 = projects.map(p => ({ ...p, siteType: getSiteType(p.buildType) } as ProjectRef2));

    const mapByBody = projects2.reduce((map, p) => {
      let bodyName = p.bodyName || 'Unknown';

      if (!map[bodyName]) { map[bodyName] = { name: bodyName, surface: [], orbital: [] }; }

      if (p.siteType.orbital)
        map[bodyName].orbital.push(p);
      else
        map[bodyName].surface.push(p);

      return map;
    }, {} as Record<string, BodyData>);

    // sort by body name but force Unknown to be last in the list
    const keys = Object.keys(mapByBody)
      .filter(n => n !== 'Unknown')
      .sort();
    if ('Unknown' in mapByBody) { keys.push('Unknown'); }
    const finalMap: Record<string, BodyData> = {};
    for (let key of Object.keys(mapByBody)) { finalMap[key] = mapByBody[key]; }


    const sysInf: Record<string, number> = {};
    const potentialEffects: SysEffects = {};
    const actualEffects: SysEffects = {};
    const tierPoints: [number, number] = [0, 0];
    let activeCount = 0;

    for (const p of projects2) {

      // calc total system Economic influence
      sysInf[p.siteType.inf] = (sysInf[p.siteType.inf] ?? 0) + 1;

      // calc total system effects
      for (const key of sysEffectsNames) {
        const siteEffect = p.siteType.effects[key];
        if (!siteEffect) continue;

        if (p.complete) {
          actualEffects[key] = (actualEffects[key] ?? 0) + siteEffect;
        } else {
          potentialEffects[key] = (potentialEffects[key] ?? 0) + siteEffect;
        }
      }

      // adjust system tier points
      if (p.siteType.needs.count > 0 && p.siteType.needs.tier > 1) {
        tierPoints[p.siteType.needs.tier - 2] -= p.siteType.needs.count
      }
      if (p.siteType.gives.count > 0 && p.siteType.gives.tier > 1) {
        tierPoints[p.siteType.gives.tier - 2] += p.siteType.gives.count
      }

      if (!p.complete) { activeCount++; }
    }
    delete sysInf.none;

    console.log(sysInf);
    console.log(potentialEffects);
    console.log(actualEffects);

    return {
      tierPoints: tierPoints,
      siteCount: projects.length,
      activeCount: activeCount,
      bodies: finalMap,
      architectName: projects.find(p => p.architectName)?.architectName ?? "Unknown",
      primaryPort: projects.find(p => p.isPrimaryPort),
      actualEffects: actualEffects,
      potentialEffects: potentialEffects,
      sysInf: sysInf,
    };
  }


  render() {
    const { bodies, architectName, primaryPort, siteCount, tierPoints } = this.state;


    return <div className='half'>
      <h3 className={cn.h3}>
        Summary: {siteCount} sites
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
        <div style={{ gridColumn: '2 / span 3' }}>{architectName}</div>

        <div>Tier points:</div>
        <div style={{ gridColumn: '2 / span 3' }}>
          <TierPoints tier={2} count={tierPoints[0]} />
          &nbsp;
          <TierPoints tier={3} count={tierPoints[1]} />
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
    </div >;
  }

  renderSysEconomies() {
    const { sysInf } = this.state;

    // let rows = Object.keys(sysInf)
    //   .filter(k => k !== 'none' && sysInf[k as Economy] > 0)
    //   .map(k => <span key={`se${k}`} style={{ margin: 8 }}>
    //     {k}: {sysInf[k as Economy]}
    //   </span>);

    // let max = Math.max(...Object.values(sysInf));
    let maxKeys = Object.keys(sysInf)
      // .filter(k => sysInf[k] === max)
      .map(k => `${mapName[k]}: ${sysInf[k]}`)
      .join(', ');

    return <>
      <div>Economies:</div>
      <div style={{ gridColumn: '2 / span 3' }}>{maxKeys}</div>
    </>;
  }

  renderSysEffects2() {
    const { actualEffects } = this.state;

    return sysEffectsNames.map(key => {
      const actual = actualEffects[key as keyof SysEffects] ?? 0;
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

  renderSysEffects() {
    const { potentialEffects } = this.state;

    const rows = Object.keys(potentialEffects).map(key => {
      const value = potentialEffects[key as keyof SysEffects];
      if (!value || key === 'pop' || key === 'mpop') return null;

      return <tr key={`se${key}`} title={`${mapName[key]}: ${asPosNegTxt(value)}`}>
        <td>{mapName[key]}:</td>
        <td>
          {value < 0 && <Chevrons name={`sys${key}l`} count={value} />}
        </td>
        <td>
          <span>{asPosNegTxt(value)}</span>
        </td>
        <td>
          {value > 0 && <Chevrons name={`sys${key}r`} count={value} />}
        </td>
      </tr>
    });

    return <div>
      <table cellPadding={0} cellSpacing={0} >
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>;
  }

  renderBody(body: BodyData) {
    return <li key={`li${body.name}`} style={{ marginBottom: 8 }}>
      <Label>{body.name}</Label>

      {!!body.orbital.length && body.orbital.map(p => this.renderSite(p, false))}
      {!body.orbital.length && <>
        <span key={`b${body.name}-noo`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='Communications' /> No orbital sites</span>
      </>}

      <div style={{ margin: '4px 40px 4px -10px', height: 1, borderBottom: `1px dashed ${appTheme.palette.neutralTertiaryAlt}` }}></div>

      {!!body.surface.length && body.surface.map(p => this.renderSite(p, true))}
      {!body.surface.length && <>
        <span key={`b${body.name}-nos`} style={{ color: appTheme.palette.neutralTertiaryAlt }}><Icon iconName='MountainClimbing' /> No surface sites</span>
      </>}

    </li>;
  }

  renderSite(p: ProjectRef2, isSurface: boolean) {
    return <div key={p.buildId}>
      {!p.complete && <Icon iconName='ConstructionCone' style={{ marginRight: 8, fontWeight: 'bold' }} title='Under construction' />}

      <ProjectLink proj={p} noSys noBold iconName={p.complete ? 'Communications' : ''} />
      {!p.complete && <Icon iconName='ConstructionCone' style={{ marginLeft: 8, fontWeight: 'bold' }} title='Under construction' />}
    </div>;
  }

}