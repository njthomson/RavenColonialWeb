import { ChoiceGroup, DefaultButton, IChoiceGroupOption, IComboBoxOption, IconButton, Label, MessageBar, MessageBarType, PrimaryButton, SelectableOptionMenuItemType, Spinner, Stack, TeachingBubble, TextField, Toggle } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { store } from '../local-storage';
import { CreateProject, StationEDSM } from '../types';
import { LinkSrvSurvey } from './LinkSrvSurvey';
import { cn } from '../theme';
import { BuildType } from './BuildType';

interface ProjectCreateProps {
  systemName?: string;
  knownMarketIds: string[];
  onCancel: () => void;
}

// TODO: stop extending `CreateProject` and add `project: CreateProject` as a member of the stte
interface ProjectCreateState extends Omit<CreateProject, 'marketId'> {
  marketId: string | undefined;
  checking?: boolean;
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

  { key: 'l8', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't1ss-s', text: 'Small Surface Settlements - Small', itemType: SelectableOptionMenuItemType.Header, },
  { key: "consus", text: "Agricultural Settlement (Consus)" },
  { key: "ourea", text: "Extraction Settlement (Ourea)" },
  { key: "fontus", text: "Industrial Settlement (Fontus)" },
  { key: "ioke", text: "Military Settlement (Ioke)" },

  { key: 'l9', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't1ss-m', text: 'Tier 1: Surface Settlements - Medium', itemType: SelectableOptionMenuItemType.Header, },
  { key: "picumnus", text: "Agricultural Settlement (Picumnus, Annona)" },
  { key: "mantus", text: "Extraction Settlement (Mantus, Orcus)" },
  { key: "meteope", text: "Industrial Settlement (Meteope, Palici, Minthe)" },
  { key: "bellona", text: "Military Settlement (Bellona, Enyo, Polemos)" },

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
  { key: 't2sss', text: 'Tier 2: Surface Settlements', itemType: SelectableOptionMenuItemType.Header, },
  { key: "ceres", text: "Agricultural Settlement - Large (Ceres, Fornax)" },
  { key: "erebus", text: "Extraction Settlement - Large (Erebus, Aerecura)" },
  { key: "gaea", text: "Industrial Settlement - Large (Gaea)" },
  { key: "minerva", text: "Military Settlement - Large (Minerva)" },
  { key: "pheobe", text: "Hightech Settlement - Small (Pheobe)" },
  { key: "asteria", text: "Hightech Settlement - Small (Asteria, Caerus)" },
  { key: "chronos", text: "Hightech Settlement - Large (Chronos)" },
  { key: "aergia", text: "Tourism Settlement - Small (Aergia)" },
  { key: "comos", text: "Tourism Settlement - Medium (Comos, Gelos)" },
  { key: "fufluns", text: "Tourism Settlement - Large (Fufluns)" },

