import './WhereToBuy.css';
import * as api from '../../api';
import { ActionButton, Checkbox, ComboBox, DefaultButton, DirectionalHint, Icon, IconButton, Label, Link, mergeStyles, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton, Slider, SpinButton, Spinner, Stack, Toggle } from '@fluentui/react';
import { Component } from 'react';
import { appTheme, cn } from '../../theme';
import { Cargo, FindMarketsOptions, FoundMarkets, MarketSummary, mapCommodityNames, mapSourceEconomy } from '../../types';
import { store } from '../../local-storage';
import { CommodityIcon } from '../CommodityIcon/CommodityIcon';
import { CopyButton } from '../CopyButton';
import { CalloutMsg } from '../CalloutMsg';
import { PadSize } from '../PadSize';
import { LinkSrvSurvey } from '../LinkSrvSurvey';
import { isMobile, parseIntLocale, validIncDecLocale } from '../../util';
import { mapName } from '../../site-data';
import { EconomyBlock } from '../EconomyBlock';
import { FindSystemName } from '../FindSystemName';

const maxMaxDistance = 1000;
const maxMaxArrival = 250_000;

interface WhereToBuyProps {
  visible: boolean;
  buildIds: string[];
  systemName: string;
  need: Cargo;
  onClose: () => void;
}

interface WhereToBuyState extends FindMarketsOptions {
  largePanel: boolean;
  searching: boolean;
  showSearchCriteria: boolean;
  hasSearched?: boolean;
  foundMarkets?: FoundMarkets;
  sortedRows: MarketSummary[];
  missedCargo: string[];

  expandTopBubbles: boolean;
  expandMatches: Set<string>;
  expandHighlights?: boolean;
  highlightHover?: string;
  highlights: Set<string>;
  filterNoHighlights: boolean;

  sortColumn: string;
  sortAscending: boolean;
}

export class WhereToBuy extends Component<WhereToBuyProps, WhereToBuyState> {

