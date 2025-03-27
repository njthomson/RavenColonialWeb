import { Label, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack } from '@fluentui/react';
import { Component, createRef } from 'react';
import { api } from '../api';
import { KnownFC, mapCommodityNames } from '../types';
import { CommodityIcon, FindFC } from '../components';

interface FleetCarrierProps {
  marketId?: string;
}

interface FleetCarrierState {
  nextMarketId?: string;
  foo?: string;
  errorMsg?: string;

  loading: boolean;
  fc?: KnownFC;
  cargo: Record<string, number>;
}

export class FleetCarrier extends Component<FleetCarrierProps, FleetCarrierState> {
  private findFC = createRef<FindFC>();

  constructor(props: FleetCarrierProps) {
    super(props);

    this.state = {
      nextMarketId: this.props.marketId,
      loading: false,
      cargo: {},
      // showBubble: !this.props.cmdr,
    };
  }

  componentDidMount(): void {
    window.document.title = `FC: ${this.props?.marketId ?? '?'}`;
    if (this.props.marketId) {
      this.setState({ loading: true })
      api.fc.get(this.props.marketId)
        .then(fc => this.setState({ loading: false, fc: fc, cargo: fc.cargo }))
        .catch(err => this.setState({ loading: false, errorMsg: err.message }));
    }
  }

  componentDidUpdate(prevProps: Readonly<FleetCarrierProps>, prevState: Readonly<FleetCarrierState>, snapshot?: any): void {
    // if (prevProps.cmdr !== this.props.cmdr) {
    //   this.fetchCmdrProjects(this.props.cmdr);
    // }
  }

  // async fetchCmdrProjects(cmdr: string | undefined): Promise<void> {
  //   this.setState({ loading: true, projects: undefined });
  //   try {
  //     if (!cmdr) { return; }
  //     const url = `${apiSvcUrl}/api/cmdr/${encodeURIComponent(cmdr)}/summary`;
  //     console.log('fetchCmdrProjects:', url);

  //     this.setState({ loading: true, projects: undefined });

  //     // await new Promise(resolve => setTimeout(resolve, 2500));
  //     const response = await fetch(url, { method: 'GET' });
  //     if (response.status === 200) {
  //       const cmdrSummary: CmdrSummary = await response.json();

  //       this.setState({ projects: cmdrSummary.projects });
  //     } else {
  //       const msg = `${response.status}: ${response.statusText}`;
  //       this.setState({ errorMsg: msg });
  //       console.error(msg);
  //     }
  //   } catch (err: any) {
  //     this.setState({
  //       errorMsg: err.message,
  //     });
  //     console.error(err.stack);
  //   } finally {
  //     this.setState({
  //       loading: false
  //     });
  //   }
  // }

  render() {
    const { errorMsg } = this.state;

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      <div className='half'>
        <h3>Fleet Carrier:</h3>
        {!this.props.marketId && this.renderFindFC()}
        {this.props.marketId && this.renderFC()}
      </div>
    </>;
  }

  renderFindFC() {
    const { nextMarketId, errorMsg } = this.state;

    return <>
      <Label>Enter Fleet Carrier name:</Label>
      <Stack horizontal>

        <FindFC
          match
          errorMsg={errorMsg}
          onMarketId={(marketId) => this.setState({ nextMarketId: marketId })}
        />

        <PrimaryButton
          disabled={!nextMarketId}
          iconProps={{ iconName: 'Search' }}
          onClick={() => {
            this.setState({ errorMsg: !!errorMsg ? '' : 'oops' })
            console.log('!');
            window.location.assign(`#fc=${nextMarketId}`);
            window.location.reload();
          }}
        />
      </Stack>
    </>;
  }

  renderFC() {
    const { loading, fc, cargo } = this.state;
    if (!fc) return;

    return <>
      {loading && <Spinner size={SpinnerSize.large} label={`Loading  ...`} />}
      <div className='hint' style={{backgroundColor: 'lightcyan'}}>(temporary UI)</div>

      <table>
        <tbody>
          <tr>
            <td>Name:</td>
            <td className='grey'>{fc.displayName} ({fc.name})</td>
          </tr>
          <tr>
            <td>MarketId:</td>
            <td className='grey'>{fc.marketId}</td>
          </tr>
        </tbody>
      </table>

      {this.renderCargo(fc.marketId, cargo)}
    </>;
  }

  renderCargo(marketId: number, cargo: Record<string, number>) {

    const cargoKeys = Object.keys(cargo);

    const rows = cargoKeys.map(key => {
      const displayName = mapCommodityNames[key];
      return <tr key={`c-${key}`}>
        <td>
          <CommodityIcon name={key} /> {displayName}
        </td>
        <td>
          <input
            type='number'
            min={0}
            value={cargo[key]}
            onChange={(ev) => {
              const cargoUpdate = this.state.cargo;
              cargoUpdate[key] = ev.target.valueAsNumber;
              this.setState({ cargo: cargoUpdate });
            }}
          />
        </td>
      </tr>
    });


    return <>
      <table>
        <thead><tr>
          <th>Commodity:</th>
          <th>Amount:</th>
        </tr></thead>
        <tbody>
          {rows}
        </tbody>
      </table>
      <PrimaryButton
        text='Update cargo'
        onClick={() => {
          this.setState({ loading: true});
          api.fc.updateCargo(this.state.fc!.marketId, this.state.cargo)
            .then(cargoUpdated => {
              this.setState({ loading: false, cargo: cargoUpdated });
            })
            .catch(err => this.setState({ loading: false, errorMsg: err.message }));
        }}
      />
    </>
  }
}
