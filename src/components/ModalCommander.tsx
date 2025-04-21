import { ActionButton, Checkbox, DefaultButton, Icon, IconButton, Label, Modal, PrimaryButton, Slider, SpinButton, Stack, TextField } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { store } from '../local-storage';
import { KnownFC } from '../types';
import { appTheme, cn } from '../theme';
import { delayFocus, fcFullName } from '../util';
import { FindFC } from './FindFC';
import { FleetCarrier } from '../views';

interface ModalCommanderProps {
  onComplete: () => void;
}

interface ModalCommanderState {
  cmdr?: string;

  cargoLargeMax: number;
  cargoMediumMax: number;

  cmdrLinkedFCs?: KnownFC[];
  cmdrEditLinkedFCs?: KnownFC[];
  showAddFC?: boolean;
  fcMatchMarketId?: string;
  fcMatchError?: string;

  fcEditMarketId?: string;

  hideShipTrips: boolean
}


export class ModalCommander extends Component<ModalCommanderProps, ModalCommanderState> {
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
      hideShipTrips: store.hideShipTrips,
    };
  }


  render() {
    const { cmdr, cargoLargeMax, cargoMediumMax, showAddFC, cmdrLinkedFCs, cmdrEditLinkedFCs, fcMatchError, fcMatchMarketId, fcEditMarketId, hideShipTrips } = this.state;

    if (cmdrLinkedFCs === undefined || cmdrLinkedFCs.length !== store.cmdrLinkedFCs.length || !store.cmdrLinkedFCs.every(fc => cmdrLinkedFCs?.find(lfc => lfc.marketId === fc))) {
      api.cmdr.getCmdrLinkedFCs(store.cmdrName)
        .then(cmdrLinkedFCs => {
          this.setState({ cmdrLinkedFCs: [...cmdrLinkedFCs], cmdrEditLinkedFCs: [...cmdrLinkedFCs] });
          store.cmdrLinkedFCs = this.state.cmdrEditLinkedFCs?.map(fc => fc.marketId) ?? [];
        })
        .catch(err => console.error(err.message));
    }

    const rows = cmdrEditLinkedFCs?.map(item => (<li key={`@${item.marketId}`}>
      <span className='removable'>
        {fcFullName(item.name, item.displayName)}
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Edit'
          title={`Edit FC: ${item.displayName} (${item.name})`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ fcEditMarketId: item.marketId.toString() });
          }}
        />
        &nbsp;
        <Icon
          className={`btn ${cn.btn}`}
          iconName='Delete'
          title={`Unlink FC: ${item.displayName} (${item.name})`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => { this.onClickUnlinkFC(item.marketId); }}
        />
      </span>
    </li>));

    return <>
      <div className="edit-cmdr">
        <div style={{ textAlign: 'left' }}>
          <TextField
            autoFocus
            name='cmdr'
            label='Commander name:'
            value={cmdr}
            onChange={(_, v) => this.setState({ cmdr: v! })}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') { this.onSave(); }
              if (ev.key === 'Escape') { this.onCancal(); }
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

          <Checkbox
            checked={hideShipTrips}
            label='Hide remaining ship trips'
            title='Being reminded that so many trips are needed can be demoralizing. Check this to hide them.'
            onChange={(_ev, checked) => this.setState({ hideShipTrips: !!checked })}
          />
          <br />

          <Label>Linked FCs:</Label>
          <ul>
            {rows}
          </ul>
          <div hidden={showAddFC}>
            <ActionButton
              text='Link to a Fleet Carrier?'
              title='Link a new Fleet Carrier to this project'
              iconProps={{ iconName: 'Airplane' }}
              onClick={() => {
                this.setState({
                  showAddFC: true
                });
                delayFocus('add-fc-combo-input');
              }}
            />
          </div>


          {showAddFC && <div>
            <Label>Enter Fleet Carrier name:</Label>
            <Stack className='add-fc' horizontal tokens={{ childrenGap: 10, padding: 10, }}>
              <FindFC
                errorMsg={fcMatchError}
                onMatch={(marketId) => {
                  if (marketId) {
                    if (this.state.cmdrLinkedFCs?.find(fc => fc.marketId.toString() === marketId)) {
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
        </div>

        <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
          <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.onSave} />
          <DefaultButton iconProps={{ iconName: 'Delete' }} text='Clear' onClick={this.onClear} />
          <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={this.onCancal} />
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
      const fcsToAdd = this.state.cmdrEditLinkedFCs?.filter(fc => !this.state.cmdrLinkedFCs?.find(lfc => lfc.marketId === fc.marketId)) ?? [];
      const fcsToRemove = this.state.cmdrLinkedFCs?.filter(fc => !this.state.cmdrEditLinkedFCs?.find(lfc => lfc.marketId === fc.marketId)) ?? [];
      for (const fc of fcsToAdd) {
        await api.cmdr.linkFC(store.cmdrName, fc.marketId);
      }
      for (const fc of fcsToRemove) {
        await api.cmdr.unlinkFC(store.cmdrName, fc.marketId);
      }

      // and update local storage
      store.cmdrLinkedFCs = this.state.cmdrEditLinkedFCs?.map(fc => fc.marketId) ?? [];
      store.hideShipTrips = this.state.hideShipTrips;

      this.setState({
        cmdr: cmdr,
      });
      window.location.reload();
    }
  }

  onCancal = () => {
    this.props.onComplete();
  };

  onClickLinkFC = async () => {
    // const buildId = this.state.proj?.buildId;
    const marketId = this.state.fcMatchMarketId;
    if (!marketId) return;
    const fc = await api.fc.get(marketId!)

    // add to array
    const { cmdrEditLinkedFCs } = this.state;
    cmdrEditLinkedFCs?.push(fc);
    this.setState({ cmdrEditLinkedFCs, fcMatchMarketId: undefined, showAddFC: false, fcMatchError: undefined });
  }

  onClickUnlinkFC = async (marketId: number) => {
    const match = this.state.cmdrEditLinkedFCs?.find(fc => fc.marketId === marketId);
    if (!match) {
      console.error(`Fleet Carrier ${marketId} not found?`);
      return;
    }

    // remove entry from array
    const { cmdrEditLinkedFCs } = this.state;
    cmdrEditLinkedFCs!.splice(cmdrEditLinkedFCs!.indexOf(match), 1);
    this.setState({ cmdrEditLinkedFCs });
  }

}
