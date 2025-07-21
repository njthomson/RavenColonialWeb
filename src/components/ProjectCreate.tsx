import { ChoiceGroup, DefaultButton, DirectionalHint, IChoiceGroupOption, Icon, IconButton, Label, MessageBar, MessageBarType, PrimaryButton, Spinner, Stack, TeachingBubble, TextField, Toggle } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { store } from '../local-storage';
import { CreateProject, StationEDSM } from '../types';
import { LinkSrvSurvey } from './LinkSrvSurvey';
import { cn } from '../theme';
import { BuildType } from './BuildType/BuildType';
import { delay } from '../util';
import { CopyButton } from './CopyButton';
import { ViewEditBody } from '../views/SystemView2/ViewEditBody';
import { Bod } from '../types2';
import { BodyMap2 } from '../system-model2';

interface ProjectCreateProps {
  systemName: string;
  knownMarketIds: string[];
  onCancel: () => void;
  noTitle?: boolean;
  knownNames: string[];
  bodies?: Bod[];
  bodyMap?: Record<string, BodyMap2>
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
  bodyNum: number;
  bodyName?: string;
}


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
      bodyNum: -1,
    };
  }

  componentDidMount(): void {
    this.onCheckSystem()
      .catch(err => this.setState({ msgError: err.message, msgClass: MessageBarType.error }));
  }

  readyToCreate(): boolean {
    const { buildName, marketId, buildType, systemAddress, bodyNum } = this.state;
    const showNewBodies = !!this.props.bodies && !!this.props.bodyMap;
    return !!marketId && parseInt(marketId) > 0 && !!buildType && !!buildName && systemAddress > 0 && (!showNewBodies || bodyNum > -1);
  }

  componentDidUpdate(prevProps: Readonly<ProjectCreateProps>, prevState: Readonly<ProjectCreateState>, snapshot?: any): void {
    if (this.props.systemName && prevProps.systemName !== this.props.systemName) {
      this.setState({ systemName: this.props.systemName ?? '' });
    }
  }

  render() {
    const { buildName, marketId, buildType, showMarketId, showMarketIdHelp, msgError, msgClass, checking, isPrimaryPort } = this.state;

    const showNewBodies = !!this.props.bodies && !!this.props.bodyMap;

    return <>
      <div className="create-project">
        {!this.props.noTitle && <h3 className={cn.h3}>Start a new project:</h3>}

        <MessageBar messageBarType={MessageBarType.success} styles={{ root: { marginBottom: 10 } }}>
          Use this to manually create a new build project: for tracking delivery progress and cargo pre-loaded onto Fleet Carriers.
          <br />
          <br />
          <b><Icon className='icon-inline' iconName='LightBulb' />&nbsp;Creating projects through<LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/wiki/Colonization#creating-a-project' title='How to create projects with SrvSurvey' /> is easier and highly recommended</b>
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
            calloutProps={{ directionalHint: DirectionalHint.bottomLeftEdge, gapSpace: 1 }}
            hasCloseButton={true}
            onDismiss={() => { this.setState({ showMarketIdHelp: false }) }}
          >
            <div>The <code className={cn.navy}>MarketID</code> value can be found in your journal files once docked at the construction ship or site for this project:</div>
            <ul>
              <li>Open folder: <code className={cn.navy}>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code> <CopyButton text='%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous' /></li>
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

        {showNewBodies && <Stack horizontal verticalAlign='center'>
          <Label required>Body:</Label>
          <ViewEditBody
            systemName={this.props.systemName}
            bodies={this.props.bodies ?? []}
            bodyMap={this.props.bodyMap ?? {}}
            bodyNum={this.state.bodyNum ?? -1}
            onChange={num => this.setState({
              bodyNum: num,
              bodyName: this.props.bodies?.find(b => b.num === num)?.name,
            })}
            pinnedSiteId=''
          />
        </Stack>}

        <Stack horizontal verticalAlign='center'>
          <Label required>Build type:</Label>
          <BuildType
            buildType={buildType}
            onChange={(t) => this.setState({ buildType: t })}
          />
        </Stack>
        <br />

        {/* {!!buildType && <MessageBar messageBarType={MessageBarType.severeWarning}>
          Note: Cargo requirements will need to be manually entered.
        </MessageBar>} */}

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
              const newName = name.split(':')[1]?.trim() || name;
              const siteMatch = foundStations.find(s => s.marketId === i?.key);
              const bodyMatch = siteMatch && this.props.bodyMap && this.props.bodyMap[siteMatch.body?.name ?? ''];
              this.setState({
                marketId: i?.key ?? '',
                showMarketId: false,
                buildName: newName,
                bodyNum: bodyMatch?.num ?? -1,
              });
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
      await delay(500);

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

      const foundStations = data.stations.filter(s => {
        return (s.name.includes('Construction Site:') || s.name.includes('Colonisation'))
          && !this.props.knownMarketIds.includes(s.marketId.toString())
          && !this.props.knownNames.some(n => s.name.endsWith(n))
          ;
      });

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
