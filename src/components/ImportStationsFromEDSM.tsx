import * as api from '../api';
import { Component, ReactNode } from "react";
import { Cargo, CreateProject, ProjectRef, ResponseEdsmSystemBodies, StationEDSM } from "../types";
import { appTheme, cn } from '../theme';
import { buildSystemModel, SysMap } from '../system-model';
import { Checkbox, DefaultButton, Link, MessageBar, MessageBarType, PrimaryButton, Spinner, Stack } from '@fluentui/react';
import { BuildType } from './BuildType';
import { ChooseBody } from './ChooseBody';
import { getSiteType } from '../site-data';

let buildNN = 0;
const firstNow = Date.now();

interface ImportStationsFromEDSMProps {
  systemName: string;
  projects: ProjectRef[];
  onClose: () => void
}

interface ImportStationsFromEDSMState {
  sysMap: SysMap;
  loading?: boolean;
  importing?: boolean;
  // stations: StationEDSM[];
  projects: ProjectRef[];
  linkEDSM?: string;
  systemAddress?: string;
  errorMsg?: string;
}

export class ImportStationsFromEDSM extends Component<ImportStationsFromEDSMProps, ImportStationsFromEDSMState> {
  static cache: Record<string, ResponseEdsmSystemBodies> = {};

  constructor(props: ImportStationsFromEDSMProps) {
    super(props);

    let sysMap: SysMap = buildSystemModel(props.projects, true, true);

    this.state = {
      sysMap: sysMap,
      projects: [],
      loading: true,
    };
  }

  componentDidMount(): void {
    this.fetchSystemStations()
      .catch(err => this.setState({ errorMsg: err.message }));
  }

  componentDidUpdate(prevProps: Readonly<ImportStationsFromEDSMProps>, prevState: Readonly<ImportStationsFromEDSMState>, snapshot?: any): void {
    if (prevProps.projects !== this.props.projects) {
      this.setState({
        sysMap: buildSystemModel(this.props.projects, true, true),
      });
    }
  }

  async fetchSystemStations(): Promise<void> {
    console.log(`fetchSystemStations: ${this.props.systemName} ...`);

    await new Promise(resolve => setTimeout(resolve, 500));
    const data = await api.edsm.findStationsInSystem(this.props.systemName);
    let stations = data.stations;

    console.log(`fetchSystemStations: found ${stations?.length} entries`);

    if (!stations || stations.length === 0) {
      // nothing we can use here
      this.setState({ loading: false });
      return;
    }

    // discard ...
    stations = stations.filter(st => {
      // reject any FC's
      if (st.type === 'Fleet Carrier') return false;

      // reject if name matches something we already have
      const nameTail = st.name.split(':', 2)[1]?.trim();
      let match = this.state.sysMap?.allSites.some(s => !s.isMock && (s.buildName.toLowerCase().endsWith(nameTail?.toLowerCase()) || s.buildName.toLowerCase().endsWith(st.name.toLowerCase())));
      if (match) return false;

      // match = this.state.sysMap?.allSites.some(s => s.marketId?.toString() === st.marketId)
      // if (match) {
      //   console.warn(st);
      // }

      // auto-accept anything not construction related
      if (!st.name.includes('Construction Site:') && !st.name.includes('$EXT_PANEL_ColonisationShip')) return true;

      // reject any construction sites where we see a real station
      if (stations.some(st2 => st2.name === nameTail)) return false;

      // reject $EXT_PANEL_ColonisationShip if we have a primary port already
      if (st.name.includes('$EXT_PANEL_ColonisationShip') && !!this.state.sysMap?.primaryPort) return false;

      return true;
    });

    const newProjects = stations.map(st => {
      const nameTail = st.name.split(':', 2)[1]?.trim() ?? st.name;
      let complete = (nameTail === st.name) || st.haveShipyard || st.haveOutfitting;

      // try to match a build type
      let buildType = this.inferBuildType(st);
      const firstTypePart = st.type?.split(' ', 1)[0]?.toLowerCase() ?? '';
      let siteType = getSiteType(firstTypePart, true);
      if (!!siteType) { buildType = firstTypePart; }
      if (firstTypePart === 'orbis') { buildType = 'apollo'; }

      const newProj: ProjectRef = {
        buildId: `${firstNow}-${++buildNN}`,
        marketId: complete ? parseInt(st.marketId) : 1,
        buildName: nameTail ?? st.name,
        isPrimaryPort: false,
        complete: complete,
        isMock: true,

        architectName: this.props.projects[0]?.architectName,
        systemName: data.name,
        systemAddress: data.id64,
        starPos: [],// TODO: x,y,z

        maxNeed: 0,
        buildType: buildType ?? '',

        bodyName: st.body?.name,
        bodyNum: st.body?.id,
        notes: `Imported from: www.edsm.net/en/system/stations/id/${data.id}/name/${data.name}/details/idS/${st.id}/nameS/${st.name}`,
      };

      if (!complete) {
        newProj.notes = 'Required commodities unknown. Please adjust as necesary. ' + newProj.notes;
      }

      return newProj;
    });

    this.setState({
      loading: false,
      linkEDSM: data.url,
      systemAddress: data.id64?.toString(),
      projects: newProjects,
      sysMap: buildSystemModel([...this.state.sysMap?.allSites, ...newProjects], true, true),
    });
  }