  constructor(props: WhereToBuyProps) {
    super(props);

    // disregard prior data if the buildId does not match (and clear our cached data)
    let priorMarkets = store.foundMarkets;
    if (props.buildIds.length !== priorMarkets?.buildIds?.length || JSON.stringify(props.buildIds) !== JSON.stringify(priorMarkets?.buildIds ?? [])) {
      priorMarkets = undefined;
      store.foundMarkets = undefined;
    }

    // set max distance to "no limit" if it was zero previously
    const findMarketsOptions = store.findMarketsOptions;
    if (!findMarketsOptions.maxDistance) { findMarketsOptions.maxDistance = maxMaxDistance; }
    if (!findMarketsOptions.maxArrival) { findMarketsOptions.maxArrival = maxMaxArrival; }

    // reset refSystem if we have no prior results
    let defaultSystem = !!priorMarkets ? findMarketsOptions.refSystem : props.systemName;

    // do initial sort/filter by initial sort criteria
    const defaultSortColumn = 'distance';
    const defaultSortAscending = false;
    const sortedRows = this.sortMarkets(priorMarkets, defaultSortColumn, defaultSortAscending);
    const missedCargo = Object.keys(props.need).filter(cargo => sortedRows.some(m => cargo in m.supplies));

    // auto expand the first row
    const expandMatches = new Set<string>();
    if (sortedRows.length > 0) { expandMatches.add(sortedRows[0].stationName); }

    this.state = {
      ...findMarketsOptions,
      refSystem: defaultSystem,
      largePanel: false,
      searching: false,
      showSearchCriteria: sortedRows.length === 0,
      hasSearched: false,
      foundMarkets: priorMarkets,
      sortedRows: sortedRows,
      missedCargo: missedCargo,
      expandTopBubbles: true,
      expandMatches: expandMatches,
      highlights: new Set(),
      sortColumn: defaultSortColumn,
      sortAscending: defaultSortAscending,
      filterNoHighlights: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<WhereToBuyProps>, prevState: Readonly<WhereToBuyState>, snapshot?: any): void {

    let nextState: Partial<WhereToBuyState> | undefined = undefined;

    // re-sort/filter if needs have changed
    if (prevProps.need !== this.props.need) {
      const { sortColumn, sortAscending } = this.state;
      const newSortedRows = this.sortMarkets(this.state.foundMarkets, sortColumn, sortAscending);
      const newMissedCargo = Object.keys(this.props.need).filter(cargo => newSortedRows.some(m => cargo in m.supplies));

      nextState = {
        ...nextState ?? {},
        sortedRows: newSortedRows,
        missedCargo: newMissedCargo,
      };
    }

    if (prevProps.systemName !== this.props.systemName) {
      nextState = {
        ...nextState ?? {},
        refSystem: this.props.systemName,
      };
    }

    if (nextState) {
      this.setState(nextState as WhereToBuyState);
    }
  }

  doSearch = async () => {
    try {
      this.setState({ searching: true, hasSearched: true, refSystem: this.state.refSystem });

      // use distance: zero to indicate no limit
      const maxDistance = this.state.maxDistance < maxMaxDistance ? this.state.maxDistance : 0;
      const maxArrival = this.state.maxArrival < maxMaxArrival ? this.state.maxArrival : 0;

      // extract options parts + store
      const findMarketsOptions = {
        commodities: {},
        refSystem: this.state.refSystem,
        shipSize: this.state.shipSize,
        maxDistance: maxDistance,
        maxArrival: maxArrival,
        noFC: this.state.noFC,
        noSurface: this.state.noSurface,
        requireNeed: this.state.requireNeed,
        hasShipyard: this.state.hasShipyard,
      } as FindMarketsOptions;
      // only populate needed things
      for (const key in this.props.need) {
        if (this.props.need[key] > 0) {
          findMarketsOptions.commodities![key] = this.props.need[key];
        }
      }

      store.findMarketsOptions = findMarketsOptions;

      const foundMarkets = await api.project.findMarkets(findMarketsOptions);
      // associate the buildIds (even though we didn't use them for searching)
      foundMarkets.buildIds = this.props.buildIds;

      // store response for future reference
      store.foundMarkets = foundMarkets;

      const sortedRows = this.sortMarkets(foundMarkets, this.state.sortColumn, this.state.sortAscending);
      const missedCargo = Object.keys(this.props.need).filter(cargo => sortedRows.some(m => cargo in m.supplies));

      // auto expand the first row
      const expandMatches = new Set<string>();
      if (sortedRows.length > 0) { expandMatches.add(sortedRows[0].stationName); }

      this.setState({
        searching: false,
        showSearchCriteria: sortedRows.length === 0,
        foundMarkets: foundMarkets,
        sortedRows: sortedRows,
        missedCargo: missedCargo,
        expandMatches: expandMatches,
      });
    } catch (err: any) {
      console.error(`WhereToBuy: search failed: ${err.stack}`);
      this.setState({
        searching: false,
        showSearchCriteria: false,
      });
      this.props.onClose();
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
    const { refSystem, foundMarkets, sortedRows, largePanel, showSearchCriteria } = this.state;

    return <Panel
      isHiddenOnDismiss isFooterAtBottom
      isLightDismiss
      allowTouchBodyScroll={isMobile()}
      isOpen={this.props.visible}
      type={largePanel ? PanelType.large : PanelType.custom}
      customWidth='800px'
      onDismiss={() => this.props.onClose()}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        scrollableContent: { scrollbarGutter: 'stable' },
        footerInner: { padding: 1 }
      }}

      onRenderHeader={() => {
        return <div style={{ width: '90%', margin: '10px 40px' }}>
          <IconButton
            iconProps={{ iconName: largePanel ? 'DoubleChevronRight' : 'DoubleChevronLeft', style: { color: appTheme.palette.neutralDark, fontSize: 12 } }}
            style={{ position: 'absolute', left: 0, top: 0 }}
            onClick={() => this.setState({ largePanel: !largePanel })}
          />
          <h3 style={{ fontSize: 20 }}>
            Where to buy near: <span style={{ color: appTheme.palette.themePrimary }}>{refSystem}</span>
            &nbsp;
            <CopyButton text={this.props.systemName} fontSize={14} />
          </h3>
        </div>;
      }}

      onRenderFooterContent={() => {

        const preparedAt = new Date(foundMarkets?.preparedAt ?? 0);

        return <div>
          {!showSearchCriteria && !isMobile() && this.renderFilledBars()}

          <Stack horizontal horizontalAlign='space-between' style={{ margin: 6, fontSize: 10 }}>
            {!showSearchCriteria && <span>Found: {sortedRows.length} markets. Searched on: {preparedAt.toLocaleDateString()} {preparedAt.toLocaleTimeString()}</span>}
            <LinkSrvSurvey href='#about=markets' text='Help?' title='Learn more on the About page' />
          </Stack>
        </div>;
      }}
    >
      <div className='where-to-buy'>
        {showSearchCriteria && this.renderSearchCriteria()}
        {!showSearchCriteria && this.renderFoundMarkets()}
      </div>
    </Panel>;
  }

