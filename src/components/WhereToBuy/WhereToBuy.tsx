import './WhereToBuy.css';
import * as api from '../../api';
import { ActionButton, Checkbox, ComboBox, DefaultButton, Icon, IconButton, Label, Link, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Slider, SpinButton, Spinner, Stack, Toggle } from '@fluentui/react';
import { Component } from 'react';
import { appTheme, cn } from '../../theme';
import { FindMarketsOptions, FoundMarkets, MarketSummary, mapCommodityNames } from '../../types';
import { store } from '../../local-storage';
import { CommodityIcon } from '../CommodityIcon/CommodityIcon';
import { CopyButton } from '../CopyButton';
import { CalloutMsg } from '../CalloutMsg';
import { PadSize } from '../PadSize';
import { LinkSrvSurvey } from '../LinkSrvSurvey';
import { isMobile } from '../../util';

const maxMaxDistance = 1000;

interface WhereToBuyProps {
  visible: boolean;
  buildId: string;
  systemName: string;
  need: Record<string, number>;
  onClose: () => void;
}

interface WhereToBuyState extends FindMarketsOptions {
  panelType: PanelType;
  searching: boolean;
  showSearchCriteria: boolean;
  hasSearched?: boolean;
  foundMarkets?: FoundMarkets;
  sortedRows: MarketSummary[];

  expandMatches: Set<string>;
  expandHighlights?: boolean;
  highlightHover?: string;
  highlights: Set<string>;

  sortColumn: string;
  sortAscending: boolean;
}

export class WhereToBuy extends Component<WhereToBuyProps, WhereToBuyState> {

  constructor(props: WhereToBuyProps) {
    super(props);

    // disregard prior data if the buildId does not match (and clear our cached data)
    let priorMarkets = store.foundMarkets;
    if (props.buildId !== priorMarkets?.buildId) {
      priorMarkets = undefined;
      store.foundMarkets = undefined;
    }

    // set max distance to "no limit" if it was zero previously
    const findMarketsOptions = store.findMarketsOptions;
    if (findMarketsOptions.maxDistance === 0) {
      findMarketsOptions.maxDistance = maxMaxDistance;
    }

    // do initial sort/filter by initial sort criteria
    const defaultSortColumn = 'matches';
    const defaultSortAscending = true;
    const sortedRows = this.sortMarkets(priorMarkets, defaultSortColumn, defaultSortAscending);

    // auto expand the first row
    const expandMatches = new Set<string>();
    if (sortedRows.length > 0) { expandMatches.add(sortedRows[0].stationName); }

    this.state = {
      ...findMarketsOptions,
      panelType: PanelType.medium,
      searching: false,
      showSearchCriteria: sortedRows.length === 0,
      hasSearched: false,
      foundMarkets: priorMarkets,
      sortedRows: sortedRows,
      expandMatches: expandMatches,
      highlights: new Set(),
      sortColumn: defaultSortColumn,
      sortAscending: defaultSortAscending
    };
  }

  componentDidUpdate(prevProps: Readonly<WhereToBuyProps>, prevState: Readonly<WhereToBuyState>, snapshot?: any): void {
    // re-sort/filter if needs have changed
    if (prevProps.need !== this.props.need) {
      const { sortColumn, sortAscending } = this.state;
      const newSortedRows = this.sortMarkets(this.state.foundMarkets, sortColumn, sortAscending);
      this.setState({
        sortedRows: newSortedRows,
      });
    }
  }

  doSearch = async () => {
    try {
      this.setState({ searching: true, hasSearched: true });

      // use distance: zero to indicate no limit
      const maxDistance = this.state.maxDistance < maxMaxDistance ? this.state.maxDistance : 0;

      // push choices into local storage
      store.findMarketsOptions = {
        shipSize: this.state.shipSize,
        maxDistance: maxDistance,
        noFC: this.state.noFC,
        noSurface: this.state.noSurface,
        requireNeed: this.state.requireNeed,
      };

      const foundMarkets = await api.project.findMarkets(this.props.buildId, this.state);

      // store response for future reference
      store.foundMarkets = foundMarkets;

      const sortedRows = this.sortMarkets(foundMarkets, this.state.sortColumn, this.state.sortAscending);

      // auto expand the first row
      const expandMatches = new Set<string>();
      if (sortedRows.length > 0) { expandMatches.add(sortedRows[0].stationName); }

      this.setState({
        searching: false,
        showSearchCriteria: sortedRows.length === 0,
        foundMarkets: foundMarkets,
        sortedRows: sortedRows,
        expandMatches: expandMatches,
      });
    } catch (err: any) {
      console.error(`WhereToBuy: search failed: ${err.stack}`);
    }
  };