  { key: 'l9', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't2ss-h', text: 'Tier 2: Surface Hubs', itemType: SelectableOptionMenuItemType.Header, },
  { key: "tartarus", text: "Extraction Hub (Tartarus)" },
  { key: "aegle", text: "Civilian Hub (Aegle)" },
  { key: "tellus", text: "Exploration Hub (Tellus)" },
  { key: "io", text: "Outpost Hub (Io)" },
  { key: "athena", text: "Scientific Hub (Athena, Caelus)" },
  { key: "alala", text: "Military Hub (Alala, Ares)" },
  { key: "silenus", text: "Refinery Hub (Silenus)" },
  { key: "janus", text: "High Tech Hub (Janus)" },
  { key: "molae", text: "Industrial Hub (Molae, Tellus, Eunostus)" },

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
      buildType: '',
      architectName: '',
      factionName: '',
      maxNeed: 0,
      complete: false,
      notes: '',
      isPrimaryPort: false,
      commodities: {},
    };
  }

  componentDidMount(): void {
    this.onCheckSystem()
      .catch(err => this.setState({ msgError: err.message, msgClass: MessageBarType.error }));
  }

  readyToCreate(): boolean {
    const { buildName, marketId, buildType, systemAddress } = this.state;
    return !!marketId && parseInt(marketId) > 0 && !!buildType && !!buildName && systemAddress > 0;
  }

  componentDidUpdate(prevProps: Readonly<ProjectCreateProps>, prevState: Readonly<ProjectCreateState>, snapshot?: any): void {
    if (this.props.systemName && prevProps.systemName !== this.props.systemName) {
      this.setState({ systemName: this.props.systemName ?? '' });
    }
  }

  render() {
    const { buildName, marketId, buildType, showMarketId, showMarketIdHelp, msgError, msgClass, checking, isPrimaryPort } = this.state;

    return <>
      <div className="create-project">
        <h3 className={cn.h3}>Start a new project:</h3>

        <MessageBar messageBarType={MessageBarType.success}>
          Creating projects through <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/wiki/Colonization#creating-a-project' title='How to create projects with SrvSurvey' /> is <strong>strongly recommended</strong>.
        </MessageBar>

        {checking && <Spinner label='Searching for known construction sites...' labelPosition='right' style={{ maxWidth: 'fit-content' }} />}

        {this.renderFoundStations()}

        {showMarketId && <div>
          <Stack horizontal style={{ alignItems: 'flex-end' }}>
            <TextField
              id='manual-marketId'
              name='marketId'
              label='Market ID:'
              title='Enter the marketId of the construction site from your journal file'
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
            <div>The <code className={cn.navy}>MarketID</code> value can be found in your journal files once docked at the construction ship or site for this project:</div>
            <ul>
              <li>Open folder: <code className={cn.navy}>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code></li>
              <li>Find the file named with today's date. Something like: <code className={cn.navy}>Journal.{new Date().toISOString().substring(0, 10)}T102030.01.log</code></li>
              <li>Scroll to the bottom and look for the line with <code className={cn.navy}>"event":"Docked"</code></li>
              <li>On that line, copy the value of <code className={cn.navy}>MarketID</code></li>
            </ul>
          </TeachingBubble>}
        </div>}

        <TextField name='buildName' title='Enter a descriptive name for this project' label='Build name:' value={buildName} required={true} onChange={(_, v) => this.setState({ buildName: v! })} />

        <Label required>Primary port:</Label>
        <Toggle
          onText='Yes' offText='No'
          defaultChecked={isPrimaryPort}
          styles={{ root: { height: 25, margin: 0, marginLeft: 8 } }}
          onChange={(_, checked) => this.setState({ isPrimaryPort: !!checked })}
        />

        <Label required>Build type:</Label>
        <BuildType
          buildType={buildType}
          onChange={(t) => this.setState({ buildType: t })}
        />
        <br />

        {!!buildType && <MessageBar messageBarType={MessageBarType.severeWarning}>
          Note: Cargo requirements will need to be manually entered.
        </MessageBar>}


        {msgError && <MessageBar messageBarType={msgClass ?? MessageBarType.error}>{msgError}</MessageBar>}

        <Stack horizontal tokens={{ childrenGap: 4 }} style={{ marginTop: 8 }}>
          <PrimaryButton text='Create ...' disabled={!this.readyToCreate()} onClick={this.onCreateBuild} />

          <DefaultButton iconProps={{ iconName: 'Cancel' }} onClick={() => this.props.onCancel()} text='Cancel' />
        </Stack>

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
                let newName = name.split(':')[1]?.trim() || name;
                this.setState({ buildName: newName, });
              }
            }
          }} />
      </>;
    }
  }

  onCheckSystem = async () => {
    if (!this.state.systemName) { return; }

    this.setState({
      checking: true,
      showMarketId: false,
      foundStations: undefined,
    });
    try {

      // add a little artificial delay so the spinner doesn't flicker in and out
      await new Promise(resolve => setTimeout(resolve, 500));

      const data = await api.edsm.findStationsInSystem(this.state.systemName);

      if (!data?.id64) {
        // system not known
        this.setState({
          checking: false,
          msgError: 'Unknown system',
          msgClass: MessageBarType.error,
        });
        return;
      }

      // look up x,y,z values
      const data2 = await api.edsm.getSystem(this.state.systemName);
      // console.log('ProjectCreate.onCheckSystem:', data);

      this.setState({
        checking: false,
        systemAddress: data.id64,
        starPos: [data2.coords.x, data2.coords.y, data2.coords.z],
        systemName: data.name,
        msgError: undefined,
      });

      const foundStations = data.stations.filter(s => (s.name.includes('Construction') || s.name.includes('Colonisation')) && !this.props.knownMarketIds.includes(s.marketId.toString()));
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
    } catch (err: any) {
      this.setState({ msgError: err.message, msgClass: MessageBarType.error });
    }

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

    try {
      // TODO: stop extending `CreateProject` and add `project: CreateProject` as a member of the stte
      const body = {
        ...this.state,
      };
      delete body.foundStations;
      delete body.msgError;
      delete body.msgClass;

      const cmdr = store.cmdrName;
      if (cmdr) {
        body.commanders = {};
        body.commanders[cmdr] = [];
        body.architectName = cmdr;
      }

      // call the API
      const newProj = await api.project.create(body as any);

      window.location.assign(`#build=${newProj.buildId}`);
      window.location.reload();

    } catch (err: any) {
      if (err.statusCode === 409) {
        this.setState({
          msgError: `Cannot create new build project. Already tracking marketId: ${this.state.marketId} in ${this.state.systemName}`,
          msgClass: MessageBarType.error,
        });
      } else {
        this.setState({ msgError: err.message, msgClass: MessageBarType.error });
      }
    }
  }

}