  renderFilledBars() {
    const { highlights } = this.state;

    /** The visible width of the bar matching a large ship */
    const wl = 720;
    const wr = 40;
    const large = store.cmdr?.largeMax ?? 1200;
    const r = wl / large;
    const med = store.cmdr?.medMax ?? 400;
    const xMedLine = r * med;
    const xMedTxt = xMedLine < 20 ? xMedLine : xMedLine - 20;

    let used = 0;
    const pills = Array.from(highlights).map(cargo => {
      const need = this.props.need[cargo] ?? 0;
      const leftPad = (large - used) * 0.3; // in case the pill is too wide, this keeps text visible
      used += need;
      let txt = need?.toLocaleString() ?? '?';
      if (need > 40) txt += ' ' + mapCommodityNames[cargo];

      return <div
        key={`fbp-${cargo}`}
        className={barPill}
        style={{
          width: r * need,
          fontSize: 9,
          overflow: 'hidden',
          alignContent: 'center',
          border: '1px solid ' + appTheme.palette.themePrimary,
          textAlign: used > large ? 'left' : 'unset',
          paddingLeft: used > large ? leftPad : 'unset',
        }}
        title={`${mapCommodityNames[cargo]}: ${need?.toLocaleString() ?? '?'}`}
      >{txt}</div>;
    });

    return <>
      <div style={{
        position: 'relative',
        marginLeft: 20,
        width: wl + wr,
        height: 40,
        paddingTop: 4,
        overflow: 'hidden',
        cursor: 'default',
        fontSize: 10,
        backgroundColor: appTheme.palette.white,
      }}>

        <div style={{ width: wl, height: 20, backgroundColor: appTheme.palette.neutralTertiaryAlt }} />
        <div style={{ position: 'absolute', bottom: 0, left: 4 }}>Ship capacity: {used?.toLocaleString() ?? '?'}</div>

        <div style={{
          position: 'absolute',
          left: xMedTxt,
          top: 0,
          bottom: 0,
          alignContent: 'end',
          paddingRight: 8,
          color: used > med ? appTheme.palette.yellow : undefined,
        }}        >
          <Stack horizontal><span>Medium: {med} </span><Icon iconName={used > med ? 'StatusCircleErrorX' : 'StatusCircleCheckmark'} style={{ lineHeight: '12px', fontSize: 18 }} /></Stack>
        </div>

        <div style={{
          position: 'absolute',
          borderRight: '4px solid ' + appTheme.palette.accent,
          left: xMedLine,
          top: 0,
          bottom: 14,
        }} />

        <div style={{
          position: 'absolute',
          right: wr - 20,
          top: 0,
          bottom: 0,
          alignContent: 'end',
          paddingRight: 4,
          fontWeight: used > large ? 'bold' : undefined,
          color: used > large ? appTheme.palette.yellow : undefined,
        }}
        >
          <Stack horizontal><span>Large: {large} </span><Icon iconName={used > large ? 'StatusCircleErrorX' : 'StatusCircleCheckmark'} style={{ lineHeight: '12px', fontSize: 18 }} /></Stack>
        </div>

        <div style={{
          position: 'absolute',
          borderRight: '4px solid ' + appTheme.palette.accent,
          right: wr,
          top: 0,
          bottom: 14,
        }} />

        <Stack horizontal style={{ position: 'absolute', top: 4, textAlign: 'center', }}>
          {pills}
        </Stack>

        <div style={{
          position: 'absolute',
          width: wr,
          right: 0,
          top: 0,
          bottom: 14,
          alignContent: 'end',
          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0), ${appTheme.palette.white})`,
          backgroundSize: '40px 40px',
        }} />

      </div >
    </>;
  }

  renderSearchCriteria() {
    const { foundMarkets, refSystem, shipSize, maxDistance, maxArrival, noSurface, noFC, hasShipyard, requireNeed, searching, hasSearched } = this.state;

    const maxDistanceTxt = !maxDistance || maxDistance >= maxMaxDistance ? 'Unlimited' : maxDistance.toString();
    const maxArrivalTxt = !maxArrival || maxArrival >= maxMaxArrival ? 'Unlimited' : maxArrival.toLocaleString();
    const noMarketsFound = !searching && hasSearched && foundMarkets?.markets.length === 0;
    // const hours = new Date().getUTCHours() + 2;

    return <div>
      <div style={{ marginBottom: 10 }}>Search for markets near this construction site that sell the commodities you need.</div>

      <Label>Search near:</Label>
      <FindSystemName
        noLabel
        text={refSystem}
        onMatch={value => this.setState({ refSystem: value ?? '' })}
      />

      <ComboBox
        label='Minimum ship size:'
        useComboBoxAsMenuWidth
        selectedKey={shipSize}
        style={{ marginBottom: 10 }}
        styles={{
          callout: { border: '1px solid ' + appTheme.palette.themePrimary, width: 300 },
        }}
        disabled={searching}
        options={[
          { key: 'large', text: 'Large', },
          { key: 'medium', text: 'Medium', },
          { key: 'small', text: 'Small', },
        ]}
        onChange={(_, o) => {
          this.setState({
            shipSize: o?.key.toString() ?? ''
          });
        }}
      />

      <Label>Maximum distance: (ly)</Label>
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
          min={0} max={maxMaxDistance}
          style={{ width: 102, marginLeft: 8 }}
          disabled={searching}
          onChange={(_, v) => this.setState({ maxDistance: parseIntLocale(v, true) })}
          onValidate={txt => validIncDecLocale(txt, 0, maxMaxDistance)}
          onIncrement={txt => validIncDecLocale(txt, +25, maxMaxDistance)}
          onDecrement={txt => validIncDecLocale(txt, -25, maxMaxDistance)}
        />
      </Stack>

      <Label>Maximum distance to arrival: (ls)</Label>
      <Stack horizontal>
        <Slider
          showValue={false}
          min={0} max={maxMaxArrival}
          step={5_000}
          value={maxArrival}
          disabled={searching}
          styles={{
            container: { width: 200, },
            line: { width: '100%', },
          }}
          onChange={v => this.setState({ maxArrival: v })}
        />
        <SpinButton
          value={maxArrivalTxt}
          min={0} max={maxMaxArrival}
          style={{ width: 102, marginLeft: 8 }}
          disabled={searching}
          onChange={(_, v) => this.setState({ maxArrival: parseIntLocale(v, true) })}
          onValidate={txt => validIncDecLocale(txt, 0, maxMaxArrival)}
          onIncrement={txt => validIncDecLocale(txt, +10_000, maxMaxArrival)}
          onDecrement={txt => validIncDecLocale(txt, -10_000, maxMaxArrival)}
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
        <Checkbox
          label='Has shipyard'
          checked={hasShipyard}
          disabled={searching}
          onChange={(_ev, checked) => this.setState({ hasShipyard: !!checked })}
        />
      </Stack>

      <div className='small' style={{ margin: '20px 0' }}>Data sourced from <Link href='https://spansh.co.uk' target='spansh'>spansh.co.uk</Link>, updated hourly.</div>

      {noMarketsFound && <MessageBar messageBarType={MessageBarType.blocked}>
        No markets found by these criteria
      </MessageBar>}

      <Stack horizontal horizontalAlign='end' verticalAlign='end' tokens={{ childrenGap: 20 }} style={{ marginTop: 20 }}>

        {searching && <Spinner hidden label='Searching' labelPosition='right' style={{ margin: 6 }} />}

        <PrimaryButton
          iconProps={{ iconName: 'Search' }}
          text="Search"
          disabled={searching || !refSystem}
          onClick={this.doSearch} style={{ height: 25 }}
        />

        <DefaultButton
          iconProps={{ iconName: 'Cancel' }}
          text="Cancel"
          style={{ height: 25 }}
          onClick={() => {
            if (!store.foundMarkets || noMarketsFound) {
              this.props.onClose();
            } else {
              this.setState({ showSearchCriteria: false });
            }
          }}
        />
      </Stack>
    </div>;
  }

  renderFoundMarkets() {
    const { sortedRows, expandMatches, expandHighlights, filterNoHighlights } = this.state;

    const allCollapsed = expandMatches.size === 0;

    return <div>
      <Stack horizontal style={{ marginTop: 2 }}>

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

        <div title='Toggle this on to auto-expand any stations containing highlighted commodities'>
          <Toggle
            onText='Expand highlights'
            offText='Expand highlights'
            checked={expandHighlights}
            onChange={() => this.setState({ expandHighlights: !expandHighlights })}
          />
        </div>

        <div title='Toggle this on to hide stations that have none of the highlighted commodities'>
          <Toggle
            onText='Only highlights'
            offText='Only highlights'
            checked={filterNoHighlights}
            onChange={() => this.setState({ filterNoHighlights: !filterNoHighlights })}
          />
        </div>

        <ActionButton
          iconProps={{ iconName: 'SearchAndApps' }}
          text='Change criteria'
          style={{ height: 22 }}
          onClick={() => this.setState({ showSearchCriteria: true })}
        />
      </Stack>

      {this.renderBubblesNeeded()}

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

  renderBubblesNeeded() {
    const { expandTopBubbles, highlights, highlightHover, missedCargo } = this.state;

    const bubbleNames = expandTopBubbles
      ? Object.keys(this.props.need).filter(k => this.props.need[k] > 0)
      : Array.from(this.state.highlights);

    const bubbles = bubbleNames.map(cargo => {
      const isHighlighted = highlights.has(cargo);
      const backColor = isHighlighted ? appTheme.palette.themeSecondary : appTheme.palette.neutralTertiaryAlt;
      let textColor = isHighlighted ? 'white' : appTheme.palette.black;

      let sourceMarkets = mapSourceEconomy[cargo].split(',').map(t => ' - ' + mapName[t]).join('\n');
      const countTxt = this.props.need[cargo].toLocaleString();
      let titleTxt = `Need ${countTxt} units, found in markets:\n${sourceMarkets}\n\n`
        + (isHighlighted ? `Click to remove highlight` : `Click to highlight`);

      if (!missedCargo.includes(cargo)) {
        titleTxt = `** Not available in any markets below **\n\n` + titleTxt;
        if (!isHighlighted) {
          textColor = 'grey'; //or appTheme.palette.themeLighterAlt; ?
        }
      }

      return <div
        key={`topBubble${cargo}`}
        className='bubble'
        title={titleTxt}
        style={{
          color: textColor,
          backgroundColor: backColor,
          border: `2px solid ${cargo === highlightHover ? appTheme.palette.black : backColor}`,
          userSelect: 'none',
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
        <CommodityIcon name={cargo} />&nbsp;{mapCommodityNames[cargo]}: {countTxt}
      </div>;
    });

    const highlightTitleTxt = 'Click commodities to highlight stations that can provide them';
    return <>
      <Stack
        horizontal wrap
        className={`highlight ${cn.bb}`}
        verticalAlign='start'
        style={{ padding: 4, marginBottom: 8 }}
      >
        <Stack horizontal verticalAlign='center' title={highlightTitleTxt}>
          <ActionButton
            iconProps={{ iconName: expandTopBubbles ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
            text={'Highlight:'}
            style={{ height: 22, paddingLeft: 0, }}
            onClick={() => this.setState({ expandTopBubbles: !expandTopBubbles })}
          />

          <CalloutMsg msg={highlightTitleTxt} directionalHint={DirectionalHint.bottomCenter} style={{ fontSize: 12 }} />
        </Stack>

        {bubbles}

        {!!highlights.size && <IconButton
          iconProps={{ iconName: 'Clear' }}
          title='Remove all highlights'
          style={{ width: 22, height: 22 }}
          onClick={() => {
            highlights.clear();
            this.setState({ highlights });
          }}
        />}
      </Stack>
    </>;
  }

  renderMarketSummary(market: MarketSummary, idx: number) {
    const { expandMatches, highlights, expandHighlights, filterNoHighlights } = this.state;

    if (filterNoHighlights && highlights.size > 0 && !Object.keys(market.supplies).some(cargo => highlights.has(cargo))) {
      return null;
    }

    const isHighlightMatch = !filterNoHighlights && Object.keys(market.supplies).some(n => highlights.has(n));
    const isExpanded = expandMatches.has(market.stationName) || (expandHighlights && isHighlightMatch);

    // fleet carriers need to use their ident, not display name
    const stationName = market.stationName.endsWith(')')
      ? market.stationName.substring(market.stationName.lastIndexOf('(')).slice(1, -1)
      : market.stationName;
    const inaraLink = `https://inara.cz/elite/station/?search=${stationName} [${market.systemName}]`;

    const subMatches = Object.entries(market.supplies).filter(([cargo]) => cargo in this.props.need && this.props.need[cargo] > 0);
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
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 2 }}>
          <Icon
            iconName={market.surface ? 'GlobeFavorite' : 'ProgressRingDots'}
            title={marketLocationTitle}
            style={{ fontSize: 12 }}
          />
          <EconomyBlock economy={market.economy.toLowerCase()} size='10px' ratio={market.economies} />
          <PadSize size={market.padSize} />
        </Stack>
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
    let titleTxt = isHighlighted ? `Remove ${mapCommodityNames[cargo]} from highlights` : `Click to highlight: ${mapCommodityNames[cargo]}`

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
        userSelect: 'none',
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

const barPill = mergeStyles({
  borderRadius: 5,
  height: '18px!important',
  padding: 0,
  fontSize: 12,
  backgroundColor: appTheme.palette.themeTertiary,
  whiteSpace: 'nowrap',
});
