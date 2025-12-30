import * as api from '../../api';
import './Commander.css';
import { ActionButton, Icon, Label, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack, TeachingBubble } from '@fluentui/react';
import { Component } from 'react';
import { CargoRemaining, CommodityIcon, ProjectLink } from '../../components';
import { mapCommodityNames, ProjectRef } from '../../types';
import { store } from '../../local-storage';
import { appTheme, cn } from '../../theme';

interface CmdrProps { }

interface CmdrState {
  showBubble: boolean;
  projectRefs?: ProjectRef[],
  assignments: Record<string, Record<string, number>>
  loading?: boolean;
  errorMsg?: string;
  showCompleted?: boolean;
}

export class Commander extends Component<CmdrProps, CmdrState> {

  private unmounted: boolean = false;

  constructor(props: CmdrProps) {
    super(props);

    this.state = {
      showBubble: !store.cmdrName,
      assignments: {},
    };
  }

  componentDidMount(): void {
    if (store.cmdrName) {
      this.fetchCmdrProjects(store.cmdrName);
    }
  }

  componentWillUnmount(): void {
    this.unmounted = true;
  }

  async fetchCmdrProjects(cmdr: string | undefined): Promise<void> {
    this.setState({ loading: true, projectRefs: undefined });
    try {
      if (!cmdr) { return; }

      this.setState({
        loading: true,
        projectRefs: undefined
      });

      const [assigned, refs] = await Promise.all([
        api.cmdr.getActiveAssignments(cmdr),
        api.cmdr.getProjectRefs(cmdr)
      ]);

      if (this.unmounted) return;

      this.setState({
        loading: false,
        projectRefs: refs ?? [],
        assignments: assigned ?? {},
      });

    } catch (err: any) {
      this.setState({ loading: false, errorMsg: err.message });
    }
  }

  render() {
    const { errorMsg, showBubble, projectRefs } = this.state;

    // const comboBoxStyles: Partial<IComboBoxStyles> = { root: { maxWidth: 300 } };
    const editingCmdr = false
    const hasActiveProjects = projectRefs?.some(p => !p.complete);

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
          <div className='half'>
            <h3 className={cn.h3}>
              Active projects and assignments:
              &nbsp;
              {hasActiveProjects && <ActionButton
                className={cn.bBox}
                iconProps={{ iconName: 'Manufacturing' }}
                text='View combined ...'
                title='View merged data for all your active projects'
                href='#build'
              />}
            </h3>
            {this.renderCmdrProjects()}
          </div>
        </div>
      </>}
    </>;
  }

  renderCmdrProjects() {
    const { projectRefs, loading, showCompleted, assignments } = this.state;

    const activeProjects = projectRefs?.filter(p => !p.complete) ?? [];

    const rows = [];
    let sumTotal = 0;

    for (const p of activeProjects) {

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
      if (assignments[p.buildId]) {
        let flip = false;
        for (const commodity in assignments[p.buildId]) {
          flip = !flip;
          const need = assignments[p.buildId][commodity];
          if (need < 1) { continue; }
          const rowC = <tr className='assignment' key={`cp${p.buildId}-${commodity}`} style={{ position: 'relative', backgroundColor: flip ? undefined : appTheme.palette.themeLighter }}>
            <td />
            <td className='commodity d' >
              <Stack horizontal verticalAlign='center' horizontalAlign='end' tokens={{ childrenGap: 2 }} style={{ position: 'relative', fontSize: 14 }}>
                <CommodityIcon name={commodity} />
                <div>&nbsp;{mapCommodityNames[commodity]}:</div>
              </Stack>
            </td>
            <td className='need d'>{need.toLocaleString()}</td>
            <td className='filler'></td>
          </tr>;
          rows.push(rowC);
          sumTotal += assignments[p.buildId][commodity];
        }
      }
    }

    const completedProjects = !projectRefs ? [] : projectRefs
      .filter(p => p.complete)
      .map(p => <li key={`cp${p.buildId}`}><ProjectLink proj={p} /></li>);

    return <>
      {loading && <Spinner size={SpinnerSize.large} label={`Loading projects and assignments ...`} />}
      {!loading && <>

        {!rows.length && <Stack horizontal tokens={{ childrenGap: 8 }} style={{ margin: '20px 0 10px 0' }}>
          <Label>No active projects.</Label>
          <PrimaryButton text='Find or start a project ...' onClick={() => {
            window.location.assign("#sys");
            window.location.reload();
          }} />
        </Stack>}

        {!!rows.length && <ul>
          <table className='cmdr-projects' cellSpacing={0} cellPadding={0}>
            <tbody>{rows}</tbody>
          </table>
          {sumTotal > 0 && <div className='cargo-remaining'><CargoRemaining sumTotal={sumTotal} label='Remaining cargo to deliver' /></div>}
        </ul>}

        {completedProjects.length > 0 && <>
          <ActionButton
            iconProps={{ iconName: showCompleted ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
            text={`${completedProjects.length} Completed projects`}
            title={showCompleted ? 'Showing completed projects' : 'Hiding completed projects'}
            onClick={() => this.setState({ showCompleted: !showCompleted })}
          />
          {showCompleted && <ul className='completed'>{completedProjects}</ul>}
        </>}

      </>}
    </>;
  }
}
