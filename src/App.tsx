import './App.css';
import * as api from './api';
import { CommandBar, ContextualMenu, Dialog, DialogFooter, Icon, initializeIcons, Link, Modal, PrimaryButton, Spinner, SpinnerSize, ThemeProvider } from '@fluentui/react';
import { Component, ErrorInfo, } from 'react';
import { store } from './local-storage';
import { appTheme, cn } from './theme';
import { SortMode, TopPivot } from './types';
import { About, Commander, Home, ProjectView } from './views';
import { ModalCommander } from './components/ModalCommander';
import { LinkSrvSurvey } from './components/LinkSrvSurvey';
import { ViewAll } from './views/ViewAll/ViewAll';
import { VisualIdentify } from './components/VisualIdentify';
import { SystemView2 } from './views/SystemView2/SystemView2';
import { BigSiteTablePage } from './components/BigSiteTable/BigSiteTable';
import { processLoginCodes } from './api/auth';

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
  private static scrollBarWidth = 0;
  private static fakeScroll: HTMLDivElement;

  public static suspendPageScroll() {
    if (document.body.clientHeight < document.body.scrollHeight) {
      App.fakeScroll.style.display = 'block';
      document.body.style.marginRight = `${App.scrollBarWidth}px`;
      document.body.style.overflow = 'hidden';
    }
  }

  public static resumePageScroll() {
    App.fakeScroll.style.display = 'none';
    document.body.style.marginRight = '0';
    document.body.style.overflow = 'auto';
  }

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
      this.setState({
        pivot: newPivot,
        pivotArg: pivotArg,
        cmdrEdit: false,
      });
    };
  }

  componentDidMount(): void {
    this.setStateFromHash();
    this.fetchPrimaryBuildId();

    // migrate local-storage items?
    if ((store.commoditySort as any) === 'Group by type') { store.commoditySort = SortMode.group; }
    store.migrateLinkedFCs().catch(err => console.error(err));
    localStorage.removeItem('code_verifier');

    // style scrollbars
    App.scrollBarWidth = this.calcScrollBarWidth();
    const docBody = document.getElementsByTagName('html')[0];
    docBody.className = cn.bodyScroll;

    // inject an element to proxy for the scrollbar when it is hidden
    App.fakeScroll = document.createElement('div');
    App.fakeScroll.style.backgroundColor = appTheme.palette.neutralQuaternaryAlt;
    App.fakeScroll.style.zIndex = '10';
    App.fakeScroll.style.position = 'fixed';
    App.fakeScroll.style.top = '0';
    App.fakeScroll.style.right = '0';
    App.fakeScroll.style.bottom = '0';
    App.fakeScroll.style.width = `${App.scrollBarWidth}px`;
    App.fakeScroll.style.display = 'none';
    docBody.appendChild(App.fakeScroll);
  }

  calcScrollBarWidth() {
    // Create a temporary div
    const scrollDiv = document.createElement('div');
    scrollDiv.style.opacity = '0'; // ensure not visible
    scrollDiv.style.width = '100px';
    scrollDiv.style.height = '100px';
    scrollDiv.style.overflow = 'scroll';
    scrollDiv.style.position = 'absolute';

    document.body.appendChild(scrollDiv);
    // The scrollbar width is the difference between offsetWidth and clientWidth
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    let element = document.getElementById('oops');
    if (element) { element.style.display = 'block'; }
    element = document.getElementById('bad-error');
    if (element) { element.innerText = `${window.location}\n\n${error.message ?? "Unknown"}\n\n${error.stack ?? "Unknown"}`; }
  }

  fetchPrimaryBuildId() {
    if (!!store.cmdrName) {
      api.cmdr.getPrimary(store.cmdrName)
        .then(buildId => store.primaryBuildId = buildId)
        .catch(err => console.error(err.stack));
    }
  }

  setStateFromHash() {
    // console.log(`** App.setStateFromHash: '${window.location.hash}'`);
    const nextState = { ...this.state };

    const params = new URLSearchParams(window.location.hash?.substring(1));
    if (params.has('find')) {
      // searching for build projects
      nextState.pivot = TopPivot.find;
    } else if (params.has('sys')) {
      // viewing a whole system
      nextState.pivot = TopPivot.sys;
    } else if (params.has('build') || params.has('edit')) {
      // viewing a build project
      nextState.pivot = window.location.hash === '#build' ? TopPivot.buildAll : TopPivot.build;
    } else if (params.has('about')) {
      // viewing help content
      nextState.pivot = TopPivot.about;
    } else if (params.has('vis') || window.location.pathname === '/vis') {
      nextState.pivot = TopPivot.vis;
    } else if (params.has('table') || window.location.pathname === '/table') {
      nextState.pivot = TopPivot.table;
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
    } else if (nextState.pivot === TopPivot.login) {
      // do not change any state
    } else if (window.location.pathname.endsWith('/user')) {
      nextState.cmdrEdit = true;
    } else {
      nextState.pivot = TopPivot.home;
    }

    this.setState(nextState);
  }

  getPivotFromHash(): [TopPivot, string | undefined] {
    const params = new URLSearchParams(window.location.hash?.substring(1));
    const pivotArg = params.values().next().value;

    // are we logging in?
    if (window.location.pathname.endsWith('/login')) {
      processLoginCodes();
      return [TopPivot.login, pivotArg];
    } else if (window.location.pathname.endsWith('/user')) {
      return [TopPivot.about, pivotArg];
    }

    // auto switch urls to hash based anchors
    if (window.location.pathname.length > 1) {
      window.location.assign('/#' + window.location.pathname.slice(1));
    }

    if (params.has('find')) {
      return [TopPivot.find, pivotArg];
    } else if (params.has('sys')) {
      return [TopPivot.sys, pivotArg];
    } else if (params.has('build')) {
      return window.location.hash === '#build' ? [TopPivot.buildAll, pivotArg] : [TopPivot.build, pivotArg];
    } else if (params.has('about')) {
      return [TopPivot.about, pivotArg];
    } else if (params.has('cmdr')) {
      return [TopPivot.cmdr, pivotArg];
    } else if (params.has('vis') || window.location.pathname === '/vis') {
      return [TopPivot.vis, pivotArg];
    } else if (params.has('table') || window.location.pathname === '/table') {
      return [TopPivot.table, pivotArg];
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
              className: cn.bBox,
              key: 'home', text: 'Home',
              iconProps: { iconName: 'Home' },
              title: 'Home',
              checked: pivot === 'home',
              href: '/#home',
            },
            {
              className: cn.bBox,
              key: 'find', text: 'System',
              iconProps: { iconName: 'HomeGroup' },
              checked: pivot === 'sys',
              href: '/#sys',
              onClick: (ev, i) => {
                if (window.location.hash.startsWith('#find')) {
                  ev?.preventDefault();
                }
              }
            },
            {
              className: cn.bBox,
              key: 'build', text: 'Build',
              iconProps: { iconName: 'Manufacturing' },
              checked: pivot === 'build',
              href: '/#build',
            },
            // {
            //   key: 'cmdr', text: 'Cmdr',
            //   iconProps: { iconName: 'Contact' },
            //   onClick: (_, i) => this.clickNearItem(i),
            // },
            {
              className: cn.bBox,
              key: 'about', text: 'About',
              iconProps: { iconName: 'Help' },
              checked: pivot === 'about',
              href: '/#about',
            },

          ]}
          farItems={[
            {
              className: cn.bBox,
              id: 'view-vis', key: 'vis',
              iconProps: { iconName: 'View' },
              iconOnly: true,
              title: 'Site visual identification guide',
              onClick: () => window.open('/#vis', 'vis'),
            },
            {
              className: cn.bBox,
              id: 'set-theme', key: 'theme',
              iconProps: { iconName: 'Contrast' },
              iconOnly: true,
              title: 'Choose a theme',
              onClick: () => this.setState({ showThemes: !this.state.showThemes }),
            },
            {
              className: cn.bBox,
              id: 'current-cmdr', key: 'current-cmdr',
              iconProps: { iconName: store.cmdrName ? 'Contact' : 'UserWarning' },
              text: this.state.cmdr,
              onClick: () => this.setState({ cmdrEdit: !this.state.cmdrEdit }),
            }
          ]}
        />
        {showThemes && <ContextualMenu
          target={`#set-theme`}
          onDismiss={() => this.setState({ showThemes: false })}
          items={[
            { key: 'choose', text: 'Choose a theme:', disabled: true },
            { key: 'wite/blue', text: 'Blue (light)', },
            { key: 'dark/blue', text: 'Blue (dark)', },
            { key: 'dark/orange', text: 'Orange (dark)', },
            { key: 'white/green', text: 'Green (light)', },
            { key: 'dark/green', text: 'Green (dark)', },
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
        />}

        {this.renderBody()}

        {cmdrEdit && <Modal isOpen>
          <ModalCommander onComplete={() => this.setState({ cmdrEdit: false })} />
        </Modal>}
        <br />
        <footer className={cn.footer}>
          <div>©2025 Raven Colonial Corporation <span style={{ color: 'grey' }}>|</span> <Link onClick={() => this.setState({ showDonate: true })}>Support <Icon className='icon-inline' iconName='Savings' style={{ textDecoration: 'none' }} /></Link> <span style={{ color: 'grey' }}>|</span> <LinkSrvSurvey text='About SrvSurvey' /></div>
        </footer>

        <Dialog
          hidden={!showDonate}
          dialogContentProps={{ title: 'Support Raven Colonial' }}
        >
          Do you like this site? Fantastic!
          <br />
          <br />
          If you would like to help with server costs or buying fresh coffee, donations may be made through <Link href='https://paypal.me/SrvSurvey' target='_blank'>PayPal</Link> or <Link href='https://www.patreon.com/SrvSurvey' target='_blank'>Patreon</Link>.
          <br />
          <br />
          Thank you 😎
          <br />
          <br />
          ~ CMDR Grinning2001
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
      case TopPivot.find: //return <ProjectSearch systemName={pivotArg} />;
      case TopPivot.sys: return <SystemView2 systemName={pivotArg!} />;
      case TopPivot.build: return <ProjectView buildId={pivotArg} />;
      case TopPivot.buildAll: return <ViewAll />;
      case TopPivot.cmdr: return <Commander />;
      case TopPivot.about: return <About />;
      case TopPivot.vis: return <VisualIdentify buildType={pivotArg} />;
      case TopPivot.table: return <BigSiteTablePage />;
      case TopPivot.login: return <div><Spinner style={{ marginTop: 100 }} size={SpinnerSize.large} label='Logging in ...' /></div>;
    }
  }

}
