import * as api from '../api';
import { ActionButton, Checkbox, DefaultButton, DirectionalHint, Icon, IconButton, Label, PrimaryButton, Slider, SpinButton, Stack, TextField } from '@fluentui/react';
import { Component } from 'react';
import { store } from '../local-storage';
import { appTheme, cn } from '../theme';
import { delay, delayFocus, fcFullName } from '../util';
import { FindFC } from './FindFC';
import { FleetCarrier } from '../views';
import { CalloutMsg } from './CalloutMsg';
import { redirectToFrontierAuth, resetApiKey } from '../api/auth';
import { CopyButton } from './CopyButton';

interface ModalCommanderProps {
  onComplete: () => void;
  preAddFC?: boolean
}

interface ModalCommanderState {
  cmdr?: string;
  apiKey?: string;
  resetting?: boolean;

  cargoLargeMax: number;
  cargoMediumMax: number;

  cmdrLinkedFCs: Record<string, string>;
  cmdrEditLinkedFCs: Record<string, string>;
  showAddFC?: boolean;

  fcEditMarketId?: string;

  hideShipTrips: boolean
  useNativeDiscord: boolean;
  fetchingFCs?: boolean;
}

export class ModalCommander extends Component<ModalCommanderProps, ModalCommanderState> {
  private static first = true;
  largeMax: number;
  medMax: number;

  constructor(props: ModalCommanderProps) {
    super(props);

    const cmdr = store.cmdr;
    this.largeMax = cmdr?.largeMax ?? 784;
    this.medMax = cmdr?.medMax ?? 400;

    this.state = {
      showAddFC: props.preAddFC,
      cmdr: cmdr?.name,
      apiKey: store.apiKey,
      cargoLargeMax: this.largeMax,
      cargoMediumMax: this.medMax,
      cmdrLinkedFCs: { ...store.cmdrLinkedFCs },
      cmdrEditLinkedFCs: { ...store.cmdrLinkedFCs },
      hideShipTrips: store.hideShipTrips,
      useNativeDiscord: store.useNativeDiscord,
    };

    if (props.preAddFC) {
      delayFocus('add-fc-combo-input');
    }
  }

  componentDidMount(): void {
    if (ModalCommander.first) {
      // fetch FCs from server, if the first time here
      ModalCommander.first = false;

      api.cmdr.getCmdrLinkedFCs(store.cmdrName)
        .then(cmdrLinkedFCs => {
          const linkedFCs = cmdrLinkedFCs.reduce((map, fc) => {
            map[fc.marketId.toString()] = fcFullName(fc.name, fc.displayName);
            return map;
          }, {} as Record<string, string>);

          this.setState({
            cmdrLinkedFCs: { ...linkedFCs },
            cmdrEditLinkedFCs: { ...linkedFCs }
          });
          // and push into local storage
          store.cmdrLinkedFCs = linkedFCs;
        })
        .catch(err => console.error(err.stack));
    }
  }

