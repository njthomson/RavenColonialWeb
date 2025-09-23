import './BuildType.css';
import { ActionButton, IconButton, INavLink, INavLinkGroup, Nav, Panel, PanelType, Pivot, PivotItem, Stack } from "@fluentui/react";
import { Component } from "react";
import { getBuildTypeDisplayName, getSiteType, isOrbital, mapName, SiteType, siteTypes } from "../../site-data";
import { appTheme } from "../../theme";
import { delayFocus, isMobile } from "../../util";
import { SysMap } from '../../system-model';
import { store } from '../../local-storage';
import { ShowCoachingMarks } from '../ShowCoachingMarks';
import { BigSiteTable } from '../BigSiteTable/BigSiteTable';
import { SysMap2 } from '../../system-model2';

interface ChooseBuildTypeProps {
  buildType: string | undefined,
  onChange: (value: string) => void
  sysMap?: SysMap;
  sysMap2?: SysMap2;
  tableOnly?: boolean;
}

interface ChooseBuildTypeState {
  showList: boolean;
  panelType: PanelType;
  location: string;
  selection: string | undefined;
  groups: INavLinkGroup[];
}

export class BuildType extends Component<ChooseBuildTypeProps, ChooseBuildTypeState> {

  constructor(props: ChooseBuildTypeProps) {
    super(props);

    const orbital = isOrbital(props.buildType);

    this.state = {
      showList: props.tableOnly ?? false,
      panelType: store.buildTypeGrid || props.tableOnly ? PanelType.large : PanelType.smallFixedFar,
      location: orbital ? 'orbital' : 'surface',
      selection: props.buildType,
      groups: this.getFilteredOptions2(props.buildType, orbital ? 'orbital' : 'surface'),
    };
  }

  componentDidMount(): void {
    if (this.state.selection && this.state.panelType === PanelType.large) {
      delayFocus(`st-${this.state.selection}`);
    }
  }

  componentDidUpdate(prevProps: Readonly<ChooseBuildTypeProps>, prevState: Readonly<ChooseBuildTypeState>, snapshot?: any): void {

    if (prevProps.buildType !== this.props.buildType) {
      const location = isOrbital(this.props.buildType) ? 'orbital' : 'surface';
      this.setState({
        selection: this.props.buildType,
        location: location,
        groups: this.getFilteredOptions2(this.props.buildType, location),
      });
    }
  }

  getFilteredOptions2(selection: string | undefined, location: string | undefined): INavLinkGroup[] {
    const targetTier = selection ? getSiteType(selection)?.tier : 0;

    const orbital = location === 'orbital';

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
      {!this.props.tableOnly && <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
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
      </Stack>}

      {showList && <Panel
        isOpen={true}
        allowTouchBodyScroll={isMobile()}
        type={panelType}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => {
          this.setState({ showList: false });
        }}
        onKeyDown={(ev) => {
          if (ev.key === 'Escape') { this.setState({ showList: false }); }
        }}

        onRenderHeader={() => {
          return <div style={{ width: '90%', margin: '10px 40px' }}>
            {!this.props.tableOnly && <IconButton
              id='go-large'
              iconProps={{
                iconName: isLarge ? 'DoubleChevronRight' : 'DoubleChevronLeft',
                style: {
                  color: appTheme.palette.neutralDark,
                  fontSize: 12
                }
              }}
              style={{ position: 'absolute', left: 0, top: 0 }}
              onClick={() => {
                store.buildTypeGrid = !isLarge;
                this.setState({ panelType: isLarge ? PanelType.smallFixedFar : PanelType.large });
                if (this.state.selection && !isLarge) { delayFocus(`st-${this.state.selection}`); }
              }}
            />}
            <h3 style={{ fontSize: 20 }}>
              <Stack horizontal verticalAlign='center'>
                <div>Choose a type:</div>
                <IconButton
                  title='View table in a separate tab'
                  href='/table'
                  target='table'
                  iconProps={{ iconName: 'OpenInNewWindow', style: { cursor: 'pointer' } }}
                  style={{
                    marginLeft: 10,
                    marginTop: 4,
                    width: 16, height: 16,
                  }}
                />
              </Stack>
            </h3>
            <ShowCoachingMarks target='#go-large' id='largeBuildType' />
          </div>;
        }}
      >
        {!isLarge && this.renderNarrow()}
        {isLarge && <>
          <BigSiteTable
            buildType={this.props.buildType}
            sysMap={this.props.sysMap}
            sysMap2={this.props.sysMap2}
            onChange={newValue => {
              this.props.onChange(newValue);
              this.setState({ showList: false });
            }}
            stickyTop={isMobile() ? 0 : 64}
            allowPartial={this.props.tableOnly}
          />
        </>}

      </Panel>}

    </div>;
  }

  renderNarrow() {
    const { selection, location, groups } = this.state;

    return <div className='build-type'>
      <Pivot
        selectedKey={location}
        style={{
          position: 'sticky',
          zIndex: 1,
          top: 69,
          backgroundColor: appTheme.palette.white,
        }}
        onLinkClick={(item) => {
          this.setState({
            location: item?.props.itemKey ?? 'orbital',
            groups: this.getFilteredOptions2(selection, item?.props.itemKey)
          });
        }}
      >
        <PivotItem headerText="Orbital" itemKey='orbital' />
        <PivotItem headerText="Surface" itemKey='surface' />
        <PivotItem headerText="Both" itemKey='both' />
      </Pivot>

      {false && location !== 'both' && <Nav
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
      />}

      {this.renderBoth()}
      {/* {location === 'both' && this.renderBoth()} */}
    </div>;
  }

  renderBoth() {
    const { location, selection } = this.state;

    const rows = siteTypes
      .filter(t => t.tier > 0) // remove unknown types
      .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'))
      .map((type, idx) => {
        const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection) || selection === type.subTypes[0] + '?');

        return <div
          className='type-row'
          key={`bbt-${type.displayName2}`}
          style={{
            backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
            borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
            fontWeight: isCurrentSelection ? 'bold' : undefined,
            paddingLeft: isCurrentSelection ? 4 : undefined,
          }}
        >
          <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
          <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>

          <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
            {type.subTypes.map((st, i) => {
              const isSelected = selection === st
                || (i === 0 && type.altTypes?.includes(selection!));

              return <ActionButton
                key={`st-${st}`}
                id={`st-${st}`}
                style={{
                  color: isSelected ? appTheme.palette.black : undefined,
                  backgroundColor: isSelected ? appTheme.palette.neutralLighter : undefined,
                  // fontWeight: selection === st ? 'bold' : undefined,
                  fontSize: 12,
                  height: 16,
                  padding: '0 0 2px 0',
                  margin: 1,
                  border: `1px solid ${isSelected ? appTheme.palette.themePrimary : 'grey'}`,
                }}
                onClick={() => {
                  this.props.onChange(st);
                  this.setState({ showList: false });
                }}
              >
                {st.replace('_i', '').replace('_e', '')}
              </ActionButton>;
            })}
          </Stack>
        </div>;
      })
    return <div className='both'>
      {rows}
    </div>;
  }
}
