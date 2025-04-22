import { ActionButton, Checkbox, DefaultButton, Icon, IconButton, Label, Modal, PrimaryButton, Slider, SpinButton, Stack, TextField } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { store } from '../local-storage';
import { appTheme, cn } from '../theme';
import { delayFocus, fcFullName } from '../util';
import { FindFC } from './FindFC';
import { FleetCarrier } from '../views';
import { CalloutMsg } from './CalloutMsg';

interface ModalCommanderProps {
  onComplete: () => void;
}

interface ModalCommanderState {
  cmdr?: string;

  cargoLargeMax: number;
  cargoMediumMax: number;

  cmdrLinkedFCs: Record<string, string>;
  cmdrEditLinkedFCs: Record<string, string>;
  showAddFC?: boolean;
  fcMatchMarketId?: string;
  fcMatchError?: string;

  fcEditMarketId?: string;

  hideShipTrips: boolean
  useNativeDiscord: boolean;
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
      cmdr: cmdr?.name,
      cargoLargeMax: this.largeMax,
      cargoMediumMax: this.medMax,
      cmdrLinkedFCs: { ...store.cmdrLinkedFCs },
      cmdrEditLinkedFCs: { ...store.cmdrLinkedFCs },
      hideShipTrips: store.hideShipTrips,
      useNativeDiscord: store.useNativeDiscord,
    };
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
        .catch(err => console.error(err.message));
    }
  }

  render() {
    const { cmdr, cargoLargeMax, cargoMediumMax, showAddFC, cmdrEditLinkedFCs, fcMatchError, fcMatchMarketId, fcEditMarketId, hideShipTrips, useNativeDiscord } = this.state;

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
          <TextField
            autoFocus
            name='cmdr'
            label='Commander name:'
            value={cmdr}
            onChange={(_, v) => this.setState({ cmdr: v! })}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { this.onSave(); }
              if (ev.key === 'Escape') { this.onCancel(); }
            }}
          />

          <Label>Large ship max capacity:</Label>
          <Stack horizontal>
            <Slider showValue={false} min={0} max={794} value={cargoLargeMax} onChange={v => this.setState({ cargoLargeMax: v })} />
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
                id='useNativeDiscord'
                checked={useNativeDiscord}
                label='Use native Discord links'
                title='Use Discord protocols to open the App, rather than opening Discord inside a web page. Uncheck if this device does not have Discord installed.'
                onChange={(_ev, checked) => this.setState({ useNativeDiscord: !!checked })}
              />
              &nbsp;
              <CalloutMsg id='useNativeDiscord' msg='Requires Discord app to be installed on this device.' />
            </Stack>
          </Stack>

          <br />

          <Stack horizontal verticalAlign='center'>
            <Label>Linked FCs:</Label>
            {!showAddFC && <ActionButton
              iconProps={{ iconName: 'Add' }}
              text='Add'
              title='Link a new Fleet Carrier to your Commander'
              style={{
                marginLeft: 10,
                padding: 0,
                height: 22,
                backgroundColor: appTheme.palette.themeLighter,
              }}
              onClick={() => {
                this.setState({
                  showAddFC: true
                });
                delayFocus('add-fc-combo-input');
              }}
            />}
          </Stack>

          {showAddFC && <div>
            <Label>Enter Fleet Carrier name:</Label>
            <Stack className='add-fc' horizontal tokens={{ childrenGap: 10, padding: 10, }}>
              <FindFC
                errorMsg={fcMatchError}
                onMatch={(marketId) => {
                  if (marketId) {
                    if (marketId in this.state.cmdrEditLinkedFCs) {
                      this.setState({ fcMatchMarketId: undefined, fcMatchError: `FC already linked` });
                    } else {
                      this.setState({ fcMatchMarketId: marketId, fcMatchError: undefined });
                    }
                  } else {
                    this.setState({ fcMatchMarketId: undefined, fcMatchError: undefined });
                  }
                }}
              />

              <PrimaryButton text='Link' onClick={this.onClickLinkFC} iconProps={{ iconName: 'Airplane' }} disabled={!fcMatchMarketId || !!fcMatchError} />
              <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.setState({ showAddFC: false, fcMatchError: undefined })} />
            </Stack>
          </div>}

          <ul>
            {rows}
          </ul>
        </div>

        <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
          <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.onSave} />
          <DefaultButton iconProps={{ iconName: 'Delete' }} text='Clear' onClick={this.onClear} />
          <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={this.onCancel} />
        </Stack>
      </div>

      {fcEditMarketId && <Modal isOpen>
        <FleetCarrier
          onClose={() => this.setState({ fcEditMarketId: undefined })}
          marketId={fcEditMarketId}
        />
      </Modal>}
    </>
  }

  onClear = () => {
    store.clearCmdr();
    window.location.reload();
  }

  onSave = async () => {
    const { cmdr, cargoLargeMax, cargoMediumMax } = this.state;
    if (!!cmdr) {
      store.cmdr = {
        name: cmdr,
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

  onClickLinkFC = async () => {
    const marketId = this.state.fcMatchMarketId;
    if (!marketId) return;
    const fc = await api.fc.get(marketId!)

    // add to array
    const { cmdrEditLinkedFCs } = this.state;
    cmdrEditLinkedFCs[marketId] = fcFullName(fc.name, fc.displayName);
    this.setState({ cmdrEditLinkedFCs, fcMatchMarketId: undefined, showAddFC: false, fcMatchError: undefined });
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
