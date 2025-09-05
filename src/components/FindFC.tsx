import * as api from '../api';
import { ComboBox, IComboBox, IComboBoxOption, IconButton, Stack } from '@fluentui/react';
import { Component, createRef } from 'react';
import { appTheme } from '../theme';

interface FindFCProps {
  onChange: (marketId: string | undefined) => void;
  match?: boolean;
  preMatches?: Record<string, string>
  notThese: string[]
}

interface FindFCState {
  matches: IComboBoxOption[];
  marketId?: string;
  matchName?: string;
  errorMsg?: string;
  searching?: boolean;
  preMatch?: boolean;
}

export class FindFC extends Component<FindFCProps, FindFCState> {
  private comboFindFC = createRef<IComboBox>();
  private comboFindPendingTypeCount = 0;

  constructor(props: FindFCProps) {
    super(props);

    const preMatches = Object.entries(props.preMatches ?? {})?.map(([marketId, fullName]) => ({
      key: marketId,
      text: fullName,
    }));

    this.state = {
      matches: preMatches,
      preMatch: preMatches.length > 0,
    };
  }

  componentDidMount(): void {
    if (this.state.preMatch) {
      this.comboFindFC.current?.focus(true, true);
    }
  }

  componentDidUpdate(prevProps: Readonly<FindFCProps>, prevState: Readonly<FindFCState>, snapshot?: any): void {
    if (prevState.marketId !== this.state.marketId) {
      this.props.onChange(this.state.marketId);
    }
  }

  render() {
    const { matches, errorMsg } = this.state;

    return <>
      <Stack className='add-fc' horizontal tokens={{ childrenGap: 8 }}>
        <ComboBox
          id='add-fc-combo'
          componentRef={this.comboFindFC}
          openOnKeyboardFocus
          errorMessage={errorMsg}
          styles={{
            root: { maxWidth: 300 },
            callout: {
              border: '1px solid ' + appTheme.palette.themePrimary,
              display: errorMsg ? 'none' : 'flex',
            },
          }}
          allowFreeform
          autoComplete='off'
          options={matches}

          onRenderUpperContent={() => {
            const hint = this.getUpperContentHint();
            if (hint)
              return <div className='add-fc-upper' style={{ color: appTheme.palette.themePrimary }}>{hint}</div>;
            else
              return null;
          }}

          onInputValueChange={this.onType}

          onChange={(_, o) => {
            const newMarketId = o?.key.toString();
            if (!newMarketId) return;

            if (this.props.notThese.includes(newMarketId)) {
              this.setState({
                errorMsg: 'FC already linked'
              });
            } else {
              this.onChooseFC(newMarketId);
            }
          }}
        />

        <IconButton
          title='Cancel'
          iconProps={{ iconName: 'Cancel' }}
          onClick={() => this.props.onChange(undefined)}
        />

      </Stack>
    </>;
  }

  getUpperContentHint() {
    const { preMatch, matchName, searching } = this.state;

    if (preMatch)
      return 'Commander linked Fleet Carriers:';
    else if (!preMatch && (!matchName || matchName.length < 3))
      return 'Type 3 characters to begin search';
    else if (searching)
      return 'Searching ...';
    else
      return null;
  }

  onType = async (txt: string) => {
    this.setState({ errorMsg: undefined, marketId: undefined, searching: true, preMatch: false });
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
    if (txt.length < 3) {
      this.setState({ matches: [] });
      return;
    }

    if (this.props.match) {
      this.setState({ matches: [], searching: true });

      // MATCH the FC from those known to us
      const matches = await api.fc.match(txt);

      const keys = Object.keys(matches);
      this.setState({
        searching: false,
        errorMsg: keys.length === 0 ? 'No matches found. Try Carrier ID?' : undefined,
        marketId: undefined,
        matches: keys.map(k => ({
          key: k,
          text: matches[k],
        }))
      });
      this.comboFindFC.current?.focus(true);
    } else {
      this.setState({ matches: [], searching: true });

      // FIND the FC
      const matches = await api.fc.query(txt);

      this.setState({
        searching: false,
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

  onChooseFC = async (marketId: string) => {
    try {
      // check we know this FC first
      await api.fc.check(marketId);
    } catch (err: any) {
      if (err.statusCode !== 409) {
        this.setState({ errorMsg: err.message });
        return;
      }
    }

    // pass onto external code
    this.props.onChange(marketId);
  }
}
