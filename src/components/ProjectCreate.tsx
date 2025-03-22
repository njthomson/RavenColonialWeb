import { ChoiceGroup, ComboBox, IChoiceGroupOption, IComboBoxOption, IComboBoxStyles, Icon, IconButton, MessageBar, MessageBarType, PrimaryButton, SelectableOptionMenuItemType, Stack, TeachingBubble, TextField } from '@fluentui/react';
import { Component } from 'react';
import { Store } from '../local-storage';
import { apiSvcUrl, CreateProject, Project, ResponseEdsmStations, ResponseEdsmSystem, StationEDSM } from '../types';
// import { prepIconLookup } from './prep-costs';
// prepIconLookup();

interface ProjectCreateProps {
  systemName?: string;
}

interface ProjectCreateState extends Omit<CreateProject, 'marketId'> {
  marketId: string | undefined;
  showMarketId: boolean;
  showMarketIdHelp: boolean;
  foundStations?: StationEDSM[];
  msgError?: string;
  msgClass?: MessageBarType;
}


export const buildTypes: IComboBoxOption[] = [
  { key: 't1so', text: 'Tier 1: Space Outposts', itemType: SelectableOptionMenuItemType.Header },
  { key: "plutus", text: "Commercial Outpost (Plutus)" },
  { key: "vulcan", text: "Industrial Outpost (Vulcan)" },
  { key: "dysnomia", text: "Pirate Outpost (Dysnomia)" },
  { key: "vesta", text: "Civilian Outpost (Vesta)" },
  { key: "prometheus", text: "Scientific Outpost (Prometheus)" },
  { key: "nemesis", text: "Military Outpost (Nemesis)" },

  { key: 'l1', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't1s1', text: 'Tier 1: Space Installations', itemType: SelectableOptionMenuItemType.Header },
  { key: "hermes", text: "Satellite Installation (Hermes, Angelia, Eirene)" },
  { key: "pistis", text: "Comms Installation (Pistis, Soter, Aletheia)" },
  { key: "demeter", text: "Agricultural Installation (Demeter)" },
  { key: "apate", text: "Pirate Installation (Apate, Laverna)" },
  { key: "euthenia", text: "Industrial Installation (Euthenia, Phorcys)" },
  { key: "enodia", text: "Relay Installation (Enodia, Ichnaea)" },

  { key: 'l2', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't1ss', text: 'Tier 1: Surface Sites', itemType: SelectableOptionMenuItemType.Header, },
  { key: "hestia", text: "Civilian Settlement (Hestia, Decima, Atropos, Nona, Lachesis, Clotho)" },
  { key: "hephaestus", text: "Industrial Settlement (Hephaestus, Opis, Ponos, Tethys, Bia, Mefitis)" },
  { key: "necessitas", text: "Scientific Settlement (Necessitas, Ananke, Fauna, Providentia, Antevorta, Porrima)" },

  { key: 'l3', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't2so', text: 'Tier 2: Space Stations', itemType: SelectableOptionMenuItemType.Header },
  { key: "coriolis", text: "Coriolis Starport (No Truss, Dual Truss, Quad Truss)" },
  { key: "asteroid", text: "Asteroid Base (Asteroid)" },

  { key: 'l4', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't2si', text: 'Tier 2: Space Installations', itemType: SelectableOptionMenuItemType.Header },
  { key: "vacuna", text: "Military Installation (Vacuna, Alastor)" },
  { key: "dicaeosyne", text: "Security Installation (Dicaeosyne, Poena, Eunomia, Nomos)" },
  { key: "harmonia", text: "Government Installation (Harmonia)" },
  { key: "asclepius", text: "Medical Installation (Asclepius, Eupraxia)" },
  { key: "astraeus", text: "Scientific Installation (Astraeus, Coeus, Dodona, Dione)" },
  { key: "hedone", text: "Tourist Installation (Hedone, Opora, Pasithea)" },
  { key: "dionysus", text: "Space Bar (Dionysus, Bacchus)" },

  { key: 'l5', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't2ss', text: 'Tier 2: Surface', itemType: SelectableOptionMenuItemType.Header, },
  { key: "consus", text: "Agricultural Settlement (Consus)" },
  { key: "picumnus", text: "Agricultural Settlement (Picumnus, Annona)" },
  { key: "ceres", text: "Agricultural Settlement (Ceres, Fornax)" },
  { key: "ourea", text: "Extraction Settlement (Ourea)" },
  { key: "mantus", text: "Extraction Settlement (Mantus, Orcus)" },
  { key: "erebus", text: "Extraction Settlement (Erebus, Aerecura)" },
  { key: "fontus", text: "Industrial Settlement (Fontus)" },
  { key: "meteope", text: "Industrial Settlement (Meteope, Palici, Minthe)" },
  { key: "gaea", text: "Industrial Settlement (Gaea)" },
  { key: "ioke", text: "Military Settlement (Ioke)" },
  { key: "bellona", text: "Military Settlement (Bellona, Enyo, Polemos)" },
  { key: "minerva", text: "Military Settlement (Minerva)" },
  { key: "pheobe", text: "Hightech Settlement (Pheobe)" },
  { key: "asteria", text: "Hightech Settlement (Asteria, Caerus)" },
  { key: "chronos", text: "Hightech Settlement (Chronos)" },
  { key: "aergia", text: "Tourism Settlement (Aergia)" },
  { key: "comos", text: "Tourism Settlement (Comos, Gelos)" },
  { key: "fufluns", text: "Tourism Settlement (Fufluns)" },
  { key: "tartarus", text: "Extraction Surface Outpost (Tartarus)" },
  { key: "aegle", text: "Civilian Surface Outpost (Aegle)" },
  { key: "tellus", text: "Exploration Surface Outpost (Tellus)" },
  { key: "io", text: "Outpost Surface Outpost (Io)" },
  { key: "athena", text: "Scientific Surface Outpost (Athena, Caelus)" },
  { key: "alala", text: "Military Surface Outpost (Alala, Ares)" },
  { key: "silenus", text: "Refinery Surface Outpost (Silenus)" },
  { key: "janus", text: "High Tech Surface Outpost (Janus)" },
  { key: "molae", text: "Industrial Surface Outpost (Molae, Tellus, Eunostus)" },

  { key: 'l6', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't3so', text: 'Tier 3: Space', itemType: SelectableOptionMenuItemType.Header, },
  { key: "ocellus", text: "Ocellus Starport (Ocellus)" },
  { key: "apollo", text: "Orbis Starport (Apollo, Artemis)" },

  { key: 'l7', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't3ss', text: 'Tier 3: Surface', itemType: SelectableOptionMenuItemType.Header, },
  { key: "zeus", text: "Port Surface Outpost (Zeus, Hera, Poseidon, Aphrodite)" }
];

