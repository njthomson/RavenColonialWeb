import * as api from '../api';
import { Component, FunctionComponent, useMemo, useState } from "react";
import { Chain, ChainSys, ChainType } from "../api/chain";
import { ActionButton, CommandBar, DefaultButton, Icon, IconButton, Label, Link, mergeStyles, MessageBar, MessageBarButton, MessageBarType, Panel, PanelType, PrimaryButton, Spinner, SpinnerSize, Stack, TextField } from '@fluentui/react';
import { appTheme, cn } from '../theme';
import { CopyButton } from '../components/CopyButton';
import { delayFocus, isMatchingCmdr, isMobile } from '../util';
import { store } from '../local-storage';
import { FindFC } from '../components';
import { HaulSize } from '../components/BigSiteTable/BigSiteTable';
import { getAverageHauls } from '../avg-haul-costs';
import { FleetCarrier } from './FleetCarrier';

const css = mergeStyles({
  '.sysName': {
    margin: '0 8px',
  },
  '.statBox': {
    marginBottom: 20,
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
  '.statBox .ms-Button--icon': {
    width: 20,
    height: 20,
    '.ms-Button-icon': {
      fontSize: 10
    }
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
          }
        });
      }
    }
  }

  async loadChain(id: string) {
    this.setState({ loading: true, errorMsg: undefined });

    try {
      const newChain = await api.chain.get(id);

      this.setState({
        loading: false,
        chain: newChain,
      });
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

  render() {
    const { chain, errorMsg, loading, editSystems } = this.state;

    if (!this.props.id) {
      return this.renderCreate();
    }

    if (!chain && !loading) {
      return <>
        {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p>Cannot view a chain by id: {this.props.id}</p>
          <p><Link href='/#chain'>View chains</Link></p>
        </div>

      </>;
    }

    return <div className={css}>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

      {loading && <Spinner style={{ marginTop: 20 }} size={SpinnerSize.large} label='Loading ...' />}

      {!!chain && <>
        {this.renderTitles(chain)}
        <div className='contain-horiz'>
          {this.renderSystems()}
          <div className='half' style={{ marginTop: 10, cursor: 'default' }}>
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

    return <>
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}
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
          key: 'btn-save',
          text: 'Edit systems',
          iconProps: { iconName: 'EditNote' },
          onClick: () => this.setState({ editSystems: chain?.systems.map(s => s.name).join(`\n`) + `\n`, showAddCmdr: false, showAddFC: false }),
        }
      ]} />
      {errorMsg && <MessageBar messageBarType={MessageBarType.error}>{errorMsg}</MessageBar>}

    </div>;
  }

  renderSystems() {
    const { chain } = this.state;
    if (!chain) return;

    const rows = chain.systems.map(s => {
      let progress = 100 / s.total * s.progress;
      if (isNaN(progress)) { progress = 0; }
      const remaining = !s.total ? getAverageHauls('plutus') : s.total - (s.progress ?? 0);

      return <div key={`cs-${s.id64}`}>
        <Stack horizontal verticalAlign='baseline'>
          <Icon
            iconName={s.type === ChainType.hub ? 'WebAppBuilderFragment' : 'Link'}
            title={s.type === ChainType.hub ? 'Hub' : 'Bridge'}
          />
          <Link
            className='sysName'
            target='chainSys'
            href={`/#sys=${encodeURIComponent(s.id64)}`}
          >{s.name}</Link>
          <div>{progress.toFixed(0)}%</div>

          <HaulSize haul={remaining} />
        </Stack>
      </div>;
    });

    if (!rows.length) {
      rows.push(<div key='no-systems' style={{ marginTop: 20, textAlign: 'center' }}>
        <ActionButton
          className={cn.bBox}
          text='Add systems...'
          onClick={() => this.setState({ editSystems: '\n' })}
        />
      </div>);
    }

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
      <div>
        {rows}
      </div>
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
                  .then(newChain => this.setState({ saving: false, chain: newChain, editSystems: undefined }))
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

  renderRouteStats(chain: Chain) {
    const sumTotal = chain.systems.map(s => s.total ?? 0).reduce((t, c) => t + c, 0);
    const sumProgress = chain.systems.map(s => s.progress ?? 0).reduce((t, c) => t + c, 0);
    const sumRemaining = sumTotal - sumProgress;

    const currentSystem = chain.systems.reduce((l, s) => {
      if (s.total !== s.progress && s.progress > 0) { l = s; }
      return l;
    }, undefined as any as ChainSys);
    return <div className='statBox'>
      <h3 className={cn.h3}>Route stats:</h3>

      <div style={{ fontSize: 14 }}>
        <div>Total haul: {sumTotal.toLocaleString()}</div>
        <div>Total progress: {sumProgress.toLocaleString()}</div>
        <div>Remaining: {sumRemaining.toLocaleString()}</div>
        <div>Current system: {currentSystem?.name}</div>
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

      {!chains && <div style={{ color: 'grey' }}>You are not linked to any chains</div>}
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