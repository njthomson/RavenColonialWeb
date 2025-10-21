import { ActionButton, Icon, IconButton, Link, Stack } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { appTheme, cn } from '../theme';
import { store } from '../local-storage';
import { Cargo, KnownFC, mapCommodityNames, SortMode } from '../types';
import { flattenObj, getGroupedCommodities, mergeCargo, nextSort, sumCargo } from '../util';
import { CommodityIcon } from './CommodityIcon/CommodityIcon';
import { FleetCarrier } from '../views';
import { EconomyBlock } from './EconomyBlock';
import { mapName } from '../site-data';
import { WhereToBuy } from './WhereToBuy/WhereToBuy';

interface CargoGridProps {
  cargo: Cargo,
  linkedFC: KnownFC[],
  hideActive?: boolean;
  onRefresh?: () => void;
  whereToBuy?: { refSystem: string; buildIds: string[] }
  minWidthNeed?: number;
  commodityTitles?: Record<string, string>
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
    };
  }

  componentDidUpdate(prevProps: Readonly<CargoGridProps>, prevState: Readonly<CargoGridState>, snapshot?: any): void {

    if (prevProps.cargo !== this.props.cargo) {
      this.setState({
        cargo: this.getDefaultCargo(this.props.linkedFC, this.state.hideFCColumns),
        zeroNeed: Object.keys(this.props.cargo).length === 0
      });
    }

    if (prevProps.linkedFC !== this.props.linkedFC) {
      const { linkedFC } = this.props;

      this.setState({
        linkedFC: this.props.linkedFC,
        cargo: this.getDefaultCargo(this.props.linkedFC, this.state.hideFCColumns),
        zeroNeed: Object.keys(this.props.cargo).length === 0,
        fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
        refreshing: false,
      });
    }
  }

  getDefaultCargo(linkedFC: KnownFC[], hideFCColumns: boolean) {
    const defaultCargo: Cargo = {
      ...this.props.cargo,
      // always show tritium
      tritium: 0,
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
    const { sort, hideDoneRows, hideFCColumns, linkedFC, fcEditMarketId, zeroNeed, refreshing, showWhereToBuy, fcCargo } = this.state;

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
            {!hideFCColumns && this.getCargoFCHeaders()}
          </tr>
        </thead>
        <tbody>{this.getTableRows()}</tbody>
      </table>}

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
    const { sort, linkedFC, hideFCColumns, cargo, hideDoneRows, zeroNeed } = this.state;

    const validCargoNames = Object.keys(cargo).filter(k => !hideDoneRows || cargo[k] !== 0)
    const groupedCommodities = getGroupedCommodities(validCargoNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCommodities);

    const colSpan = 2 + (hideFCColumns ? 0 : linkedFC.length + 1);

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
    const { cargo, linkedFC, fcCargo, hideFCColumns, zeroNeed } = this.state;

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

    return <tr key={`cc-${key}`} className={className} style={style}>

      <td className={`commodity-name ${cn.br}`} id={`cargo-${key}`} title={this.props.commodityTitles && this.props.commodityTitles[key]}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }}>
          <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
        </Stack>
      </td>

      {!zeroNeed && <td className={`commodity-need ${cn.br}`} title={this.props.commodityTitles && this.props.commodityTitles[key]}>
        <span className='t'>{need === -1 ? '?' : need.toLocaleString()}</span>
      </td>}

      {!hideFCColumns && <>
        {/* The FC Diff cell */}
        {!zeroNeed && <td key='fcc-have' className={`commodity-diff ${cn.br}`}  >
          <div className='bubble' style={{ backgroundColor: fcDiffCellColor, color: appTheme.palette.teal }} >
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

}
