import './EditCargo.css';

import { ActionButton, Dropdown, Icon, IDropdownOption, Label, SelectableOptionMenuItemType, Stack } from '@fluentui/react';
import { Component, CSSProperties, ReactNode } from 'react';
import { CommodityIcon } from '..';
import { store } from '../../local-storage';
import { appTheme } from '../../theme';
import { Cargo, mapCommodityNames, SortMode } from '../../types';
import { delayFocus, flattenObj, getGroupedCommodities, iconForSort, nextSort, sumCargo } from '../../util';
import { EconomyBlock } from '../EconomyBlock';
import { mapName } from '../../site-data';

interface EditCargoProps {
  /** Counts of cargo */
  cargo: Cargo;
  /** Per-row default amounts; when set, shows a reset button that restores `cargo[key]` to this value. */
  maxCounts?: Cargo;
  /** Names of cargo items valid to be added */
  validNames?: string[];
  /** Names of cargo that have been marked as ready */
  readyNames?: string[];

  sort?: SortMode;
  noAdd?: boolean;
  noDelete?: boolean;
  showTotalsRow?: boolean;

  /** Show the add button below the table, vs next to the sort order button */
  addButtonBelow?: boolean;
  /** Show the add button above the table, vs next to the sort order button */
  addButtonAbove?: boolean;

  /** Rendered inside `.edit-cargo` immediately above the commodity table (e.g. prep deliver reference building). */
  beforeTable?: ReactNode;
  /** Presentation of the reset button label; behavior always resets to `maxCounts[key]`. */
  resetButtonLabelMode?: 'value' | 'maxReq';
  /** Optional cap applied to MAX REQ button behavior. */
  maxReqCap?: number;
  /** When set, row amounts and MAX REQ are clamped so sum(cargo) never exceeds this. */
  maxTotalCargo?: number;
  /**
   * When false, `maxCounts` only sets the MAX REQ / reset target (e.g. guided by a reference column).
   * Manual typing is capped by `maxReqCap` and `maxTotalCargo` only. Default true.
   */
  useMaxCountsAsRowCap?: boolean;

  onChange?: (cargo: Cargo) => void;
}

interface EditCargoState {
  cargo: Cargo;
  canAddMore: boolean;
  sort: SortMode;
  newCargo?: string;
}

export class EditCargo extends Component<EditCargoProps, EditCargoState> {
  private cargoNames: string[];
  private firstKey?: string;

  constructor(props: EditCargoProps) {
    super(props);

    // limit to the given names, or all relevant commodities if not
    this.cargoNames = props.validNames ?? Object.keys(mapCommodityNames).slice(0, -4) // exclude the last 4 prior-error commodities
    this.cargoNames.sort();

    this.state = {
      cargo: props.cargo,
      canAddMore: this.getCanAddMore(props, props.cargo),
      sort: props.sort ?? store.commoditySort,
    };
  }

  getCanAddMore(props: EditCargoProps, cargo: Cargo): boolean {
    return !props.noAdd && this.cargoNames.filter(k => !(k in cargo)).length > 0;
  }

  componentDidMount(): void {
    // force focus onto the first input field, if known
    if (this.firstKey) {
      delayFocus(this.firstKey);
    }
  }

  componentDidUpdate(prevProps: Readonly<EditCargoProps>, prevState: Readonly<EditCargoState>, snapshot?: any): void {
    // broadcast change when totals, row set, or any amount changes (e.g. new row at 0 must sync — sum alone is not enough)
    if (this.props.onChange) {
      const prev = prevState.cargo;
      const next = this.state.cargo;
      let changed = sumCargo(prev) !== sumCargo(next);
      if (!changed) {
        const keys = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);
        for (const k of keys) {
          if (prev[k] !== next[k]) {
            changed = true;
            break;
          }
        }
      }
      if (changed) {
        this.props.onChange(next);
      }
    }

    // if there's nothing left to be added - hide the `Add` button
    const oldCount = Object.keys(prevState.cargo);
    const newCount = Object.keys(this.state.cargo);
    if (oldCount.length !== newCount.length) {
      const canAddMore = this.getCanAddMore(this.props, this.state.cargo);
      this.setState({ canAddMore });
    }

    // if there's no rows to render - force adding
    if (newCount.length === 0 && this.state.newCargo !== '') {
      this.setState({ newCargo: '' });
    }

