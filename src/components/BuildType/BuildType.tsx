import './BuildType.css';
import { ActionButton, ContextualMenu, ContextualMenuItemType, Icon, IconButton, IContextualMenuItem, INavLink, INavLinkGroup, Link, Nav, Panel, PanelType, Pivot, PivotItem, registerIcons, Stack } from "@fluentui/react";
import { Component } from "react";
import { getBuildTypeDisplayName, getSiteType, isOrbital, mapName, SiteType, siteTypes, sysEffects, SysEffects } from "../../site-data";
import { appTheme, cn } from "../../theme";
import { asPosNegTxt, delayFocus, isMobile } from "../../util";
import { Chevrons, TierPoints } from "../Chevrons";
import { EconomyBlock } from '../EconomyBlock';
import { FilterDescendingIcon } from '@fluentui/react-icons-mdl2';
import { CalloutMsg } from '../CalloutMsg';
import { PadSize } from '../PadSize';
import { hasPreReq, SysMap } from '../../system-model';
import { store } from '../../local-storage';

registerIcons({
  icons: {
    FilterDescending: <FilterDescendingIcon />,
  },
});

interface ChooseBuildTypeProps {
  buildType: string | undefined,
  onChange: (value: string) => void
  sysMap?: SysMap;
}

interface ChooseBuildTypeState {
  showList: boolean;
  panelType: PanelType;
  orbital: boolean;
  selection: string | undefined;
  groups: INavLinkGroup[];
  filterColumns: Set<string>;
  headerContextKey?: string;
  headerContextOptions: string[]
}

export class BuildType extends Component<ChooseBuildTypeProps, ChooseBuildTypeState> {

  constructor(props: ChooseBuildTypeProps) {
    super(props);

    const orbital = isOrbital(props.buildType);

    this.state = {
      showList: false,
      panelType: store.buildTypeGrid ? PanelType.large : PanelType.smallFixedFar,
      orbital: orbital,
      selection: props.buildType,
      groups: this.getFilteredOptions2(props.buildType, orbital),
      filterColumns: new Set<string>(),
      headerContextOptions: [],
    };
  }

  componentDidMount(): void {
    if (this.state.selection && this.state.panelType === PanelType.large) {
      delayFocus(`st-${this.state.selection}`);
    }
  }

  componentDidUpdate(prevProps: Readonly<ChooseBuildTypeProps>, prevState: Readonly<ChooseBuildTypeState>, snapshot?: any): void {

    if (prevProps.buildType !== this.props.buildType) {
      const orbital = isOrbital(this.props.buildType);
      this.setState({
        selection: this.props.buildType,
        orbital: orbital,
        groups: this.getFilteredOptions2(this.props.buildType, orbital),
      });
    }
  }

  getFilteredOptions2(selection: string | undefined, orbital: boolean): INavLinkGroup[] {
    const targetTier = selection ? getSiteType(selection).tier : 0;

    let groups: INavLinkGroup[] = [
      {
        name: "Tier 1",
        collapseByDefault: targetTier !== 1,
        links: this.getFilteredGroupOptions(1, orbital, selection),
      },
      {
        name: "Tier 2",
        collapseByDefault: targetTier !== 2,
        links: this.getFilteredGroupOptions(2, orbital, selection),
      },
      {
        name: "Tier 3",
        collapseByDefault: targetTier !== 3,
        links: this.getFilteredGroupOptions(3, orbital, selection),
      },
    ];

    return groups;
  }

