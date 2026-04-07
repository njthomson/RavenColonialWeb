import { DefaultButton, IconButton, mergeStyles, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../api';
import { EditCargo, FindSystemName } from '../components';
import { appTheme } from '../theme';
import { KnownFC } from '../types';
import { store } from '../local-storage';
import { delay, fcFullName, isMobile } from '../util';
import { CopyButton } from '../components/CopyButton';


const css = mergeStyles({
  cursor: 'default',
  '.fields': {
    '.lbl': {
      fontWeight: 600,
    },
    '.val': {
      padding: '0 4px',
      backgroundColor: appTheme.palette.purpleDark,
    },
  },
});

interface FleetCarrierProps {
  marketId: string;
  onClose: (cargoUpdated?: Record<string, number>) => void;
}

interface FleetCarrierState {
  nextMarketId?: string;
  foo?: string;
  errorMsg?: string;

  loading: boolean;
  saving?: boolean;
  fc?: KnownFC;
  editCargo: Record<string, number>;
  editDisplayName?: string;
  editSystemName?: string;
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
            editSystemName: fc.systemName,
          });
        })
        .catch(err => this.setState({ loading: false, errorMsg: err.message }));
    }
  }

  render() {
    const { errorMsg, loading, saving } = this.state;

    return <Panel
      className={css}
      isOpen
      allowTouchBodyScroll={isMobile()}
      type={PanelType.custom}
      customWidth={'380px'}
      headerText='Edit Fleet Carrier'
      styles={{
        main: { maxWidth: 400 },
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={() => this.props.onClose()}
      isFooterAtBottom

      onRenderFooterContent={() => {
        return <div>
          {saving && <Spinner size={SpinnerSize.large} labelPosition='right' label={'Saving ...'} />}

          {!loading && !saving && <Stack horizontal horizontalAlign='end' verticalAlign='end' tokens={{ childrenGap: 4, padding: 0, }}>
            <PrimaryButton
              text='Save'
              iconProps={{ iconName: 'Save' }}
              disabled={loading}
              onClick={this.onUpdateCargo}
            />
            <DefaultButton
              text='Cancel'
              iconProps={{ iconName: 'Cancel' }}
              disabled={loading}
              onClick={() => {
                this.setState({ editCargo: this.state.fc!.cargo });
                this.props.onClose();
              }}
            />
          </Stack>}
        </div>;
      }}
    >
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      {this.props.marketId && this.renderFC()}
    </Panel>;
  }

  renderFC() {
    const { loading, fc, editCargo, editSystemName } = this.state;

    return <>
      {this.renderFields()}
      {fc && <div style={{ marginBottom: 4, paddingLeft: 3 }} ><FindSystemName text={editSystemName} onMatch={systemName => this.setState({ editSystemName: systemName })} /></div>}

      {loading && <Spinner size={SpinnerSize.large} labelPosition='right' label={'Loading  ...'} />}
      {!!fc && <EditCargo
        addButtonAbove
        showTotalsRow
        cargo={editCargo}
        onChange={cargo => this.setState({ editCargo: cargo })}
      />}
    </>;
  }

  renderFields() {
    const { fc, editDisplayName, cmdrLinked } = this.state;

    return <table className='fields' cellPadding={0} cellSpacing={2}>
      <tbody>
        <tr>
          <td className='lbl'>Raw name:</td>
          <td className='val'>
            {!!fc && <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
              <span>{fc.name}</span>
              <CopyButton text={fc.name} />
            </Stack>}
          </td>
        </tr>

        <tr>
          <td className='lbl'>Carrier name:</td>
          <td>
            {!!fc && <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
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
            </Stack>}
          </td>
        </tr>

        <tr>
          <td>
            <div className='lbl' style={{ width: 100, padding: 0, margin: 0 }}>
              MarketId:
              {store.cmdrName && <IconButton
                className='icon-btn'
                iconProps={{ iconName: cmdrLinked ? 'UserFollowed' : 'UserRemove' }}
                title={cmdrLinked ? `Click to unlink this FC from ${store.cmdrName}` : `Click to link this FC to ${store.cmdrName}`}
                onClick={async () => {
                  if (!fc) return;
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
            </div>
          </td>
          <td className='val'>
            {!!fc && <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
              <span>{fc.marketId}</span>
              <CopyButton text={fc.marketId.toString()} />
            </Stack>}
          </td>
        </tr>

        {!!fc?.owner && <tr>
          <td className='lbl'>Owner:</td>
          <td className='val'>
            {fc?.owner}
          </td>
        </tr>}

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
        editSystemName: fcUpdated.systemName,
      });
    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  onUpdateLocation = async (systemName: string) => {
    this.setState({ saving: true });

    try {
      const fcUpdated = await api.fc.setLocation(this.state.fc!.marketId.toString(), systemName);
      this.setState({
        saving: false,
        fc: fcUpdated,
        editCargo: fcUpdated.cargo,
        editDisplayName: fcUpdated.displayName,
        editSystemName: fcUpdated.systemName,
      });
    } catch (err: any) {
      this.setState({ saving: false, errorMsg: err.message });
    }
  }

  onUpdateCargo = async () => {
    const { fc, editDisplayName, editSystemName } = this.state;
    if (!fc) { return; }

    // also save the display name if it has changed
    if (fc.displayName !== editDisplayName) {
      await this.onUpdateFields();
    }
    // also save the location if it has changed
    if (editSystemName && fc.systemName !== editSystemName) {
      await this.onUpdateLocation(editSystemName);
    }

    this.setState({ saving: true });
    await delay(500);

    try {
      // the API call is update, not patch/delta. Make sure we have entries with zero for anything the user removed
      const cargoEdit = { ...this.state.editCargo };
      for (const key in this.state.fc!.cargo) {
        if (!(key in cargoEdit)) {
          cargoEdit[key] = 0;
        }
      }

      const cargoUpdated = await api.fc.updateCargo(this.state.fc!.marketId, cargoEdit);
      this.setState({ saving: false, editCargo: cargoUpdated });
      this.props.onClose(cargoUpdated);
    } catch (err: any) {
      this.setState({ saving: false, errorMsg: err.message });
    }
  };
}
