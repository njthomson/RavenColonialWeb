import './Commander.css';

import { Icon, MessageBar, MessageBarType, Spinner, SpinnerSize, TeachingBubble } from '@fluentui/react';
import { Component } from 'react';
import * as api from '../../api';
import { CargoRemaining, CommodityIcon, ProjectLink } from '../../components';
import { mapCommodityNames, mapCommodityType, Project } from '../../types';
import { store } from '../../local-storage';

interface CmdrProps {
  cmdr?: string | undefined;
}

interface CmdrState {
  showBubble: boolean;
  projects?: Project[],
  loading?: boolean;
  errorMsg?: string;
}

export class Commander extends Component<CmdrProps, CmdrState> {
  constructor(props: CmdrProps) {
    super(props);

    this.state = {
      showBubble: !this.props.cmdr,
    };
  }

  componentDidMount(): void {
    window.document.title = `Cmdr: ${this.props?.cmdr ?? '?'}`;
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

      this.setState({
        loading: true,
        projects: undefined
      });

      const cmdrSummary = await api.cmdr.getSummary(cmdr);

      this.setState({
        loading: false,
        projects: cmdrSummary.projects
      });

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
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
        hasCloseButton={true}
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
    const cmdr = this.props.cmdr?.toLowerCase() ?? '';
    const { projects, loading } = this.state;

    const rows = [];
    let sumTotal = 0;

    for (const p of projects ?? []) {
      if (p.complete) continue;

      // a row the the project link
      const rowP = <tr key={`cp${p.buildId}`}>
        <td colSpan={4}>
          <li className='header'>
            <ProjectLink proj={p} />
            {p.buildId === store.primaryBuildId && <Icon iconName='SingleBookmarkSolid' className='icon-inline' title='This is your current primary project' />}
          </li>
        </td>
      </tr>;
      rows.push(rowP);

      // add rows with commodity assignments?
      if (p.commanders[cmdr]?.length > 0) {
        let flip = true;
        for (const commodity of p.commanders[cmdr]) {
          // if (!p.commodities![commodity]) continue;

          flip = !flip;
          const className = 'assignment' + (flip ? '' : ' odd');
          const commodityClass = mapCommodityType[commodity]!;
          const rowC = <tr className={className} key={`cp${p.buildId}-${commodity}`}>
            <td className='commodity d'>{mapCommodityNames[commodity]}:</td>
            <td className='icon d'><CommodityIcon name={commodityClass} /></td>
            <td className='need d'>{p.commodities![commodity].toLocaleString()}</td>
            <td className='filler'></td>
          </tr>;
          rows.push(rowC);
          sumTotal += p.commodities![commodity];
        }
      }
    }

    const completedProjects = !projects ? [] : projects
      .filter(p => p.complete)
      .map(p => <li key={`cp${p.buildId}`}><ProjectLink proj={p} /></li>);

    return <>
      <div className='half'>
        <h3>Active projects and assignments:</h3>
        {loading && <Spinner size={SpinnerSize.large} label={`Loading projects and assignments ...`} />}
        {!loading && <>
          <table className='cmdr-projects' cellSpacing={0} cellPadding={0}>
            <tbody>
              {rows}
            </tbody>
          </table>
          <CargoRemaining sumTotal={sumTotal} />
        </>}

        {completedProjects.length > 0 && <>
          <br />
          <h3>Completed projects:</h3>
          <ul className='completed'>{completedProjects}</ul>
        </>}
      </div>
    </>;
  }
}
