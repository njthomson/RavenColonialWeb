import { ActionButton, INavLink, INavLinkGroup, Nav, Panel, Pivot, PivotItem, Stack } from "@fluentui/react";
import { Component } from "react";
import { getBuildTypeDisplayName, getSiteType, isOrbital, mapName, SiteType, siteTypes } from "../site-data";
import { appTheme } from "../theme";
import { isMobile } from "../util";

interface ChooseBuildTypeProps {
  buildType: string | undefined,
  onChange: (value: string) => void
}

interface ChooseBuildTypeState {
  showList: boolean;
  orbital: boolean;
  selection: string | undefined;
  groups: INavLinkGroup[];
}

export class BuildType extends Component<ChooseBuildTypeProps, ChooseBuildTypeState> {

  constructor(props: ChooseBuildTypeProps) {
    super(props);

    const orbital = isOrbital(props.buildType);

    this.state = {
      showList: false,
      orbital: orbital,
      selection: props.buildType,
      groups: this.getFilteredOptions2(props.buildType, orbital),
    };
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
    const { showList, selection, orbital, groups } = this.state;

    const displayText = getBuildTypeDisplayName(selection);

    return <div style={{ display: 'inline-block' }}>
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
        <div className="hint">{displayText}</div>

        <ActionButton
          iconProps={{ iconName: "Manufacturing" }}
          style={{ height: 22 }}
          onClick={() => this.setState({ showList: !showList })}
        >
          Change
        </ActionButton>
      </Stack>

      {showList && <Panel
        isOpen={true}
        allowTouchBodyScroll={isMobile()}
        styles={{
          main: { maxWidth: 400 },
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => this.setState({ showList: false })}
        onKeyDown={(ev) => {
          if (ev.key === 'Escape') { this.setState({ showList: false }); }
        }}
      >
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
      </Panel>}

    </div>;
  }
}
