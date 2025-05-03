import './App.css';
import * as api from './api';
import { CommandBar, ContextualMenu, Dialog, DialogFooter, Icon, IContextualMenuItem, initializeIcons, Link, Modal, PrimaryButton, ThemeProvider } from '@fluentui/react';
import { Component, } from 'react';
import { store } from './local-storage';
import { appTheme, cn } from './theme';
import { TopPivot } from './types';
import { About, Commander, Home, ProjectSearch, ProjectView } from './views';
import { ModalCommander } from './components/ModalCommander';
import { LinkSrvSurvey } from './components/LinkSrvSurvey';
import { ViewAll } from './views/ViewAll/ViewAll';

// Initialize icons in case this example uses them
initializeIcons();

interface AppProps {
}

interface AppState {
  pivot: TopPivot;
  pivotArg?: string;

  cmdr?: string;
  cmdrEdit: boolean;
  showDonate?: boolean;
  showThemes?: boolean;
}

export class App extends Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);

    const [pivot, pivotArg] = this.getPivotFromHash();

    this.state = {
      pivot: pivot,
      pivotArg: pivotArg,
      cmdr: store.cmdrName,
      cmdrEdit: false,
    };

    window.onhashchange = () => {
      // console.debug('onhashchange:', ev);
      let [newPivot, pivotArg] = this.getPivotFromHash();
      this.setState({ pivot: newPivot, pivotArg: pivotArg });
    };
  }

  clickNearItem = (item: IContextualMenuItem | undefined): boolean | void => {
    if (!item) { return; }

    const newHash = `#${item.key}`;
    if (!window.location.hash.startsWith(newHash) || newHash !== '#find') {
      window.location.assign(newHash);
    }
    return true;
  };

  componentDidMount(): void {
    this.setStateFromHash();
    this.fetchPrimaryBuildId();

    // migrate local-storage items?
    store.migrateLinkedFCs()
      .catch(err => console.error(err));
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
    } else if (params.has('build') || params.has('edit')) {
      // viewing a build project
      nextState.pivot = window.location.hash === '#build' ? TopPivot.buildAll : TopPivot.build;
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
        window.location.hash = `#home`;
        window.location.reload();
      }
    } else {
      nextState.pivot = TopPivot.home;
    }

    this.setState(nextState);
  }

  getPivotFromHash(): [TopPivot, string | undefined] {
    const params = new URLSearchParams(window.location.hash?.substring(1));
    const pivotArg = params.values().next().value;

    if (params.has('find')) {
      // searching for build projects
      return [TopPivot.find, pivotArg];
    } else if (params.has('build')) {
      return window.location.hash === '#build' ? [TopPivot.buildAll, pivotArg] : [TopPivot.build, pivotArg];
    } else if (params.has('about')) {
      return [TopPivot.about, pivotArg];
    } else if (params.has('cmdr')) {
      return [TopPivot.cmdr, pivotArg];
    } else {
      return [TopPivot.home, pivotArg];
    }
  }

  render() {
    const { cmdrEdit, pivot, showDonate, showThemes } = this.state;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <CommandBar
          className={`top-bar ${cn.topBar}`}
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

          ]}
          farItems={[
            {
              id: 'set-theme', key: 'theme',
              iconProps: { iconName: 'Contrast' },
              iconOnly: true,
              title: 'Choose a theme',
              onClick: () => this.setState({ showThemes: !this.state.showThemes }),
            },
            {
              id: 'current-cmdr', key: 'current-cmdr',
              iconProps: { iconName: store.cmdrName ? 'Contact' : 'UserWarning' },
              text: this.state.cmdr,
              onClick: () => this.setState({ cmdrEdit: !this.state.cmdrEdit }),
            }
          ]}
        />
        <ContextualMenu
          target={`#set-theme`}
          hidden={!showThemes}
          onDismiss={() => this.setState({ showThemes: false })}
          items={[
            { key: 'choose', text: 'Choose a theme:', disabled: true },
            { key: 'wite/blue', text: 'Blue (light)', },
            { key: 'dark/blue', text: 'Blue (dark)', },
            { key: 'dark/orange', text: 'Orange (dark)', },
            { key: 'white/green', text: 'Green (light)', },
          ]}
          onItemClick={(e, i) => {
            const newTheme = i?.key.toString() ?? '';
            if (newTheme !== store.theme) {
              store.theme = newTheme;
              window.location.reload();
            }
          }}
          styles={{
            container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
          }}
        />

        {this.renderBody()}

        {cmdrEdit && <Modal isOpen>
          <ModalCommander onComplete={() => this.setState({ cmdrEdit: false })} />
        </Modal>}
        <br />
        <footer className={cn.footer}>
          <div>© 2025  Raven Colonial Corporation | <Link onClick={() => this.setState({ showDonate: true })}>Support <Icon className='icon-inline' iconName='Savings' style={{ textDecoration: 'none' }} /></Link> | <LinkSrvSurvey text='About SrvSurvey' /></div>
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
    const { pivot, pivotArg } = this.state;

    switch (pivot) {
      case TopPivot.home: return <Home />;
      case TopPivot.find: return <ProjectSearch systemName={pivotArg} />;
      case TopPivot.build: return <ProjectView buildId={pivotArg} />;
      case TopPivot.buildAll: return <ViewAll />;
      case TopPivot.cmdr: return <Commander />;
      case TopPivot.about: return <About />;
    }
  }

}
