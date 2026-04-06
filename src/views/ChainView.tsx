import * as api from '../api';
import { Component, FunctionComponent, useMemo, useState } from "react";
import { Chain, ChainSys } from "../api/chain";
import { ActionButton, CommandBar, DefaultButton, Icon, IconButton, Label, Link, mergeStyles, MessageBar, MessageBarButton, MessageBarType, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { appTheme, cn } from '../theme';
import { CopyButton } from '../components/CopyButton';
import { delayFocus, getCargoCountOnHand, isMatchingCmdr, isMobile, mergeCargo, removeCargo } from '../util';
import { store } from '../local-storage';
import { FindFC, ProjectLink } from '../components';
import { getAverageHauls, getAvgHaulCosts } from '../avg-haul-costs';
import { FleetCarrier } from './FleetCarrier';
import { IChartDataPoint, StackedBarChart } from '@fluentui/react-charting';
import { Cargo } from '../types';

const css = mergeStyles({
  '.statBox': {
    marginBottom: 20,
    '.ms-Button--icon': {
      width: 20,
      height: 20,
      '.ms-Button-icon': {
        fontSize: 10
      },
    },
  },
  'h3 .ms-Button--action': {
    marginLeft: 10,
    marginBottom: 2,
    padding: 0,
    height: 22,
    fontSize: 12,
    '.ms-Button-icon': {
      fontSize: 12
    }
  },
  '.listItem': {
    marginRight: 8,
  },
  '.c0': {
    position: 'relative',
    'i': {
      position: 'relative',
      zIndex: 2,
      left: -1,
      top: 1,
    }
  },
  '.c1': {
    paddingLeft: 8,
  },
  '.c2': {
    minWidth: 50,
    textAlign: 'center'
  },
  '.c3': {
    minWidth: 80,
    textAlign: 'center'
  },
  '.routeStats': {
    '.h': {
      color: appTheme.palette.themePrimary,
    },
    '.boxes': {
      textAlign: 'center',
    },
  }
});

interface ChainViewProps {
  id?: string;
}

interface ChainViewState {
  loading: boolean;
  saving?: boolean;
  errorMsg?: string;

  chain?: Chain;
  currentSystem?: ChainSys;
  cargoFC?: Cargo;

  showAddCmdr?: boolean;
  showAddFC?: boolean;
  editSystems?: string;
  fcEditMarketId?: string;
}

export class ChainView extends Component<ChainViewProps, ChainViewState> {
  firstCargo: Record<string, number> = {};

  constructor(props: ChainViewProps) {
    super(props);

    this.state = {
      loading: true,
    };
  }

  componentDidMount(): void {
    if (this.props.id) {
      this.loadChain(this.props.id);
    } else {
      this.setState({
        chain: {
          id: '',
          name: '',
          cmdrs: [],
          fcs: [],
          open: false,
          systems: [],
          hubs: [],
          builds: [],
        }
      });
    }
  }

  componentDidUpdate(prevProps: Readonly<ChainViewProps>, prevState: Readonly<ChainViewState>, snapshot?: any): void {
    if (prevProps.id !== this.props.id) {
      if (this.props.id) {
        this.loadChain(this.props.id);
      } else {
        this.setState({
          chain: {
            id: '',
            name: '',
            cmdrs: [],
            fcs: [],
            open: false,
            systems: [],
            hubs: [],
            builds: [],
          }
        });
      }
    }
  }

  async loadChain(id: string) {
    this.setState({ loading: true, errorMsg: undefined });

    try {
      const newChain = await api.chain.get(id);
      this.useChain(newChain);
    } catch (err: any) {
      if (err.statusCode === 404) {
        // ignore cases when a chain is not found
        console.log(`loadChain: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      } else {
        console.error(`loadChain: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      }
    }
  }

  useChain(newChain: Chain) {
    // inject pending Outpost if nothing set
    for (const s of newChain.systems) {
      if (!s.needs && !s.total) {
        s.needs = getAvgHaulCosts('outpost (primary)');
        s.total = Object.values(s.needs).reduce((sum, val) => sum += val, 0);
      }
    }

    // calculate the current system
    const currentSystem = newChain.systems.reduceRight((l, s) => {
      if (!s.progress || (s.total > 0 && s.progress < s.total)) { l = s; }
      return l;
    }, undefined as ChainSys | undefined);

    this.setState({
      loading: false,
      chain: newChain,
      currentSystem: currentSystem,
      cargoFC: mergeCargo(newChain.fcs.map(fc => fc.cargo)),
      editSystems: undefined,
      saving: false,
    });
    window.document.title = `Chain: ${newChain.name}`;
  }

  render() {
    const { chain, errorMsg, loading, editSystems, currentSystem } = this.state;

    if (!this.props.id) {
      return this.renderCreate();
    }

    if (!chain && !loading) {
      return <>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p>Cannot view a chain by id: {this.props.id}</p>
          <p><Link href='/#chain'>View chains</Link></p>
        </div>
      </>;
    }

    return <div className={css} style={{ cursor: 'default' }}>
      {loading && <Spinner style={{ marginTop: 20 }} size={SpinnerSize.large} labelPosition='right' label='Loading ...' />}

      {!!chain && !loading && <>
        {this.renderTitles(chain)}
        <div className='contain-horiz'>
          {this.renderSystems(chain)}
          <div className='half' style={{ marginTop: 10, cursor: 'default' }}>
            {currentSystem && this.renderCurrentSystem(chain, currentSystem)}
            {this.renderRouteStats(chain)}
            {this.renderCommanders(chain)}
            {this.renderFleetCarriers(chain)}
          </div>
          {editSystems && this.renderEditSystems(chain)}
        </div>
      </>}
    </div>;
  }

  renderCreate() {
    const { chain, errorMsg } = this.state;
    if (!chain) return null;

    window.document.title = `Chains`;
    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}
      {!store.apiKey && <MessageBar
        messageBarType={MessageBarType.severeWarning}
        actions={<MessageBarButton onClick={() => document.getElementById('current-cmdr')?.click()}>Login</MessageBarButton>}
        isMultiline={false}
      >
        You need to login to use this.
      </MessageBar>}

      <div className='contain-horiz' style={{ margin: 20 }}>
        <CmdrChains />

        <div className='half' style={{ marginTop: 10 }}>
          <h2 className={cn.h3}>Start a new chain:</h2>

          <Stack horizontal verticalAlign='end' tokens={{ childrenGap: 10 }}>
            <TextField
              label='Name:'
              value={chain.name}
              disabled={!store.apiKey}
              onChange={((_, txt) => {
                const newChain = { ...chain, name: txt! };
                this.setState({ chain: newChain })
              })}
            />

            <DefaultButton
              id='chain-name'
              text='Create'
              disabled={!chain.name || !store.apiKey}
              onClick={() => {
                this.setState({ saving: false, errorMsg: '' });

                api.chain.create(chain.name)
                  .then(newChain => {
                    console.log(newChain);
                    window.location.assign(`/#chain=${encodeURIComponent(newChain.id)}`);
                  }).catch((err: any) => {
                    console.error(`loadChain: ${err.stack}`);
                    this.setState({ saving: false, errorMsg: err.message });
                  });
              }} />
          </Stack>
        </div>
      </div>
    </>;
  }

  renderTitles(chain: Chain) {
    const { errorMsg } = this.state;

    return <div className='full'>
      <h2 style={{ margin: 10 }}>
        <CopyButton text={chain.name} fontSize={16} />
        {chain.name}

        <IconButton
          id='sysView2_SearchNew'
          title='Search for a different chain'
          iconProps={{ iconName: "Search", style: { cursor: 'pointer' } }}
          style={{ marginLeft: 10 }}
          className={cn.bBox}
          onClick={() => window.location.assign('/#chain')}
        />
      </h2>

      <CommandBar className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`} items={[
        {
          key: 'btn-refresh',
          text: 'Refresh',
          iconProps: { iconName: 'Refresh' },
          onClick: () => { this.loadChain(this.props.id!) },
        },
      ]} />
      {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}

    </div>;
  }

  renderSystems(chain: Chain) {
    const { currentSystem, cargoFC } = this.state;

    let remainingCargoFC = { ...cargoFC };
    console.log(`AA:`, remainingCargoFC.steel);

    const rows = [];
    let flip = undefined;
    let lastWasCurrent = false;
    for (const s of chain.systems) {
      let progress = 100 / s.total * s.progress;
      if (isNaN(progress)) { progress = 0; }
      const remaining = !s.total ? getAverageHauls('plutus') : s.total - (s.progress ?? 0);
      const isHub = chain.hubs.includes(s.id64);
      const isComplete = remaining === 0;
      const isCurrent = s.id64 === currentSystem?.id64;

      const bb = (isComplete || isCurrent ? '2px solid ' : '2px dotted ') + appTheme.palette.themeTertiary;

      const iconName = isHub ? 'ShieldSolid' : isCurrent ? 'Location' : 'LocationDot';
      const iconColor = isCurrent ? (appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod') : isComplete ? appTheme.semanticColors.bodyText : appTheme.palette.themeSecondary;
      const textColor = isCurrent ? iconColor : isComplete ? undefined : appTheme.palette.themeSecondary;

      let completion = !progress ? '' : isComplete ? <>Completed</> : <>{progress.toFixed(0)} %</>;
      const completionTitle = progress > 0 ? `Delivered ${s.progress.toLocaleString()} of ${s.total.toLocaleString()}` : undefined;

      const readyOnFCs = getCargoCountOnHand(s.needs ?? {}, remainingCargoFC);
      if (!progress && !isCurrent && readyOnFCs > 0) {
        const remaining = s.total - readyOnFCs;
        const chartData = [{
          legend: 'Ready on FCs',
          data: readyOnFCs,
          color: appTheme.palette.tealDark,
        }, {
          legend: 'Remaining',
          data: remaining,
          color: 'grey',
        }];
        completion = <StackedBarChart
          ignoreFixStyle
          hideLegend
          styles={{ root: { marginTop: 4, width: 100, height: 18 } }}
          data={{ chartData }}
        />
      }

      if (s.needs) {
        // remove remaining FC cargo based on what this system needs
        remainingCargoFC = removeCargo(remainingCargoFC, s.needs!);
        console.log(`BB: ${s.name} (${s.total})`, remainingCargoFC.steel);
      }

      rows.push(<tr key={`cs-${s.id64}`} style={{ backgroundColor: flip ? appTheme.palette.themeLighter : undefined, fontWeight: isCurrent ? 'bold' : undefined }}>
        <td className='c0'>
          {flip !== undefined && <>
            <div style={{
              position: 'absolute',
              left: 4,
              width: 1,
              top: lastWasCurrent ? '-150%' : '-50%',
              bottom: '+50%',
              borderRight: bb,
            }} />
          </>}
          <Icon iconName={iconName} style={{ color: iconColor }} />
        </td>

        <td className='c1'>
          <CopyButton text={s.name} fontSize={10} color={appTheme.palette.themeTertiary} />
          <Link target='chainSys' href={`/#sys=${encodeURIComponent(s.id64)}`} style={{ marginLeft: 4, color: textColor }}>{s.nickname ?? s.name}</Link>
        </td>

        <td className='c2' style={{ color: textColor }}>{isHub ? 'Hub' : ' '}</td>

        <td className='c3' style={{ color: textColor }} title={completionTitle}>{completion}</td>
      </tr>);

      if (lastWasCurrent) { lastWasCurrent = false; }
      if (isCurrent && currentSystem.total > 0) {
        lastWasCurrent = true;
        const delivered = currentSystem.progress;
        const remaining = currentSystem.total - delivered - readyOnFCs;

        rows.push(<tr key={`cs-${s.id64}-b`} style={{ backgroundColor: flip ? appTheme.palette.themeLighter : undefined }}>
          <td />
          <td colSpan={3} className='c1 sysName' style={{ paddingLeft: 8, paddingRight: 4 }}>
            <StackedBarChart
              ignoreFixStyle
              hideLegend
              styles={{ root: { marginTop: 4, height: 18 } }}
              data={{
                chartData: [{
                  legend: 'Delivered',
                  data: delivered,
                  color: appTheme.palette.tealLight,
                }, {
                  legend: 'Ready on FCs',
                  data: readyOnFCs,
                  color: appTheme.palette.tealDark,
                }, {
                  legend: 'Remaining',
                  data: remaining,
                  color: 'grey',
                }],
              }}
            />
          </td>
        </tr>);
      }
      flip = !flip;
    };

    return <div className='half' style={{ marginTop: 10 }}>
      <h3 className={cn.h3}>
        <>Systems:</>
        <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: 'EditNote' }}
          text='Edit'
          title='Edit and re-order systems'
          onClick={() => this.setState({ editSystems: chain?.systems.map(s => s.name).join(`\n`) + `\n`, showAddCmdr: false, showAddFC: false })}
        />
      </h3>
      <div style={{ color: appTheme.palette.themeTertiary, fontSize: 12, marginBottom: 8 }}>
        Systems with 2 or more facilities will be considered a hub
      </div>

      {!rows.length && <div key='no-systems' style={{ marginTop: 20, textAlign: 'center' }}>
        <ActionButton
          className={cn.bBox}
          text='Add systems...'
          onClick={() => this.setState({ editSystems: '\n' })}
        />
      </div>}

      {!!rows.length && <>
        <table cellPadding={0} cellSpacing={0} style={{ fontSize: 14 }}>
          <tbody>
            {rows}
          </tbody>
        </table>
      </>}
    </div>;
  }

  renderEditSystems(chain: Chain) {
    const { editSystems, saving } = this.state;

    return <Panel
      isOpen
      allowTouchBodyScroll={isMobile()}
      type={PanelType.custom}
      customWidth={'380px'}
      headerText='Edit systems'
      onDismiss={() => this.setState({ editSystems: undefined })}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}

      isFooterAtBottom
      onRenderFooterContent={() => {
        return <>
          {saving && <Spinner
            className='submitting'
            label="Updating systems ..."
            labelPosition="right"
          />}

          {!saving && <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 4, padding: 0, }} verticalAlign='end'>
            <PrimaryButton
              text='Save'
              iconProps={{ iconName: 'Save' }}
              onClick={() => {
                this.setState({ saving: true });

                const newNames = Array.from(new Set(editSystems?.split(`\n`)));
                api.chain.setSystems(chain.id, newNames)
                  .then(newChain => this.useChain(newChain))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />
            <DefaultButton
              text='Cancel'
              iconProps={{ iconName: 'Cancel' }}
              onClick={() => this.setState({ editSystems: undefined })}
            />
          </Stack>}
        </>;
      }}
    >
      <div>
        <div style={{ color: appTheme.palette.themeSecondary }}>Paste, edit, arrange system names below. One per line, in the desired order</div>
        <div>
          <TextField
            multiline
            label='Systems:'
            rows={20}
            value={editSystems}
            onChange={(_, txt) => this.setState({ editSystems: txt })}
          />
        </div>
      </div>

    </Panel>;
  }

  renderCurrentSystem(chain: Chain, currentSystem: ChainSys) {
    const { cargoFC } = this.state;
    const activeProjects = chain.builds.filter(b => !b.complete);
    const linkColor = appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod';

    return <div className='routeStats statBox'>
      <h3 className={cn.h3}>Current system:</h3>

      <div style={{ fontSize: 14 }}>
        <Link target='chainSys' href={`/#sys=${encodeURIComponent(currentSystem.id64)}`} style={{ fontWeight: 'bold', color: linkColor }}>{currentSystem.nickname ?? currentSystem.name}</Link>

        <div style={{ marginTop: 4, marginBottom: 4 }}>
          Active projects: {activeProjects.length ? activeProjects.length : <span style={{ color: 'grey' }}>None</span>}
        </div>

        <div style={{ position: 'relative', paddingLeft: 10 }}>
          {activeProjects.map(p => {
            const delivered = p.maxNeed - p.sumNeed;
            const readyOnFCs = getCargoCountOnHand(p.commodities, cargoFC ?? {});
            const remaining = p.sumNeed - readyOnFCs;

            const chartData: IChartDataPoint[] = [{
              legend: 'Delivered',
              data: delivered,
              color: appTheme.palette.tealLight,
            }, {
              legend: 'Remaining',
              data: remaining,
              color: 'grey',
            }];

            if (readyOnFCs > 0) {
              chartData.splice(1, 0, {
                legend: 'Ready on FCs',
                data: readyOnFCs,
                color: appTheme.palette.tealDark,
              });
            }

            return <div key={p.buildId} style={{ marginBottom: 4 }}>
              <Stack verticalAlign='center'>
                <ProjectLink proj={p} noSys target='_blank' />
                <StackedBarChart
                  ignoreFixStyle
                  hideLegend
                  styles={{ root: { width: '100%', height: 18 } }}
                  data={{ chartTitle: ' ', chartData }}
                />
              </Stack>
            </div>;
          })}
        </div>
      </div>
    </div>;
  }

  renderRouteStats(chain: Chain) {
    const { cargoFC } = this.state;

    const sumTotal = chain.systems.map(s => s.total ?? 0).reduce((t, c) => t + c, 0);
    const sumDelivered = chain.systems.map(s => s.progress ?? 0).reduce((t, c) => t + c, 0);
    const sumCargo = mergeCargo(chain.systems.map(s => s.needs ?? {}));
    const readyOnFCs = getCargoCountOnHand(sumCargo, cargoFC ?? {});
    const sumRemaining = sumTotal - sumDelivered - readyOnFCs;

    const completed = chain.systems.filter(s => s.total && s.progress && s.progress >= s.total);
    const hubs = chain.systems.filter(s => chain.hubs.includes(s.id64));
    const systemsProgress = 100 / chain.systems.length * completed.length;


    const chartData: IChartDataPoint[] = [{
      legend: 'Delivered',
      data: sumDelivered,
      color: appTheme.palette.tealLight,
    }, {
      legend: 'Remaining',
      data: sumRemaining,
      color: 'grey',
    }];
    if (readyOnFCs > 0) {
      chartData.splice(1, 0, {
        legend: 'Ready on FCs',
        data: readyOnFCs,
        color: appTheme.palette.tealDark,
      });
    }

    return <div className='routeStats statBox'>
      <h3 className={cn.h3}>Route stats:</h3>

      <div style={{ fontSize: 14 }}>
        <Stack className='boxes' horizontal tokens={{ childrenGap: 40 }}>
          <div><div className='h'>Hubs:</div>{hubs.length}</div>
          <div><div className='h'>Systems complete:</div>{completed.length} of {chain.systems.length}</div>
          <div><div className='h'>Progress:</div>{systemsProgress.toFixed()} %</div>
        </Stack>

        <div style={{ marginTop: 16 }}><span className='h'>Total haul:</span> {sumTotal.toLocaleString()}</div>
        <StackedBarChart
          ignoreFixStyle
          enabledLegendsWrapLines
          styles={{ root: { marginTop: 4 } }}
          data={{ chartData }}
        />
      </div>
    </div>;
  }

  renderCommanders(chain: Chain) {
    const { showAddCmdr } = this.state;
    const allowEdit = chain.cmdrs.some(cmdr => isMatchingCmdr(cmdr, store.cmdrName));
    const allowRemoveCmdr = chain.cmdrs.length > 1;

    return <div className='statBox'>
      <h3 className={cn.h3}>
        <>Commanders:</>
        {allowEdit && <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: 'Add' }}
          text='Add'
          title='Add a new Commander to this project'
          onClick={() => {
            this.setState({ showAddCmdr: true, showAddFC: false });
            delayFocus('new-cmdr-edit');
          }}
        />}
      </h3>

      {showAddCmdr && <AddCmdr onClose={newCmdr => {
        if (!newCmdr) { this.setState({ showAddCmdr: false }); return; }

        this.setState({ saving: true, showAddCmdr: false });
        const newCmdrs = Array.from(new Set([...chain.cmdrs, newCmdr]));
        api.chain.setCmdrs(chain.id, newCmdrs)
          .then(newChain => this.setState({ saving: false, chain: newChain }));
      }} />}

      <div style={{ fontSize: 14 }}>
        {chain.cmdrs.map(cmdr => {
          return <Stack key={`csc-${cmdr}`} horizontal verticalAlign='center'>
            <span className='listItem'>{cmdr}</span>

            {allowEdit && <IconButton
              className={cn.bBox}
              iconProps={{ iconName: 'Clear' }}
              disabled={!allowRemoveCmdr}
              onClick={() => {
                this.setState({ saving: true });
                const newCmdrs = chain.cmdrs.filter(c => c !== cmdr);
                api.chain.setCmdrs(chain.id, newCmdrs)
                  .then(newChain => this.setState({ saving: false, chain: newChain }))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />}
          </Stack>;
        })}
      </div>
    </div>
  }

  renderFleetCarriers(chain: Chain) {
    const { showAddFC, fcEditMarketId } = this.state;
    const allowEdit = chain.cmdrs.some(cmdr => isMatchingCmdr(cmdr, store.cmdrName));

    let preMatches: Record<string, string> | undefined = undefined;
    if (showAddFC) {
      const cmdrLinkedFCs = store.cmdrLinkedFCs;
      preMatches = Object.keys(store.cmdrLinkedFCs)
        .filter(marketId => chain.fcs.every(fc => fc.marketId.toString() !== marketId))
        .reduce((map, marketId) => {
          map[marketId] = cmdrLinkedFCs[marketId];
          return map;
        }, {} as Record<string, string>);
    }
    const linkedMarketIds = chain.fcs.map(fc => fc.marketId.toString()) ?? [];

    return <div className='statBox'>
      <h3 className={cn.h3}>
        <>Fleet Carriers:</>
        {allowEdit && <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: 'Add' }}
          text='Add'
          title='Add a new Fleet Carrier to this project'
          onClick={() => {
            this.setState({ showAddFC: true, showAddCmdr: false });
            delayFocus('new-cmdr-edit');
          }}
        />}
      </h3>

      {showAddFC && <div>
        <Label>Enter Fleet Carrier name:</Label>
        <FindFC
          preMatches={preMatches}
          notThese={linkedMarketIds}
          onChange={(marketId) => {
            if (!marketId) { this.setState({ showAddFC: false }); return; }

            this.setState({ saving: true });
            const newMarketIDs = Array.from(new Set([...chain.fcs.map(fc => fc.marketId), parseInt(marketId)]));
            api.chain.setFCs(chain.id, newMarketIDs)
              .then(newChain => this.setState({ saving: false, chain: newChain, showAddFC: false }))
              .catch(err => this.setState({ saving: false, errorMsg: err.message }));
          }}
        />
      </div>}

      <div style={{ fontSize: 14 }}>
        {chain.fcs.map(fc => {
          return <Stack key={`csfs-${fc.marketId}`} horizontal verticalAlign='center'>
            <span className='listItem'>{fc.displayName} ({fc.name})</span>

            <IconButton
              className={cn.bBox}
              iconProps={{ iconName: 'Edit' }}
              onClick={() => this.setState({ fcEditMarketId: fc.marketId.toString() })}
            />

            {allowEdit && <IconButton
              className={cn.bBox}
              iconProps={{ iconName: 'Clear' }}
              onClick={() => {
                this.setState({ saving: true });
                const newMarketIDs = chain.fcs.map(x => x.marketId).filter(x => x !== fc.marketId);
                api.chain.setFCs(chain.id, newMarketIDs)
                  .then(newChain => this.setState({ saving: false, chain: newChain }))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />}
          </Stack>;
        })}
      </div>

      {fcEditMarketId && <FleetCarrier
        marketId={fcEditMarketId}
        onClose={() => {
          this.setState({ fcEditMarketId: undefined });
          // TODO: reload?
        }}
      />}
    </div>;
  }

}

