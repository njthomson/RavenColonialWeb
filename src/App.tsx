import './App.css';

import * as api from './api';
import { CommandBar, Dialog, DialogFooter, Icon, IContextualMenuItem, initializeIcons, Link, Modal, PrimaryButton, ThemeProvider } from '@fluentui/react';
import { Component, } from 'react';
import { store } from './local-storage';
import { appTheme } from './theme';
import { TopPivot } from './types';
import { About, Commander, Home, ProjectSearch, ProjectView } from './views';
import { ModalCommander } from './components/ModalCommander';
import { LinkSrvSurvey } from './components/LinkSrvSurvey';

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
  showDonate?: boolean;
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
    if (!!store.cmdrName) {
      api.cmdr.getPrimary(store.cmdrName)
        .then(buildId => store.primaryBuildId = buildId)
        .catch(err => console.error(err.message));
    }
  }

  setStateFromHash() {
    // console.log(`** App.setStateFromHash: '${window.location.hash}'`);
    const nextState = { ...this.state };

    const params = new URLSearchParams(window.location.hash?.substring(1));
    if (params.has('find')) {
      // searching for build projects
      nextState.pivot = TopPivot.find;
      nextState.find = params.get('find') ?? undefined;
    } else if (params.has('build')) {
      // viewing a build project
      nextState.pivot = TopPivot.build;
      nextState.bid = params.get('build') ?? undefined;
    } else if (params.has('about')) {
      // viewing help content
      nextState.pivot = TopPivot.about;
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

    this.setState(nextState);
  }

  render() {
    const { cmdrEdit, pivot, showDonate } = this.state;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <CommandBar
          className='top-bar'
          items={[
            {
              key: 'home', text: 'Home',
              iconProps: { iconName: 'Home' },
              title: 'Home',
              checked: pivot === 'home',
              onClick: (_, i) => this.clickNearItem(i),
            },
            {
              key: 'find', text: 'Find',
              iconProps: { iconName: 'Search' },
              checked: pivot === 'find',
              onClick: (_, i) => this.clickNearItem(i),
            },
            {
              key: 'build', text: 'Build',
              iconProps: { iconName: 'Manufacturing' },
              checked: pivot === 'build',
              onClick: (_, i) => this.clickNearItem(i),
            },
            // {
            //   key: 'cmdr', text: 'Cmdr',
            //   iconProps: { iconName: 'Contact' },
            //   onClick: (_, i) => this.clickNearItem(i),
            // },
            {
              key: 'about', text: 'About',
              iconProps: { iconName: 'Help' },
              checked: pivot === 'about',
              onClick: (_, i) => this.clickNearItem(i),
            },
            // {
            //   key: 'help', iconOnly: true,
            //   iconProps: { iconName: 'Help' },
            //   title: 'Help',
            //   onClick: (_, i) => this.clickNearItem(i),
            // }
          ]}
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
          <p>© 2025  Raven Colonial Corporation | <Link onClick={() => this.setState({ showDonate: true })}>Support <Icon className='icon-inline' iconName='Savings' style={{ textDecoration: 'none' }} /></Link> | <LinkSrvSurvey text='About SrvSurvey' /></p>
        </footer>

        <Dialog
          hidden={!showDonate}
          dialogContentProps={{ title: 'Support Raven Colonial' }}
        >
          Do you like this site? Fantastic!
          <br />
          <br />
          If you would like to help with server costs or buying fresh coffee, donations may be made through <Link href='https://paypal.me/SrvSurvey' target='_blank'>PayPal</Link>.
          <br />
          <br />
          Thank you 😎
          <DialogFooter>
            <PrimaryButton text="Close" onClick={() => this.setState({ showDonate: false })} />
          </DialogFooter>
        </Dialog>

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