  inferBuildType(st: StationEDSM) {
    let buildType = undefined;

    // match first part of name? (eg: Coriolis)
    const firstTypePart = st.type?.split(' ', 1)[0]?.toLowerCase() ?? '';
    let siteType = getSiteType(firstTypePart, true);
    if (!!siteType) { return firstTypePart; }

    if (firstTypePart === 'orbis') { return 'apollo'; }

    if (st.type === 'Outpost') {
      switch (st.economy) {
        case 'Industrial': return 'vulcan';
        case 'High Tech': return 'prometheus';
        case 'Colony': return 'vesta';
        case 'Military': return 'nemesis';
        case 'Refinery': return '';
        // dysnomia? Pirate Outpost
      }
    }

    return buildType ?? '';
  }

  render(): ReactNode {
    const { loading, projects, linkEDSM, systemAddress, importing, errorMsg } = this.state;

    const linkSpansh = systemAddress ? `https://spansh.co.uk/system/${systemAddress}#system-stations` : undefined;

    const disableImport = !projects.some(s => !s.isMock && s.buildType.length > 0);

    return <div>
      <h3 className={cn.h3}>Import stations from EDSM</h3>

      <div style={{ margin: 8 }}>
        The following have been inferred from EDSM data. Be wary if you have renamed anything.
        <br />
        {(linkEDSM || linkSpansh) && <>
          For comparison you can view this system on:
          &nbsp;
          {linkEDSM && <Link href={linkEDSM} target='_blank'>EDSM</Link>}
          {linkEDSM && linkSpansh && <>&nbsp;or&nbsp;</>}
          {linkSpansh && <Link href={linkSpansh} target='_blank'>Spansh</Link>}
        </>}
      </div>

      {loading && <Spinner label='Searching for stations on EDSM ...' labelPosition='right' />}

      {!loading && projects.length === 0 && <div style={{ marginLeft: 10, paddingTop: 4 }}>
        <MessageBar messageBarType={MessageBarType.blocked}>
          No valid sites have been found.
        </MessageBar>
      </div>}

      {!!projects && projects.length > 0 && this.renderStations()}

      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign='end' verticalAlign='baseline' style={{ margin: 10 }}>
        {!importing && <div className='small' style={{ color: appTheme.palette.accent }}>You must set the type before they can be imported.</div>}
        {importing && <Spinner label='Importing ...' labelPosition='right' />}

        <PrimaryButton
          disabled={disableImport || importing}
          text='Import'
          onClick={this.doImport}
        />
        <DefaultButton
          text='Cancel'
          disabled={importing}
          onClick={() => this.props.onClose()}
        />
      </Stack>
    </div>;
  }

  renderStations() {
    const { projects, sysMap } = this.state;

    // cell styles
    const cs = { padding: '0 4px' };

    const rows = projects.map(s => {
      return <tr style={{ backgroundColor: s.isMock ? undefined : appTheme.palette.themeLighter }}>

        <td className={cn.br} style={cs}>
          {s.buildName}
        </td>

        <td className={cn.br} style={{ ...cs, textAlign: 'center' }}>
          <Checkbox
            checked={s.complete}
            styles={{ root: { display: 'inline-block' } }}
            onChange={(_, newValue) => {
              s.complete = !!newValue;
              this.setState({
                projects: this.state.projects,
                sysMap: buildSystemModel(this.state.projects, true, true),
              });
            }}
          />
        </td>

        <td className={cn.br} style={{ ...cs, maxWidth: 250 }}>
          <ChooseBody
            systemName={this.props.systemName}
            sysMap={sysMap}
            bodyName={s.bodyName ?? ''}
            onChange={(newName, newId) => {
              s.bodyName = newName;
              s.bodyNum = newId;
              this.setState({
                projects: this.state.projects,
                sysMap: buildSystemModel(this.state.projects, true, true),
              });
            }}
          />
        </td>

        <td className={cn.br} style={{ ...cs, textAlign: 'right' }}>
          &nbsp;
          <BuildType
            buildType={s.buildType}
            onChange={newValue => {
              if (s.buildType === '') {
                s.isMock = false;
              }
              s.buildType = newValue;
              this.setState({
                projects: this.state.projects,
                sysMap: buildSystemModel(this.state.projects, true, true),
              });
            }}
          />
        </td>

        <td style={{ ...cs, textAlign: 'center' }}>
          <Checkbox
            checked={!s.isMock}
            disabled={s.buildType.length === 0}
            styles={{ root: { display: 'inline-block' } }}
            onChange={(_, newValue) => {
              s.isMock = !newValue;
              this.setState({
                projects: this.state.projects,
                sysMap: buildSystemModel(this.state.projects, true, true),
              });
            }}
          />
        </td>
      </tr>;
    });

    return <div>
      <table cellPadding={0} cellSpacing={0} style={{ margin: `10px 0` }}>
        <thead>
          <tr>
            <th className={`${cn.bb} ${cn.br}`} style={cs}>Site name</th>
            <th className={`${cn.bb} ${cn.br}`} style={cs}>Complete</th>
            <th className={`${cn.bb} ${cn.br}`} style={cs}>Body</th>
            <th className={`${cn.bb} ${cn.br}`} style={cs}>Type</th>
            <th className={`${cn.bb}`} style={cs}>Import</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>;
  }

  doImport = async () => {
    try {
      const list = this.state.projects.filter(p => !p.isMock);
      console.log(`Importing ${list.length} items ...`)

      this.setState({ importing: true });

      for (const p of list) {
        const proj: CreateProject = {
          ...p,
          // we need some commodities otherwise other wise server create logic applies a default template (which is not helpful in this case)
          commodities: { steel: 1 } as Cargo,
        };
        const savedProject = await api.project.create(proj);

        if (p.complete) {
          await api.project.complete(savedProject.buildId);
        }
      }

      // force the page to reload once done
      window.location.reload();
    } catch (err: any) {
      this.setState({
        importing: false,
        errorMsg: err.message,
      })
    }
  };
}