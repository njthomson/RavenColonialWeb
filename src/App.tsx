import './App.css';

import * as api from './api';
import { CommandBar, IContextualMenuItem, initializeIcons, Modal, ThemeProvider } from '@fluentui/react';
import { Component, } from 'react';
import { store } from './local-storage';
import { appTheme } from './theme';
import { TopPivot } from './types';
import { About, Commander, Home, ProjectSearch, ProjectView } from './views';
import { ModalCommander } from './components/ModalCommander';

// Initialize icons in case this example uses them
initializeIcons();

interface AppProps {
}

interface AppState {
  pivot: TopPivot;
  bid?: string;
  find?: string;

  cmdr?: string;
  cmdrEdit: boolean;
}

export class App extends Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);


    this.state = {
      pivot: TopPivot.home,
      cmdr: store.cmdrName,
      cmdrEdit: false,
    };

    window.onhashchange = () => {
      // console.debug('onhashchange:', ev);
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
    this.setStateFromHash();
    this.fetchPrimaryBuildId();
  }

  fetchPrimaryBuildId() {
    api.cmdr.getPrimary(store.cmdrName)
      .then(buildId => store.primaryBuildId = buildId)
      .catch(err => console.error(err.message));
  }

  setStateFromHash() {
    // console.log(`** App.setStateFromHash: '${window.location.hash}'`);
    const nextState = { ...this.state };

    if (window.location.hash === '#about') {
      nextState.pivot = TopPivot.about;
    } else {
      const params = new URLSearchParams(window.location.hash?.substring(1));
      if (params.has('find')) {
        // searching for build projects
        nextState.pivot = TopPivot.find;
        nextState.find = params.get('find') ?? undefined;
      } else if (params.has('build')) {
        // viewing a build project
        nextState.pivot = TopPivot.build;
        nextState.bid = params.get('build') ?? undefined;
      } else if (params.has('cmdr')) {
        // Cmdr specific data
        nextState.pivot = TopPivot.cmdr;
        const hashCmdr = params.get('cmdr');
        if (hashCmdr) {
          // update to new name and clean the hash
          console.log(`Chanding cmdr: ${store.cmdrName} => ${hashCmdr}`);
          store.cmdrName = hashCmdr;
          nextState.cmdr = hashCmdr;
          window.location.hash = `#cmdr`;
          this.fetchPrimaryBuildId();
        } else {
          nextState.cmdr = store.cmdrName;
        }
      } else {
        nextState.pivot = TopPivot.home;
      }
    }

    this.setState(nextState);
  }

  render() {
    const { cmdrEdit } = this.state;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <CommandBar
          className='top-bar'
          items={[{
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
          }]}
          farItems={[{
            id: 'current-cmdr', key: 'current-cmdr',
            iconProps: { iconName: store.cmdrName ? 'Contact' : 'UserWarning' },
            text: this.state.cmdr,
            onClick: () => this.setState({ cmdrEdit: !this.state.cmdrEdit }),
          }]}
        />
        {this.renderBody()}

        {cmdrEdit && <Modal isOpen>
          <ModalCommander onComplete={() => this.setState({ cmdrEdit: false })} />
        </Modal>}
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
      case TopPivot.cmdr: return <Commander cmdr={cmdr} />;
      case TopPivot.about: return <About />;
    }
  }

}
