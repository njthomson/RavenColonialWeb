import { ComboBox, IComboBox, IComboBoxOption, Label } from '@fluentui/react';
import { Component, createRef } from 'react';
import * as api from '../api';

interface FindSystemNameProps {
  onMatch: (marketId: string | undefined) => void;
  text?: string;
  errorMsg?: string;
  match?: boolean;
}

interface FindSystemNameState {
  matches: IComboBoxOption[];
  text?: string;
  matchName?: string;
  errorMsg?: string;
}

export class FindSystemName extends Component<FindSystemNameProps, FindSystemNameState> {
  private comboFindFC = createRef<IComboBox>();
  private comboFindPendingTypeCount = 0;

  constructor(props: FindSystemNameProps) {
    super(props);
    this.state = {
      text: props.text ?? '',
      matches: [],
      errorMsg: props.errorMsg,
    };
  }

  componentDidUpdate(prevProps: Readonly<FindSystemNameProps>, prevState: Readonly<FindSystemNameState>, snapshot?: any): void {
    if (this.state.text && prevState.text !== this.state.text) {
      this.props.onMatch(this.state.text);
    }

    if (this.props.text && prevProps.text !== this.props.text && this.props.text !== this.state.text) {
      this.setState({ text: this.props.text });
    }

    if (this.props.errorMsg && this.props.errorMsg !== this.state.errorMsg) {
      this.setState({ errorMsg: this.props.errorMsg });
    }
  }

  render() {
    const { text, matches, matchName, errorMsg } = this.state;

    return <>
      <Label required={true}>System name:</Label>
      <ComboBox
        text={text}
        componentRef={this.comboFindFC}
        openOnKeyboardFocus
        errorMessage={errorMsg}
        styles={{ root: { maxWidth: 300 } }}
        allowFreeform
        autoComplete='off'
        options={matches}
        onRenderUpperContent={() => {
          if (!matchName || matchName.length < 3)
            return <div className='add-fc-upper'>Type 3 characters to begin search</div>;
          else
            return <></>;
        }}
        onInputValueChange={this.onMatch}
        onChange={(_, o, i, v) => {
          this.setState({
            text: o?.key.toString(),
            errorMsg: undefined
          });
        }}
      />
    </>;
  }

  onMatch = async (txt: string) => {
    this.setState({ errorMsg: undefined, text: undefined });
    this.comboFindPendingTypeCount++;
    // wait half a second, only proceed if no other typing happened since
    await new Promise(resolve => setTimeout(resolve, 500));
    this.comboFindPendingTypeCount--;
    if (this.comboFindPendingTypeCount > 0) {
      // don't search if empty string
      this.setState({
        text: undefined,
        errorMsg: undefined,
        matches: [],
      });
      return;
    }

    if (txt.length === 0) {
      // don't search if empty string
      this.setState({
        text: undefined,
        errorMsg: undefined,
        matches: [],
      });
      this.comboFindFC.current?.dismissMenu();
      return;
    }

    this.setState({ matchName: txt, });
    if (txt.length < 3) return;

    this.setState({ matches: [] });

    // MATCH the FC from those known to us
    const matches = await api.edsm.findSystems(txt);

    this.setState({
      errorMsg: matches.length === 0 ? 'No matches found. Try Carrier ID?' : undefined,
      text: undefined,
      matches: matches.map(m => ({
        key: m.value,
        text: m.value,
      }))
    });
    this.comboFindFC.current?.focus(true);

  };
}