  sortMarkets(foundMarkets: FoundMarkets | undefined, sortColumn: string, sortAscending: boolean,): MarketSummary[] {
    if (!foundMarkets) { return []; }

    const sortedRows = foundMarkets.markets
      // reduce each market's supplies to those that matter
      .map(m => {
        const matchedSupplies = Object.keys(m.supplies)
          .filter(cargo => cargo in this.props.need && this.props.need[cargo] > 0)
          .reduce((map, cargo) => {
            map[cargo] = m.supplies[cargo];
            return map;
          }, {} as Record<string, number>);

        return {
          ...m,
          supplies: matchedSupplies,
        };
      })
      // remove any market that no longer has supplies
      .filter(m => Object.keys(m.supplies).length > 0)
      .sort((a, b) => {
        const inverter = sortAscending ? 1 : -1;
        switch (sortColumn) {
          case 'stationName':
            return b.stationName.localeCompare(a.stationName) * inverter;
          case 'matches':
          default:
            return (Object.keys(b.supplies).length - Object.keys(a.supplies).length) * inverter;
          case 'systemName':
            return b.systemName.localeCompare(a.systemName) * inverter;
          case 'distance':
            return (b.distance - a.distance) * inverter;
          case 'distanceToArrival':
            return (b.distanceToArrival - a.distanceToArrival) * inverter;
        }
      });

    return sortedRows;
  }