    // accept new cargo from Props if not a reference we know
    const cargoHasChanged = this.state.cargo !== this.props.cargo && prevProps.cargo !== this.props.cargo;
    if (cargoHasChanged) {
      this.setState({
        cargo: this.props.cargo
      });
    }
  }

  updateCargoState(func: (cargoUpdate: Cargo) => void, extra?: Partial<EditCargoState>): void {
    // pull from state, change it then push to state
    const cargoUpdate = { ...this.state.cargo };
    func(cargoUpdate);
    this.setState({
      ...extra as EditCargoState,
      cargo: cargoUpdate,
    });
  }

  private sumCargoExcept(cargo: Cargo, exceptKey: string): number {
    let s = 0;
    for (const k in cargo) {
      if (k === exceptKey) { continue; }
      const v = cargo[k];
      if (typeof v === 'number' && v > 0) { s += v; }
    }
    return s;
  }

  private clampKeyToCaps(key: string, cargo: Cargo, raw: number): number {
    let v = Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
    const { maxCounts, maxTotalCargo, maxReqCap, useMaxCountsAsRowCap } = this.props;
    const rowCapFromGuidance = useMaxCountsAsRowCap !== false;
    const defaultCount = maxCounts && maxCounts[key] !== undefined ? maxCounts[key] : undefined;
    if (rowCapFromGuidance && defaultCount !== undefined && defaultCount >= 0) {
      v = Math.min(v, Math.floor(defaultCount));
    }
    if (typeof maxReqCap === 'number' && this.props.resetButtonLabelMode === 'maxReq') {
      v = Math.min(v, Math.max(0, Math.floor(maxReqCap)));
    }
    if (typeof maxTotalCargo === 'number') {
      const others = this.sumCargoExcept(cargo, key);
      const cap = Math.max(0, Math.floor(maxTotalCargo));
      v = Math.min(v, Math.max(0, cap - others));
    }
    return v;
  }

  render() {
    const { cargo, sort, canAddMore, newCargo } = this.state;
    const { addButtonBelow, addButtonAbove, showTotalsRow: totalsRow } = this.props;

    const hasCargoRows = Object.values(cargo).length > 0;

    const showAddNew = newCargo !== undefined;

    return <div className='edit-cargo'>
      {!showAddNew && canAddMore && addButtonAbove && <ActionButton
        text='Add commodity?'
        iconProps={{ iconName: 'Add' }}
        onClick={() => {
          this.setState({ newCargo: '' });
          delayFocus('new-cargo');
        }}
      />}

      {!hasCargoRows && <Label>No known cargo. Please add ...</Label>}

      {showAddNew && this.renderAddNew()}

      {this.props.beforeTable}

      {hasCargoRows && <table cellSpacing={0}>
        <thead>
          <tr>

            <th className='name'>
              <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} >

                <span>Commodity:</span>

                {/* Toggle sort order button */}
                <ActionButton
                  className='icon-btn'
                  title={sort}
                  text={sort}
                  iconProps={{ iconName: iconForSort(sort) }}
                  tabIndex={0}
                  style={{ color: appTheme.palette.themePrimary }}
                  onClick={() => {
                    const newSort = nextSort(sort);
                    this.setState({ sort: newSort });
                    store.commoditySort = newSort;
                  }}
                />

                {/* Add new items button */}
                {canAddMore && !addButtonBelow && !addButtonAbove && <ActionButton
                  className='icon-btn'
                  title='Add a new cargo item'
                  text='Add'
                  iconProps={{ iconName: 'Add' }}
                  style={{ color: appTheme.palette.themePrimary }}
                  onClick={() => {
                    this.setState({ newCargo: '' });
                    delayFocus('new-cargo');
                  }}
                />}
              </Stack>
            </th>

            <th className='amount'>Amount:</th>
          </tr>
        </thead>

        <tbody>
          {this.renderRows()}
        </tbody>

        {totalsRow && this.renderTotalsRow()}
      </table>}


      {!showAddNew && canAddMore && (addButtonBelow || !hasCargoRows) && <ActionButton
        text='Add commodity?'
        iconProps={{ iconName: 'Add' }}
        onClick={() => {
          this.setState({ newCargo: '' });
          delayFocus('new-cargo');
        }}
      />}

      {!showAddNew && canAddMore && (addButtonBelow || !hasCargoRows) && !!this.props.maxCounts && this.props.resetButtonLabelMode === 'maxReq' && <div style={{ marginTop: 6, fontSize: 12, color: appTheme.palette.neutralSecondary }}>
        {this.props.useMaxCountsAsRowCap === false ? <>
          <b>Note</b> MAX REQ fills each line from the reference you chose (capped by cargo capacity). You can type any amounts within per-line and total capacity; Load FC sends what you enter.
        </> : <>
          <b>Note</b> Clicking MAX REQ caps each commodity to its required amount and to your maximum cargo capacity.
        </>}
        {typeof this.props.maxTotalCargo === 'number' && <>
          <br />
          <b>Total</b> across all lines cannot exceed that capacity; amounts and MAX REQ use whatever room is left.
        </>}
      </div>}

    </div>;
  }

  renderRows() {
    const { cargo, sort } = this.state;

    const cargoNames = Object.keys(cargo).filter(c => c in mapCommodityNames); // filter out names unrelated to Colonization
    const groupedCargo = getGroupedCommodities(cargoNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCargo);

    let flip = true;
    return groupsAndCommodityKeys.map(key => {
      return key in groupedCargo
        ? this.renderGroupRow(key, sort)
        : this.renderItemRow(key, flip = !flip);
    });
  }

  renderGroupRow(key: string, sort: SortMode) {
    const colorBlock = sort === SortMode.econ ? <div><EconomyBlock economy={key} /></div> : null;
    const txt = sort === SortMode.econ
      ? key.split(',').map(t => mapName[t] ?? '??').join(' / ')
      : key;

    return sort === SortMode.alpha
      ? undefined
      : <tr
        key={`group-${key}`}
        className='group'
        style={{
          background: appTheme.palette.themeDark,
          color: appTheme.palette.themeLighter
        }}
      >
        <td colSpan={3}>
          <Stack horizontal verticalAlign='center'>
            {colorBlock}
            <div className='hint'>{txt}</div>
          </Stack>
        </td>
      </tr>;
  }

  renderItemRow(key: string, flip: boolean) {
    const { cargo } = this.state;
    const { noDelete, maxCounts, readyNames, resetButtonLabelMode, maxReqCap } = this.props;

    const displayName = mapCommodityNames[key];
    const isReady = readyNames && readyNames.includes(key)
      ? <Icon iconName='SkypeCircleCheck' title={`${displayName} is ready`} />
      : undefined;

    const useRowCapFromGuidance = this.props.useMaxCountsAsRowCap !== false;
    const defaultCount = maxCounts && maxCounts[key] !== undefined ? maxCounts[key] : undefined;
    const guidanceMax = defaultCount !== undefined && defaultCount >= 0 ? defaultCount : undefined;
    const sumOthers = this.sumCargoExcept(cargo, key);
    const maxTotal = this.props.maxTotalCargo;
    const rowMaxFromTotal = typeof maxTotal === 'number'
      ? Math.max(0, Math.floor(maxTotal) - sumOthers + (typeof cargo[key] === 'number' && cargo[key] > 0 ? cargo[key] : 0))
      : undefined;
    const maxReqLine = typeof maxReqCap === 'number' && resetButtonLabelMode === 'maxReq'
      ? Math.max(0, Math.floor(maxReqCap))
      : undefined;
    const htmlMax = !useRowCapFromGuidance
      ? (() => {
          const parts = [rowMaxFromTotal, maxReqLine].filter((x): x is number => typeof x === 'number');
          return parts.length > 0 ? Math.min(...parts) : undefined;
        })()
      : (guidanceMax !== undefined && rowMaxFromTotal !== undefined
        ? Math.min(guidanceMax, rowMaxFromTotal)
        : guidanceMax ?? rowMaxFromTotal);

    const showMaxReq = resetButtonLabelMode === 'maxReq';
    const roomUnderTotal = typeof maxTotal === 'number'
      ? Math.max(0, Math.floor(maxTotal) - sumOthers)
      : undefined;
    const cappedDefault = showMaxReq && typeof maxReqCap === 'number'
      ? Math.min(defaultCount ?? 0, Math.max(0, Math.floor(maxReqCap)), roomUnderTotal ?? Infinity)
      : defaultCount;

    // different colour per row
    const rowStyle: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };

    if (!this.firstKey) {
      this.firstKey = `edit-${key}`;
    }

    return <tr key={`c-${key}`} style={rowStyle}>
      <td>
        <CommodityIcon name={key} /> {displayName} {isReady}
      </td>

      <td>
        <input
          id={`edit-${key}`}
          type='number'
          min={0}
          max={htmlMax}
          value={cargo[key] === -1 ? '' : cargo[key]}
          style={{
            backgroundColor: appTheme.palette.themeLighterAlt,
            color: appTheme.palette.black,
            border: '1px solid ' + appTheme.palette.accent
          }}
          onChange={(ev) => {
            const raw = ev.target.value === '' ? 0 : ev.target.valueAsNumber;
            this.updateCargoState(uc => {
              uc[key] = this.clampKeyToCaps(key, uc, raw);
            });
          }}
          onFocus={(ev) => {
            ev.target.type = 'text';
            ev.target.setSelectionRange(0, 10);
            ev.target.type = 'number';
          }}
        />
      </td>

      <td>
        {/* Delete row button */}
        {!noDelete && <Icon
          className='icon-btn'
          title={`Remove ${displayName}`}
          iconName='Delete'
          tabIndex={0}
          style={{ color: appTheme.palette.themePrimary }}
          onClick={() => {
            this.updateCargoState(uc => delete uc[key]);
          }}
        />}

        {/* Reset-to-default button when maxCounts supplies the template value for this row */}
        {defaultCount !== undefined && defaultCount >= 0 && <ActionButton
          className='icon-btn'
          title={showMaxReq
            ? `Maximum required (${defaultCount.toLocaleString()})`
            : `Reset amount to default (${defaultCount.toLocaleString()})`}
          iconProps={{ iconName: 'CirclePlus' }}
          onClick={() => {
            const base = showMaxReq ? cappedDefault : defaultCount;
            const v = this.clampKeyToCaps(key, this.state.cargo, Math.max(0, Math.floor(Number(base))));
            this.updateCargoState(uc => { uc[key] = v; });
            delayFocus(`edit-${key}`);
          }} >
          {showMaxReq ? 'MAX REQ' : defaultCount.toLocaleString()}
        </ActionButton>}
      </td>
    </tr>;
  }

  renderTotalsRow() {
    const { cargo } = this.state;

    const sumTotal = sumCargo(cargo);
    if (sumTotal < 0) return;

    return <tfoot>
      <tr className='hint'>
        <td className='total-txt'>Total:</td>
        <td className='total-num'>
          <input
            readOnly
            value={sumTotal.toLocaleString()}
            tabIndex={-1}
            style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: 0 }}
          />
        </td>
        <td></td>
      </tr>
    </tfoot>;
  }

  renderAddNew() {
    const { cargo, newCargo, sort } = this.state;

    // filter out cargo already in use
    const validNewNames = this.cargoNames.filter(k => !(k in cargo));

    // arrange possible options by the sort order
    const groupedCargo = getGroupedCommodities(validNewNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCargo);

    // remove any empty groups
    for (const k in groupedCargo) {
      if (groupedCargo[k].length === 0) {
        delete groupedCargo[k];
      }
    }

    // prepare drop-down options
    const cargoOptions: IDropdownOption[] = [];
    groupsAndCommodityKeys.forEach((k, i) => {
      if (k in groupedCargo) {
        if (sort !== SortMode.alpha) {
          // add divider if not the first group
          if (i > 0) { cargoOptions.push({ key: `d${i}`, text: '', itemType: SelectableOptionMenuItemType.Divider }); }

          cargoOptions.push({ key: k, text: k, itemType: SelectableOptionMenuItemType.Header });
        }
      } else {
        cargoOptions.push({ key: k, text: mapCommodityNames[k] });
      }
    });

    return <Dropdown
      id='new-cargo'
      openOnKeyboardFocus
      placeholder='Choose a commodity...'
      options={cargoOptions}
      selectedKey={newCargo}
      onDismiss={() => this.setState({ newCargo: undefined })}
      onChange={(_, o) => {
        const k = `${o?.key}`;
        this.updateCargoState(uc => uc[k] = 0);
        delayFocus(`edit-${k}`);
      }}
      style={{ margin: '4px 0' }}
      styles={{
        callout: { border: '1px solid ' + appTheme.palette.themePrimary }
      }}
    />;
  }

}
