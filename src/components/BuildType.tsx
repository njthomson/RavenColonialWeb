import { ActionButton, INavLink, INavLinkGroup, Nav, Panel, Pivot, PivotItem, Stack } from "@fluentui/react";
import { Component } from "react";

type Environ = 'orbital' | 'surface';

interface ChooseBuildTypeProps {
  buildType: string,
  onChange: (value: string) => void
}

interface ChooseBuildTypeState {
  showList: boolean;
  environ: Environ;
  selection: string;
  groups: INavLinkGroup[];
}

export class BuildType extends Component<ChooseBuildTypeProps, ChooseBuildTypeState> {

  constructor(props: ChooseBuildTypeProps) {
    super(props);

    const environ = this.getEnviron(props.buildType);

    this.state = {
      showList: false,
      environ: environ,
      selection: props.buildType,
      groups: this.getFilteredOptions(props.buildType, environ),
    };
  }

  componentDidUpdate(prevProps: Readonly<ChooseBuildTypeProps>, prevState: Readonly<ChooseBuildTypeState>, snapshot?: any): void {

    if (prevProps.buildType !== this.props.buildType) {
      const environ = this.getEnviron(this.props.buildType);
      this.setState({
        selection: this.props.buildType,
        environ: environ,
        groups: this.getFilteredOptions(this.props.buildType, environ),
      });
    }
  }

  findLine(selection: string): string {
    for (let tiers of Object.values(buildTypeMap)) {
      for (let tier of tiers) {
        for (let line of tier) {
          let [, , types] = line.toLowerCase().split('/');
          if (types.split(',').includes(selection)) {
            return line;
          }
        }
      }
    }

    return '';
  }

  getEnviron(selection: string) {
    for (let tier of buildTypeMap.orbital) {
      for (let line of tier) {
        let [, , types] = line.toLowerCase().split('/');
        if (types.includes(selection)) {
          return 'orbital';
        }
      }
    }

    return 'surface';
  }

  getFilteredOptions(selection: string, environ: keyof (typeof buildTypeMap)): INavLinkGroup[] {

    let groups: INavLinkGroup[] = [
      {
        name: "Tier 1",
        collapseByDefault: true,
        links: [],
      },
      {
        name: "Tier 2",
        collapseByDefault: true,
        links: [],
      },
      {
        name: "Tier 3",
        collapseByDefault: true,
        links: [],
      },

    ];

    let expandeds: INavLink[] = [];

    buildTypeMap[environ].forEach((lines, idx) => {
      let topLinks: INavLink[] = groups[idx].links;
      let lastLinks: INavLink[] = topLinks;

      let lastTop: INavLink | undefined = undefined;
      let lastPrefix = '';

      for (let line of lines) {
        let [prefix, txt, types] = line.split('/');

        if (lastPrefix !== prefix) {
          // start a new group
          lastTop = {
            url: '',
            key: prefix.toLowerCase(),
            name: prefix,
            links: [],
          } as INavLink;
          topLinks.push(lastTop);
          lastLinks = lastTop.links!;
          lastPrefix = prefix;
        }

        let link = {
          key: txt.toLowerCase(),
          name: txt,
        } as INavLink;
        lastLinks.push(link);

        let subTypes = types.split(',');
        if (subTypes.length === 1) {
          // singular subtype: suffix the text
          link.name += `: ${types}`;
          link.key = subTypes[0].toLowerCase();

          if (link.key === selection) {
            if (!!lastTop) { expandeds.push(lastTop); }
            groups[idx].collapseByDefault = false;
          }
        } else {
          // multiple subtypes: add child links
          link.links = [];
          for (let subType of subTypes) {

            if (subType.toLowerCase() === selection) {
              if (!!lastTop) { expandeds.push(lastTop); }
              expandeds.push(link);
              groups[idx].collapseByDefault = false;
            }

            link.links?.push({
              key: subType.toLowerCase(),
              name: subType,
            } as INavLink);
          }

        }
      }
    });

    expandeds.forEach(item => item.isExpanded = true);
    return groups;
  };