export class ProjectCreate extends Component<ProjectCreateProps, ProjectCreateState> {

  constructor(props: ProjectCreateProps) {
    super(props);

    this.state = {
      systemAddress: 0,
      systemName: props.systemName ?? '',
      starPos: [0, 0, 0],
      marketId: undefined,
      showMarketId: false,
      showMarketIdHelp: false,
      buildId: '',
      buildName: '',
      buildType: 'orbis',
      architectName: '',
      factionName: '',
      maxNeed: 0,
      complete: false,
      notes: '',
    };
  }

  readyToCreate(): boolean {
    const { buildName, marketId, buildType, systemAddress } = this.state;
    return !!marketId && parseInt(marketId) > 0 && !!buildType && !!buildName && systemAddress > 0;
  }

  render() {
    const { systemName, systemAddress, buildName, marketId, buildType, showMarketId, showMarketIdHelp, msgError, msgClass } = this.state;

    const comboBoxStyles: Partial<IComboBoxStyles> = { root: { maxWidth: 300 } };

    return <>
      <div className="create-project">
        <h3>Or start a new build?</h3>
        <div>
          <Stack horizontal style={{ alignItems: 'flex-end' }}>
            <TextField id='create-systemName' name='systemName' label='System name:' value={systemName} required={true} onChange={(_, v) => this.setState({ systemName: v! })} />
            <IconButton title='Search system for construction sites' iconProps={{ iconName: 'Refresh' }} onClick={this.onCheckSystem} />
          </Stack>
        </div>
        {this.renderFoundStations()}
        {showMarketId && <div>
          <Stack horizontal style={{ alignItems: 'flex-end' }}>
            <TextField
              id='manual-marketId'
              name='marketId'
              label='Market ID:'
              value={marketId}
              required={true}
              onChange={(_, v) => this.setState({ marketId: v! })}
            />
            <IconButton title='How to find the marketId' iconProps={{ iconName: 'Info' }} onClick={() => this.setState({ showMarketIdHelp: true })} />
          </Stack>

          {showMarketIdHelp && <TeachingBubble
            target={'#manual-marketId'}
            hasCloseButton={true}
            onDismiss={() => { this.setState({ showMarketIdHelp: false }) }}
          >
            <div>The <code className='navy'>MarketID</code> value can be found in your journal files once docked at the construction ship or site for this project:</div>
            <ul>
              <li>Open folder: <code className='navy'>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code></li>
              <li>Find the file named with today's date. Something like: <code className='navy'>Journal.{new Date().toISOString().substring(0, 10)}T102030.01.log</code></li>
              <li>Scroll to the bottom and look for the line with <code className='navy'>"event":"Docked"</code></li>
              <li>On that line, copy the value of <code className='navy'>MarketID</code></li>
            </ul>
          </TeachingBubble>}
        </div>}

        <TextField name='buildName' label='Build name:' value={buildName} required={true} onChange={(_, v) => this.setState({ buildName: v! })} />
        <ComboBox label='Build type:' selectedKey={buildType} options={buildTypes} styles={comboBoxStyles} required={true} onChange={(_, o) => this.setState({ buildType: `${o?.key}` })} />
        <div className='hint'><Icon iconName='Info' />&nbsp;<span>Exact cargo requirements are random and will require some adjustments.</span></div>

        {!!systemAddress && <PrimaryButton text='Create ...' disabled={!this.readyToCreate()} onClick={this.onCreateBuild} />}
        {!systemAddress && <PrimaryButton text='Search sites ...' onClick={this.onCheckSystem} />}
        {msgError && <MessageBar messageBarType={msgClass ?? MessageBarType.error}>{msgError}</MessageBar>}
      </div>
    </>;
  }

