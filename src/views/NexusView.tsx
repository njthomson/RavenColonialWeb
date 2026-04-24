import * as api from '../api';
import { Component, FunctionComponent, useMemo, useState } from "react";
import { Nexus, NexusSys } from "../api/nexus";
import { ActionButton, Callout, CommandBar, DefaultButton, DirectionalHint, Icon, IconButton, Label, Link, mergeStyles, MessageBar, MessageBarButton, MessageBarType, Modal, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { appTheme, cn } from '../theme';
import { CopyButton } from '../components/CopyButton';
import { asGrey, delayFocus, getCargoCountOnHand, isMatchingCmdr, isMobile, mergeCargo, sumCargo } from '../util';
import { store } from '../local-storage';
import { CommodityIcon, FindFC, ProjectLink } from '../components';
import { getAverageHauls, getAvgHaulCosts } from '../avg-haul-costs';
import { FleetCarrier } from './FleetCarrier';
import { IChartDataPoint, StackedBarChart } from '@fluentui/react-charting';
import { autoUpdateFrequency, autoUpdateStopDuration, Cargo, mapCommodityNames } from '../types';
import { WhereToBuy } from '../components/WhereToBuy/WhereToBuy';
import { GalMap, MapData } from './GalMap';
import { ViewEditName } from './SystemView2/ViewEditName';
import { Link2 } from '../components/LinkSrvSurvey';

const css = mergeStyles({
  '.ms-Button--action, .ms-Button--icon': {
    border: `1px solid transparent`,
    ':hover': {
      zIndex: 2,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
    ':disabled': {
      border: `1px solid transparent`,
    },
  },
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
  '.tableSystems': {
    '.c0': {
      paddingLeft: 4,
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
      '.info': {
        width: 18,
        height: 18,
        marginLeft: 4,
        color: appTheme.palette.themeTertiary,
        '.ms-Button-icon': { fontSize: 12 }
      }
    },
    '.c2': {
      minWidth: 50,
      textAlign: 'center'
    },
    '.c3': {
      textAlign: 'right',
      paddingRight: 6,
    },
    '.c4': {
      textAlign: 'right'
    },
  },
  '.routeStats': {
    '.h': {
      color: appTheme.palette.themePrimary,
    },
    '.boxes': {
      textAlign: 'center',
    },
  },
  '.tableCargoFC': {
    width: '100%',
    '.c2': {
      paddingLeft: 8,
      minWidth: 50,
      textAlign: 'right',
    },
    '.bar': {
      position: 'relative',
      display: 'inline-block',
      margin: '0 4px',
      width: 50,
      height: 8,
      backgroundColor: 'grey',
      'div': {
        height: '100%',
        backgroundColor: appTheme.palette.greenLight,
      }
    },
  }
});

interface NexusViewProps {
  id?: string;
}

interface NexusViewState {
  loading: boolean;
  saving?: boolean;
  errorMsg?: string;
  createName?: string;

  nexus?: Nexus;
  listRows: SysRow[];
  currentSystem?: SysRow;
  cargoFC?: Cargo;
  autoUpdateUntil: number;
  lastPoll?: string;
  isMember?: boolean;
  confirmDelete?: boolean;
  submitting?: boolean;

  showAddCmdr?: boolean;
  showAddFC?: boolean;
  editSystems?: string;
  fcEditMarketId?: string;

  addingSysFC?: number;
  hoverFC?: number;
  expandFC?: { id64: number, marketId: number };

  shopFC?: number;
  showRemaining?: number;
}

interface SysRow extends NexusSys {
  /** Count of cargo needing to be supplied */
  pending: number;
  /** Count of cargo that could be supplied */
  available: number;
  /** Count of cargo not available, aka: pending - available */
  missing: number;
  /** Cargo not available */
  missingCargo: Cargo;
  /** Explicit cargo allocated from each FC */
  fromFC: Record<number, Cargo>;
}

export class NexusView extends Component<NexusViewProps, NexusViewState> {
  private timer?: NodeJS.Timeout;

  constructor(props: NexusViewProps) {
    super(props);

    this.state = {
      autoUpdateUntil: 0,
      lastPoll: 'x',
      loading: true,
      listRows: [],
    };
  }

  componentDidMount(): void {
    this.toggleAutoRefresh();
  }

  componentDidUpdate(prevProps: Readonly<NexusViewProps>, prevState: Readonly<NexusViewState>, snapshot?: any): void {
    if (prevProps.id !== this.props.id) {
      this.setState({
        listRows: [],
        nexus: {
          id: '',
          name: '',
          owner: '',
          cmdrs: [],
          fcs: [],
          open: false,
          systems: [],
          hubs: [],
        },
      });
      if (this.props.id) {
        this.loadNexus(this.props.id);
      }
    }
  }

  componentWillUnmount(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  prepMapData() {
    const { nexus, currentSystem } = this.state;
    if (!nexus) { return; }

    const systems = nexus.systems.map(d => {
      const progress = (!d.progress ? 0 : 100 / d.total * d.progress).toFixed(0);
      const infos = `<a class='bl' href='/#sys=${d.name}' target='_blank' style="font-size: 12px">View: ${d.name}</a>
<br/><br/><table>
<tr><td>Progress:</td><td>${progress} %</td></tr>
</table>`;
      return {
        name: d.nickname ?? d.name,
        coords: { x: d.pos[0], y: d.pos[1], z: d.pos[2] },
        cat: [currentSystem?.id64 === d.id64 ? 1 : d.progress > 0 && d.progress === d.total ? 0 : 2],
        infos: infos,
      };
    });

    const playerPos = currentSystem?.pos ?? nexus.systems[0].pos;
    const msg: MapData = {
      source: 'nexus',
      init: {
        startAnim: true,
        effectScaleSystem: [25, 10000],
        playerPos: playerPos,
        cameraPos: undefined,
      },
      mapData: {
        categories: {
          'Tag:': {
            '0': { name: "Complete", color: '#00CC00'.substring(1) },
            '1': { name: "Current", color: '#CCCC00'.substring(1) },
            '2': { name: "Pending", color: '#00CCCC'.substring(1) },
          },
        },
        systems: systems,
        routes: [{
          title: nexus.name,
          points: systems.map(s => { return { s: s.name } as { s: string, label?: string }; })
        }],
      },
    };
    msg.mapData.routes![0].points[0].label = 'Start';
    msg.mapData.routes![0].points[msg.mapData.routes![0].points.length - 1].label = 'End';

    GalMap.open(msg);
  }

  async loadNexus(id: string) {
    this.setState({ loading: true, errorMsg: undefined });

    try {
      const newNexus = await api.nexus.get(id);
      this.useNexus(newNexus);
    } catch (err: any) {
      if (err.statusCode === 404) {
        // ignore cases when a nexus is not found
        console.log(`loadNexus: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      } else {
        console.error(`loadNexus: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      }
    }
  }

  useNexus(newNexus: Nexus) {
    // process systems and allocate cargo from FCs
    const listRows: SysRow[] = [];
    const fcCargos = newNexus.fcs.reduce((m, fc) => {
      m[fc.marketId] = { ...fc.cargo };
      return m;
    }, {} as Record<number, Cargo>)

    for (const s of newNexus.systems) {
      let needs = s.needs;
      let total = s.total;
      if (s.builds.length > 0 && !s.progress) { s.progress = 0; }

      // substitute an outpost if blank
      if (!s.needs && !s.total) {
        needs = getAvgHaulCosts('outpost (primary)');
        total = Object.values(needs).reduce((sum, val) => sum += val, 0);
      }

      // for each cargo needed ...
      const fromFC: Record<number, Cargo> = {};
      const remaining = { ...needs ?? {} };
      let available = 0;
      for (const name in remaining) {
        // ... pull it from the FCs
        for (const mid of s.fcs) {
          const fcCargo = fcCargos[mid] ?? {};
          const need = remaining[name];
          if (!need) { continue; }

          const onFC = fcCargo[name] ?? 0;
          fromFC[mid] = { ...fromFC[mid] ?? {} };
          if (onFC > need) {
            available += need;
            remaining[name] = 0;
            fcCargo[name] -= need;
            fromFC[mid][name] = need;
          } else {
            available += onFC;
            remaining[name] -= onFC;
            fcCargo[name] = 0;
            fromFC[mid][name] = onFC;
          }
        }
      }

      const pending = sumCargo(needs);
      listRows.push({
        ...s,
        needs,
        total,
        pending,
        available,
        missing: pending - available,
        missingCargo: remaining,
        fromFC,
      });
    }

    // calculate the current system
    let hitCompleted = false;
    const currentSystem = listRows.reduceRight((l, s) => {
      if (!hitCompleted && (!s.progress || (s.total > 0 && s.progress < s.total))) { l = s; }
      if (s.total === s.progress && s.total > 0) { hitCompleted = true; }
      return l;
    }, undefined as SysRow | undefined);

    newNexus.cmdrs.sort();
    const isMember = newNexus.cmdrs.some(cmdr => isMatchingCmdr(cmdr, store.cmdrName));

    // don't auto-poll if final system is complete
    let autoUpdateUntil = this.state.autoUpdateUntil;
    if (newNexus.systems.length) {
      const lastSystem = newNexus.systems[newNexus.systems.length - 1];
      if (lastSystem.progress === lastSystem.total) {
        clearTimeout(this.timer);
        autoUpdateUntil = 0;
      }
    }

    this.setState({
      loading: false,
      saving: false,
      showAddFC: false,
      addingSysFC: undefined,
      expandFC: undefined,
      nexus: newNexus,
      listRows: listRows,
      currentSystem: currentSystem,
      cargoFC: mergeCargo(newNexus.fcs.map(fc => fc.cargo)),
      isMember: isMember,
      editSystems: undefined,
      autoUpdateUntil: autoUpdateUntil,
    });
    window.document.title = `Nexus: ${newNexus.name}`;
  }

  toggleAutoRefresh = () => {
    if (this.state.autoUpdateUntil > 0) {
      // stop auto-refresh poll and maybe right now? NO
      console.log(`Stopping timer at: ${new Date().toISOString()}`);
      clearTimeout(this.timer);
      this.setState({ autoUpdateUntil: 0 });
    } else {
      // start polling (which causes an immediate refresh)
      console.log(`Starting timer at: ${new Date().toISOString()}`);
      this.setState({ autoUpdateUntil: Date.now() + autoUpdateStopDuration });
      this.pollLastTimestamp(true);
    }
  };

  async pollLastTimestamp(force: boolean = false) {
    if (!this.props.id) { return; }

    try {
      // skip polling when editing systems, or there are zero systems + FC
      if ((this.state.editSystems && Date.now() < this.state.autoUpdateUntil) || (!!this.state.nexus && !this.state.nexus.systems.length && !this.state.nexus.fcs.length)) {
        // just schedule the next poll
        this.timer = setTimeout(() => this.pollLastTimestamp(), autoUpdateFrequency);
        console.debug(`skip polling...`);
        return;
      }

      this.setState({ loading: true });

      // call server to see if anything changed
      const { nexus, lastPoll } = this.state;

      let currentPoll = 'x';
      if (!force) {
        var fcIDs = nexus?.fcs.map(fc => fc.marketId.toString()) ?? [];

        const buildIds = nexus?.systems.flatMap(s => s.builds.map(b => b.buildId)) ?? [];
        const pollData = await api.project.poll([...buildIds, ...fcIDs]);
        currentPoll = pollData.max;
      }

      console.log(`pollTimestamp: ${currentPoll} vs ${lastPoll} (match: ${currentPoll === lastPoll}), forced: ${force}`);

      if (currentPoll !== lastPoll || force) {
        this.setState({ lastPoll: currentPoll });
        // something changed
        await this.loadNexus(this.props.id);
      }

      // schedule next poll?
      if (this.state.autoUpdateUntil > 0) {
        if (Date.now() < this.state.autoUpdateUntil) {
          this.timer = setTimeout(() => this.pollLastTimestamp(), autoUpdateFrequency);
        } else {
          console.log(`Stopping auto-update after one hour of no changes at: ${new Date().toISOString()}`);
          this.setState({ autoUpdateUntil: 0 });
        }
      }
    } catch (err: any) {
      console.error(`Stop auto-updating at: ${new Date()} due to:\n`, err?.message);
      this.setState({ autoUpdateUntil: 0 });
    } finally {
      // add artificial delay to avoid flicker on the spinner
      setTimeout(() => this.setState({ loading: false }), 500);
    }
  }

  deleteNexus = async () => {
    const id = this.state.nexus?.id;
    if (!id) { return; }

    try {
      await api.nexus.delete(id);
      window.location.replace("/#nexus");
    } catch (err: any) {
      if (err.statusCode === 404) {
        // ignore cases when a nexus is not found
        console.log(`deleteNexus: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      } else {
        console.error(`deleteNexus: ${err.stack}`);
        this.setState({ loading: false, errorMsg: err.message });
      }
    }
  }

  render() {
    const { nexus, errorMsg, loading, editSystems, currentSystem, shopFC, confirmDelete, submitting } = this.state;

    // show create/find UX
    if (!this.props.id) {
      return this.renderCreate();
    }

    // failed to load nexus by ID
    if (!nexus && !loading) {
      return <>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p>Cannot view a nexus by id: {this.props.id}</p>
          <p><Link onClick={() => {
            this.setState({ nexus: undefined, listRows: [], errorMsg: undefined, loading: false, saving: false, lastPoll: 'x', expandFC: undefined, hoverFC: undefined });
            window.location.assign('/#nexus');
          }} >View nexus</Link></p>
        </div>
      </>;
    }

    return <div className={css} style={{ cursor: 'default' }}>
      {!nexus?.id && loading && <Spinner style={{ marginTop: 20 }} size={SpinnerSize.large} labelPosition='right' label='Loading ...' />}

      {!!nexus?.id && <>
        {this.renderTitles(nexus)}
        <div className='contain-horiz'>
          {this.renderSystems(nexus)}
          <div className='half' style={{ marginTop: 10, cursor: 'default' }}>
            {currentSystem && this.renderCurrentSystem(nexus, currentSystem)}
            {this.renderRouteStats(nexus)}
            {this.renderCommanders(nexus)}
            {this.renderFleetCarriers(nexus)}
          </div>
          {editSystems && this.renderEditSystems(nexus)}
          {shopFC && this.renderShopFC(nexus, shopFC)}
        </div>

        {confirmDelete && <Modal
          isOpen
          onDismiss={() => this.setState({ confirmDelete: false })}
          styles={{ main: { border: '1px solid ' + appTheme.palette.themePrimary, } }}
        >
          <div className='center'>
            <p>
              <h3 className={cn.h3}>Are you sure you want to delete?</h3>
              <br />
              This cannot be undone.</p>
            <DefaultButton
              text='Yes'
              disabled={submitting}
              iconProps={{ iconName: 'Warning' }}
              style={{ backgroundColor: appTheme.palette.yellowDark, color: 'black' }}
              onClick={this.deleteNexus}
            />
            &nbsp;
            <DefaultButton
              text='No'
              id='delete-no'
              iconProps={{ iconName: 'Cancel' }}
              disabled={submitting}
              onClick={() => this.setState({ confirmDelete: false })}
            />
          </div>
        </Modal>}
      </>}
    </div>;
  }

  renderCreate() {
    const { createName, errorMsg } = this.state;

    window.document.title = `Nexus`;
    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}
      {!store.apiKey && <MessageBar
        messageBarType={MessageBarType.severeWarning}
        actions={<MessageBarButton onClick={() => document.getElementById('current-cmdr')?.click()}>Login</MessageBarButton>}
        isMultiline={false}
      >
        You need to login to use this.
      </MessageBar>}

      <Stack horizontal verticalAlign='center' style={{ margin: '10px 0 -40px 30px', color: appTheme.palette.themeSecondary, fontSize: 14 }}>
        <Icon iconName='Info' style={{ marginRight: 8 }} />
        <div>
          What is a nexus? <Link2 href='/#about=nexus' target='about' text='Learn more' />
        </div>
      </Stack >

      <div className='contain-horiz' style={{ margin: 20 }}>
        <CmdrNexus />

        <div className='half' style={{ marginTop: 10 }}>
          <h2 className={cn.h3}>Create a nexus:</h2>

          <Stack horizontal verticalAlign='end' tokens={{ childrenGap: 10 }}>
            <TextField
              label='Name:'
              value={createName}
              disabled={!store.apiKey}
              onChange={((_, txt) => {
                this.setState({ createName: txt! });
              })}
            />

            <DefaultButton
              id='nexus-name'
              text='Create'
              disabled={!createName || !store.apiKey}
              onClick={() => {
                this.setState({ saving: false, errorMsg: '' });

                api.nexus.create(createName!)
                  .then(newNexus => {
                    console.log(newNexus);
                    window.location.assign(`/#nexus=${encodeURIComponent(newNexus.id)}`);
                  }).catch((err: any) => {
                    console.error(`nexusCreate: ${err.stack}`);
                    this.setState({ saving: false, errorMsg: err.message });
                  });
              }} />
          </Stack>
        </div>
      </div>
    </>;
  }

  renderTitles(nexus: Nexus) {
    const { errorMsg, saving, loading, autoUpdateUntil, isMember } = this.state;
    const isOwner = isMatchingCmdr(nexus.owner, store.cmdrName);

    // prepare rich copy link
    var copyLink = new ClipboardItem({
      'text/plain': window.location.toString(),
      'text/html': new Blob([`<a href='${window.location.toString()}'>${nexus.name}</a>`], { type: 'text/html' }),
    });

    return <div className='full'>
      <h2 style={{ margin: 10 }}>
        <Stack horizontal verticalAlign='center'>
          <div>
            <ViewEditName
              blockEmpty
              disabled={!isMember}
              name={nexus.name}
              onChange={txt => {
                if (txt) {
                  this.setState({ saving: true });
                  api.nexus.setName(nexus.id, txt)
                    .then(newNexus => this.setState({ nexus: newNexus, saving: false }))
                    .catch((err: any) => {
                      console.error(`setName: ${err.stack}`);
                      this.setState({ saving: false, errorMsg: err.message });
                    });
                }
              }}
            />
          </div>

          <span style={{ marginLeft: 4, color: appTheme.palette.themeTertiary }}><CopyButton text={copyLink} title='Copy link to this nexus' fontSize={14} /></span>

          <IconButton
            id='sysView2_SearchNew'
            title='Search for a different nexus'
            iconProps={{ iconName: "Search", style: { cursor: 'pointer' } }}
            style={{ marginLeft: 10 }}
            onClick={() => {
              this.setState({ nexus: undefined, listRows: [], errorMsg: undefined, loading: false, saving: false, lastPoll: 'x', expandFC: undefined, hoverFC: undefined });
              window.location.assign('/#nexus');
            }}
          />
        </Stack>
      </h2>

      <CommandBar className={`top-bar ${cn.bb} ${cn.bt} ${cn.topBar}`} items={[
        {
          className: cn.bBox,
          key: 'btn-private',
          text: nexus.open ? 'Open' : 'Private',
          title: nexus.open ? 'Click to mark as private' : 'Click to mark as open',
          iconProps: { iconName: nexus.open ? 'Unlock' : 'LockSolid', style: { color: asGrey(!isMember || loading || saving) } },
          disabled: !isMember || saving || loading,
          style: { color: asGrey(!isMember || loading || saving) },
          onClick: () => {
            this.setState({ saving: true });
            api.nexus.setPrivate(nexus.id, nexus.open)
              .then(newNexus => this.setState({ nexus: newNexus, saving: false }))
              .catch((err: any) => {
                console.error(`setPrivate: ${err.stack}`);
                this.setState({ saving: false, errorMsg: err.message });
              });
          },
        },
        {
          className: cn.bBox,
          key: 'btn-refresh',
          text: 'Refresh',
          title: !!autoUpdateUntil ? 'Click to stop auto updating' : 'Click to refresh now and auto update every 30 seconds',
          iconProps: { iconName: !!autoUpdateUntil ? 'PlaybackRate1x' : 'Refresh', style: { color: asGrey(loading || saving) } },
          disabled: saving || loading,
          style: { color: asGrey(saving || loading) },
          onClick: () => this.toggleAutoRefresh(),
        },
        {
          className: cn.bBox,
          key: 'btn-del',
          text: 'Delete',
          title: 'Delete this nexus',
          iconProps: { iconName: 'Delete', style: { color: asGrey(!isOwner || loading || saving) } },
          style: { color: asGrey(!isOwner || loading || saving) },
          disabled: !isOwner || loading || saving,
          onClick: () => this.setState({ confirmDelete: true }),
        },
        {
          className: cn.bBox,
          key: 'btn-map',
          text: 'Show on map',
          title: 'Show on a map',
          iconProps: { iconName: 'Globe', style: { color: asGrey(loading || !nexus.systems.length) } },
          style: { color: asGrey(loading || !nexus.systems.length) },
          disabled: loading || !nexus.systems.length,
          onClick: () => this.prepMapData()
        },
        {
          className: cn.bBox,
          key: 'btn-help',
          title: 'Learn more',
          iconProps: { iconName: 'Help' },
          href: '/#about=nexus',
          target: 'about'
        },
        {
          key: 'sys-loading',
          iconProps: { iconName: 'Nav2DMapView' },
          onRender: () => {
            return !(loading || saving) ? null : <div>
              <Spinner
                size={SpinnerSize.medium}
                labelPosition='right'
                label={loading ? 'Loading ...' : 'Saving ...'}
                style={{ marginTop: 12, cursor: 'default' }}
              />
            </div>
          },
        },
      ]} />
      {errorMsg && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMsg: undefined })}>{errorMsg}</MessageBar>}

    </div>;
  }

  renderSystems(nexus: Nexus) {
    const { currentSystem, listRows, addingSysFC, saving, loading, expandFC, showRemaining, isMember } = this.state;

    let rows: JSX.Element[] = [];
    let flip = undefined;
    let lastWasCurrent = false;
    for (const s of listRows) {
      let progress = 100 / s.total * s.progress;
      if (isNaN(progress)) { progress = 0; }
      const remaining = !s.total ? getAverageHauls('plutus') : s.total - (s.progress ?? 0);
      const isHub = nexus.hubs.includes(s.id64);
      const isComplete = remaining === 0;
      const isCurrent = s.id64 === currentSystem?.id64;

      const bc = flip ? undefined : appTheme.palette.themeLighter;
      const bb = (isComplete || isCurrent ? '2px solid ' : '2px dotted ') + appTheme.palette.themeTertiary;

      const iconName = isHub ? 'ShieldSolid' : isCurrent ? 'Location' : 'LocationDot';
      const iconColor = isCurrent ? (appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod') : isComplete ? appTheme.semanticColors.bodyText : appTheme.palette.themeSecondary;
      const textColor = isCurrent ? iconColor : isComplete ? appTheme.palette.themeTertiary : appTheme.palette.themeSecondary;

      let completion = isComplete ? <>Completed</> : '';
      const completionTitle = progress > 0 ? `Delivered ${s.progress.toLocaleString()} of ${s.total.toLocaleString()}` : undefined;

      if (s.fcs.length && !isCurrent && !isComplete && !s.builds.length) {
        const chartData: IChartDataPoint[] = [{
          legend: 'Ready on FCs',
          data: s.available,
          color: appTheme.palette.tealDark,
        }, {
          legend: 'Remaining',
          data: s.missing,
          color: 'grey',

        }];
        completion = <Stack
          horizontal
          verticalAlign='center'
        >
          <StackedBarChart
            ignoreFixStyle
            hideLegend
            styles={{ root: { marginTop: 4, width: 100, height: 18 } }}
            data={{ chartData }}
          />
        </Stack>
      }

      rows.push(<tr key={`cs-${s.id64}`} style={{ backgroundColor: bc, fontWeight: isCurrent ? 'bold' : undefined }}>
        <td className='c0'>
          {flip !== undefined && <>
            <div style={{
              position: 'absolute',
              left: 8,
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
          <Link target='nexusSys' href={`/#sys=${encodeURIComponent(s.id64)}`} style={{ marginLeft: 4, color: textColor }}>{s.nickname ?? s.name}</Link>
          {!isComplete && <IconButton
            className='info'
            id={`rem-${s.id64}`}
            iconProps={{ iconName: 'Info' }}
            onClick={() => this.setState({ showRemaining: showRemaining === s.id64 ? undefined : s.id64 })}
          />}
        </td>

        <td className='c2' style={{ color: textColor }}>{isHub ? 'Hub' : ' '}</td>

        <td className='c4' colSpan={!completion ? 2 : 1}>
          {!isComplete && <Stack horizontal horizontalAlign='end'>
            {s.fcs.map(mid => this.renderIconFC(mid, s.id64))}
            <IconButton
              title='Assign a Fleet Carrier to this system'
              iconProps={{ iconName: 'AddTo', style: { color: saving ? 'grey' : appTheme.palette.themeTertiary } }}
              disabled={saving}
              onClick={() => this.setState({ addingSysFC: addingSysFC === s.id64 ? undefined : s.id64 })}
            />
          </Stack>}
        </td>

        {!!completion && <td className='c3' style={{ color: textColor }} title={completionTitle}>
          {completion}
        </td>}
      </tr>);

      if (addingSysFC === s.id64) {
        // start with nexus linked FCs
        const preMatches: Record<string, string> = nexus.fcs.reduce((m, fc) => {
          if (!s.fcs.includes(fc.marketId)) {
            m[fc.marketId.toString()] = `${fc.displayName} (${fc.name})`;
          }
          return m;
        }, {} as Record<string, string>);
        // add cmdr linked FCs
        for (const [mid, name] of Object.entries(store.cmdrLinkedFCs)) {
          if (!(mid in preMatches || s.fcs.includes(parseInt(mid)))) {
            preMatches[mid] = name;
          }
        }

        const iconMap = nexus.fcs.reduce((m, fc, i) => {
          m[fc.marketId.toString()] = fcIconList[i % fcIconList.length];
          return m;
        }, {} as Record<string, string>);

        rows.push(<tr key={`cs-${s.id64}-b`} style={{ backgroundColor: bc }}>
          <td className='c0'>
            <div style={{
              position: 'absolute',
              left: 8,
              width: 1,
              top: lastWasCurrent ? '-150%' : '-50%',
              bottom: '+50%',
              borderRight: '2px dotted ' + appTheme.palette.themeTertiary,
            }} />
          </td>
          <td colSpan={4} className='c1 sysName' style={{ paddingLeft: 8, paddingRight: 4 }}>
            <FindFC
              preMatchText='Linked Fleet Carriers:'
              preMatches={preMatches}
              notThese={s.fcs.map(fc => fc.toString())}
              disabled={saving}
              processing={saving}
              noSpanshCheck
              iconMap={iconMap}
              onChange={(marketId) => {
                if (!marketId) { this.setState({ addingSysFC: undefined }); return; }

                this.setState({ saving: true });
                const newMarketIDs = Array.from(new Set([...s.fcs, parseInt(marketId)]));
                api.nexus.setSysFCs(nexus.id, s.id64, newMarketIDs)
                  .then(newNexus => this.useNexus(newNexus))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />
          </td>
        </tr>);
      }

      if (lastWasCurrent) { lastWasCurrent = false; }
      if (s.total > 0 && s.progress < s.total) {
        lastWasCurrent = true;
        const chartData: IChartDataPoint[] = [{
          legend: 'Delivered',
          data: s.progress,
          color: appTheme.palette.tealLight,
        }, {
          legend: 'Remaining',
          data: s.missing,
          color: 'grey',
        }];
        if (s.available > 0) {
          chartData.splice(1, 0, {
            legend: 'Ready on FCs',
            data: s.available,
            color: appTheme.palette.tealDark,
          });
        }

        rows.push(<tr key={`cs-${s.id64}-c`} style={{ backgroundColor: bc }}>
          <td />
          <td colSpan={4} className='c1 sysName' style={{ paddingLeft: 8, paddingRight: 6 }}>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <StackedBarChart
                ignoreFixStyle
                hideLegend
                styles={{ root: { marginTop: 4, height: 18 } }}
                data={{ chartData }}
              />
              <div style={{ color: textColor, fontWeight: 'bold' }}>{progress.toFixed(0)}&nbsp;%</div>
            </Stack>
          </td>
        </tr>);
      }
      flip = !flip;
    }

    return <div className='half' style={{ marginTop: 10 }}>
      <h3 className={cn.h3}>
        <>Systems:</>
        {isMember && <ActionButton
          iconProps={{ iconName: 'EditNote' }}
          text='Edit'
          title='Edit and re-order systems'
          disabled={saving}
          onClick={() => this.setState({ editSystems: nexus?.systems.map(s => s.name).join(`\n`) + `\n`, showAddCmdr: false, showAddFC: false })}
        />}
      </h3>
      <div style={{ color: appTheme.palette.themeTertiary, fontSize: 12, marginBottom: 8 }}>
        Systems with 2 or more facilities will be considered a hub
      </div>

      {!rows.length && <div key='no-systems' style={{ marginTop: 20, textAlign: 'center' }}>
        <ActionButton
          text='Add systems...'
          disabled={loading || saving || !isMember}
          style={{ color: asGrey(loading || saving || !isMember) }}
          onClick={() => this.setState({ editSystems: '\n' })}
        />
      </div>}

      {!!rows.length && <>
        <table className='tableSystems' cellPadding={0} cellSpacing={0} style={{ fontSize: 14 }}>
          <tbody>{rows}</tbody>
        </table>
      </>}

      {!!expandFC && this.renderFCCard(nexus, expandFC.id64, expandFC.marketId)}
      {!!showRemaining && this.renderRemaining(nexus, showRemaining)}
    </div>;
  }

  renderRemaining(nexus: Nexus, id64: number) {
    const { listRows } = this.state;
    const sysRow = listRows.find(s => s.id64 === id64);
    if (!sysRow) { return null; }

    return <>
      <Callout
        className={css}
        target={`#rem-${id64}`}
        setInitialFocus
        alignTargetEdge
        directionalHint={DirectionalHint.rightTopEdge}
        gapSpace={4}
        styles={{
          beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
          calloutMain: {
            backgroundColor: appTheme.palette.neutralTertiaryAlt,
            color: appTheme.palette.neutralDark,
            cursor: 'default',
          }
        }}
        onDismiss={() => this.setState({ showRemaining: undefined })}
      >
        <h3 className={cn.h3}>{sysRow.name}</h3>

        <div style={{ fontSize: 12, color: appTheme.palette.themePrimary, marginBottom: 4 }}>
          Cargo remaining: {sysRow.missing.toLocaleString()}
        </div>

        <table className='tableCargoFC' cellPadding={0} cellSpacing={0}>
          <tbody>
            {Object.entries(sysRow.missingCargo).filter(([n, v]) => v > 0).map(([n, v], i) => {
              return <tr key={`mrc-${i}`} style={{ backgroundColor: i % 2 ? appTheme.palette.neutralQuaternaryAlt : undefined }}>
                <td className='c1'>
                  <CommodityIcon name={n} />
                  &nbsp;
                  {mapCommodityNames[n] ?? n}:
                </td>
                <td className='c2'>
                  {v.toLocaleString()}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </Callout>
    </>;
  }

  renderFCCard(nexus: Nexus, id64: number, marketId: number) {
    const { expandFC, listRows, saving, shopFC } = this.state;
    const fc = nexus.fcs.find(fc => fc.marketId === marketId);
    const sysRow = listRows.find(s => s.id64 === id64);
    if (!expandFC || !fc || !sysRow) { return null; }

    return <>
      <Callout
        className={css}
        target={`#fcc-${expandFC.id64}-${expandFC.marketId}`}
        setInitialFocus
        alignTargetEdge
        directionalHint={DirectionalHint.rightTopEdge}
        gapSpace={4}
        styles={{
          beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
          calloutMain: {
            backgroundColor: appTheme.palette.neutralTertiaryAlt,
            color: appTheme.palette.neutralDark,
            cursor: 'default',
          }
        }}
        onDismiss={() => this.setState({ expandFC: undefined })}
      >
        <h3 className={cn.h3}>{fc.displayName} ({fc.name})</h3>

        <Stack horizontal tokens={{ childrenGap: 4 }}>
          <ActionButton
            iconProps={{ iconName: 'Clear', style: { color: asGrey(saving) } }}
            title='Unlink FC from this system'
            text={`Unlink FC`}
            style={{ height: 28, color: asGrey(saving) }}
            disabled={saving}
            onClick={() => {
              this.setState({ saving: true });
              const newMarketIDs = sysRow.fcs.filter(mid => mid !== marketId);
              api.nexus.setSysFCs(nexus.id, sysRow.id64, newMarketIDs)
                .then(newNexus => this.useNexus(newNexus))
                .catch(err => this.setState({ saving: false, errorMsg: err.message }));
            }}
          />

          <ActionButton
            iconProps={{ iconName: 'Edit', style: { color: asGrey(saving) } }}
            title='Edit cargo on this FC'
            text={`Edit`}
            style={{ height: 28, color: asGrey(saving) }}
            disabled={saving}
            onClick={() => this.setState({ fcEditMarketId: fc.marketId.toString() })}
          />

          <ActionButton
            iconProps={{ iconName: 'ShoppingCart', style: { color: asGrey(saving) } }}
            title='Shop for supplies for this FC'
            text={`Shop`}
            style={{ height: 28, color: asGrey(saving) }}
            disabled={saving}
            onClick={() => this.setState({ shopFC: shopFC === fc.marketId ? undefined : fc.marketId })}
          />
        </Stack>

        <div style={{ fontSize: 12, color: appTheme.palette.themePrimary, marginBottom: 4 }}>
          FC cargo to apply in this system:
        </div>

        <table className='tableCargoFC' cellPadding={0} cellSpacing={0}>
          <tbody>
            {Object.entries(sysRow.fromFC[marketId]).map(([n, v], i) => {
              const w = 100 / fc.cargo[n] * v;
              return <tr key={`fccc-${marketId}-${i}`} style={{ backgroundColor: i % 2 ? appTheme.palette.neutralQuaternaryAlt : undefined }}>
                <td className='c1'>
                  <CommodityIcon name={n} />
                  &nbsp;
                  {mapCommodityNames[n] ?? n}:
                </td>
                <td className='c2'>
                  {v.toLocaleString()}
                  <div className='bar' title={`${mapCommodityNames[n] ?? n}: ${v} of ${fc.cargo[n]}`}>
                    <div style={{ width: `${w}%` }} />
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </Callout>
    </>;
  }

  renderEditSystems(nexus: Nexus) {
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
                api.nexus.setSystems(nexus.id, newNames)
                  .then(newNexus => this.useNexus(newNexus))
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
        <div style={{ color: appTheme.palette.themeSecondary }}>Paste, edit, arrange system names below. One per line, in the desired order:</div>
        <div>
          <TextField
            multiline
            autoFocus
            label='Systems:'
            rows={20}
            value={editSystems}
            onChange={(_, txt) => this.setState({ editSystems: txt })}
          />
        </div>
      </div>

    </Panel>;
  }

  renderCurrentSystem(nexus: Nexus, currentSystem: SysRow) {
    // const { cargoFC } = this.state;
    const activeProjects = currentSystem.builds ?? [];
    const linkColor = appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod';

    const cargoFC = mergeCargo(Object.values(currentSystem.fromFC));

    return <div className='routeStats statBox'>
      <h3 className={cn.h3}>Current system:</h3>

      <div style={{ fontSize: 14 }}>
        <Link target='nexusSys' href={`/#sys=${encodeURIComponent(currentSystem.id64)}`} style={{ fontWeight: 'bold', color: linkColor }}>{currentSystem.nickname ?? currentSystem.name}</Link>

        <div style={{ marginTop: 4, marginBottom: 4 }}>
          Active projects: {activeProjects.length ? activeProjects.length : <span style={{ color: 'grey' }}>None</span>}
        </div>

        <div style={{ position: 'relative', paddingLeft: 10 }}>
          {activeProjects.map(p => {
            const delivered = p.maxNeed - p.sumNeed;
            const readyOnFCs = getCargoCountOnHand(p.commodities, cargoFC);
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

  renderRouteStats(nexus: Nexus) {
    const { cargoFC, listRows } = this.state;

    const sumTotal = listRows.map(s => s.total ?? 0).reduce((t, c) => t + c, 0);
    const sumDelivered = listRows.map(s => s.progress ?? 0).reduce((t, c) => t + c, 0);
    const sumCargo = mergeCargo(listRows.map(s => s.needs ?? {}));
    const readyOnFCs = getCargoCountOnHand(sumCargo, cargoFC ?? {});
    const sumRemaining = sumTotal - sumDelivered - readyOnFCs;

    const completed = listRows.filter(s => s.total && s.progress && s.progress >= s.total);
    const hubs = listRows.filter(s => nexus.hubs.includes(s.id64));
    const systemsProgress = listRows.length ? 100 / listRows.length * completed.length : 0;


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
        legend: 'Ready on any FC',
        data: readyOnFCs,
        color: appTheme.palette.tealDark,
      });
    }

    return <div className='routeStats statBox'>
      <h3 className={cn.h3}>Route stats:</h3>

      <div style={{ fontSize: 14 }}>
        <Stack className='boxes' horizontal tokens={{ childrenGap: 40 }}>
          <div><div className='h'>Hubs:</div>{hubs.length}</div>
          <div><div className='h'>Systems complete:</div>{completed.length} of {nexus.systems.length}</div>
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

  renderCommanders(nexus: Nexus) {
    const { showAddCmdr, isMember } = this.state;
    const allowRemoveCmdr = nexus.cmdrs.length > 1;

    return <div className='statBox'>
      <h3 className={cn.h3}>
        <>Commanders:</>
        {isMember && <ActionButton
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
        const newCmdrs = Array.from(new Set([...nexus.cmdrs, newCmdr]));
        api.nexus.setCmdrs(nexus.id, newCmdrs)
          .then(newNexus => this.setState({ saving: false, nexus: newNexus }));
      }} />}

      <div style={{ fontSize: 14 }}>
        {nexus.cmdrs.map(cmdr => {
          const isOwner = isMatchingCmdr(cmdr, nexus.owner);
          return <Stack key={`csc-${cmdr}`} horizontal verticalAlign='center'>
            <span className='listItem'>{cmdr}</span>

            {isOwner && <Icon iconName='Crown' style={{ color: 'grey', width: 10, height: 16, margin: '0 3px' }} title={`The owner of this nexus cannot be removed`} />}

            {isMember && !isOwner && <IconButton
              iconProps={{ iconName: 'Clear' }}
              disabled={!allowRemoveCmdr}
              onClick={() => {
                this.setState({ saving: true });
                const newCmdrs = nexus.cmdrs.filter(c => c !== cmdr);
                api.nexus.setCmdrs(nexus.id, newCmdrs)
                  .then(newNexus => this.setState({ saving: false, nexus: newNexus }))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />}
          </Stack>;
        })}
      </div>
    </div>
  }

  renderFleetCarriers(nexus: Nexus) {
    const { showAddFC, fcEditMarketId, hoverFC, shopFC, listRows, saving, isMember } = this.state;

    let preMatches: Record<string, string> | undefined = undefined;
    if (showAddFC) {
      const cmdrLinkedFCs = store.cmdrLinkedFCs;
      preMatches = Object.keys(store.cmdrLinkedFCs)
        .filter(marketId => nexus.fcs.every(fc => fc.marketId.toString() !== marketId))
        .reduce((map, marketId) => {
          map[marketId] = cmdrLinkedFCs[marketId];
          return map;
        }, {} as Record<string, string>);
    }
    const linkedMarketIds = nexus.fcs.map(fc => fc.marketId.toString()) ?? [];

    return <div className='statBox'>
      <h3 className={cn.h3}>
        <>Fleet Carriers:</>
        {isMember && <ActionButton
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
            const newMarketIDs = Array.from(new Set([...nexus.fcs.map(fc => fc.marketId), parseInt(marketId)]));
            api.nexus.setFCs(nexus.id, newMarketIDs)
              .then(newNexus => this.useNexus(newNexus))
              .catch(err => this.setState({ saving: false, errorMsg: err.message }));
          }}
        />
      </div>}

      <div style={{ fontSize: 14 }}>
        {nexus.fcs.map((fc, i) => {
          const isSysLinked = listRows.some(r => r.fcs.includes(fc.marketId));

          return <Stack
            key={`csfs-${fc.marketId}`}
            horizontal
            verticalAlign='center'
            style={{ backgroundColor: hoverFC === fc.marketId ? appTheme.palette.themeLight : undefined, padding: 4 }}
            onMouseEnter={() => this.setState({ hoverFC: fc.marketId })}
            onMouseLeave={() => this.setState({ hoverFC: undefined })}
          >
            {this.renderIconFC(fc.marketId)}
            &nbsp;
            <span className='listItem'>{fc.displayName} ({fc.name})</span>

            <IconButton
              iconProps={{ iconName: 'Edit', style: { color: asGrey(saving) } }}
              disabled={saving}
              onClick={() => this.setState({ fcEditMarketId: fc.marketId.toString() })}
            />

            {isMember && <IconButton
              iconProps={{ iconName: 'Clear', style: { color: asGrey(saving) } }}
              disabled={saving}
              onClick={() => {
                this.setState({ saving: true });
                const newMarketIDs = nexus.fcs.map(x => x.marketId).filter(x => x !== fc.marketId);
                api.nexus.setFCs(nexus.id, newMarketIDs)
                  .then(newNexus => this.useNexus(newNexus))
                  .catch(err => this.setState({ saving: false, errorMsg: err.message }));
              }}
            />}

            {isSysLinked && <IconButton
              iconProps={{ iconName: 'ShoppingCart', style: { color: asGrey(saving) } }}
              disabled={saving}
              onClick={() => this.setState({ shopFC: shopFC === fc.marketId ? undefined : fc.marketId })}
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

  renderShopFC(nexus: Nexus, marketId: number) {
    const { listRows } = this.state;
    const fc = nexus.fcs.find(fc => fc.marketId === marketId);
    if (!fc) { return null; }

    const need = mergeCargo(listRows
      .filter(r => r.fcs.includes(marketId))
      .map(r => r.needs ?? {}));

    // search where the FC is located, or the first assigned system if that is not known
    const systemName = fc.systemName ?? listRows.find(r => r.fcs.includes(marketId))?.name ?? '';

    return <>
      <WhereToBuy
        visible={!!marketId}
        buildIds={[marketId?.toString()]}
        systemName={systemName}
        need={need}
        have={fc.cargo}
        onClose={() => this.setState({ shopFC: undefined })}
      />
    </>;
  }

  renderIconFC(marketId: number, id64?: number) {
    const { nexus, hoverFC, expandFC } = this.state;
    const fc = nexus?.fcs.find(fc => fc.marketId === marketId);
    if (!fc) { return null; }
    const idx = nexus!.fcs.indexOf(fc);

    const iconName = fcIconList[idx % fcIconList.length];

    if (!id64) {
      return <Icon
        key={`fci-${marketId}`}
        iconName={iconName}
        title={`${fc.displayName} (${fc.name})`}
        style={{
          color: marketId === hoverFC ? appTheme.palette.themeDark : appTheme.palette.themeSecondary,
          fontSize: 24,
        }}
        onMouseEnter={() => this.setState({ hoverFC: marketId })}
        onMouseLeave={() => this.setState({ hoverFC: undefined })}
      />
    } else {
      return <IconButton
        id={`fcc-${id64}-${marketId}`}
        key={`fci-${marketId}`}
        iconProps={{ iconName: iconName, style: { fontSize: 24, } }}
        title={`${fc.displayName} (${fc.name})`}
        style={{
          color: marketId === hoverFC ? appTheme.palette.themeDark : appTheme.palette.themeSecondary,
        }}
        onMouseEnter={() => this.setState({ hoverFC: marketId })}
        onMouseLeave={() => this.setState({ hoverFC: undefined })}
        onClick={() => this.setState({ expandFC: expandFC ? undefined : { id64, marketId } })}
      />
    }
  }

}

const fcIconList: string[] = [
  'FerrySolid',
  'BusSolid',
  'TrainSolid',
  'ParkingSolid',
  'GiftBoxSolid',
  'LadybugSolid',
  'ParachuteSolid',
  'ColorSolid',
  'BankSolid',
  'FiltersSolid',
  'DiamondSolid',
  'VerifiedBrandSolid',
  'CircleShapeSolid',
  'SquareShapeSolid',
  'TriangleShapeSolid',
  'DropShapeSolid',
  'StarburstSolid',
]

export const CmdrNexus: FunctionComponent<{}> = (props) => {
  const [nexus, setNexus] = useState<Record<string, string> | undefined>(undefined);

  useMemo(async () => {
    try {
      const newNexus = await api.cmdr.getMyNexus();
      setNexus(newNexus);
    } catch (err: any) {
      if (err.statusCode !== 404) {
        // ignore cases where a project is not found
        console.error(`CmdrNexus failed: ${err.stack}`);
      }
    }
  }, []);

  return <div className='half' style={{ marginTop: 10 }}>
    <h2 className={cn.h3}>Choose a nexus:</h2>
    <div>
      {nexus && Object.keys(nexus).map(key => {
        return <div key={`ck-${key}`}>
          <Link href={`/#nexus=${encodeURIComponent(key)}`}>
            <Icon iconName='BuildQueue' style={{ marginRight: 4, fontSize: 12, textDecoration: 'none' }} />
            {nexus[key]}
          </Link>
        </div>;
      })}

      {!Object.keys(nexus ?? {}).length && <div style={{ color: 'grey' }}>You are not linked to any nexus</div>}
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