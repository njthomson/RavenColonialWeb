import './App.css';
import { Component, } from 'react';
import { CommandBar, DefaultButton, ICommandBarItemProps, IContextualMenuItem, initializeIcons, Modal, PrimaryButton, Slider, Stack, TextField, ThemeProvider } from '@fluentui/react';
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
  nearItems: ICommandBarItemProps[];
  cmdrBtn: ICommandBarItemProps;
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
      nearItems: [{
        key: 'home', iconOnly: true,
        iconProps: { iconName: 'Home' },
        onClick: (_, i) => this.clickNearItem(i),
      }, {
        key: 'find', text: 'Find',
        onClick: (_, i) => this.clickNearItem(i),
      }, {
        key: 'build', text: 'Build',
        onClick: (_, i) => this.clickNearItem(i),
      }, {
        key: 'cmdr', text: 'Cmdr',
        onClick: (_, i) => this.clickNearItem(i),
      }, {
        key: 'about', text: 'About',
        onClick: (_, i) => this.clickNearItem(i),
      }],
      cmdrBtn: {
        id: 'current-cmdr', key: 'current-cmdr',
        iconProps: { iconName: cmdr?.name ? 'Contact' : 'UserWarning' },
        text: cmdr?.name ?? '?',
        onClick: () => this.setState({ cmdrEdit: Store.getCmdr()?.name ?? '' }),
      },
      cmdr: cmdr?.name,
      cargoLargeMax: this.largeMax,
      cargoMediumMax: this.medMax,
    };

    window.onhashchange = (ev: HashChangeEvent) => {
      console.debug('onhashchange:', ev);
      this.setStateFromHash();
    };
  }

  clickNearItem = (item: IContextualMenuItem | undefined): boolean | void => {
    if (!item) { return; }

    const newHash = `#${item.key}`;
    if (!window.location.hash.startsWith(newHash)) {
      window.location.assign(newHash);
    }
    return true;
  };

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
    const { nearItems, cmdrBtn, cmdrEdit, cargoLargeMax, cargoMediumMax } = this.state;

    const editingCmdr = cmdrEdit !== undefined;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <CommandBar items={nearItems} farItems={[cmdrBtn]} className='top-bar' />
        {this.renderBody()}

        <Modal isOpen={editingCmdr}>
          <div className="edit-cmdr">
            <h2>Who are you?</h2>
            <TextField name='cmdr' value={cmdrEdit} onChange={(_, v) => this.setState({ cmdrEdit: v! })} onKeyDown={(ev) => {if (ev.key === 'Enter') { this.saveCmdrName(); }}} autoFocus />
            <Slider min={0} max={794} value={cargoLargeMax} label='Large ship max capacity:' onChange={v => this.setState({ cargoLargeMax: v })} />
            <Slider min={0} max={400} value={cargoMediumMax} label='Medium ship max capacity:' onChange={v => this.setState({ cargoMediumMax: v })} />
            <Stack horizontal tokens={{ childrenGap: 10, padding: 10, }}>
              <PrimaryButton iconProps={{ iconName: 'Save' }} text='Save' onClick={this.saveCmdrName} />
              <DefaultButton iconProps={{ iconName: 'Delete' }} text='Clear' onClick={this.clearCmdrName} />
              <DefaultButton iconProps={{ iconName: 'Cancel' }} text='Cancel' onClick={this.cancelCmdrName} />
            </Stack>
          </div>
        </Modal>
        <br />
        <footer>
          <p>© 2025 - Raven Colonial Corporation - Under development</p>
        </footer>
      </ThemeProvider>
    );
  }

  renderBody() {
    const { pivot, bid, find, cmdr } = this.state;

    switch (pivot) {
      case TopPivot.home: return <Home />;
      case TopPivot.find: return <ProjectSearch find={find} />;
      case TopPivot.build: return <ProjectView buildId={bid} cmdr={cmdr} />;
      case TopPivot.cmdr: return <Cmdr cmdr={cmdr} />;
      case TopPivot.about: return <About />;
    }
  }

  clearCmdrName = () => {
    const { pivot, cmdrBtn, } = this.state;
    Store.clearCmdr();

    this.setState({
      cmdr: undefined,
      cmdrEdit: undefined,
      cmdrBtn: {
        ...cmdrBtn,
        iconProps: { iconName: 'UserWarning' },
        text: '?',
      },
    });

    if (pivot === TopPivot.cmdr) {
      window.document.title = `Cmdr: ?`;
    }
  }

  saveCmdrName = () => {
    const { cmdrBtn, cmdrEdit, cargoLargeMax, cargoMediumMax } = this.state;
    if (!!cmdrEdit) {
      Store.setCmdr({
        name: cmdrEdit,
        largeMax: cargoLargeMax,
        medMax: cargoMediumMax,
      });

      this.setState({
        cmdr: cmdrEdit,
        cmdrEdit: undefined,
        cmdrBtn: {
          ...cmdrBtn,
          iconProps: { iconName: 'Contact' },
          text: cmdrEdit,
        },
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
