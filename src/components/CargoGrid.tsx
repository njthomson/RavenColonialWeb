import { ActionButton, ContextualMenu, Icon, Link, Modal } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { appTheme, cn } from '../theme';
import { store } from '../local-storage';
import { Cargo, KnownFC, mapCommodityNames, SortMode } from '../types';
import { flattenObj, getTypeForCargo, mergeCargo } from '../util';
import { CommodityIcon } from './CommodityIcon/CommodityIcon';
import { FleetCarrier } from '../views';

interface CargoGridProps {
  cargo: Cargo,
  linkedFC: KnownFC[],
}

interface CargoGridState {
  cargo: Cargo,
  linkedFC: KnownFC[],
  fcCargo: Cargo;

  sort: SortMode
  hideDoneRows: boolean;
  hideFCColumns: boolean;
  fcEditMarketId?: string;
}

export class CargoGrid extends Component<CargoGridProps, CargoGridState> {

  constructor(props: CargoGridProps) {
    super(props);

    const fcCargo = mergeCargo(props.linkedFC.map(fc => fc.cargo));
    this.state = {
      cargo: props.cargo,
      linkedFC: props.linkedFC,
      fcCargo: fcCargo,

      sort: store.commoditySort ?? SortMode.alpha,
      hideDoneRows: store.commodityHideCompleted,
      hideFCColumns: store.commodityHideFCColumns,
    };
  }

  componentDidUpdate(prevProps: Readonly<CargoGridProps>, prevState: Readonly<CargoGridState>, snapshot?: any): void {

    if (prevProps.cargo !== this.props.cargo) {
      this.setState({ cargo: this.props.cargo });
    }

    if (prevProps.linkedFC !== this.props.linkedFC) {
      const { linkedFC } = this.props;

      this.setState({
        linkedFC: this.props.linkedFC,
        fcCargo: mergeCargo(linkedFC.map(fc => fc.cargo)),
      });
    }
  }

  render() {
    const { sort, hideDoneRows, hideFCColumns, linkedFC, fcEditMarketId } = this.state;

    return <>
      <h3 className={cn.h3}>
        Commodities:&nbsp;
        <ActionButton
          id='menu-sort'
          iconProps={{ iconName: 'Sort' }}
          onClick={() => {
            const newSort = sort === SortMode.alpha ? SortMode.group : SortMode.alpha;
            this.setState({ sort: newSort });
            store.commoditySort = newSort;
          }}
        >
          {sort}
        </ActionButton>
        <ActionButton
          id='menu-sort'
          iconProps={{ iconName: hideDoneRows ? 'ThumbnailViewMirrored' : 'AllAppsMirrored' }}
          title={hideDoneRows ? 'Hiding completed commodies' : 'Showing all commodities'}
          text={hideDoneRows ? 'Active' : 'All'}
          onClick={() => {
            this.setState({ hideDoneRows: !hideDoneRows });
            store.commodityHideCompleted = !hideDoneRows;
          }}
        />
        {linkedFC.length > 0 && <ActionButton
          id='menu-sort'
          iconProps={{ iconName: hideFCColumns ? 'AirplaneSolid' : 'Airplane' }}
          title={hideFCColumns ? 'Hiding FC columns' : 'Showing FC columns'}
          onClick={() => {
            this.setState({ hideFCColumns: !hideFCColumns });
            store.commodityHideFCColumns = !hideFCColumns;
          }}
        />}
      </h3>

      <table className={`commodities`} cellSpacing={0} cellPadding={0}>
        <thead>
          <tr>
            <th className={`commodity-name ${cn.bb} ${cn.br}`}>Commodity</th>
            <th className={`commodity-need ${cn.bb} ${cn.br}`} title='Total needed for this commodity'>Need</th>
            {!hideFCColumns && this.getCargoFCHeaders()}
            {/* {!editCommodities && hasAssignments && <th className={`commodity-assigned ${cn.bb}`}>Assigned</th>} */}
          </tr>
        </thead>
        <tbody>{this.getTableRows()}</tbody>
      </table>

      {fcEditMarketId && <Modal
        isOpen
        allowTouchBodyScroll
        dragOptions={{
          moveMenuItemText: 'Move',
          closeMenuItemText: 'Close',
          menu: ContextualMenu,
          keepInBounds: true,
          dragHandleSelector: '.ms-Modal-scrollableContent > h3',
        }}
        onDismissed={() => this.setState({ fcEditMarketId: undefined })}
      >
        <FleetCarrier
          onClose={(changed) => {
            this.setState({ fcEditMarketId: undefined });
            if (changed) {
              window.location.reload();
            }
            // this.fetchCargoFC(this.state.proj!.buildId);
          }}
          marketId={fcEditMarketId}
        />
      </Modal>}

    </>;
  }