export const CmdrChains: FunctionComponent<{}> = (props) => {
  const [chains, setChains] = useState<Record<string, string> | undefined>(undefined);

  useMemo(async () => {
    try {
      console.debug(`Fetch Cmdr chains`);
      const newChains = await api.cmdr.getMyChains();
      setChains(newChains);
    } catch (err: any) {
      if (err.statusCode !== 404) {
        // ignore cases where a project is not found
        console.error(`CmdrChains failed: ${err.stack}`);
      }
    }
  }, []);


  return <div className='half' style={{ marginTop: 10 }}>
    <h2 className={cn.h3}>Choose a chain:</h2>
    <div>
      {chains && Object.keys(chains).map(key => {
        return <div key={`ck-${key}`}>
          <Link href={`/#chain=${encodeURIComponent(key)}`}>
            <Icon iconName='BuildQueue' style={{ marginRight: 4 }} />
            {chains[key]}
          </Link>
        </div>;
      })}

      {!Object.keys(chains ?? {}).length && <div style={{ color: 'grey' }}>You are not linked to any chains</div>}
    </div>
  </div>
    ;
};


export const AddCmdr: FunctionComponent<{ onClose: (cmdr: string | undefined) => void }> = (props) => {
  const [cmdr, setCmdr] = useState('');


  return <div className='add-cmdr'>
    <Stack horizontal tokens={{ childrenGap: 4, padding: 4, }}>
      <TextField
        id='new-cmdr-edit'
        name='cmdr'
        value={cmdr}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') { props.onClose(cmdr); }
          if (ev.key === 'Escape') { props.onClose(undefined); }
        }}
        onChange={(_, txt) => setCmdr(txt ?? '')}
      />
      <PrimaryButton text='Add' onClick={() => { props.onClose(cmdr) }} iconProps={{ iconName: 'Add' }} />
      <IconButton title='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => props.onClose(undefined)} />
    </Stack>
  </div>;
};