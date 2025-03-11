import { ChoiceGroup, ComboBox, IChoiceGroupOption, IComboBoxOption, IComboBoxStyles, initializeIcons, MessageBar, MessageBarType, PrimaryButton, SelectableOptionMenuItemType, TextField } from '@fluentui/react';
import { apiSvcUrl, Project, ProjectRef, ResponseEdsmStations, ResponseEdsmSystem, StationEDSM } from './types'
import { Component } from 'react';

interface ProjectCreateProps {
  systemName?: string;
}

interface ProjectCreateState extends ProjectRef {
  foundStations?: StationEDSM[];
  errorMsg?: string;
}

// Initialize icons in case this example uses them
initializeIcons();

const buildTypes: IComboBoxOption[] = [
  { key: '', text: 'Tier 1: Space', itemType: SelectableOptionMenuItemType.Header },
  { key: 'output-commercial', text: 'Commercial Outpost', },
  { key: 'output-industrial', text: 'Industrial Outpost', },
  { key: 'output-criminal', text: 'Prirate Outpost', },
  { key: 'output-civilian', text: 'Civilian Outpost', },
  { key: 'output-science', text: 'Science Outpost', },
  { key: 'output-military', text: 'Military Outpost', },
  
  { key: '', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: '', text: 'Tier 1: Surface', itemType: SelectableOptionMenuItemType.Header, },
  { key: '', text: 'Coming soon', disabled: true},
  // TODO: ...

  { key: '', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: 't2-space', text: 'Tier 2: Space', itemType: SelectableOptionMenuItemType.Header },
  { key: 'coriolis', text: 'Coriolis', },
  { key: 'asteroid', text: 'Asteroid', },
  
  { key: '', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: '', text: 'Tier 2: Surface', itemType: SelectableOptionMenuItemType.Header, },
  { key: '', text: 'Coming soon', disabled: true},
  // TODO: ...

  { key: '', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: '', text: 'Tier 3: Space', itemType: SelectableOptionMenuItemType.Header, },
  { key: 'ocellus', text: 'Ccellus', },
  { key: 'orbis', text: 'Orbis', },
  
  { key: '', text: '-', itemType: SelectableOptionMenuItemType.Divider },
  { key: '', text: 'Tier 3: Surface', itemType: SelectableOptionMenuItemType.Header, },
  { key: '', text: 'Coming soon', disabled: true},
  // TODO: ...

];

export class ProjectCreate extends Component<ProjectCreateProps, ProjectCreateState> {

  constructor(props: ProjectCreateProps) {
    super(props);

    this.state = {
      systemName: props.systemName,
      buildId: '',
      buildName: '',
      buildType: 'orbis',
      architectName: '',
      factionName: '',
      marketId: 0,
      notes: '',
    };

  }

  render() {
    const { systemName, buildName, marketId, buildType, foundStations, errorMsg } = this.state;

    const comboBoxStyles: Partial<IComboBoxStyles> = { root: { maxWidth: 300 } };

    return <>
      <div className="create-project">
        <h3>Start a new build?</h3>
        <div>
          <TextField label='System name:' value={systemName} required={true} onChange={(_, v) => this.setState({ systemName: v! })} />
          <button onClick={this.onCheckSystem} hidden={foundStations && foundStations.length > 0}>check system</button>
        </div>
        <ComboBox label='Build type:' selectedKey={buildType} options={buildTypes} styles={comboBoxStyles} required={true} onChange={(_, o) => this.setState({ buildType: `${o?.key}` })} />
        {this.renderFoundStations()}
        {(marketId === -1) && <div>
          <TextField label='Market ID:' value={marketId.toString()} required={true} description='This value comes from journal files in: %HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous' />
        </div>}

        <TextField label='Build name:' value={buildName} required={true} onChange={(_, v) => this.setState({ buildName: v! })} />
        <br />

        {(marketId === 0 && !foundStations) && <div>( check system first )<br /></div>}
        <PrimaryButton text='Create ...' disabled={!foundStations} onClick={this.onCreateBuild} />
        {
          errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>
        }
      </div>
    </>;
  }

  renderFoundStations = () => {
    const { foundStations, marketId, buildName } = this.state;

    if (foundStations && foundStations.length > 0) {

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
            const name = i.key === '-1' ? buildName : i.text;
            this.setState({
              marketId: parseInt(i?.key ?? '-1'),
              buildName: name,
            });
          }} />
      </>;
    }
  }

  onCheckSystem = async () => {
    if (!this.state.systemName) { return; }
    const url = `https://www.edsm.net/api-system-v1/stations?systemName=` + encodeURIComponent(this.state.systemName);
    console.log('ProjectCreate.onCheckSystem:', url);
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
        const foundStations = data.stations.filter(s => s.name.includes('Construction') || s.name.includes('Colonisation'));
        this.setState({
          systemAddress: data.id64,
          starPos: [data2.coords.x, data2.coords.y, data2.coords.z],
          systemName: data.name,
          foundStations
        });
        return;
      }
    }

    // still here? no or stations system found
    this.setState({ errorMsg: `${response.status}: ${response.statusText}` });
  }

  onCreateBuild = async () => {
    // const { systemName, buildName, marketId, buildType, foundStations, errorMsg } = this.state;

    const url = `${apiSvcUrl}/api/project/`;
    console.log('ProjectCreate.onCheckSystem:', url);

    const body = {
      ...this.state
    };
    delete body.foundStations;

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
    } else {
      const msg = await response.text();
      this.setState({ errorMsg: `${response.status}: ${response.statusText} ${msg}` });
    }
  }

}
