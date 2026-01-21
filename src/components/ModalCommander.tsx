import * as api from '../api';
import { ActionButton, Checkbox, DefaultButton, DirectionalHint, Icon, IconButton, Label, PrimaryButton, Slider, SpinButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { Component } from 'react';
import { store } from '../local-storage';
import { appTheme, cn } from '../theme';
import { delay, delayFocus, fcFullName } from '../util';
import { FindFC } from './FindFC';
import { FleetCarrier } from '../views';
import { CalloutMsg } from './CalloutMsg';
import { redirectToFrontierAuth, resetApiKey } from '../api/auth';
import { CopyButton } from './CopyButton';
import { App } from '../App';

interface ModalCommanderProps {
  onComplete: () => void;
  preAddFC?: boolean
}

interface ModalCommanderState {
  cmdr?: string;
  apiKey?: string;
  showApiKey?: boolean;
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
  applyBuffNerf: boolean;
}

export class ModalCommander extends Component<ModalCommanderProps, ModalCommanderState> {
  private static first = true;
  largeMax: number;
  medMax: number;

  constructor(props: ModalCommanderProps) {
    super(props);

    const cmdr = store.cmdr;
    this.largeMax = cmdr?.largeMax ?? 1304;
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
      applyBuffNerf: store.applyBuffNerf,
    };

    if (props.preAddFC) {
      delayFocus('add-fc-combo-input');
    }
  }

  componentDidMount(): void {
    if (ModalCommander.first) {
      // fetch FCs from server, if the first time here
      ModalCommander.first = false;

      if (store.cmdrName) {
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
  }

  render() {
    const { cmdr, apiKey, showApiKey, resetting, cargoLargeMax, cargoMediumMax, showAddFC, cmdrEditLinkedFCs, fcEditMarketId, hideShipTrips, useNativeDiscord, applyBuffNerf, fetchingFCs } = this.state;
    const showLogin = true;

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

    const apiKeyTxt = !apiKey
      ? 'login needed'
      : showApiKey && !localStorage.getItem('streamer') ? apiKey : '(hidden)';

    return <>
      <div className="edit-cmdr half">
        <div style={{ textAlign: 'left' }}>
          <div
            onMouseEnter={() => this.setState({ showApiKey: true })}
            onMouseLeave={() => this.setState({ showApiKey: false })}
          >
            <Label style={{ margin: 0, padding: 0 }}>Commander name:</Label>
            <Stack horizontal verticalAlign='end' style={{ margin: 0, padding: 0 }}>
              <TextField
                autoFocus
                name='cmdr'
                disabled={true}
                value={cmdr ?? 'login needed'}
                onChange={(_, v) => this.setState({ cmdr: v ?? '' })}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') { this.onSave(); }
                  if (ev.key === 'Escape') { this.onCancel(); }
                }}
              />

              {showLogin && <ActionButton
                className={`${cn.bBox2} ${cn.bGrey}`}
                style={{ height: 32, margin: '8px 0 8px 8px', minWidth: 88 }}
                iconProps={{ iconName: 'SignIn' }}
                text='Login'
                onClick={() => {
                  if (cmdr && !apiKey) {
                    if (window.confirm('⚠️ Caution ⚠️\n\nThis will change your Commander name to match the game. If you have been using a different name as system architect you will not be able to edit your own systems after logging in.\n\n✔️ If in doubt hit Cancel, then:\n- In each system, click the pencil toolbar button\n- Change "Edit security" from "Secured" to "Open"')) {
                      redirectToFrontierAuth();
                    } else {
                      window.location.assign('/sys');
                    }
                  } else {
                    redirectToFrontierAuth();
                  }
                }}
              />}
            </Stack>

            {showLogin && <>
              <ActionButton className={`${cn.bBox2} ${cn.bGrey}`} style={{ float: 'right', marginLeft: 8, minWidth: 88, height: 32 }} iconProps={{ iconName: 'SignOut' }} text='Logout' onClick={this.onClear} title='Clear your Commander details' />
              <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }} style={{ fontSize: 12, color: !apiKey ? 'grey' : appTheme.palette.themeSecondary }}>
                <CalloutMsg msg={'API Keys are used to authenticate apps against Raven Colonial APIs. Copy and paste this value into those apps.'} iconStyle={{ marginRight: 2 }} />
                <div>API Key:&nbsp;</div>
                {apiKey && <CopyButton text={apiKey} title='Copy API Key' />}
                <code style={{ border: '1px solid', padding: '2px 8px', margin: '0 4px', width: 150, textAlign: 'center' }}>{apiKeyTxt}</code>
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
          </div>

          <Label>Large ship max capacity:</Label>
          <Stack horizontal>
            <Slider showValue={false} min={0} max={1304} value={cargoLargeMax} onChange={v => this.setState({ cargoLargeMax: v })} />
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
              <CalloutMsg msg='Requires Discord app to be installed on this device.' directionalHint={DirectionalHint.rightCenter} iconStyle={{ fontSize: 12 }} />
            </Stack>
            <Checkbox
              checked={applyBuffNerf}
              label='Apply buff/nerf by default'
              onChange={(_ev, checked) => this.setState({ applyBuffNerf: !!checked })}
            />
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
              disabled={fetchingFCs || !apiKey}
              onClick={() => {
                this.setState({
                  showAddFC: true
                });
                delayFocus('add-fc-combo-input');
              }}
            />}
            {showLogin && <>
              <ActionButton
                iconProps={{ iconName: 'Refresh' }}
                text='My FC'
                title='Refresh data for your own and/or Squadron Fleet Carrier'
                className={`${cn.bBox2} ${cn.bGrey}`}
                style={{
                  margin: '0 10px',
                  padding: 2,
                  height: 26,
                }}
                disabled={fetchingFCs || !apiKey}
                onClick={this.onFetchFCs}
              />
              {fetchingFCs && <Spinner size={SpinnerSize.medium} />}
            </>}
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
      store.applyBuffNerf = this.state.applyBuffNerf;
      if (window.location.pathname.endsWith('/user')) {
        window.location.assign('/#about');
      } else {
        window.location.reload();
      }
    }
  }

  onCancel = () => {
    this.props.onComplete();
  };

  onClickLinkFC = async (marketId: string) => {
    if (!marketId) return;
    const fc = await api.fc.get(marketId);

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

  onFetchFCs = async () => {
    this.setState({ fetchingFCs: true });
    try {
      const fcs = await api.cmdr.fetchMyFCs();
      if (fcs.length) {
        const { cmdrEditLinkedFCs, cmdrLinkedFCs } = this.state;
        for (const myFC of fcs) {
          cmdrEditLinkedFCs[myFC.marketId] = fcFullName(myFC.name, myFC.displayName);
          cmdrLinkedFCs[myFC.marketId] = fcFullName(myFC.name, myFC.displayName);
        }
        this.setState({ cmdrEditLinkedFCs, fetchingFCs: false });
        store.cmdrLinkedFCs = cmdrLinkedFCs;
      } else {
        window.alert(`Your Commander and/or your squadron do not appear to have Fleet Carriers`);
        this.setState({ fetchingFCs: false });
      }
    } catch (err: any) {
      if (err.statusCode === 424) {
        // show special message for Epic users
        window.alert(`✋ Frontier/Epic account link expired?\n\nPlease start playing the game with your Epic account and try again.`);
        this.setState({ fetchingFCs: false });
      } else if (err.statusCode === 418) {
        window.alert(`Frontier servers appear to be offline. Please try again later.`);
        this.setState({ fetchingFCs: false });
      } else if (err.statusCode === 404) {
        // show special message for when squad FC is found but cannot be created due to a missing marketId
        window.alert(`🔎 Cannot find the market ID for your Squadron Fleet Carrier.\n\nThis is a one time problem, please dock at it and try again.`);
        this.setState({ fetchingFCs: false });
      } else if (err.statusCode === 401) {
        // Show re-login prompt?
        console.error(`Failed to fetch FCs: `, err.message);
        this.setState({ fetchingFCs: false });
        App.showReLogin();
      } else {
        // Otherwise, log raw error and show a generic error to users
        console.error(`Failed to fetch FCs: `, err.message);
        this.setState({ fetchingFCs: false });
        window.alert(`There was a problem accessing Fleet Carriers.\nCheck console for more information.`);
      }
    }
  };
}
