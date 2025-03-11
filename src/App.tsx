import { Component } from 'react';
import { Pivot, PivotItem, ThemeProvider } from '@fluentui/react';
import { About } from './about';
import { Home } from './home';
import { TopPivot } from './types'
import { ProjectSearch } from './project-search';
import { appTheme } from './theme';
import { ProjectView } from './project-view';
import './App.css';
import { Footer } from './footer';

interface AppProps {

}
interface AppState {
  pivot: TopPivot;
  bid?: string | null;
  find?: string | null;
}

export class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {
      pivot: TopPivot.home,
    };


    window.onhashchange = (ev: HashChangeEvent) => {
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
    }
    else {
      const params = new URLSearchParams(window.location.hash?.substring(1));
      if (params.has('find')) {
        // searching for build projects
        nextState.pivot = TopPivot.find;
        nextState.find = params.get('find');
      }

      else if (params.has('build')) {
        // viewing a build project
        nextState.pivot = TopPivot.build;
        nextState.bid = params.get('build');
      } else {
        nextState.pivot = TopPivot.home;
      }
    }

    this.setState(nextState);
  }

  onTabClick = () => {

  };

  render() {
    const { pivot, bid, find } = this.state;

    return (
      <ThemeProvider theme={appTheme} className='app'>
        <Pivot
          selectedKey={pivot}
          onLinkClick={(i) => {
            if (!i) { return; }

            const newHash = `#${i.props.itemKey}`;
            if (!window.location.hash.startsWith(newHash)) {
              window.location.assign(newHash);
              // this.setState({
              //   pivot: TopPivot[i.props.itemKey as TopPivot]
              // });
            }

            // setTS({ ...ts, pivot: i.props.itemKey as TopPivot });
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
          <PivotItem itemKey={TopPivot.about} headerText="About">
            <About />
          </PivotItem>
        </Pivot>
        <br />
        <Footer />
      </ThemeProvider>
    );
  }
}