  renderFoundStations = () => {
    const { foundStations, marketId, buildName } = this.state;

    if (foundStations) {

      const options: IChoiceGroupOption[] = [
        ...foundStations?.map(s => ({ key: s.marketId, text: s.name })),
        { key: '-1', text: 'Other' }
      ];

      return <>
        <ChoiceGroup
          options={options}
          label='Choose construction site:'
          value={marketId}
          onChange={(_, i) => {
            if (!i) { return; }
            const name = i.key === '' ? buildName : i.text;
            if (i.key === '-1') {
              this.setState({
                marketId: '',
                showMarketId: true
              });
            } else {
              this.setState({
                marketId: i?.key ?? '',
                showMarketId: false,
              });
              if (!this.state.buildName) {
                this.setState({ buildName: name, });
              }
            }
          }} />
      </>;
    }
  }

  onCheckSystem = async () => {
    if (!this.state.systemName) { return; }
    const url = `https://www.edsm.net/api-system-v1/stations?systemName=` + encodeURIComponent(this.state.systemName);
    console.log('ProjectCreate.onCheckSystem:', url);

    this.setState({
      showMarketId: false,
      foundStations: undefined,
    });

    const response = await fetch(url);
    //console.log('ProjectCreate.onCheckSystem:', response);

    if (response.status === 200) {
      // success - add to in-memory data
      const data: ResponseEdsmStations = await response.json();
      if (data.id64) {
        // look up x,y,z values
        const response2 = await fetch(`https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=` + encodeURIComponent(this.state.systemName));
        console.log('ProjectCreate.onCheckSystem2:', response2);
        const data2: ResponseEdsmSystem = await response2.json();

        console.log('ProjectCreate.onCheckSystem:', data);

        this.setState({
          systemAddress: data.id64,
          starPos: [data2.coords.x, data2.coords.y, data2.coords.z],
          systemName: data.name,
          msgError: undefined,
        });

        const foundStations = data.stations.filter(s => s.name.includes('Construction') || s.name.includes('Colonisation'));
        if (foundStations.length === 0) {
          this.setState({
            showMarketId: true,
            msgError: 'No known colonization sites. Manual marketID needed.',
            msgClass: MessageBarType.warning,
          });
        } else {
          this.setState({
            foundStations
          });
        }
        return;
      } else {
        this.setState({
          msgError: 'Unknown system',
          msgClass: MessageBarType.error,
        });
        return;
      }
    }

    // still here? EDSM call was not successful
    this.setState({
      msgError: `${response.status}: ${response.statusText}`,
      msgClass: MessageBarType.error,
    });
  }

  onCreateBuild = async () => {
    const { buildName, marketId, buildType } = this.state;

    // validate before creating anything
    const msgs: string[] = [];

    if (!marketId || !(parseInt(marketId) > 0)) { msgs.push('Cannot create build project without a marketID.'); }
    if (!buildType) { msgs.push('Cannot create build project without a type.'); }
    if (!buildName) { msgs.push('Cannot create build project without a name.'); }

    if (msgs.length > 0) {
      this.setState({
        msgError: msgs.join(' '),
        msgClass: MessageBarType.warning,
      });
      return;
    }

    const url = `${apiSvcUrl}/api/project/`;
    console.log('ProjectCreate.onCheckSystem:', url);

    const body = {
      ...this.state,
    };
    delete body.foundStations;
    delete body.msgError;
    delete body.msgClass;

    const cmdr = Store.getCmdr()?.name;
    if (cmdr) {
      body.commanders = {};
      body.commanders[cmdr] = [];
    }

    const response = await fetch(url, {
      method: 'PUT',
      // referrer: '',
      // referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify(body),
    });
    console.log('ProjectCreate.onCreateBuild:', response);

    if (response.status === 200) {
      // redirect to viewer
      const newProj: Project = await response.json();
      if (newProj.buildId) {
        window.location.assign(`#build=${newProj.buildId}`);
        window.location.reload();
      } else {
        console.error('Why no BuildId?', newProj)
      }
    } else if (response.status === 409) {
      this.setState({
        msgError: `Cannot create new build project. There is one tracked in ${this.state.systemName} with marketId: ${this.state.marketId}`,
        msgClass: MessageBarType.error,
      });
    } else {
      const msg = await response.text();
      this.setState({
        msgError: `${response.status}: ${response.statusText} ${msg}`,
        msgClass: MessageBarType.error,
      });
    }
  }

}
