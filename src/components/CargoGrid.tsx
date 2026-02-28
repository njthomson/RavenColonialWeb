import { ActionButton, Callout, DirectionalHint, Icon, IconButton, Link, mergeStyleSets, Stack } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { appTheme, cn } from '../theme';
import { store } from '../local-storage';
import { Cargo, CmdrShip, KnownFC, mapCommodityNames, mapShipNames, SortMode } from '../types';
import { flattenObj, getGroupedCommodities, getRelativeDuration, mergeCargo, nextSort, sumCargo } from '../util';
import { CommodityIcon } from './CommodityIcon/CommodityIcon';
import { FleetCarrier } from '../views';
import { EconomyBlock } from './EconomyBlock';
import { mapName } from '../site-data';
import { WhereToBuy } from './WhereToBuy/WhereToBuy';

const { ng, nhl, nsn, nsc, npl1, npl2 } = mergeStyleSets({
  ng: {
    display: 'grid',
    gridTemplateColumns: 'auto auto',
    gap: '2px 10px',
  },
  nhl: {
    borderBottom: '1px solid',
  },
  nsn: {
    color: appTheme.palette.themePrimary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  nsc: {
    color: appTheme.palette.themePrimary,
    textAlign: 'right',
    marginTop: 4,
  },
  npl1: {
    marginLeft: 20,
  },
  npl2: {
    textAlign: 'right'
  }
});

interface CargoGridProps {
  cargo: Cargo,
  linkedFC: KnownFC[],
  hideActive?: boolean;
  onRefresh?: () => void;
  whereToBuy?: { refSystem: string; buildIds: string[] }
  minWidthNeed?: number;
  commodityNeeds?: Record<string, Record<string, Record<string, number>>>;
  ships?: CmdrShip[];
}

interface CargoGridState {
  cargo: Cargo,
  zeroNeed: boolean;
  linkedFC: KnownFC[],
  fcCargo: Cargo;

  sort: SortMode
  hideDoneRows: boolean;
  hideFCColumns: boolean;
  fcEditMarketId?: string;
  refreshing?: boolean;
  showWhereToBuy?: boolean;
  showNeededKey?: string;

  ships?: CmdrShip[];
  showShips?: boolean;
  showShipsTargetId?: string;
  showShipsTargetCargo?: string;
}

export class CargoGrid extends Component<CargoGridProps, CargoGridState> {

  constructor(props: CargoGridProps) {
    super(props);

    const fcCargo = mergeCargo(props.linkedFC.map(fc => fc.cargo));
    const defaultHideFCColumns = store.commodityHideFCColumns;
    this.state = {
      cargo: this.getDefaultCargo(props.linkedFC, defaultHideFCColumns),
      zeroNeed: Object.keys(props.cargo).length === 0,
      linkedFC: props.linkedFC,
      fcCargo: fcCargo,

      sort: store.commoditySort ?? SortMode.alpha,
      hideDoneRows: store.commodityHideCompleted,
      hideFCColumns: defaultHideFCColumns,
      showWhereToBuy: undefined,
      ships: props.ships,
      showShips: props.ships?.some(ship => Object.keys(ship.cargo).some(c => ship.cargo[c] > 0 && props.cargo[c] > 0)),
    };
  }

  componentDidUpdate(prevProps: Readonly<CargoGridProps>, prevState: Readonly<CargoGridState>, snapshot?: any): void {

    if (prevProps.cargo !== this.props.cargo) {
      this.setState({
        cargo: this.getDefaultCargo(this.props.linkedFC, this.state.hideFCColumns),
        zeroNeed: Object.keys(this.props.cargo).length === 0,
        showShips: this.props.ships?.some(ship => Object.keys(ship.cargo).some(c => ship.cargo[c] > 0 && this.state.cargo[c] > 0)),
      });
    }

    if (prevProps.linkedFC !== this.props.linkedFC) {
      const { linkedFC } = this.props;

      this.setState({
        linkedFC: this.props.linkedFC,
        cargo: this.getDefaultCargo(this.props.linkedFC, this.state.hideFCColumns),
        zeroNeed: Object.keys(this.props.cargo).length === 0,
        showShips: this.props.ships?.some(ship => Object.keys(ship.cargo).some(c => ship.cargo[c] > 0 && this.state.cargo[c] > 0)),
        fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
        refreshing: false,
      });
    }

    if (prevProps.ships !== this.props.ships) {

      this.setState({
        ships: this.props.ships,
        showShips: this.props.ships?.some(ship => Object.keys(ship.cargo).some(c => ship.cargo[c] > 0 && this.props.cargo[c] > 0)),
      });
    }
  }

  getDefaultCargo(linkedFC: KnownFC[], hideFCColumns: boolean) {
    const defaultCargo: Cargo = {
      ...this.props.cargo,
      // always show tritium? Maybe not
      // tritium: 0,
    };

    if (!hideFCColumns || this.state?.zeroNeed) {
      for (const fc of linkedFC) {
        for (const cargo in fc.cargo) {
          if (cargo in defaultCargo) { continue; }
          defaultCargo[cargo] = 0;
        }
      }
    }

    return defaultCargo;
  }

  render() {
    const { sort, hideDoneRows, hideFCColumns, linkedFC, fcEditMarketId, zeroNeed, refreshing, showWhereToBuy, fcCargo, showNeededKey, showShips, showShipsTargetId, showShipsTargetCargo } = this.state;

    const hideGrid = hideDoneRows && zeroNeed;
    return <>
      <h3 className={cn.h3}>
        Commodities:&nbsp;
        <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: 'Sort' }}
          onClick={() => {
            const newSort = nextSort(sort);
            this.setState({ sort: newSort });
            store.commoditySort = newSort;
          }}
        >
          {sort}
        </ActionButton>
        {!this.props.hideActive && <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: hideDoneRows ? 'ThumbnailViewMirrored' : 'AllAppsMirrored' }}
          title={hideDoneRows ? 'Hiding completed commodies' : 'Showing all commodities'}
          text={hideDoneRows ? 'Active' : 'All'}
          onClick={() => {
            this.setState({ hideDoneRows: !hideDoneRows });
            store.commodityHideCompleted = !hideDoneRows;
          }}
        />}
        {linkedFC.length > 0 && <ActionButton
          className={cn.bBox}
          iconProps={{ iconName: hideFCColumns ? 'fleetCarrier' : 'fleetCarrierSolid' }}
          title={hideFCColumns ? 'Hiding FC columns' : 'Showing FC columns'}
          onClick={() => {
            this.setState({
              cargo: this.getDefaultCargo(this.props.linkedFC, this.state.hideFCColumns),
              zeroNeed: Object.keys(this.props.cargo).length === 0,
              hideFCColumns: !hideFCColumns,
            });
            store.commodityHideFCColumns = !hideFCColumns;
          }}
        />}

        {this.props.whereToBuy && <ActionButton
          id='btnWhereToBuy'
          iconProps={{ iconName: showWhereToBuy ? 'ShoppingCartSolid' : 'ShoppingCart' }}
          title='Find markets supplying required commodities'
          onClick={() => {
            this.setState({ showWhereToBuy: !showWhereToBuy });
          }}
        />}

        {this.props.onRefresh && <IconButton
          className={cn.bBox}
          iconProps={{ iconName: 'Refresh' }}
          style={{ width: 24, height: 24, float: 'right' }}
          disabled={refreshing}
          onClick={() => {
            if (this.props.onRefresh) {
              this.setState({ refreshing: true });
              this.props.onRefresh();
            }
          }}
        />}
      </h3>

      {!hideGrid && <table className={`commodities`} cellSpacing={0} cellPadding={0} style={{ cursor: 'default' }}>
        <thead>
          <tr>
            <th className={`commodity-name ${cn.bb} ${cn.br}`}>Commodity</th>
            {!zeroNeed && <th className={`commodity-need ${cn.bb} ${cn.br}`} style={{ minWidth: this.props.minWidthNeed }} title='Total needed for this commodity'>Need</th>}
            {showShips && <th className={`commodity-need ${cn.bb} ${cn.br}`} title='Cargo on tracked ships'>
              <IconButton
                id='show-all-ships'
                iconProps={{ iconName: showShipsTargetId && !showShipsTargetCargo ? 'AirplaneSolid' : 'Airplane' }}
                className={`bubble ${cn.bBox}`}
                style={{ height: 20, padding: 0, }}
                onClick={() => this.setState({ showShipsTargetId: !!showShipsTargetId ? undefined : 'show-all-ships' })}
              />
            </th>}
            {!hideFCColumns && this.getCargoFCHeaders()}
          </tr>
        </thead>
        <tbody>{this.getTableRows()}</tbody>
      </table>}

      {showNeededKey && this.props.commodityNeeds && <>
        <Callout
          directionalHint={DirectionalHint.rightCenter}
          target={`#need-${showNeededKey}`}
          onDismiss={() => setTimeout(() => this.setState({ showNeededKey: undefined }))}
          styles={{
            beak: { backgroundColor: appTheme.palette.themeLight, },
            calloutMain: {
              backgroundColor: appTheme.palette.themeLight,
              color: appTheme.palette.neutralDark,
              cursor: 'default',
            }
          }}
        >
          <h3 className={nhl}>{mapCommodityNames[showNeededKey]}</h3>
          <div className={ng}>
            {Object.entries(this.props.commodityNeeds[showNeededKey]).map(([sysName, projNeeds], i) => {
              const counts = Object.values(projNeeds);
              const sum = counts.reduce((sum, count) => sum += count, 0);
              return <>
                <div key={`needed-sys-${i}a`} className={nsn}>{sysName}</div>
                <div key={`needed-sys-${i}b`} className={nsc}>{counts.length > 1 ? sum.toLocaleString() : ''}</div>
                {Object.entries(projNeeds).map(([proj, count], j) => {
                  return <>
                    <div key={`needed-sys-${i}-a${j}`} className={npl1}>{proj}</div>
                    <div key={`needed-sys-${i}-b${j}`} className={npl2}>{count.toLocaleString()}</div>
                  </>
                })}
              </>
            })}
          </div>
        </Callout>
      </>}
      {hideGrid && <>
        <div style={{ textAlign: 'center', color: appTheme.palette.themeTertiary, margin: 20 }}>
          No commodities to show
        </div>
      </>}

      {fcEditMarketId && <>
        <FleetCarrier
          marketId={fcEditMarketId}
          onClose={cargoUpdated => {
            // use updated cargo
            const { linkedFC } = this.state;
            if (cargoUpdated) {
              const fc = linkedFC.find(fc => fc.marketId.toString() === fcEditMarketId);
              if (fc) { fc.cargo = cargoUpdated; }
            }

            this.setState({
              fcEditMarketId: undefined,
              linkedFC: linkedFC,
              fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
            });
          }}
        />
      </>}

      {!!this.props.whereToBuy && showWhereToBuy !== undefined && <>
        <WhereToBuy
          visible={!!showWhereToBuy}
          buildIds={this.props.whereToBuy.buildIds}
          systemName={this.props.whereToBuy.refSystem}
          need={this.props.cargo}
          have={hideFCColumns ? undefined : fcCargo}
          onClose={() => this.setState({ showWhereToBuy: false })}
        />
      </>}

      {!!showShipsTargetId && this.renderShipsCallout()}
    </>;
  }

  getCargoFCHeaders() {
    const { zeroNeed } = this.state;
    const cells = [
      ...this.state.linkedFC.map(fc => {
        return fc && <th key={`fcc${fc.marketId}`} className={`commodity-need ${cn.bb} ${cn.br}`} title={`${fc.displayName} (${fc.name})`} >
          <Link
            className='fake-link'
            onClick={() => this.setState({ fcEditMarketId: fc.marketId.toString() })}
          >
            {fc.name}
          </Link>
        </th>;
      })
    ];

    if (!zeroNeed) {
      cells.unshift(<th key={`fcc-have`} className={`commodity-need ${cn.bb} ${cn.br}`} title='Difference between amount needed and sum total across linked Fleet Carriers'>FC Diff</th>);
    }

    return cells;
  }

  getTableRows() {
    const { sort, linkedFC, hideFCColumns, cargo, hideDoneRows, zeroNeed, showShips } = this.state;

    const validCargoNames = Object.keys(cargo).filter(k => !hideDoneRows || cargo[k] !== 0)
    const groupedCommodities = getGroupedCommodities(validCargoNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCommodities);

    const colSpan = 2 + (hideFCColumns ? 0 : linkedFC.length + 1) + (showShips ? 1 : 0);

    let flip = true;
    const rows = [];
    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        // group row
        if (sort !== SortMode.alpha) {
          rows.push(this.renderGroupRow(key, sort, colSpan));
        }
        continue;
      }

      flip = !flip;
      var row = this.getCommodityRow(key, flip);
      rows.push(row)
    }

    // generate a totals row at the bottom
    const totals: string[] = [];
    if (!zeroNeed) { totals.push(sumCargo(cargo).toLocaleString()); }
    if (showShips) { totals.push(''); }
    if (!hideFCColumns) {
      if (!zeroNeed) { totals.push(''); }
      for (const fc of linkedFC) {
        totals.push(sumCargo(fc.cargo).toLocaleString() ?? '');
      }
    }
    let nn = 0;
    const totalsRow = <tr key='tr-sum'>
      <td className={`commodity-name ${cn.br} ${cn.bt}`} style={{ textAlign: 'right' }}>Sum total:&nbsp;</td>
      {totals.map(t => (<td key={`tr-${++nn}`} className={`commodity-need ${cn.br} ${cn.bt}`}>{t}</td>))}
    </tr>;

    rows.push(totalsRow);

    return rows;
  }

  renderGroupRow(key: string, sort: SortMode, colSpan: number) {
    const colorBlock = sort === SortMode.econ ? <div><EconomyBlock economy={key} /></div> : null;
    const txt = sort === SortMode.econ
      ? key.split(',').map(t => mapName[t] ?? '??').join(' / ')
      : key;

    return <tr
      key={`group-${key}`}
      className='group'
      style={{
        background: appTheme.palette.themeDark,
        color: appTheme.palette.themeLighter,
      }}
    >
      <td colSpan={colSpan}>
        <Stack horizontal verticalAlign='center'>
          {colorBlock}
          <div className='hint'>{txt}</div>
        </Stack>
      </td>
    </tr>;
  }

  getCommodityRow(key: string, flip: boolean): JSX.Element {
    const { cargo, linkedFC, fcCargo, hideFCColumns, zeroNeed, showNeededKey, ships, showShips } = this.state;

    const displayName = mapCommodityNames[key] ?? key;

    const need = cargo[key] ?? 0;
    const sumFC = fcCargo[key] ?? 0;
    const delta = sumFC - need;

    let deltaTxt = delta.toLocaleString();
    if (!deltaTxt.startsWith('-') && deltaTxt !== '0') deltaTxt = '+' + deltaTxt;

    const diff = 100 / need * sumFC;

    // prepare an element for the FC diff cell
    const fcSumTitle = delta > 0
      ? `${diff.toFixed(0)}% - FCs have a surplus of: ${delta.toLocaleString()}`
      : `${diff.toFixed(0)}% - FCs are short by: ${(-delta).toLocaleString()}`;
    let fcSumElement = <></>;
    if (need > 0 && delta === 0) {
      fcSumElement = <Icon className='icon-inline' iconName='CheckMark' title={`100% - FCs have enough ${displayName}`} style={{ cursor: 'Default', textAlign: 'center', width: '100%' }} />;
    } else if (need > 0 || delta > 0) {
      fcSumElement = <span title={fcSumTitle}>{deltaTxt}</span>;
    }

    // prepare bubble colour for FC diff cell
    let fcDiffCellColor = '';
    if (need > 0) {
      fcDiffCellColor = delta >= 0 ? 'lime' : appTheme.palette.yellow;
    }

    // const fcMarketIds = Object.keys(linkedFC);

    const className = need !== 0 || zeroNeed ? '' : 'done ';
    const style: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };
    const useButtonForNeeds = this.props.commodityNeeds && this.props.commodityNeeds[key];
    const needValue = need === -1 ? '?' : need.toLocaleString();

    const onShips = ships && ships.map(s => s.cargo[key] ?? 0);
    const countOnShips = onShips?.reduce((t, c) => t + c, 0) ?? 0;
    const onShipsElement = !countOnShips
      ? <span style={{ color: 'grey' }}>-</span>
      : <ActionButton
        id={`show-ships-${key}`}
        className={`bubble ${cn.bBox}`}
        style={{ height: 20, padding: 0, minWidth: 28, }}
        text={countOnShips.toLocaleString()}
        onClick={() => this.setState({ showShipsTargetCargo: key, showShipsTargetId: `show-ships-${key}` })}
      />;
    const enoughOnShipsOrFC = need > 0 && (countOnShips + delta >= 0);

    return <tr key={`cc-${key}`} className={className} style={style}>

      <td className={`commodity-name ${cn.br}`} id={`cargo-${key}`} style={{ position: 'relative' }}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }}>
          <CommodityIcon name={key} />
          <span id={`cn-${key}`} className='t'>{displayName}</span>
        </Stack>

        {(enoughOnShipsOrFC) && <span style={{ position: 'absolute', right: 0, top: 2 }} title='Enough cargo is available on linked Fleet Carriers or tracked ships'>
          <Icon iconName={'TaskSolid'} style={{ fontSize: 14, height: 16, width: 16, color: 'lime' }} />
        </span>}
      </td>

      {!zeroNeed && <td className={`commodity-need ${cn.br}`}>
        <span className='t'>
          {!useButtonForNeeds && needValue}
          {useButtonForNeeds && <ActionButton
            id={`need-${key}`}
            className={cn.bBox}
            style={{ height: 18, padding: 0, fontSize: 16, margin: 0 }}
            text={needValue}
            onClick={() => this.setState({ showNeededKey: showNeededKey ? undefined : key })}
          />}
        </span>
      </td>}

      {showShips && <td className={`${cn.br}`} style={{ textAlign: 'center' }}>{onShipsElement}</td>}

      {!hideFCColumns && <>
        {/* The FC Diff cell */}
        {!zeroNeed && <td key='fcc-have' className={`commodity-diff ${cn.br}`}  >
          <div className='bubble' style={{ backgroundColor: fcDiffCellColor, color: 'black' }} >
            {fcSumElement}
          </div>
        </td>}

        {/* A cell for each FC */}
        {linkedFC.map(fc => <td key={`fcc${fc.marketId}`} className={`commodity-need ${cn.br}`} >
          {fc.cargo[key] ? <span>{fc.cargo[key].toLocaleString()}</span> : <span style={{ color: 'grey' }}>-</span>}
        </td>)}
      </>}
    </tr>;
  }

  renderShipsCallout() {
    const { ships, showShipsTargetId, showShipsTargetCargo } = this.state;
    if (!ships) return null;
    const bw = 50;

    const rows = [];
    for (const s of ships) {
      const matchingCargo = Object.keys(s.cargo)
        .filter(c => !showShipsTargetCargo || showShipsTargetCargo === c)
        .sort();
      const sum = matchingCargo.reduce((t, c) => t + s.cargo[c], 0);
      if (sum === 0) { continue; }
      const sumAll = Object.values(s.cargo).reduce((t, c) => t + c, 0);

      const w = 100.0 / s.maxCargo * sumAll;
      // elements for the cmdr
      rows.push(
        <div key={`ship-${s.cmdr}-1`} style={{ marginBottom: 2 }}>{s.cmdr}</div>,
        <div key={`ship-${s.cmdr}-2`} style={{ marginBottom: 2, color: appTheme.palette.themePrimary }}>{mapShipNames[s.type] ?? s.type}</div>,
        <div key={`ship-${s.cmdr}-3`} style={{ marginBottom: 2, gridColumn: 'span 2', fontSize: 10, position: 'relative', minWidth: bw, height: 19 }}>
          <div style={{ textAlign: 'center' }}>{sum} of {s.maxCargo.toLocaleString()}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${w}%`, height: 4, backgroundColor: appTheme.palette.themePrimary }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: `${w}%`, width: `${100 - w}%`, height: 4, backgroundColor: appTheme.palette.neutralQuaternaryAlt }}></div>
          {!!showShipsTargetCargo && <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${100.0 / s.maxCargo * sum}%`, height: 4, backgroundColor: appTheme.palette.orangeLight }}></div>}
        </div>,
        <div key={`ship-${s.cmdr}-cargo-${s.cmdr}-4`} style={{ gridRow: `span ${matchingCargo.length}`, fontSize: 10, color: appTheme.palette.themePrimary }}>{getRelativeDuration(new Date(s.time))}</div>,
      );

      // elements for the cargo
      let flip = true;
      const fontSize = 11;
      for (const key of matchingCargo) {
        flip = !flip;
        const backgroundColor = flip ? appTheme.palette.neutralQuaternaryAlt : undefined
        rows.push(
          <div key={`ship-${s.cmdr}-cargo-${key}-5`} style={{ backgroundColor, gridColumn: 'span 1', textAlign: 'right', fontSize, paddingLeft: 10, marginRight: -10 }}>{mapCommodityNames[key] ?? key}</div>,
          <div key={`ship-${s.cmdr}-cargo-${key}-6`} style={{ backgroundColor, gridColumn: 'span 1', textAlign: 'right', fontSize, marginRight: 0, paddingRight: 10 }}>{s.cargo[key].toLocaleString()}</div>,
          <div key={`ship-${s.cmdr}-cargo-${key}-7`} />
        );
      }
      rows.push(<div key={`ship-${s.cmdr}-cargo-${s.cmdr}-8`} style={{ gridColumn: 'span 4', height: 1, margin: '4px 0', backgroundColor: appTheme.palette.themeTertiary }} />);
    }

    return <>
      <Callout
        target={`#${showShipsTargetId}`}
        setInitialFocus
        alignTargetEdge
        directionalHint={DirectionalHint.rightTopEdge}
        styles={{
          beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
          calloutMain: {
            backgroundColor: appTheme.palette.neutralTertiaryAlt,
            color: appTheme.palette.neutralDark,
            cursor: 'default',
          }
        }}
        onDismiss={() => this.setState({ showShipsTargetCargo: undefined, showShipsTargetId: undefined })}
      >
        <div style={{ marginBottom: 10, color: appTheme.palette.themePrimary }}>Commanders:</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto auto auto',
          gap: '2px 10px',
          fontSize: '14px',
          marginLeft: 10,
          marginBottom: 10,
          alignItems: 'left',
        }}>
          {rows.slice(0, -1)}
        </div>
      </Callout>
    </>
  }

}