  render() {
    const { cmdr, apiKey, resetting, cargoLargeMax, cargoMediumMax, showAddFC, cmdrEditLinkedFCs, fcEditMarketId, hideShipTrips, useNativeDiscord, fetchingFCs } = this.state;
    const showLogin = !!localStorage.getItem('test-login');

    const rows = Object.entries(cmdrEditLinkedFCs ?? {})?.map(([marketId, fullName]) => (<li key={`@${marketId}`}>
      <span className='removable'>
        {fullName}
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Edit'
          title={`Edit FC: ${fullName}`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ fcEditMarketId: marketId });
          }}
        />
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Delete'
          title={`Unlink FC: ${fullName}`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => { this.onClickUnlinkFC(marketId); }}
        />
      </span>
    </li>));

    return <>
      <div className="edit-cmdr half">
        <div style={{ textAlign: 'left' }}>
          <Stack horizontal verticalAlign='end'>
            <TextField
              autoFocus
              name='cmdr'
              label='Commander name:'
              disabled={showLogin && !!apiKey}
              value={cmdr}
              onChange={(_, v) => this.setState({ cmdr: v ?? '' })}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') { this.onSave(); }
                if (ev.key === 'Escape') { this.onCancel(); }
              }}
            />

            {showLogin && <ActionButton
              className={`${cn.bBox2} ${cn.bGrey}`}
              style={{ height: 32, margin: 8 }}
              iconProps={{ iconName: 'AuthenticatorApp' }}
              text='Login'
              onClick={() => redirectToFrontierAuth()}
            />}
          </Stack>

          {showLogin && <>
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }} style={{ fontSize: 12, color: !apiKey ? 'grey' : appTheme.palette.themeSecondary }}>
              <CalloutMsg msg={'API Keys are used to authenticate apps against Raven Colonial APIs. Copy and paste this value into those apps.'} style={{ marginRight: 2 }} />
              <div>API Key:&nbsp;</div>
              {apiKey && <CopyButton text={apiKey} title='Copy API Key' />}
              <code style={{ border: '1px solid', padding: '2px 8px', margin: '0 4px' }}>{apiKey || 'login needed'}</code>
              <ActionButton
                className={`${cn.bBox2} ${cn.bGrey}`}
                disabled={resetting || !apiKey}
                style={{ height: 20, fontSize: 12 }}
                iconProps={{ iconName: 'Refresh', style: { fontSize: 12 } }}
                text='Reset'
                onClick={async () => {
                  this.setState({ resetting: true });
                  await delay(500);
                  await resetApiKey();
                  this.setState({ apiKey: store.apiKey, cmdr: store.cmdrName, resetting: false });
                }}
              />
            </Stack>
          </>}

          <Label>Large ship max capacity:</Label>
          <Stack horizontal>
            <Slider showValue={false} min={0} max={1298} value={cargoLargeMax} onChange={v => this.setState({ cargoLargeMax: v })} />
            <SpinButton className='spin-slide' value={cargoLargeMax.toString()} onChange={(_, v) => this.setState({ cargoLargeMax: parseInt(v!) })} />
          </Stack>

          <Label>Medium ship max capacity:</Label>
          <Stack horizontal>
            <Slider showValue={false} min={0} max={400} value={cargoMediumMax} onChange={v => this.setState({ cargoMediumMax: v })} />
            <SpinButton className='spin-slide' value={cargoMediumMax.toString()} onChange={(_, v) => this.setState({ cargoMediumMax: parseInt(v!) })} />
          </Stack>

          <Stack tokens={{ childrenGap: 2 }}>
            <Checkbox
              checked={hideShipTrips}
              label='Hide remaining ship trips'
              title='Being reminded that so many trips are needed can be demoralizing. Check this to hide them.'
              onChange={(_ev, checked) => this.setState({ hideShipTrips: !!checked })}
            />
            <Stack horizontal verticalAlign='center'>
              <Checkbox
                checked={useNativeDiscord}
                label='Use native Discord links'
                title='Use Discord protocols to open the App, rather than opening Discord inside a web page. Uncheck if this device does not have Discord installed.'
                onChange={(_ev, checked) => this.setState({ useNativeDiscord: !!checked })}
              />
              &nbsp;
              <CalloutMsg msg='Requires Discord app to be installed on this device.' directionalHint={DirectionalHint.rightCenter} style={{ fontSize: 12 }} />
            </Stack>
          </Stack>

          <br />

          <Stack horizontal verticalAlign='center'>
            <Label>Commander Linked FCs:</Label>
            {!showAddFC && <ActionButton
              iconProps={{ iconName: 'Add' }}
              text='Add'
              title='Link a new Fleet Carrier to your Commander'
              className={`${cn.bBox2} ${cn.bGrey}`}
              style={{
                marginLeft: 10,
                padding: 2,
                height: 26,
              }}
              onClick={() => {
                this.setState({
                  showAddFC: true
                });
                delayFocus('add-fc-combo-input');
              }}
            />}
            {showLogin && <ActionButton
              iconProps={{ iconName: 'Refresh' }}
              text='My FC'
              title='Refresh data for your own and/or Squadron Fleet Carrier'
              className={`${cn.bBox2} ${cn.bGrey}`}
              style={{
                marginLeft: 10,
                padding: 2,
                height: 26,
              }}
              disabled={fetchingFCs}
              onClick={async () => {
                this.setState({ fetchingFCs: true });
                const fcs = await api.cmdr.fetchMyFCs()
                if (fcs.length) {
                  const { cmdrEditLinkedFCs, cmdrLinkedFCs } = this.state;
                  for (const myFC of fcs) {
                    cmdrEditLinkedFCs[myFC.marketId] = fcFullName(myFC.name, myFC.displayName);
                    cmdrLinkedFCs[myFC.marketId] = fcFullName(myFC.name, myFC.displayName);
                  }
                  this.setState({ cmdrEditLinkedFCs, fetchingFCs: false });
                  store.cmdrLinkedFCs = cmdrLinkedFCs;
                } else {
                  window.alert(`You and/or your squadron do not appear to have Fleet Carriers`);
                  this.setState({ fetchingFCs: false });
                }
              }}
            />}
          </Stack>

          {showAddFC && <div>
            <Label>Enter Fleet Carrier name:</Label>
            <FindFC
              notThese={Object.keys(cmdrEditLinkedFCs)}
              onChange={(marketId) => {
                if (marketId) {
                  this.onClickLinkFC(marketId);
                } else {
                  this.setState({ showAddFC: false });
                }
              }}
            />
          </div>}

          <ul>
            {rows}
          </ul>
        </div>

        <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }} horizontalAlign='end'>
          <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.onSave} title='Save changes' />
          <DefaultButton iconProps={{ iconName: 'Delete' }} text='Clear' onClick={this.onClear} title='Clear your Commander details' />
          <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={this.onCancel} title='Discard changes' />

          <IconButton
            className={cn.bBox}
            title='Reset "Do not show me this again" prompts'
            iconProps={{ iconName: 'ReportWarning' }}
            onClick={() => {
              if (window.confirm('This will restore "Do not show me this again" prompts and reload the page.\nDo you wish to continue?')) {
                store.notAgain = [];
                window.location.reload();
              }
            }}
          />
        </Stack>
      </div>

      {fcEditMarketId && <FleetCarrier
        onClose={() => this.setState({ fcEditMarketId: undefined })}
        marketId={fcEditMarketId}
      />}
    </>
  }

  onClear = () => {
    store.clearCmdr();
    window.location.reload();
  }

  onSave = async () => {
    const { cmdr, cargoLargeMax, cargoMediumMax } = this.state;
    if (!!cmdr) {

      // update server if cmdr name changed by casing ONLY
      if (cmdr.toLowerCase() === store.cmdrName.toLowerCase() && cmdr !== store.cmdrName) {
        await api.cmdr.updateCmdr(cmdr.toLowerCase(), { displayName: cmdr });
      }

      store.cmdr = {
        name: cmdr.trim(),
        largeMax: cargoLargeMax,
        medMax: cargoMediumMax,
      };

      // update linked FCs?
      const fcsToAdd = Object.keys(this.state.cmdrEditLinkedFCs)?.filter(marketId => !(marketId in this.state.cmdrLinkedFCs));
      const fcsToRemove = Object.keys(this.state.cmdrLinkedFCs)?.filter(marketId => !(marketId in this.state.cmdrEditLinkedFCs));
      for (const marketId of fcsToAdd) {
        await api.cmdr.linkFC(store.cmdrName, marketId);
      }
      for (const marketId of fcsToRemove) {
        await api.cmdr.unlinkFC(store.cmdrName, marketId);
      }

      // and update local storage and reload whole page
      store.cmdrLinkedFCs = { ...this.state.cmdrEditLinkedFCs };
      store.hideShipTrips = this.state.hideShipTrips;
      store.useNativeDiscord = this.state.useNativeDiscord;
      window.location.reload();
    }
  }

  onCancel = () => {
    this.props.onComplete();
  };

  onClickLinkFC = async (marketId: string) => {
    if (!marketId) return;
    const fc = await api.fc.get(marketId!)

    // add to array
    const { cmdrEditLinkedFCs } = this.state;
    cmdrEditLinkedFCs[marketId] = fcFullName(fc.name, fc.displayName);
    this.setState({ cmdrEditLinkedFCs, showAddFC: false });
  }

  onClickUnlinkFC = async (marketId: string) => {
    const { cmdrEditLinkedFCs } = this.state;
    if (!(marketId in cmdrEditLinkedFCs)) {
      console.error(`Fleet Carrier ${marketId} not found?`);
      return;
    }

    // remove entry from array
    delete cmdrEditLinkedFCs[marketId];
    this.setState({ cmdrEditLinkedFCs });
  }

}
