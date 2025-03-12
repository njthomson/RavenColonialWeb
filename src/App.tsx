import './App.css';
import { Component } from 'react';
import { ActionButton, DefaultButton, initializeIcons, IStackTokens, Modal, Pivot, PivotItem, PrimaryButton, Slider, Stack, TextField, ThemeProvider } from '@fluentui/react';
import { About } from './about';
import { Home } from './home';
import { TopPivot } from './types'
import { ProjectSearch } from './project-search';
import { appTheme } from './theme';
import { ProjectView } from './project-view';
import { Cmdr } from './cmdr';
import { Store } from './local-storage';

// Initialize icons in case this example uses them
initializeIcons();

interface AppProps {
}

interface AppState {
  pivot: TopPivot;
  bid?: string;
  find?: string;

  cmdr?: string;
  cmdrEdit?: string;

  cargoLargeMax: number;
  cargoMediumMax: number;
}

export class App extends Component<AppProps, AppState> {
  largeMax: number;
  medMax: number;

  constructor(props: AppProps) {
    super(props);

    const cmdr = Store.getCmdr();
    this.largeMax = cmdr?.largeMax ?? 790;
    this.medMax = cmdr?.medMax ?? 400;

    this.state = {
      pivot: TopPivot.home,
      cmdr: cmdr?.name,
      cargoLargeMax: this.largeMax,
      cargoMediumMax: this.medMax,
    };


    window.onhashchange = (ev: HashChangeEvent) => {
      console.debug('onhashchange:', ev);
      this.setStateFromHash();
    };
  }

  componentDidMount(): void {
    // console.warn(`** App.componentDidMount`);
    this.setStateFromHash();
  }

  setStateFromHash() {
    // console.log(`** App.setStateFromHash: '${window.location.hash}'`);
    const nextState = { ...this.state };

    if (window.location.hash === '#about') {
      nextState.pivot = TopPivot.about;
    } else if (window.location.hash === '#cmdr') {
      nextState.pivot = TopPivot.cmdr;
    } else {
      const params = new URLSearchParams(window.location.hash?.substring(1));
      if (params.has('find')) {
        // searching for build projects
        nextState.pivot = TopPivot.find;
        nextState.find = params.get('find') ?? undefined;
      }

      else if (params.has('build')) {
        // viewing a build project
        nextState.pivot = TopPivot.build;
        nextState.bid = params.get('build') ?? undefined;
      } else {
        nextState.pivot = TopPivot.home;
      }
    }

    this.setState(nextState);
  }

  render() {
    const { pivot, bid, find, cmdr } = this.state;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <Pivot
          selectedKey={pivot}
          onLinkClick={(i) => {
            if (!i) { return; }

            const newHash = `#${i.props.itemKey}`;
            if (!window.location.hash.startsWith(newHash)) {
              window.location.assign(newHash);
            }
          }}
        >
          <PivotItem itemKey={TopPivot.home} headerText="Raven Colonial Corporation">
            <Home />
          </PivotItem>
          <PivotItem itemKey={TopPivot.find} headerText="Find">
            <ProjectSearch find={find} />
          </PivotItem>
          <PivotItem itemKey={TopPivot.build} headerText="Build">
            <ProjectView buildId={bid} />
          </PivotItem>
          <PivotItem itemKey={TopPivot.cmdr} headerText="Cmdr">
            <Cmdr cmdr={cmdr} />
          </PivotItem>
          <PivotItem itemKey={TopPivot.about} headerText="About">
            <About />
          </PivotItem>
        </Pivot>
        {this.renderCmdr()}

        <br />
        <footer>
          <p>© 2025 - Raven Colonial Corporation - Under development</p>
        </footer>
      </ThemeProvider>
    );
  }

  renderCmdr() {
    const { cmdr, cmdrEdit, cargoLargeMax, cargoMediumMax } = this.state;

    const editingCmdr = cmdrEdit !== undefined;
    const txt = `Cmdr: ${cmdr ?? '?'}`;
    const icon = { iconName: cmdr ? 'Contact' : 'UserWarning' };

    const horizontalGapStackTokens: IStackTokens = {
      childrenGap: 10,
      padding: 10,
    };

    return <div className='current-cmdr'>
      <ActionButton id='current-cmdr' iconProps={icon} text={txt} onClick={() => {
        this.setState({ cmdrEdit: cmdr ?? '' });
      }} />

      <Modal isOpen={editingCmdr}>
        <div className="edit-cmdr">
          <h2>Who are you?</h2>
          <TextField name='cmdr' value={cmdrEdit} onChange={(_, v) => this.setState({ cmdrEdit: v! })} autoFocus />
          <Slider min={0} max={794} value={cargoLargeMax} label='Large ship max capacity:' onChange={v => this.setState({ cargoLargeMax: v })} />
          <Slider min={0} max={400} value={cargoMediumMax} label='Medium ship max capacity:' onChange={v => this.setState({ cargoMediumMax: v })} />
          <Stack horizontal tokens={horizontalGapStackTokens}>
            <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.saveCmdrName} />
            <DefaultButton iconProps={{ iconName: 'Delete' }} text='Clear' onClick={this.clearCmdrName} />
            <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={this.cancelCmdrName} />
          </Stack>
        </div>
      </Modal >

    </div >;
  }

  clearCmdrName = () => {
    Store.clearCmdr();
    this.setState({
      cmdr: undefined,
      cmdrEdit: undefined,
    });
  }

  saveCmdrName = () => {
    const { cmdrEdit, cargoLargeMax, cargoMediumMax } = this.state;
    if (!!cmdrEdit) {
      Store.setCmdr({
        name: cmdrEdit,
        largeMax: cargoLargeMax,
        medMax: cargoMediumMax,
      });
      this.setState({
        cmdr: cmdrEdit,
        cmdrEdit: undefined,
      });
      window.location.reload();
    }
  }

  cancelCmdrName = () => {
    this.setState({
      cmdrEdit: undefined,
      cargoLargeMax: this.largeMax,
      cargoMediumMax: this.medMax,
    });
  };
}
