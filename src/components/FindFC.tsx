import { ComboBox, IComboBox, IComboBoxOption } from '@fluentui/react';
import { Component, createRef } from 'react';
import { api } from '../api';

interface FindFCProps {
  onMarketId: (marketId: string | undefined) => void;
  errorMsg?: string;
  match?: boolean;
}

interface FindFCState {
  matches: IComboBoxOption[];
  marketId?: string;
  matchName?: string;
  errorMsg?: string;
}

export class FindFC extends Component<FindFCProps, FindFCState> {
  private comboFindFC = createRef<IComboBox>();
  private comboFindPendingTypeCount = 0;

  constructor(props: FindFCProps) {
    super(props);
    this.state = {
      matches: [],
      errorMsg: props.errorMsg,
    };
  }

  componentDidUpdate(prevProps: Readonly<FindFCProps>, prevState: Readonly<FindFCState>, snapshot?: any): void {
    if (prevState.marketId !== this.state.marketId) {
      this.props.onMarketId(this.state.marketId);
    }

    if (this.props.errorMsg && this.props.errorMsg !== this.state.errorMsg) {
      this.setState({ errorMsg: this.props.errorMsg });
    }
  }

  render() {
    const { matches, matchName, errorMsg } = this.state;

    return <>
      <ComboBox
        id='add-fc-combo'
        componentRef={this.comboFindFC}
        openOnKeyboardFocus
        errorMessage={errorMsg}
        styles={{ root: { maxWidth: 300 } }}
        allowFreeform
        autoComplete='off'
        options={matches}
        onRenderUpperContent={() => {
          if (!matchName || matchName.length < 4)
            return <div className='add-fc-upper'>Type 4 characters to begin search</div>;
          else
            return <></>;
        }}
        onInputValueChange={this.onMatchFC}
        onChange={(_, o, i, v) => {
          this.setState({
            marketId: o?.key.toString(),
            errorMsg: undefined
          });
          console.warn(`==> ${o?.key} / ${v}`);
        }}
      />
    </>;
  }

  onMatchFC = async (txt: string) => {
    this.setState({ errorMsg: undefined, marketId: undefined });
    this.comboFindPendingTypeCount++;
    // wait half a second, only proceed if no other typing happened since
    await new Promise(resolve => setTimeout(resolve, 500));
    this.comboFindPendingTypeCount--;
    if (this.comboFindPendingTypeCount > 0) {
      // don't search if empty string
      this.setState({
        marketId: undefined,
        errorMsg: undefined,
        matches: [],
      });
      return;
    }

    if (txt.length === 0) {
      // don't search if empty string
      this.setState({
        marketId: undefined,
        errorMsg: undefined,
        matches: [],
      });
      this.comboFindFC.current?.dismissMenu();
      return;
    }

    this.setState({ matchName: txt, });
    if (txt.length < 4) return;

    if (this.props.match) {
      this.setState({ matches: [] });

      // MATCH the FC from those known to us
      const matches = await api.fc.match(txt);

      const keys = Object.keys(matches);
      this.setState({
        errorMsg: keys.length === 0 ? 'No matches found. Try Carrier ID?' : undefined,
        marketId: undefined,
        matches: keys.map(k => ({
          key: k,
          text: matches[k],
        }))
      });
      this.comboFindFC.current?.focus(true);
    } else {
      this.setState({ matches: [] });

      // FIND the FC via Spansh
      const matches = await api.fc.find(txt);

      this.setState({
        errorMsg: matches.length === 0 ? 'No matches found. Try Carrier ID?' : undefined,
        marketId: undefined,
        matches: matches.map(m => ({
          key: m.market_id,
          text: m.carrier_name ? `${m.carrier_name} (${m.name})` : m.name,
        }))
      });
      this.comboFindFC.current?.focus(true);
    }
  };
}
