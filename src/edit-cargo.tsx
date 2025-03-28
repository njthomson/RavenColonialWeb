import './edit-cargo.css';
import { ActionButton, Dropdown, Icon, IDropdownOption, SelectableOptionMenuItemType, Stack } from '@fluentui/react';
import { Component, CSSProperties } from 'react';
import { CommodityIcon, delayFocus, flattenObj, getGroupedCommodities, sumCargo } from './misc';
import { mapCommodityNames, SortMode } from './types';
import { store } from './local-storage';
import { appTheme } from './theme';

interface EditCargoProps {
  /** Coutns of named commodities */
  cargo: Record<string, number>;
  noAdd?: boolean;
  noDelete?: boolean;
  maxCounts?: Record<string, number>;

  /** The set of valid that can be added */
  cargoNames?: string[];

  readyNames?: string[];

  onChange?: (cargo: Record<string, number>) => void;
}

interface EditCargoState {
  cargo: Record<string, number>;
  canAddMore: boolean;
  sort: SortMode;
  newCargo?: string;
}

export class EditCargo extends Component<EditCargoProps, EditCargoState> {
  private cargoNames: string[];

  constructor(props: EditCargoProps) {
    super(props);

    // limit to the given names, or all relevant commodities if not
    this.cargoNames = props.cargoNames ?? Object.keys(mapCommodityNames)
    this.cargoNames.sort();

    this.state = {
      cargo: props.cargo,
      canAddMore: this.getCanAddMore(props, props.cargo),
      sort: SortMode.group,
    };
  }

  getCanAddMore(props: EditCargoProps, cargo: Record<string, number>): boolean {
    return !props.noAdd && this.cargoNames.filter(k => !(k in cargo)).length > 0;
  }


  componentDidUpdate(prevProps: Readonly<EditCargoProps>, prevState: Readonly<EditCargoState>, snapshot?: any): void {
    // broadcast change if the total count has changed
    if (this.props.onChange && sumCargo(prevState.cargo) !== sumCargo(this.state.cargo)) {
      this.props.onChange(this.state.cargo);
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

  updateCargoState(func: (cargoUpdate: Record<string, number>) => void, extra?: Partial<EditCargoState>): void {
    // pull from state, change it then push to state
    const cargoUpdate = { ...this.state.cargo };
    func(cargoUpdate);
    this.setState({
      ...extra as EditCargoState,
      cargo: cargoUpdate,
    });
  }

  render() {
    const { sort, canAddMore, newCargo } = this.state;

    const showAddNew = newCargo !== undefined;

    return <div className='edit-cargo'>
      <table cellSpacing={0}>
        <thead>
          <tr>

            <th className='name'>
              <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} >

                <span>Commodity:</span>

                {/* Toggle sort order button */}
                <Icon
                  className='icon-btn'
                  title={sort}
                  iconName='Sort'
                  tabIndex={0}
                  style={{ color: appTheme.palette.themePrimary }}
                  onClick={() => this.setState({ sort: sort === SortMode.alpha ? SortMode.group : SortMode.alpha })}
                />

                {/* Add new items button */}
                {canAddMore && <ActionButton
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
      </table>

      {showAddNew && this.renderAddNew()}
    </div>;
  }

  renderRows() {
    const { cargo, sort } = this.state;

    const cargoNames = Object.keys(cargo)
    const groupedCargo = getGroupedCommodities(cargoNames, sort);
    const groupsAndCommodityKeys = flattenObj(groupedCargo);

    let flip = true;
    return groupsAndCommodityKeys.map(key => {
      flip = !flip;
      return key in groupedCargo
        ? this.renderGroupRow(key, sort)
        : this.renderItemRow(key, flip);
    });
  }

  renderGroupRow(key: string, sort: SortMode) {
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
        <td colSpan={3} className='hint'> {key}</td>
      </tr>;
  }

  renderItemRow(key: string, flip: boolean) {
    const { cargo } = this.state;
    const { noDelete, maxCounts, readyNames } = this.props;

    const displayName = mapCommodityNames[key];
    const isReady = readyNames && readyNames.includes(key)
      ? <Icon iconName='SkypeCircleCheck' title={`${displayName} is ready`} />
      : undefined;

    // if we have max values
    let maxValue = maxCounts && maxCounts[key];
    if (maxValue) { Math.min(maxValue, store.cmdr?.largeMax ?? 800) }

    // different colour per row
    const rowStyle: CSSProperties | undefined = flip ? undefined : { background: appTheme.palette.themeLighter };

    return <tr key={`c-${key}`} style={rowStyle}>
      <td>
        <CommodityIcon name={key} /> {displayName} {isReady}
      </td>

      <td>
        <input
          id={`edit-${key}`}
          type='number'
          min={0}
          max={maxValue}

          value={cargo[key]}
          onChange={(ev) => {
            this.updateCargoState(uc => uc[key] = ev.target.valueAsNumber);
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

        {/* Add max button - if we have maxCounts */}
        {maxCounts && maxCounts[key] && <ActionButton
          className='icon-btn'
          title='Set ship max or amount needed'
          iconProps={{ iconName: 'CirclePlus' }}
          onClick={() => {
            this.updateCargoState(uc => uc[key] = Math.min(this.props.maxCounts![key], store.cmdr?.largeMax ?? 800));
            delayFocus(`edit-${key}`);
          }} >
          {maxCounts[key]}
        </ActionButton>}
      </td>
    </tr>;
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

    return <>
      <Stack horizontal verticalAlign='end'>
        <Dropdown
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
        />
      </Stack>
    </>;
  }

}