  getCargoFCHeaders() {
    return [
      <th key={`fcc-have`} className={`commodity-need ${cn.bb} ${cn.br}`} title='Difference between amount needed and sum total across linked Fleet Carriers'>FC Diff</th>,

      ...this.state.linkedFC.map(fc => {
        //const fc = this.state.linkedFC.find(fc => fc.marketId.toString() === k);
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
  }

  getGroupedCommodities(): Record<string, string[]> {
    const { cargo, sort, hideDoneRows } = this.state;

    const sorted = Object.keys(cargo)
      .filter(k => !hideDoneRows || cargo[k] !== 0);
    sorted.sort();

    // just alpha sort
    if (sort === SortMode.alpha) {
      return { alpha: sorted };
    }

    const dd = sorted.reduce((d, c) => {
      const t = getTypeForCargo(c);
      if (!d[t]) d[t] = [];
      d[t].push(c);

      return d;
    }, {} as Record<string, string[]>);
    return dd;
  }

  getTableRows() {
    const { sort, linkedFC, hideFCColumns } = this.state;

    const groupedCommodities = this.getGroupedCommodities();
    const groupsAndCommodityKeys = flattenObj(groupedCommodities);

    const colSpan = hideFCColumns ? 0 : linkedFC.length + 1;

    let flip = true;
    const rows = [];
    for (const key of groupsAndCommodityKeys) {
      if (key in groupedCommodities) {
        // group row
        if (sort !== SortMode.alpha) {
          rows.push(<tr key={`group-${key}`} className='group' style={{ background: appTheme.palette.themeSecondary, color: appTheme.palette.neutralLight }}>
            <td colSpan={2 + colSpan} className='hint'> {key}</td>
          </tr>)
        }
        continue;
      }

      flip = !flip;
      var row = this.getCommodityRow(key, flip);
      rows.push(row)

      // // show extra row to assign a commodity to a cmdr?
      // if (assignCommodity === key && proj.commanders && !editCommodities) {
      //   rows.push(this.getCommodityAssignmentRow(key, proj, cmdrs));
      // }
    }

    return rows;
  }

  getCommodityRow(key: string, flip: boolean): JSX.Element {
    const { cargo, linkedFC, fcCargo, hideFCColumns } = this.state;

    const displayName = mapCommodityNames[key];
    // const currentCmdr = store.cmdrName;

    // const assigned = cmdrs
    //   .filter(k => cmdrs.some(() => proj!.commanders && proj!.commanders[k].includes(key)))
    //   .map(k => {
    //     return <span className={`removable bubble ${cn.removable}`} key={`$${key}-${k}`} style={{ backgroundColor: k === currentCmdr ? appTheme.palette.themeLight : undefined }}>
    //       <span className={`glue ${k === currentCmdr ? 'active-cmdr' : ''}`} >📌{k}</span>
    //       <Icon
    //         className={`btn ${cn.btn}`}
    //         iconName='Delete'
    //         title={`Remove assignment of ${displayName} from ${k}`}
    //         style={{ color: appTheme.palette.themePrimary }}
    //         onClick={() => this.onClickUnassign(k, key)}
    //       />
    //     </span>;
    //   });

    const need = cargo[key] ?? 0;
    const sumFC = fcCargo[key] ?? 0;
    const delta = sumFC - need;

    // const isContextTarget = false; //this.state.cargoContext === key;
    const isReady = false; //this.state.editReady.has(key);

    /*const menuItems: IContextualMenuItem[] = [
      {
        key: 'assign-cmdr',
        text: 'Assign to a commander ...',
        iconProps: { iconName: 'PeopleAdd' },
        onClick: () => {
          this.setState({ assignCommodity: key });
          delayFocus('assign-cmdr');
        },
      },
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider, },
      {
        key: 'toggle-ready',
        text: isReady ? 'Clear ready' : 'Mark ready',
        onClick: () => this.onToggleReady(this.state.proj!.buildId, key, isReady),
        iconProps: { iconName: 'StatusCircleCheckmark' },
      }
    ];

    if (need > 0) {
      menuItems.push({
        key: 'set-to-zero',
        text: 'Set to zero',
        onClick: () => this.deliverToZero(key, need),
        iconProps: { iconName: 'Download' },
      });
    }*/

    let deltaTxt = delta.toLocaleString();
    if (!deltaTxt.startsWith('-') && deltaTxt !== '0') deltaTxt = '+' + deltaTxt;

    // prepare an element for the FC diff cell
    // const fcSumTitle = delta > 0
    //   ? `FCs have a surplus of: ${delta} ${displayName}`
    //   : `FCs are short by: ${-delta} ${displayName}`;
    // let fcSumElement = <></>;
    // if (need > 0 && delta === 0) {
    //   fcSumElement = <Icon className='icon-inline' iconName='CheckMark' title={`FCs have enough ${displayName}`} style={{ cursor: 'Default', textAlign: 'center', width: '100%' }} />;
    // } else if (need > 0 || delta > 0) {
    //   fcSumElement = <span title={fcSumTitle}>{deltaTxt}</span>;
    // }

    // prepare bubble colour for FC diff cell
    let fcDiffCellColor = '';
    if (need > 0) {
      fcDiffCellColor = delta >= 0 ? 'lime' : appTheme.palette.yellow;
    }

    // const fcMarketIds = Object.keys(linkedFC);

    const className = need !== 0 ? '' : 'done ';
    const style: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };

    return <tr key={`cc-${key}`} className={className} style={style}>

      <td className={`commodity-name ${cn.br}`} id={`cargo-${key}`}>
        <CommodityIcon name={key} /> <span id={`cn-${key}`} className='t'>{displayName}</span>
        &nbsp;
        {isReady && <Icon className='icon-inline' iconName='CompletedSolid' title={`${displayName} is ready`} />}
        &nbsp;
        {/* {delta >= 0 && need > 0 && <Icon className='icon-inline' iconName='AirplaneSolid' title={fcSumTitle} />} */}

        {/* {isContextTarget && <ContextualMenu
          target={`#cn-${key}`}
          onDismiss={() => this.setState({ cargoContext: undefined })}
          items={menuItems}
          styles={{
            container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
          }}
        />}

        <Icon
          className={`btn ${cn.btn}`}
          iconName='ContextMenu'
          title={`Commands for: ${key}`}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.setState({ cargoContext: key });
          }}
        /> */}
      </td>

      <td className={`commodity-need ${cn.br}`} >
        <span className='t'>{need === -1 ? '?' : need.toLocaleString()}</span>
      </td>

      {!hideFCColumns && <>
        {/* The FC Diff cell */}
        <td key='fcc-have' className={`commodity-diff ${cn.br}`}  >
          <div className='bubble' style={{ backgroundColor: fcDiffCellColor, color: appTheme.palette.teal }} >
            <span className='t'>{deltaTxt}</span>
          </div>
        </td>

        {/* A cell for each FC */}
        {linkedFC.map(fc => <td key={`fcc${fc.marketId}`} className={`commodity-need ${cn.br}`} >
          <span>{fc.cargo[key]?.toLocaleString()}</span>
        </td>)}
      </>}

      {/* {hasAssignments && <td className='commodity-assigned'><span className='assigned'>{assigned}</span></td>} */}
    </tr>;
  }

}