  getFilteredGroupOptions(tier: number, orbital: boolean, selection: string | undefined) {

    const map = siteTypes
      .filter(s => s.tier === tier && s.orbital === orbital && s.buildClass !== 'unknown')
      .reduce((map, s) => {
        if (!map[s.buildClass]) { map[s.buildClass] = []; }
        map[s.buildClass].push(s);

        return map;
      }, {} as Record<string, SiteType[]>);

    let links = Object.entries(map).map(([k, sites]) => {
      const top = { key: k, name: mapName[k] ?? k, url: '', links: [], } as INavLink;

      top.links = sites.map(s => {
        const middle = { key: k + s.buildClass + s.displayName, name: `${s.displayName}`, url: '', links: [], } as INavLink;

        if (s.subTypes.length === 1) {
          middle.key = s.subTypes[0];
          // collapsing for single groups, eg: "Outpost: vulcan"
          if (!middle.name.toLowerCase().startsWith(s.subTypes[0])) {
            const txt = s.subTypes[0].replace('_i', '').replace('_e', '');
            middle.key = s.subTypes[0];
            middle.name += `: ${txt}`;
            if (selection && selection === s.subTypes[0]) {
              top.isExpanded = true;
            }
          }
        } else {
          middle.links = s.subTypes.map(t => {
            const txt = t.replace('_i', '').replace('_e', '').replace('_', ' ');
            return { key: t, name: txt, url: '', links: [], } as INavLink;
          });
          if (selection && s.subTypes.includes(selection)) {
            top.isExpanded = true;
            middle.isExpanded = true;
          }
        }

        return middle;
      });

      return top;
    });

    if (links.length === 1) {
      links[0].links!.forEach(l => {
        if (!l.name.toLowerCase().startsWith(links[0].name.toLowerCase()))
          l.name = `${links[0].name}: ${l.name}`;
      });
      links = links[0].links!;
    }


    return links;
  }

  render() {
    const { showList, selection, panelType } = this.state;

    const displayText = getBuildTypeDisplayName(selection);
    const isLarge = panelType === PanelType.large;

    return <div style={{ display: 'inline-block' }}>
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
        <div className="hint">{displayText}</div>

        <ActionButton
          iconProps={{ iconName: "Manufacturing" }}
          style={{ height: 22 }}
          onClick={() => {
            this.setState({ showList: true });
            if (this.state.selection && isLarge) { delayFocus(`st-${this.state.selection}`); }
          }}
        >
          Change
        </ActionButton>
      </Stack>

      {showList && <Panel
        isOpen={true}
        allowTouchBodyScroll={isMobile()}
        type={panelType}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => this.setState({ showList: false })}
        onKeyDown={(ev) => {
          if (ev.key === 'Escape') { this.setState({ showList: false }); }
        }}

        onRenderHeader={() => {
          return <div style={{ width: '90%', margin: '10px 40px' }}>
            <IconButton
              iconProps={{
                iconName: isLarge ? 'DoubleChevronRight' : 'DoubleChevronLeft',
                style: {
                  color: appTheme.palette.white, // .neutralDark, TODO: make it visible again
                  fontSize: 12
                }
              }}
              style={{ position: 'absolute', left: 0, top: 0 }}
              onClick={() => {
                store.buildTypeGrid = !isLarge;
                this.setState({ panelType: isLarge ? PanelType.smallFixedFar : PanelType.large });
                if (this.state.selection && !isLarge) { delayFocus(`st-${this.state.selection}`); }
              }}
            />
            <h3 style={{ fontSize: 20 }}>
              Choose a type:
              &nbsp;
              {isLarge && <span className='small' style={{ fontWeight: 'normal' }}>
                Work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
              </span>}
            </h3>
          </div>;
        }}
      >
        {!isLarge && this.renderNarrow()}
        {isLarge && this.renderLarge()}

      </Panel>}

