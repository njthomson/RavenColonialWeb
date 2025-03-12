import './cmdr.css';
import { MessageBar, MessageBarType, Spinner, SpinnerSize, TeachingBubble } from '@fluentui/react';
import { Component } from 'react';
import { apiSvcUrl, CmdrSummary, mapCommodityNames, mapCommodityType, Project } from './types';
import { CargoRemaining, CommodityIcon, ProjectLink } from './misc';

interface CmdrProps {
  cmdr?: string | undefined;
}

interface CmdrState {
  showBubble: boolean;
  loading?: boolean;
  projects?: Project[],
  errorMsg?: string;
}

export class Cmdr extends Component<CmdrProps, CmdrState> {
  constructor(props: CmdrProps) {
    super(props);

    this.state = {
      showBubble: !this.props.cmdr,
    };
  }

  componentDidMount(): void {
    if (this.props.cmdr) {
      this.fetchCmdrProjects(this.props.cmdr);
    }
  }

  componentDidUpdate(prevProps: Readonly<CmdrProps>, prevState: Readonly<CmdrState>, snapshot?: any): void {
    if (prevProps.cmdr !== this.props.cmdr) {
      this.fetchCmdrProjects(this.props.cmdr);
    }
  }

  async fetchCmdrProjects(cmdr: string | undefined): Promise<void> {
    this.setState({ loading: true, projects: undefined });
    try {
      if (!cmdr) { return; }
      const url = `${apiSvcUrl}/api/cmdr/${cmdr}/summary`;
      console.log('fetchCmdrProjects:', url);

      this.setState({ loading: true, projects: undefined });

      // await new Promise(resolve => setTimeout(resolve, 2500));
      const response = await fetch(url, { method: 'GET' })
      if (response.status === 200) {
        const cmdrSummary: CmdrSummary = await response.json();

        this.setState({ projects: cmdrSummary.projects });
      } else {
        const msg = `${response.status}: ${response.statusText}`;
        this.setState({ errorMsg: msg });
        console.error(msg);
      }
    } finally {
      this.setState({
        loading: false
      });
    }
  }

  render() {
    const { errorMsg, showBubble } = this.state;

    // const comboBoxStyles: Partial<IComboBoxStyles> = { root: { maxWidth: 300 } };
    const editingCmdr = false

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
      {showBubble && <TeachingBubble
        target={'#current-cmdr'}
        headline='Who are you?'
        onDismiss={() => { this.setState({ showBubble: false }) }}
      >
        Enter your cmdr's name to proceed.
      </TeachingBubble>}
      {!editingCmdr && <>
        <div className='contain-horiz'>
          {this.renderCmdrProjects()}
        </div>
      </>}
    </>;
  }

  renderCmdrProjects() {
    const cmdr = this.props.cmdr!;
    const { projects, loading } = this.state;

    const rows = [];
    let sumTotal = 0;

    for (const proj of projects ?? []) {
      // a row the the project link
      const rowP = <tr><td colSpan={5}><li className='header'><ProjectLink proj={proj} /></li></td></tr>;
      rows.push(rowP);
      // add rows with commodity assignments?
      if (proj.commanders[cmdr]?.length > 0) {
        let flip = true;
        for (const commodity of proj.commanders[cmdr]) {
          flip = !flip;
          const className = 'assignment' + (flip ? '' : ' odd');
          const commodityClass = mapCommodityType[commodity]!;
          const rowC = <tr className={className}>
            <td className='init'></td>
            <td className='commodity d'>{mapCommodityNames[commodity]}:</td>
            <td className='icon d'><CommodityIcon name={commodityClass} /></td>
            <td className='need d'>{proj.commodities![commodity].toLocaleString()}</td>
            <td className='filler'></td>
          </tr>;
          rows.push(rowC);
          sumTotal += proj.commodities![commodity];
        }
      }
    }

    return <>
      <div className='half'>
        <h3>Your projects and assignments:</h3>
        {loading && <Spinner size={SpinnerSize.large} label={`Loading projects and assignments ...`} />}
        {!loading && <>
          <table className='cmdr-projects' cellSpacing={0}>
            {rows}
          </table>
          <CargoRemaining sumTotal={sumTotal} />
        </>}
      </div>
    </>;
  }
}
