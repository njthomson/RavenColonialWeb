import { DefaultButton, IconButton, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { EditCargo } from '../components';
import { appTheme, cn } from '../theme';
import { KnownFC } from '../types';
import { store } from '../local-storage';
import { fcFullName } from '../util';
import { CopyButton } from '../components/CopyButton';

interface FleetCarrierProps {
  marketId: string;
  onClose: (changed: boolean) => void;
}

interface FleetCarrierState {
  nextMarketId?: string;
  foo?: string;
  errorMsg?: string;

  loading: boolean;
  fc?: KnownFC;
  editCargo: Record<string, number>;
  editDisplayName?: string;
  cmdrLinked: boolean;
}

export class FleetCarrier extends Component<FleetCarrierProps, FleetCarrierState> {
  firstCargo: Record<string, number> = {};

  constructor(props: FleetCarrierProps) {
    super(props);

    const numMarketId = parseInt(props.marketId ?? '0')
    this.state = {
      nextMarketId: this.props.marketId,
      loading: false,
      editCargo: {},
      cmdrLinked: numMarketId.toString() in store.cmdrLinkedFCs,
    };
  }

  componentDidMount(): void {
    window.document.title = `FC: ${this.props?.marketId ?? '?'}`;

    if (this.props.marketId) {
      this.setState({ loading: true })
      // fetch FC data...
      api.fc.get(this.props.marketId)
        .then(fc => {
          this.setState({
            loading: false,
            fc: fc,
            editCargo: fc.cargo,
            editDisplayName: fc.displayName,
          });
        })
        .catch(err => this.setState({ loading: false, errorMsg: err.message }));
    }
  }

  render() {
    const { errorMsg } = this.state;

    return <div className='half'>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      <IconButton className='right' title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.props.onClose(false)} style={{ position: 'relative', top: -4 }} />
      <h3 className={cn.h3} style={{ cursor: 'all-scroll' }}>Fleet Carrier:</h3>

      {this.props.marketId && this.renderFC()}
    </div>;
  }


  renderFC() {
    const { loading, fc } = this.state;
    if (!fc) return;

    return <>
      {loading && <Spinner size={SpinnerSize.large} label={`Loading  ...`} />}
      {this.renderFields()}
      {this.renderCargo(fc.marketId)}
    </>;
  }

  renderFields() {
    const { fc, editDisplayName, cmdrLinked } = this.state;
    if (!fc) return;

    return <table>
      <tbody>
        <tr>
          <td>Raw name:</td>
          <td className={cn.grey}>
            {fc.name}
            &nbsp;<CopyButton text={fc.name} />
          </td>
        </tr>
        <tr>
          <td>Carrier name:</td>
          <td>
            <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
              <input
                type='text'
                value={editDisplayName}
                onChange={(ev) => this.setState({ editDisplayName: ev.target.value })}
                style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }}
              />

              {/* Toggle sort order button */}
              <IconButton
                className='icon-btn'
                title='Update display name'
                iconProps={{ iconName: 'Save' }}
                disabled={fc.displayName === editDisplayName}
                onClick={this.onUpdateFields}
              />
            </Stack>
          </td>
        </tr>
        <tr>
          <td>
            MarketId:
            {store.cmdrName && <IconButton
              className='icon-btn'
              iconProps={{ iconName: cmdrLinked ? 'UserFollowed' : 'UserRemove' }}
              title={cmdrLinked ? `Click to unlink this FC from ${store.cmdrName}` : `Click to link this FC to ${store.cmdrName}`}
              onClick={async () => {
                if (this.state.cmdrLinked) {
                  // remove link
                  await api.cmdr.unlinkFC(store.cmdrName, fc.marketId.toString());

                  const cmdrLinkedFCs = store.cmdrLinkedFCs;
                  delete cmdrLinkedFCs[fc.marketId.toString()];
                  store.cmdrLinkedFCs = cmdrLinkedFCs;

                  this.setState({ cmdrLinked: false });
                } else {
                  // add link
                  await api.cmdr.linkFC(store.cmdrName, fc.marketId.toString());

                  const cmdrLinkedFCs = store.cmdrLinkedFCs;
                  cmdrLinkedFCs[fc.marketId] = fcFullName(fc.name, fc.displayName);
                  store.cmdrLinkedFCs = cmdrLinkedFCs;

                  this.setState({ cmdrLinked: true });
                }
              }}
            />}
          </td>
          <td className={cn.grey}>{fc.marketId}&nbsp;<CopyButton text={fc.marketId.toString()} />
          </td>
        </tr>

      </tbody>
    </table>;
  }

  onUpdateFields = async () => {
    this.setState({ loading: true });

    try {
      const fcUpdated = await api.fc.updateFields(this.state.fc!.marketId, {
        displayName: this.state.editDisplayName!
      });
      this.setState({
        loading: false,
        fc: fcUpdated,
        editCargo: fcUpdated.cargo,
        editDisplayName: fcUpdated.displayName,
      });
    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  renderCargo(marketId: number) {
    const { editCargo } = this.state;

    return <div style={{ display: 'inline-block' }}>
      <EditCargo
        addButtonAbove
        showTotalsRow
        cargo={editCargo}
        onChange={cargo => this.setState({ editCargo: cargo })}
      />
      <br />
      <br />
      <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
        <PrimaryButton
          text='Update cargo'
          iconProps={{ iconName: 'Save' }}
          onClick={this.onUpdateCargo}
        />
        <DefaultButton
          text='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => {
            this.setState({ editCargo: this.state.fc!.cargo });
            this.props.onClose(false);
          }}
        />
      </Stack>
    </div>;
  }

  onUpdateCargo = async () => {
    // also save the display name if it has changed
    if (this.state.fc!.displayName !== this.state.editDisplayName) {
      await this.onUpdateFields();
    }

    this.setState({ loading: true });

    try {
      // the API call is update, not patch/delta. Make sure we have entries with zero for anything the user removed
      const cargoEdit = { ...this.state.editCargo };
      for (const key in this.state.fc!.cargo) {
        if (!(key in cargoEdit)) {
          cargoEdit[key] = 0;
        }
      }

      const cargoUpdated = await api.fc.updateCargo(this.state.fc!.marketId, cargoEdit);
      this.setState({ loading: false, editCargo: cargoUpdated });
      this.props.onClose(true);
    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  };
}