    </div>;
  }

  renderNarrow() {
    const { selection, orbital, groups } = this.state;

    return <>
      <Pivot
        selectedKey={orbital ? 'orbital' : 'surface'}
        onLinkClick={(item) => {
          const orbital = item?.props.itemKey !== 'surface';
          this.setState({
            orbital: orbital,
            groups: this.getFilteredOptions2(selection, orbital)
          });
        }}
      >
        <PivotItem headerText="Orbital" itemKey='orbital' />
        <PivotItem headerText="Surface" itemKey='surface' />
      </Pivot>

      <Nav
        initialSelectedKey={selection}
        selectedKey={selection}
        styles={{ link: { textTransform: 'capitalize' } }}
        onLinkClick={(ev, item) => {
          if (!item) return;
          if (item.links?.length === 0) {
            const newSelection = item.key!;
            this.props.onChange(newSelection);
            this.setState({ showList: false });
          }
        }}
        groups={groups}
      />
    </>;
  }

  renderFilterText() {
    const { filterColumns } = this.state;

    let parts: string[] = [];

    if (filterColumns.has('env')) {
      if (filterColumns.has('orbital')) {
        parts.push(`Orbital`)
      } else if (filterColumns.has('planetary')) {
        parts.push(`Planetary`)
      }
    }

    if (filterColumns.has('tier')) {
      if (filterColumns.has('tier1')) {
        parts.push(`Tier 1`)
      } else if (filterColumns.has('tier2')) {
        parts.push(`Tier 2`)
      } else if (filterColumns.has('tier3')) {
        parts.push(`Tier 3`)
      }
    }

    if (filterColumns.has('needs')) {
      if (filterColumns.has('needT2')) {
        parts.push(`Needs T2 Points`)
      } else if (filterColumns.has('needT3')) {
        parts.push(`Needs T3 Points`)
      }
    }

    if (filterColumns.has('gives')) {
      if (filterColumns.has('giveT2')) {
        parts.push(`Gives T2 Points`)
      } else if (filterColumns.has('giveT3')) {
        parts.push(`Gives T3 Points`)
      }
    }

    if (filterColumns.has('inf')) {
      var txt = infEconomies
        .filter(inf => filterColumns.has(inf))
        .map(inf => mapName[inf])
        .join('/');
      parts.push(`Economy: ${txt}`);
    }

    for (const key of sysEffects) {
      if (filterColumns.has(key)) {
        parts.push(mapName[key]);
      }
    }

    if (parts.length === 0) { parts.push('None'); }

    return <div style={{
      padding: 8,
      color: appTheme.palette.yellowDark
    }}>
      Filter: {parts.join(', ')}
    </div>;
  }

  renderLarge() {
    const { headerContextKey, headerContextOptions, filterColumns } = this.state;

    const sorted = this.sortFilterLarge();

    const rows: JSX.Element[] = [];
    let flip = false;
    for (const t of sorted) {
      flip = !flip;
      rows.push(this.renderLargeRow(t, flip));
    }

    const menuItems: IContextualMenuItem[] = [
      ...headerContextOptions.map(t => ({
        key: `tbh-${headerContextKey}-${t}`,
        text: mapName[t],
        canCheck: true,
        checked: filterColumns.has(t),
        onClick: () => {
          if (!this.state.headerContextKey) return;

          if (filterColumns.has(t)) {
            // remove both entries
            filterColumns.delete(t);
            //filterColumns.delete(this.state.headerContextKey!);
            if (!headerContextOptions.some(o => filterColumns.has(o))) {
              filterColumns.delete(this.state.headerContextKey);
            }

          } else {
            // remove any other option and add choosen one
            // headerContextOptions.forEach(o => filterColumns.delete(o));
            filterColumns.add(t);
            filterColumns.add(this.state.headerContextKey);
          }
          this.setState({ filterColumns });
        },
      } as IContextualMenuItem)),
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider, },
      {
        key: 'toggle-ready',
        checked: false,
        text: 'Clear all',
        onClick: () => {
          if (this.state.headerContextKey) {
            filterColumns.delete(this.state.headerContextKey);
            headerContextOptions.forEach(o => filterColumns.delete(o));
          }
        },
      }
    ];

    return <div className='build-type'>
      {headerContextKey && <ContextualMenu
        target={`#bth-${headerContextKey}`}

        onDismiss={() => this.setState({ headerContextKey: undefined })}
        items={menuItems}
        styles={{
          container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
        }}
      />}

      {this.renderFilterText()}

      <table cellPadding={0} cellSpacing={0}>
        <colgroup>
          <col width='300px' />
          <col width='15px' />
          {/* <col width='66px' /> */}
          {this.props.sysMap && <col width='44px' />}
          <col width='44px' />
          <col width='44px' />
          <col width='80px' />
          <col width='80px' />
          <col width='80px' />
          <col width='80px' />
          <col width='110px' />
          <col width='75px' />
          <col width='75px' />
          <col width='80px' />
          <col width='75px' />
          <col width='75px' />
          <col width='75px' />
          <col width='75px' />
        </colgroup>

        <thead>
          <tr style={{ backgroundColor: appTheme.palette.white, position: 'sticky', zIndex: 1, top: 64 }}>
            {this.renderLargeColumnHeader('buildType', `${cn.bb}`)}
            <th className={`${cn.bb} ${cn.br}`}></th>
            {/* {this.renderLargeColumnHeader('layouts', `${cn.bb} ${cn.br}`)} */}
            {this.props.sysMap && this.renderLargeColumnHeader('valid', `cc ${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('haul', `cc ${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('pad', `cc ${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('env', `cc ${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('tier', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('needs', `${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('gives', `${cn.bb} ${cn.br}`)}

            {this.renderLargeColumnHeader('inf', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('pop', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('mpop', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('sec', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('wealth', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('tech', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('sol', `${cn.bb} ${cn.br} btn`)}
            {this.renderLargeColumnHeader('dev', `${cn.bb} btn`)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr>
            <td colSpan={14} className='cc' style={{ padding: 20, color: 'grey' }}>
              No types meet current filters.
            </td>
          </tr>}

          {rows}
        </tbody>
      </table>
    </div>;
  }

  sortFilterLarge() {
    const { filterColumns } = this.state;

    const sorted = siteTypes
      .slice(1) // remove the initial "Unknown" entry
      .filter(t => {
        // filter any of the effects
        for (const key in t.effects) {
          if (filterColumns.has(key) && (t.effects[key as keyof SysEffects] ?? 0) <= 0) {
            return false;
          }
        }
        if (filterColumns.has('tier') && !filterColumns.has(`tier${t.tier}`)) { return false; }
        if (filterColumns.has('env') && !filterColumns.has(t.orbital ? 'orbital' : 'planetary')) { return false; }
        if (filterColumns.has('needs') && !filterColumns.has(`needT${t.needs.tier}`)) { return false; }
        if (filterColumns.has('gives') && !filterColumns.has(`giveT${t.gives.tier}`)) { return false; }

        if (filterColumns.has('inf') && !filterColumns.has(t.inf)) { return false; }

        return true;
      });
    return sorted;
  }

  renderLargeColumnHeader(name: string, className: string) {
    const { filterColumns } = this.state;

    const isFilter = filterColumns.has(name);

    return <th
      className={className}
      style={{
        color: isFilter ? appTheme.palette.yellowDark : undefined
      }}
      onClick={() => {
        if (!className.includes('btn')) return;
        if (this.state.headerContextKey) {
          this.setState({ headerContextKey: undefined });
          return;
        }


        if (name in mapCyclicFilters) {
          if (!filterColumns.has(name)) {
            filterColumns.add(name);
            filterColumns.add(mapCyclicFilters[name][0]);
          } else {
            mapCyclicFilters[name].every((cf, i) => {
              if (filterColumns.has(cf)) {
                filterColumns.delete(cf);
                const next = mapCyclicFilters[name][i + 1];
                if (next) {
                  filterColumns.add(next);
                  return false;
                } else {
                  filterColumns.delete(name);
                }
              }
              return true;
            });
          }
        }

        else if (name === 'inf') {
          this.setState({
            headerContextKey: 'inf',
            headerContextOptions: infEconomies,
          });
        }

        else if (isFilter) {
          filterColumns.delete(name);
        } else {
          filterColumns.add(name);
        }
        this.setState({ filterColumns });
      }}
    >
      <span id={`bth-${name}`} style={{ marginRight: isFilter ? 2 : 16 }} title={mapColumnTitle[name]}>{mapColumnNames[name]}</span>
      {isFilter && <Icon iconName='Filter' />}
    </th>;
  }

  renderLargeRow(type: SiteType, flip: boolean) {
    const { selection } = this.state;

    // const greyDash = <span style={{ color: 'grey' }}>-</span>;
    const cid = `lr-${type.subTypes[0]}`;
    const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));
    return <tr
      className={`${cn.trhi}`}
      key={`btr${type.subTypes}1`}
      style={{ backgroundColor: flip ? appTheme.palette.neutralLighter : undefined }}
    >

      <td
        className={`cl`}
        style={{
          borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
          fontWeight: isCurrentSelection ? 'bold' : undefined,
        }}
      >
        {/* <DefaultButton id={cid} text={type.displayName2} /> */}
        <div id={cid}>{type.displayName2}:</div>
        {/* <Link
            id={cid}
          // onClick={() => {            this.props.onChange(type)          }}
          >
            {type.displayName2}
          </Link> */}

        <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
          {type.subTypes.map(st => (<ActionButton
            id={`st-${st}`}
            style={{
              color: selection === st ? appTheme.palette.black : undefined,
              backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
              // fontWeight: selection === st ? 'bold' : undefined,
              fontSize: 12,
              height: 16,
              padding: '0 0 2px 0',
              margin: 1,
              border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

            }}
            onClick={() => {
              this.props.onChange(st);
              this.setState({ showList: false });
            }}
          >
            {st.replace('_i', '').replace('_e', '')}
          </ActionButton>))}
        </Stack>
      </td>

      <td className={`${cn.br}`}>
        {type.preReq && <CalloutMsg id={cid} msg={'Requires ' + mapName[type.preReq]} />}
        {!type.preReq && <div style={{ width: 15 }} />}
      </td>

      {/* <td className={`${cn.br}`}>
          <span className='small tc'>
            <Stack horizontal wrap tokens={{ childrenGap: 2 }}>
              {/* {type.subTypes.map(st => (<div style={{ border: '1px solid grey', padding: 2 }}>
                {st.replace('_i', '').replace('_e', '')}
                &nbsp;
                <Icon iconName='Photo2' />
              </div>))} * /}
              {type.subTypes.map(st => (<ActionButton
                // iconProps={{ iconName: 'Photo2', style: { fontSize: 12 } }}
                style={{ height: 16, fontSize: 12, padding: 0, margin: 0 }}
              >
                {st.replace('_i', '').replace('_e', '')}
              </ActionButton>))}
            </Stack>
          </span>
        </td> */}

      {this.props.sysMap && <td className={`${cn.br}`}>{this.renderValid(type)}</td>}

      <td className={`${cn.br}`}>{this.renderHaulSize(type.haul)}</td>

      <td className={`${cn.br}`}><PadSize size={type.padSize} /> </td>

      <td className={`${cn.br}`}>
        <Icon iconName={type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
      </td>

      <td className={`${cn.br}`}>
        {type.tier}
      </td>

      <td className={`${cn.br}`}><TierPoints tier={type.needs.tier} count={type.needs.count} /></td>
      <td className={`${cn.br}`}><TierPoints tier={type.gives.tier} count={type.gives.count} /></td>

      <td className={`cl ${cn.br}`}>
        {type.inf !== 'none' && <Stack horizontal verticalAlign='center'>
          <EconomyBlock economy={type.inf} size='10px' />
          &nbsp;
          {mapName[type.inf]}
        </Stack>}
      </td>

      <td className={`${cn.br}`}><Chevrons name='pop' count={type.effects.pop} title={`Population: ${asPosNegTxt(type.effects.pop!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='mpop' count={type.effects.mpop} title={`Max Population: ${asPosNegTxt(type.effects.mpop!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='sec' count={type.effects.sec} title={`Security: ${asPosNegTxt(type.effects.sec!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='wealth' count={type.effects.wealth} title={`Wealth: ${asPosNegTxt(type.effects.wealth!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='tech' count={type.effects.tech} title={`Tech level: ${asPosNegTxt(type.effects.tech!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='sol' count={type.effects.sol} title={`Standard of Living: ${asPosNegTxt(type.effects.sol!)}`} /></td>
      <td style={{ borderRight: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined }}><Chevrons name='dev' count={type.effects.dev} title={`Development level: ${asPosNegTxt(type.effects.dev!)}`} /></td>
    </tr>;
  }

  renderValid(type: SiteType) {
    if (!this.props.sysMap) return null;

    // assume we can build it
    let isValid = true;

    // unless we don't have enough tier points?
    if (type.needs.tier === 2 && this.props.sysMap.tierPoints.tier2 < type.needs.count) {
      isValid = false;
      // iconName = 'StatusCircleErrorX'
    }
    if (type.needs.tier === 3 && this.props.sysMap.tierPoints.tier3 < type.needs.count) {
      isValid = false;
      // iconName = 'Remove'
      // return null;
    }

    if (type.preReq) {
      isValid = hasPreReq(this.props.sysMap, type);
    }

    return isValid
      ? <Icon iconName='SkypeCheck' />
      : <Icon iconName='StatusCircleErrorX' style={{ color: 'red' }} />;
    // : <span style={{ color: 'grey' }}>-</span>;
  }


  renderHaulSize(haul: number) {

    const dark = appTheme.isInverted
      ? 'rgb(48, 48, 48)'
      : 'rgb(200, 200, 200)';

    return <div
      title={haul.toLocaleString()}
      style={{
        // display: 'inline',
        position: 'relative',
        width: 30,
        height: 25,
        overflow: 'hidden',
        marginLeft: 8,
        marginBottom: 2,
      }}
    >
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: 4, height: 4, backgroundColor: 'lime', }} />
      <div style={{ position: 'absolute', left: 5, bottom: 0, width: 4, height: 8, backgroundColor: haul > 4_000 ? 'lightgreen' : dark, }} />
      <div style={{ position: 'absolute', left: 10, bottom: 0, width: 4, height: 12, backgroundColor: haul > 8_000 ? 'yellow' : dark }} />
      <div style={{ position: 'absolute', left: 15, bottom: 0, width: 4, height: 16, backgroundColor: haul > 20_000 ? 'orange' : dark }} />
      <div style={{ position: 'absolute', left: 20, bottom: 0, width: 4, height: 20, backgroundColor: haul > 50_000 ? 'red' : dark }} />
      <div style={{ position: 'absolute', left: 25, bottom: 0, width: 4, height: 24, backgroundColor: haul > 200_000 ? 'darkred' : dark }} />
    </div>
      ;
  }
}


const mapColumnNames: Record<string, string> = {
  buildType: 'Type',
  layouts: 'Layouts',
  valid: 'Valid',
  haul: 'Haul',
  pad: 'Pad',
  env: 'Location',
  tier: 'Tier',
  needs: 'Needs',
  gives: 'Gives',
  inf: 'Economy Inf',
  pop: 'Pop',
  mpop: 'MPop',
  sec: 'Security',
  wealth: 'Wealth',
  tech: 'Tech',
  sol: 'SoL',
  dev: 'Dev',
}

const mapColumnTitle: Record<string, string> = {
  buildType: `The overal type of a project. You must choose one of the sub-types`,
  valid: `If the system has enough tier points and all pre-req's are build`,
  haul: `Approximately how much cargo needs to be delivered
Grouped by:
    < ${(4_000).toLocaleString()} : Lime
    < ${(8_000).toLocaleString()} : Green
  < ${(20_000).toLocaleString()} : Yellow
  < ${(50_000).toLocaleString()} : Orange
< ${(200_000).toLocaleString()} : Red
> ${(200_000).toLocaleString()} : Dark red
 `,
  pad: `The largest landing pad once build`,
  env: `The location: orbital or planetary.
Click to filter:
  - Orbital
  - Planetary
  - None`,
  tier: `Click to filter:
  - Tier 1
  - Tier 2
  - Tier 3
  - None`,
  needs: `How many tier points are needed to build this project.
Use Tier to filter.`,
  gives: `How many tier points are given by this project once complete.
Use Tier to filter.`,
  inf: `The economic influence this project has. Click to filter`,
  pop: `Changes to system population once complete. Click to filter`,
  mpop: `Changes to system max population once complete. Click to filter`,
  sec: `Changes to system security once complete.
Click to filter positive impacts.`,
  wealth: `Changes to system wealth once complete. Click to filter`,
  tech: `Changes to system tech level once complete. Click to filter`,
  sol: `Changes to system standard of living once complete.
Click to filter positive impacts.`,
  dev: `Changes to system development level once complete. Click to filter`,
}


const mapCyclicFilters: Record<string, string[]> = {
  'tier': ['tier1', 'tier2', 'tier3'],
  'env': ['orbital', 'planetary'],
  'needs': ['needT2', 'needT3'],
  'gives': ['giveT2', 'giveT3'],
};

const infEconomies = [
  'agriculture',
  'colony',
  'extraction',
  'hightech',
  'industrial',
  'military',
  'refinery',
  'service',
  'tourism',
];