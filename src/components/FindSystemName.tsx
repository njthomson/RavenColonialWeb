import * as api from '../api';
import { ComboBox, IComboBox, IComboBoxOption, IconButton, Label, Stack } from '@fluentui/react';
import { Component, createRef } from 'react';
import { appTheme } from '../theme';

interface FindSystemNameProps {
  onMatch: (systemName: string | undefined) => void;
  text?: string;
  errorMsg?: string;
  match?: boolean;
}

interface FindSystemNameState {
  matches?: IComboBoxOption[];
  searchText?: string;
  errorMsg?: string;
  searching: boolean;
}

export class FindSystemName extends Component<FindSystemNameProps, FindSystemNameState> {
  private comboFind = createRef<IComboBox>();
  private comboFindPendingTypeCount = 0;

  constructor(props: FindSystemNameProps) {
    super(props);
    this.state = {
      searchText: props.text ?? '',
      matches: undefined,
      errorMsg: props.errorMsg,
      searching: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<FindSystemNameProps>, prevState: Readonly<FindSystemNameState>, snapshot?: any): void {
    if (this.props.text && prevProps.text !== this.props.text && this.props.text !== this.state.searchText) {
      this.setState({ searchText: this.props.text, matches: undefined });
    }

    if (this.props.errorMsg && this.props.errorMsg !== this.state.errorMsg) {
      this.setState({ errorMsg: this.props.errorMsg });
    }
  }

  render() {
    const { searchText, matches, errorMsg, searching } = this.state;

    return <>
      <Label required={true}>System name:</Label>

      <Stack horizontal>
        <ComboBox
          id='find-system'
          placeholder='Enter a system name'
          autoFocus
          text={searchText}
          componentRef={this.comboFind}
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
          // autoComplete='off'
          options={matches ?? []}
          onInputValueChange={this.onType}
          onMenuOpen={() => {
            // console.log(`onMenuOpen `, this.state);
            if (!this.state.matches) {
              this.onFind(this.state.searchText);
            }
          }}
          onRenderUpperContent={() => {
            // console.log(`upper: (${this.comboFindPendingTypeCount}) / ${this.state.searchText} / ${matches?.length}`);
            if (this.state.searching) {
              return <div style={{ color: appTheme.palette.themePrimary }}>Searching ...</div>;
            } else if (searchText && searchText.length > 2 && !!matches) {
              return null;
            } else {
              return <div style={{ color: appTheme.palette.themePrimary }}>Type 3 characters to begin search</div>;
            }
          }}
          onChange={(_, o, i, v) => {
            const systemName = o?.key.toString();
            if (!!systemName) {
              this.setState({
                searchText: systemName,
                errorMsg: undefined
              });
              this.props.onMatch(systemName);
            } else {
              this.setState({
                errorMsg: 'No matches found'
              });
            }
          }}
        />

        <IconButton
          iconProps={{ iconName: 'Search' }}
          disabled={searching}
          onClick={() => this.onFind(this.state.searchText)} />
      </Stack>
    </>;
  }

  onType = async (txt: string) => {
    this.setState({
      errorMsg: undefined,
      searchText: txt,
      searching: txt.length > 2
    });

    // wait a bit for more typing, only proceed if no other typing happened since
    this.comboFindPendingTypeCount++;
    // console.log(`pre: (${this.comboFindPendingTypeCount}) ${txt} / ${this.state.searchText}`);
    await new Promise(resolve => setTimeout(resolve, 250));
    this.comboFindPendingTypeCount--;
    // console.log(`post: (${this.comboFindPendingTypeCount}) ${txt}/ ${this.state.searchText}`);

    // exit early - still typing
    if (this.comboFindPendingTypeCount > 0) { return; }

    if (txt.length > 2) {
      // do the search
      await this.onFind(txt);
    } else {
      this.setState({
        errorMsg: undefined,
        matches: [],
      });
      if (txt.length === 0) {
        this.comboFind.current?.dismissMenu();
      } else if (txt.length < 3) {
        this.comboFind.current?.focus(true, true);
      }
    }
  };

  onFind = async (txt: string | undefined) => {
    // console.log(`onFind: ${txt}/ ${this.state.searchText}`);
    if (!txt) {
      this.comboFind.current?.focus(true, true);
      return;
    }
    if (txt.length < 3) return;
    if (this.state.matches?.some(m => m.text === txt)) {
      // we have an exact match - do not search again?
      this.props.onMatch(txt);
      return;
    }


    // query system names
    this.setState({ matches: [], searching: true });
    const matches = await api.edsm.findSystems(txt);

    this.setState({
      errorMsg: matches.length === 0 ? 'No matches found' : undefined,
      searching: false,
      matches: matches.map(m => ({
        key: m.value,
        text: m.value,
      }))
    });

    this.comboFind.current?.focus(true);
  }
}