  render() {
    const { showList, selection, environ, groups } = this.state;

    let selectedTxt = '';
    if (selection) {
      const line = this.findLine(selection);
      if (line) {
        let [prefix, txt] = line.split('/');
        if (prefix.endsWith('s')) prefix = prefix.slice(0, -1);
        if (txt.endsWith(prefix)) prefix = '';
        txt = txt.replace(':', '').trim();
        selectedTxt = `${txt} ${prefix} (${selection})`;
      }
    }

    return <>
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
        <div className="hint">{selectedTxt}</div>

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
        onDismiss={() => this.setState({ showList: false })}
      >
        <Pivot
          selectedKey={environ}
          onLinkClick={(item) => {
            const environ = item?.props.itemKey as Environ;
            this.setState({
              environ: environ,
              groups: this.getFilteredOptions(selection, environ)
            });
          }}
        >
          <PivotItem headerText="Orbital" itemKey='orbital' />
          <PivotItem headerText="Surface" itemKey='surface' />
        </Pivot>

        <Nav
          initialSelectedKey={selection}
          selectedKey={selection}

          onLinkClick={(ev, item) => {
            if (!item) return;
            if (!item.links) {
              const newSelection = item?.key ?? item?.name.toLowerCase();
              this.props.onChange(newSelection);
              this.setState({ showList: false });
            }
          }}
          groups={groups}
        />
      </Panel>}

    </>;
  }
}

const buildTypeMap: Record<Environ, string[][]> = {
  orbital: [
    [ // tier 1
      "Outposts/Commercial Outpost/Plutus",
      "Outposts/Industrial Outpost/Vulcan",
      "Outposts/Pirate Outpost/Dysnomia",
      "Outposts/Civilian Outpost/Vesta",
      "Outposts/Scientific Outpost/Prometheus",
      "Outposts/Military Outpost/Nemesis",

      "Installation/Satellite Installation/Hermes,Angelia,Eirene",
      "Installation/Comms Installation/Pistis,Soter,Aletheia",
      "Installation/Agricultural Installation/Demeter",
      "Installation/Pirate Installation/Apate,Laverna",
      "Installation/Industrial Installation/Euthenia,Phorcys",
      "Installation/Relay Installation/Enodia,Ichnaea",
    ],
    [  // tier 2
      "Ports/Coriolis/Coriolis",
      "Ports/Asteroid Base/Asteroid",

      "Installations/Military Installation/Vacuna,Alastor",
      "Installations/Security Installation/Dicaeosyne,Poena,Eunomia,Nomos",
      "Installations/Government Installation/Harmonia",
      "Installations/Medical Installation/Asclepius,Eupraxia",
      "Installations/Scientific Installation/Astraeus,Coeus,Dodona,Dione",
      "Installations/Tourist Installation/Hedone,Opora,Pasithea",
      "Installations/Space Bar/Dionysus,Bacchus",
    ],
    [ // tier 3
      "/Ocellus Starport/Ocellus",
      "/Orbis Starport/Apollo,Artemis",
    ],
  ],

  surface: [
    [ // tier 1
      "Surface Outposts/Civilian/Hestia,Decima,Atropos,Nona,Lachesis,Clotho",
      "Surface Outposts/Industrial/Hephaestus,Opis,Ponos,Tethys,Bia,Mefitis",
      "Surface Outposts/Scientific/Necessitas,Ananke,Fauna,Providentia,Antevorta,Porrima",

      "Small Settlements/Agricultural/Consus",
      "Small Settlements/Extraction/Ourea",
      "Small Settlements/Industrial/Fontus",
      "Small Settlements/Military/Ioke",

      "Medium Settlements/Agricultural/Picumnus,Annona",
      "Medium Settlements/Extraction/Mantus,Orcus",
      "Medium Settlements/Industrial/Meteope,Palici,Minthe",
      "Medium Settlements/Military/Bellona,Enyo,Polemos",
    ],
    [  // tier 2
      "Settlements/Agricultural: Large/Ceres,Fornax",
      "Settlements/Extraction: Large/Erebus,Aerecura",
      "Settlements/Industrial: Large/Gaea",
      "Settlements/Military: Large/Minerva",
      "Settlements/Scientific: Small/Pheobe",
      "Settlements/Scientific: Medium/Asteria,Caerus",
      "Settlements/Scientific: Large/Chronos",
      "Settlements/Tourism: Small/Aergia",
      "Settlements/Tourism: Medium/Comos,Gelos",
      "Settlements/Tourism: Large/Fufluns",

      "Hubs/Extraction/Tartarus",
      "Hubs/Civilian/Aegle",
      "Hubs/Exploration/Tellus",
      "Hubs/Outpost/Io",
      "Hubs/Scientific/Athena,Caelus",
      "Hubs/Military/Alala,Ares",
      "Hubs/Refinery/Silenus",
      "Hubs/High Tech/Janus",
      "Hubs/Industrial/Molae,Tellus,Eunostus",
    ],
    [ // tier 3
      "/Planetary Port/Zeus,Hera,Poseidon,Aphrodite",
    ],
  ]
};