  render() {
    const { foundMarkets, sortedRows, panelType, showSearchCriteria } = this.state;

    const isMedium = panelType === PanelType.medium;

    return <Panel
      isHiddenOnDismiss isFooterAtBottom
      allowTouchBodyScroll={isMobile()}
      isOpen={this.props.visible}
      type={panelType}
      onDismiss={() => this.props.onClose()}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        footerInner: { padding: 1 }
      }}

      onRenderHeader={() => {
        return <div style={{ width: '90%', margin: '10px 40px' }}>
          <IconButton
            iconProps={{ iconName: isMedium ? 'DoubleChevronLeft' : 'DoubleChevronRight', style: { color: appTheme.palette.neutralDark, fontSize: 12 } }}
            style={{ position: 'absolute', left: 0, top: 0 }}
            onClick={() => this.setState({ panelType: isMedium ? PanelType.large : PanelType.medium })}
          />
          <h3 style={{ fontSize: 20 }}>
            Where to buy near: {this.props.systemName}
            &nbsp;
            <CopyButton text={this.props.systemName} fontSize={14} />
          </h3>
        </div>;
      }}

      onRenderFooterContent={() => {

        const preparedAt = new Date(foundMarkets?.preparedAt ?? 0);

        return <Stack horizontal horizontalAlign='space-between' style={{ margin: 6, fontSize: 12 }}>
          {!showSearchCriteria && <span>Found: {sortedRows.length} markets. Searched on: {preparedAt.toLocaleDateString()} {preparedAt.toLocaleTimeString()}</span>}
          <LinkSrvSurvey href='#about=markets' text='Help?' title='Learn more on the About page' />
        </Stack>;
      }}
    >
      <div className='where-to-buy'>
        {showSearchCriteria && this.renderSearchCriteria()}
        {!showSearchCriteria && this.renderFoundMarkets()}
      </div>
    </Panel>;
  }

  renderSearchCriteria() {
    const { foundMarkets, shipSize, maxDistance, noSurface, noFC, requireNeed, searching, hasSearched } = this.state;

    const maxDistanceTxt = maxDistance === 0 || maxDistance >= maxMaxDistance ? 'Unlimited' : maxDistance.toString();
    const noMarketsFound = !searching && hasSearched && foundMarkets?.markets.length === 0;
    // const hours = new Date().getUTCHours() + 2;

    return <div>
      <div style={{ marginBottom: 10 }}>Search for markets near this construction site that sell the commodities you need.</div>

      <ComboBox
        label='Minimum ship size:'
        useComboBoxAsMenuWidth
        selectedKey={shipSize}
        style={{ marginBottom: 10 }}
        disabled={searching}
        options={[
          { key: 'large', text: 'Large', },
          { key: 'medium', text: 'Medium', },
          { key: 'small', text: 'Small', },
        ]}
        onChange={(_, o, i, v) => {
          this.setState({
            shipSize: o?.key.toString() ?? ''
          });
        }}
      />

      <Label>Maximum distance: (LY)</Label>
      <Stack horizontal>
        <Slider
          showValue={false}
          min={0} max={maxMaxDistance}
          step={25}
          value={maxDistance}
          disabled={searching}
          styles={{
            container: { width: 200, },
            line: { width: '100%', },
          }}
          onChange={v => this.setState({ maxDistance: v })}
        />
        <SpinButton
          value={maxDistanceTxt}
          style={{ width: 102, marginLeft: 8 }}
          disabled={searching}
          onChange={(_, v) => this.setState({ maxDistance: parseInt(v!) })}
        />
      </Stack>

      <Label>Options:</Label>
      <Stack tokens={{ childrenGap: 8, maxWidth: 400 }} style={{ marginRight: 8 }}>
        <Checkbox
          label='Require enough commodity in stock'
          title='Exclude stations that do not have enough of any required commodity'
          checked={requireNeed}
          disabled={searching}
          onChange={(_ev, checked) => this.setState({ requireNeed: !!checked })}
        />
        <Checkbox
          label='No surface ports or settlements'
          checked={noSurface}
          disabled={searching}
          onChange={(_ev, checked) => this.setState({ noSurface: !!checked })}
        />
        <Checkbox
          label='No Fleet Carriers'
          checked={noFC}
          disabled={searching}
          onChange={(_ev, checked) => this.setState({ noFC: !!checked })}
        />
      </Stack>

      <div className='small' style={{ margin: '20px 0' }}>Data sourced from <Link href='https://spansh.co.uk' target='spansh'>spansh.co.uk</Link>, updated once a day.</div>

      {noMarketsFound && <MessageBar messageBarType={MessageBarType.blocked}>
        No markets found by these criteria
      </MessageBar>}

      <Stack horizontal horizontalAlign='end' verticalAlign='end' tokens={{ childrenGap: 20 }} style={{ marginTop: 20 }}>

        {searching && <Spinner hidden label='Searching' labelPosition='right' style={{ margin: 6 }} />}

        <PrimaryButton
          iconProps={{ iconName: 'Search' }}
          text="Search"
          disabled={searching}
          onClick={this.doSearch} style={{ height: 25 }}
        />

        <DefaultButton
          iconProps={{ iconName: 'Cancel' }}
          text="Cancel"
          style={{ height: 25 }}
          onClick={() => {
            if (!hasSearched || !store.foundMarkets || noMarketsFound) {
              this.props.onClose();
            } else {
              this.setState({
                showSearchCriteria: false,
              })
            }
          }}
        />
      </Stack>
    </div>;
  }

  renderFoundMarkets() {
    const { sortedRows, highlights, expandMatches, expandHighlights } = this.state;

    const allCollapsed = expandMatches.size === 0;
    const highlightTitleTxt = 'Click station commodities to highlight them at other stations';

    return <div>
      <Stack horizontal>

        <ActionButton
          iconProps={{ iconName: allCollapsed ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
          text={allCollapsed ? 'Expand all' : `Collapse all`}
          style={{ height: 22 }}
          onClick={() => {
            if (allCollapsed) {
              sortedRows.forEach(m => expandMatches.add(m.stationName));
            } else {
              expandMatches.clear();
            }
            this.setState({ expandMatches: expandMatches });
          }}
        />

        <Toggle
          onText='Expand highlights'
          offText='Expand highlights'
          checked={expandHighlights}
          onChange={() => this.setState({ expandHighlights: !expandHighlights })}
        />

        <ActionButton
          iconProps={{ iconName: 'SearchAndApps' }}
          text='Change criteria'
          style={{ height: 22 }}
          onClick={() => this.setState({ showSearchCriteria: true })}
        />
      </Stack>

      <Stack className={`highlight ${cn.bb}`} horizontal verticalAlign='start' style={{ padding: 4, marginBottom: 8 }} wrap>
        <Stack horizontal verticalAlign='center' title={highlightTitleTxt}>
          <span id='where-higlight' style={{ height: 22, marginRight: 4 }}>Highlight:</span>
          <CalloutMsg id='where-higlight' msg={highlightTitleTxt} />
          &nbsp;
        </Stack>
        {Array.from(highlights).map(cargo => <div
          key={`topBubble${cargo}`}
          className='bubble'
          title={`Remove ${mapCommodityNames[cargo]} from higlights`}
          style={{
            color: appTheme.palette.black,
            backgroundColor: appTheme.palette.neutralTertiaryAlt,
          }}
          onClick={() => {
            highlights.delete(cargo);
            this.setState({ highlights });
          }}
        >
          <CommodityIcon name={cargo} />&nbsp;{mapCommodityNames[cargo]}
        </div>)}

        {!!highlights.size && <IconButton
          iconProps={{ iconName: 'Clear' }}
          title='Remove all highlighted commodities'
          style={{ width: 22, height: 22 }}
          onClick={() => {
            highlights.clear();
            this.setState({ highlights });
          }}
        />}
      </Stack>

      <table cellPadding={0} cellSpacing={0}>
        <colgroup>
          <col width='30%' />
          <col width='10%' />
          <col width='15%' />
          <col width='30%' />
          <col width='10%' />
          <col width='15%' />
        </colgroup>

        <thead style={{ color: appTheme.palette.black }}>
          <tr>
            {this.renderSortableColumnHeader('c1', 'stationName')}
            <th className={`${cn.bb}`} />
            {this.renderSortableColumnHeader('c2', 'matches')}
            {this.renderSortableColumnHeader('c3', 'systemName')}
            {this.renderSortableColumnHeader('c4', 'distance')}
            {this.renderSortableColumnHeader('c5', 'distanceToArrival')}
          </tr>
        </thead>

        <tbody style={{ fontSize: 12, color: appTheme.palette.themeSecondary }}>
          {sortedRows.map((summary, idx) => this.renderMarketSummary(summary, idx))}
        </tbody>

      </table>
    </div>;
  }

  renderSortableColumnHeader(col: string, name: string) {
    const { sortColumn, sortAscending } = this.state;
    const isSortColumn = sortColumn === name;
    let iconName = sortAscending ? 'CaretSolidUp' : 'CaretSolidDown';
    if (!isSortColumn) {
      iconName = 'CalculatorSubtract';
    }
    return <th
      className={`${col} ${cn.bb}`}
      onClick={() => {
        const nextSortAscending = sortColumn === name ? !sortAscending : sortAscending;
        this.setState({
          sortColumn: name,
          sortAscending: nextSortAscending,
          sortedRows: this.sortMarkets(this.state.foundMarkets, name, nextSortAscending),
        });
      }}
    >
      <ActionButton
        style={{ fontSize: 12 }}
        text={mapColumnNames[name]}
        iconProps={{ iconName: iconName, style: { padding: 0, margin: 0, fontSize: 12 } }}
      />
    </th>;
  }

  renderMarketSummary(market: MarketSummary, idx: number) {
    const { expandMatches, highlights, expandHighlights } = this.state;

    const isHighlightMatch = Object.keys(market.supplies).some(n => highlights.has(n));
    const isExpanded = expandMatches.has(market.stationName) || (expandHighlights && isHighlightMatch);

    // fleet carriers need to use their ident, not display name
    const stationName = market.stationName.endsWith(')')
      ? market.stationName.substring(market.stationName.lastIndexOf('(')).slice(1, -1)
      : market.stationName;
    const inaraLink = `https://inara.cz/elite/station/?search=${stationName} [${market.systemName}]`;

    const subMatches = Object.entries(market.supplies).filter(([cargo, count]) => cargo in this.props.need && this.props.need[cargo] > 0);
    const countMatches = subMatches.length;

    let marketLocationTitle = market.type;
    if (market.bodyName) {
      marketLocationTitle += `, body: ${market.bodyName.replace(market.systemName, '').trim()}`;
    }

    const distTxt = market.distance.toFixed(1);
    const updatedAt = new Date(market.updatedAt);
    const rowTitle = `${market.stationName}\n` +
      `${market.type} / ${market.economy}\n` +
      `Has ${countMatches} required commodities\n\n` +
      `Updated: ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString()}\n`
      ;

    // row1: main visible data
    const row1 = <tr
      key={`summary${market.marketId}`}
      className={`${cn.trh}`}
      title={rowTitle}
      onClick={() => {
        if (isExpanded) {
          expandMatches.delete(market.stationName);
        } else {
          expandMatches.add(market.stationName);
        }
        this.setState({ expandMatches: expandMatches });
      }}
    >
      <td className='c1'>
        <ActionButton
          className='bubble'
          iconProps={{ iconName: isExpanded ? 'ChevronDownSmall' : 'ChevronUpSmall', style: { color: isHighlightMatch ? 'white' : undefined } }}
          text={market.stationName}
          style={{
            backgroundColor: isHighlightMatch ? appTheme.palette.themeTertiary : undefined,
            color: isHighlightMatch ? 'white' : undefined,
            margin: 1,
            height: 'unset',
          }}
        />
      </td>

      <td>
        <Icon
          iconName={market.surface ? 'GlobeFavorite' : 'ProgressRingDots'}
          title={marketLocationTitle}
          style={{ fontSize: 12 }}
        />
        <PadSize size={market.padSize} />
      </td>

      <td className='c2'>
        {countMatches}
      </td>

      <td className='c3' style={{ color: appTheme.palette.themeDarker }}>
        <CopyButton text={market.systemName} />
        <Link
          title='View on Inara'
          style={{ marginLeft: 2 }}
          href={inaraLink}
          target='inara'
        >
          {market.systemName}
        </Link>
      </td>

      <td className='c4'>
        {distTxt} ly
      </td>

      <td className='c4'>
        {Math.trunc(market.distanceToArrival).toLocaleString()} ls
      </td>
    </tr>;

    // row2: list of bubbles
    const row2 = !isExpanded ? null : <tr className='r2' key={`summary${market.marketId}r2`}>
      <td className='c1' colSpan={6}>
        <Stack horizontal wrap>
          {subMatches.map(([cargo, count]) => this.renderSupplyBubble(cargo, count, market.marketId))}
        </Stack>
      </td>
    </tr>;

    return [row1, row2];
  }

  renderSupplyBubble(cargo: string, count: number, marketId: number) {
    const { highlightHover, highlights } = this.state;

    const isHighlighted = highlights.has(cargo);
    const backColor = isHighlighted ? appTheme.palette.themeSecondary : appTheme.palette.neutralTertiaryAlt;

    let textColor = isHighlighted ? 'white' : appTheme.palette.black;
    let titleTxt = isHighlighted ? `Remove ${mapCommodityNames[cargo]} from higlights` : `Click to highlight: ${mapCommodityNames[cargo]}`

    if (count < this.props.need[cargo]) {
      // should we include the deficit count?
      titleTxt += ' (Insufficient supply)';

      if (!isHighlighted) {
        textColor = 'grey'; //or appTheme.palette.themeLighterAlt; ?
      }
    }

    return <div
      key={`${marketId}${cargo}`}
      className='bubble cargo'
      title={titleTxt}
      style={{
        color: textColor,
        backgroundColor: backColor,
        border: `2px solid ${cargo === highlightHover ? appTheme.palette.black : backColor}`,
      }}
      onMouseEnter={() => this.setState({ highlightHover: cargo })}
      onMouseLeave={() => this.setState({ highlightHover: '' })}
      onClick={() => {
        if (isHighlighted) {
          highlights.delete(cargo);
        } else {
          highlights.add(cargo);
        }
        this.setState({ highlights });
      }}
    >
      <CommodityIcon name={cargo} />
      &nbsp;
      {mapCommodityNames[cargo]}: {count.toLocaleString()}
    </div>;
  }
}

const mapColumnNames: Record<string, string> = {
  stationName: 'Station',
  matches: 'Matches',
  systemName: 'System',
  distance: 'Distance',
  distanceToArrival: 'Arrival',
}
