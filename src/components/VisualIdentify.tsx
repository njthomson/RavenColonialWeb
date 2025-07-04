
import { ActionButton, IconButton, Link, Panel, Stack, Toggle } from "@fluentui/react";
import { Component, FunctionComponent } from "react";
import { appTheme, cn } from "../theme";
import { SiteType, siteTypes } from "../site-data";
import { CopyButton } from "./CopyButton";
import { isMobile } from "../util";

interface ImageData {
  cmdr: string;
  location?: string;
}

const supportedTypes: Record<string, ImageData> = {
  'aerecura': { cmdr: 'kekosummer', location: `Correa Prospecting Platform - LTT 1873, B 1` },
  'aergia': { cmdr: 'kekosummer', location: `Mahama's Club - Col 285 Sector GL-X c1-11` },
  'alastor': { cmdr: 'Abe Andet', location: `Bierce Platform - Arietis Sector PJ-Q B5-5` },
  'aletheia': { cmdr: 'Disnaematter', location: `Taylor Sanctuary - Synuefe EM-M c23-8` },
  'ananke': { cmdr: 'Kai Thoreau', location: `Nakayama Landing - HIP 87968, 4 A` },
  'angelia': { cmdr: 'grinning2001', location: `Samos Gateway - IC 2391 Sector LH-V b2-5, A 8` },
  'annona': { cmdr: 'kekosummer', location: `Zabuzhko Botanical Garden - Col 285 Sector GL-X c1-11, A 4` },
  'apollo': { cmdr: 'Kai Thoreau', location: `Ore Depot - HIP 87968, 5 A` },
  'artemis': { cmdr: 'Alora Anophis', location: `Besonders Reach - Pru Euq XO-Z d13-11, 2 a` },
  'asteria': { cmdr: 'kekosummer', location: `Enju genetics laboratory - Col 285 Sector GL-X c1-11, B 4` },
  'asteroid': { cmdr: 'grinning2001', location: `Fairey Mines - Synuefe AN-H d11-120` },
  'atropos': { cmdr: 'Disnaematter', location: `Piazza Enterprise - Synuefe EM-M c23-8` },
  'bacchus': { cmdr: 'Abe Andet', location: `Galouye Vista - Arietis Sector PJ-Q B5-5` },
  'bellona': { cmdr: 'kekosummer', location: `Xie arsenal - Col 285 Sector GL-X c1-11, B 2` },
  'caelus': { cmdr: 'Disnaematter', location: `Hooker Horizons - Synuefe CN-Z b46-1` },
  'caerus': { cmdr: 'kekosummer', location: `Pozandr astrophysics site - Col 285 Sector GL-X c1-11, B 4` },
  'ceres': { cmdr: 'kekosummer', location: `Doroshenko Nutrition Biome - Col 285 Sector GL-X c1-11, A 4` },
  'chronos': { cmdr: 'kekosummer', location: `Neborak Astrophysics Enterprise - Col 285 Sector GL-X c1-11, B 4` },
  'clotho': { cmdr: 'Abe Andet', location: `Morelli Gateway - Arietis Sector PJ-Q B5-5` },
  'coeus': { cmdr: 'Abe Andet', location: `Magnus Enterprise - Pegasi Sector MS-T b3-5` },
  'comus': { cmdr: 'Disnaematter', location: `Emem's Leisure - Synuefe FI-Z b46-1.` },
  'consus': { cmdr: 'kekosummer', location: `Tersoo Cultivation Collection - Col 285 Sector GL-X c1-11, A 4` },
  'decima': { cmdr: 'kekosummer', location: `Venegas holdings - Col 285 Sector GL-X c1-11, A 2 a` },
  'demeter': { cmdr: 'Abe Andet', location: `Hedley Horizons - Arietis Sector PJ-Q B5-5` },
  'dicaeosyne': { cmdr: 'grinning2001', location: `Acton's Pride - IC 2391 Sector LH-V b2-5, A 2` },
  'dodona': { cmdr: 'Abe Andet', location: `Karman Vision - Arietis Sector PJ-Q B5-5` },
  'dual_truss': { cmdr: 'Abe Andet', location: `McCulley Gateway - Pegasi Sector IM-S a5-0` },
  'eirene': { cmdr: 'Abe Andet', location: `Gibbs Point - Arietis Sector PJ-Q B5-5` },
  'enodia': { cmdr: 'Locke Denman', location: `Glaser Relay - 37 Sextantis, 2 e` },
  'enyo': { cmdr: 'Abe Andet', location: `Pasichnyk Arms Garrison, Pegasi Sector MS-T b3-5` },
  'erebus': { cmdr: 'kekosummer', location: `Dhillion Mineralogic Exchange - LTT 1873, B 1` },
  'eupraxia': { cmdr: 'Abe Andet', location: `Hooper Vison - Arietis Sector PJ-Q B5-5` },
  'euthenia': { cmdr: 'Disnaematter', location: `McMullen's Progress - Synuefe EM-M c23-8` },
  'fontus': { cmdr: 'kekosummer', location: `Ahn's Industrial - Col 285 Sector GL-X c1-11, A 6` },
  'fornax': { cmdr: 'kekosummer', location: `Hakimi Horticultural Centre - Col 285 Sector GL-X c1-11, A 6` },
  'fufluns': { cmdr: 'kekosummer', location: `Oliveira Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'gaea': { cmdr: 'grinning2001', location: `Villalba Synthetics Workshop - IC 2391 Sector LH-V b2-5, A 3` },
  'gelos': { cmdr: 'kekosummer', location: `Burn Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'harmonia': { cmdr: 'Disnaematter', location: `Huberath Reach - Synuefe EM-M c23-8` },
  'hermes': { cmdr: 'grinning2001' },
  'hestia': { cmdr: 'Abe Andet', location: `Farias Berth - Pegasi Sector MS-T b3-5` },
  'ichnaea': { cmdr: 'Locke Denman', location: `Sullivan's Folly - Col 285 Sector CM-G b13-2, 1` },
  'io': { cmdr: 'Abe Andet', location: `Sakers Laboratory - Pegasi Sector IM-S a5-0` },
  'ioke': { cmdr: 'Disnaematter', location: `Yamaguchi Arms Hub - Synuefe FI-Z b46-1` },
  'mantus': { cmdr: 'kekosummer', location: `Jarvis drilling rigs - Col 285 Sector GL-X c1-11, B 3` },
  'meteope': { cmdr: 'kekosummer', location: `Nwadike synthetics facility - Col 285 Sector GL-X c1-11, A 6` },
  'minerva': { cmdr: 'kekosummer', location: `Ponomarenko Hold - Col 285 Sector GL-X c1-11, A 1` },
  'minthe': { cmdr: 'kekosummer', location: `Greko chemical workshop - Col 285 Sector GL-X c1-11, A 6` },
  'necessitas': { cmdr: 'Abe Andet', location: `Lenthall Gateway - Arietis Sector PJ-Q B5-5` },
  'nemesis': { cmdr: 'grinning2001', location: `Celebi Arsenal - Synuefe EN-H d11-108` },
  'no_truss': { cmdr: 'Abe Andet', location: `Joe T. Cline Memorial Starport - Pegasi Sector DL-y D60` },
  'nona': { cmdr: 'Abe Andet', location: `Anderson Vision - Pegasi Sector MS-T b3-5` },
  'opis': { cmdr: 'kekosummer', location: `Morgan Base - LTT 1873, B 2` },
  'orcus': { cmdr: 'kekosummer', location: `Weber metalurgic station - Col 285 Sector GL-X c1-11, B 3` },
  'ourea': { cmdr: 'kekosummer', location: `Polubotok drilling station - Col 285 Sector GL-X c1-11, B 3` },
  'palici': { cmdr: 'kekosummer', location: `Tolmie - Col 285 Sector GL-X c1-11, A 6` },
  'pheobe': { cmdr: 'kekosummer', location: `Vytrebenko Biochemical Centre - Col 285 Sector GL-X c1-11, B 4` },
  'picumnus': { cmdr: 'kekosummer', location: `Orellana Botanical Nursery - Col 285 Sector GL-X c1-11, A 4` },
  'pistis': { cmdr: 'Disnaematter', location: `Pogue Terminal - Synuefe EM-M c23-8` },
  'plutus': { cmdr: 'grinning2001', location: `Rahman Town - IC 2391 Sector EL-Y c9, B 10, A 3` },
  'polemos': { cmdr: 'kekosummer', location: `Ferreyra Defense Base - Col 285 Sector GL-X c1-11, B 5 a` },
  'porrima': { cmdr: 'Disnaematter', location: `Pettitt Nook - Synuefe EM-M c23-8` },
  'prometheus': { cmdr: 'Abe Andet', location: `Fuller Depot - Arietis Sector PJ-Q B5-5` },
  'quad_truss': { cmdr: 'grinning2001', location: `Crowley Gateway - Synuefe DL-N c23-20` },
  'silenus': { cmdr: 'grinning2001', location: `Hornby Vista - IC 2391 Sector LH-V b2-5, A 3` },
  'soter': { cmdr: 'Abe Andet', location: `Zhukovsky Point - Pegasi Sector MS-T b3-5` },
  'vacuna': { cmdr: 'Disnaematter', location: `Paton Beacon - Synuefe EM-M c23-8` },
  'vesta': { cmdr: 'Locke Denman', location: `Kusama Depot - 37 Sextantis, 2 D` },
  'vulcan': { cmdr: 'grinning2001', location: `Garvey Gateway - IC 2391 Sector LH-V b2-5, A 3` },
};

const sortedGroups = siteTypes.slice(1).sort((a, b) => a.displayName2.localeCompare(b.displayName2));
const sortedTypes = Object.keys(supportedTypes).sort();

const typeTypes = Object.keys(supportedTypes).reduce((map, key) => {
  map[key] = siteTypes.find(st => st.subTypes.includes(key))!;
  return map;
}, {} as Record<string, SiteType>);

interface VisualIdentifyProps {
  buildType?: string
}

interface VisualIdentifyState {
  zoom: string;
  showSurface: boolean;
  typeNames: string[];
  showMissing?: boolean;
  showInGroups: boolean;
}

export class VisualIdentify extends Component<VisualIdentifyProps, VisualIdentifyState> {

  constructor(props: VisualIdentifyProps) {
    super(props);

    this.state = {
      zoom: props.buildType ?? '',
      showSurface: false,
      typeNames: sortedTypes,
      showInGroups: true,
    };
  }

  componentDidMount(): void {
    // force an initial sort + filter
    this.setFilter();
  }

  componentDidUpdate(prevProps: Readonly<VisualIdentifyProps>, prevState: Readonly<VisualIdentifyState>, snapshot?: any): void {
    if (prevProps.buildType !== this.props.buildType) {
      this.setZoom(this.props.buildType ?? '');
    }
  }

  render() {
    const { zoom, showInGroups, showMissing, showSurface } = this.state;

    return <div style={{ padding: 10, fontSize: 12 }}>
      {!zoom && <>
        <Stack horizontal horizontalAlign='space-between'>

          <Stack horizontal horizontalAlign='start' verticalAlign='center' tokens={{ childrenGap: 10, padding: 0 }} style={{ textTransform: 'capitalize', padding: 0, marginLeft: -4 }}>
            <div style={{ fontSize: 14, paddingBottom: 8 }}>
              <b>Show:</b>
              &nbsp;
              Orbital
            </div>
            <Toggle
              onText='Surface'
              offText='Surface'
              checked={showSurface}
              onChange={() => {
                this.setState({ showSurface: !showSurface });

                setTimeout(() => {
                  this.setFilter();
                }, 10);
              }}
            />
            <Toggle
              onText='Grouped'
              offText='Grouped'
              checked={showInGroups}
              onChange={() => {
                this.setState({ showInGroups: !showInGroups });
              }}
            />
          </Stack>

          <ActionButton
            text='What is missing?'
            iconProps={{ iconName: 'ImageSearch' }}
            style={{ position: 'relative', right: 0 }}
            onClick={() => this.setState({ showMissing: !showMissing })}
          />
        </Stack>

        {showInGroups && this.renderGoups()}
        {!showInGroups && this.renderGrid()}

        {showMissing && this.renderMissing()}
      </>}
      {zoom && this.renderZoom()}
    </div>;
  }

  setZoom = (newZoom: string) => {
    this.setState({ zoom: newZoom });
    if (newZoom) {
      window.location.assign(`/#vis=${newZoom}`);
    } else {
      window.location.assign(`/#vis`);
    }
  };

  setFilter = () => {
    const { showSurface, showInGroups } = this.state;

    const typeNames = showInGroups ?
      sortedGroups
        .filter(t => t.orbital !== showSurface)
        .flatMap(t => t.subTypes.filter(st => st in supportedTypes))
      : sortedTypes
        .filter(key => typeTypes[key].orbital !== showSurface);

    this.setState({
      showSurface: showSurface,
      typeNames: typeNames,
    });
  };

  renderGrid() {
    const { typeNames } = this.state;

    const rows = typeNames.map(t => (<div
      key={`grid-${t}`}
      title={`${t[0].toUpperCase()}${t.slice(1)}\n${typeTypes[t].displayName2}\nTier: ${typeTypes[t].tier}`}
      onClick={() => this.setZoom(t)}
    >
      <Link style={{ textTransform: 'capitalize' }}>{t}</Link>
      <div
        style={{
          width: 200,
          height: 200,
          border: `2px solid ${appTheme.palette.themePrimary}`,
          backgroundColor: 'black',
          backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${t}.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer',
        }}
      />
    </div>));

    return <div style={{ maxWidth: 880 }}>

      <Stack horizontal wrap tokens={{ childrenGap: 10 }}>
        {rows}
      </Stack>

    </div>;
  }

  renderGoups() {
    const { showSurface } = this.state;

    const sz = 200;

    const rows = sortedGroups
      .map(type => {
        // skip groups with zero images
        const notMissing = type.subTypes.filter(st => st in supportedTypes);
        if (notMissing.length === 0 || type.orbital === showSurface) { return null; }

        return <div key={`grp-${type.displayName2}`}>

          <h2 className={cn.h3} style={{ margin: '20px 0 10px 0', color: appTheme.palette.black }}>{type.displayName2}</h2>
          <Stack wrap horizontal tokens={{ childrenGap: 10 }}>
            {type.subTypes.map(st => {
              if (notMissing.includes(st)) {
                return <div key={`grp-${type.displayName2}-${st}`} onClick={() => this.setZoom(st)}>
                  <Link style={{ textTransform: 'capitalize', textAlign: 'center' }}>
                    {st}
                    <SiteImage buildType={st} width={sz} height={sz} noCredits />
                  </Link>

                </div>;
              } else {
                return <div key={`grp-${type.displayName2}-${st}`} style={{ textAlign: 'center' }}>
                  {st}
                  <SiteImage buildType={st} width={sz} height={sz} noCredits />
                </div>;
              }
            })}
          </Stack>
        </div>;
      });

    return <div style={{}}>
      <div style={{ textTransform: 'capitalize', cursor: 'default' }}>
        <Stack wrap horizontal tokens={{ childrenGap: '0 60px' }}>
          {rows}
        </Stack>
      </div>
    </div>;
  }

  renderMissing() {
    const { showMissing } = this.state;

    const countTotal = siteTypes.flatMap(t => t.subTypes).length;
    let countMissing = 0;
    const groups = siteTypes
      .slice(1)
      .reduce((map, t) => {
        const missing = t.subTypes.filter(st => !(st in supportedTypes));
        if (missing.length > 0) {
          countMissing += missing.length;
          map[t.displayName2] = missing;
        }
        return map;
      }, {} as Record<string, string[]>);

    const rows = Object.entries(groups).map(([displayName2, missing]) => {
      return <div>
        <h3 className={cn.h3} style={{ marginTop: 8, color: appTheme.palette.themeSecondary }}>{displayName2}</h3>
        {missing.map(st => (<div>{st.replace('_i', '').replace('_e', '').replace('_', ' ')}</div>))}
      </div>;
    });

    return <Panel
      isLightDismiss
      isOpen={showMissing}
      headerText={`Missing ${countMissing} images:`}
      title={`Missing ${countMissing} of ${countTotal} images`}
      allowTouchBodyScroll={isMobile()}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={() => {
        this.setState({ showMissing: false });
      }}
    >
      <div style={{ textTransform: 'capitalize', cursor: 'default' }}>
        {rows}
      </div>
    </Panel>;
  }

  renderZoom() {
    const { zoom, typeNames } = this.state;

    const type = typeTypes[zoom];
    const idx = typeNames.indexOf(zoom);
    const namePrev = typeNames[idx - 1] ?? typeNames[typeNames.length - 1];
    const nameNext = typeNames[idx + 1] ?? typeNames[0];

    var copyLink = new ClipboardItem({
      'text/plain': `${window.location.origin}/#vis=${zoom}`,
      'text/html': new Blob([`<a href='${`${window.location.origin}/#vis=${zoom}`}'>${type.displayName2}: ${zoom}</a>`], { type: 'text/html' }),
    });

    const sz = window.innerHeight - 250;

    return <div>
      <Stack horizontal horizontalAlign='start' verticalAlign='center' tokens={{ padding: 0 }} style={{ textTransform: 'capitalize', padding: 0, marginLeft: -4 }}>

        <div style={{ width: 120, textAlign: 'right' }} onClick={() => this.setZoom(namePrev)}>
          <ActionButton
            iconProps={{ iconName: 'DoubleChevronLeft' }}
            style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0, textAlign: 'right' }}
            styles={{ flexContainer: { flexDirection: 'row-reverse' } }}
            text={namePrev}
          />
        </div>

        <IconButton
          title='Back to grid'
          iconProps={{ iconName: 'DoubleChevronUp' }}
          style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0 }}
          onClick={() => this.setZoom('')}
        />

        <div style={{ width: 120, textAlign: 'left' }} onClick={() => this.setZoom(nameNext)}>
          <ActionButton
            iconProps={{ iconName: 'DoubleChevronRight' }}
            style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0 }}
            text={nameNext}
          />
        </div>
      </Stack>

      <div style={{ textTransform: 'capitalize', marginBottom: 4, fontSize: 22 }} >
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
          <div>{type.displayName2}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <CopyButton text={copyLink} title='Copy link to this page' fontSize={14} />
          <div style={{ fontWeight: 'bold' }}>{zoom}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <div>Tier: {type.tier}</div>
        </Stack>
      </div>

      <SiteImage buildType={zoom} height={sz} />
    </div>;
  }
}


export const SiteImage: FunctionComponent<{ buildType: string; height: number; width?: number; noCredits?: boolean }> = (props) => {
  let height = props.height;
  let width = props.width ?? props.height * 1.5;

  const match = supportedTypes[props.buildType];

  return <>
    {!match && <>
      <div
        style={{
          border: `2px solid ${appTheme.palette.themeTertiary}`,
          width: width,
          height: props.width ? height : undefined,
          padding: props.width ? undefined : '40px 0',
          alignContent: 'center',
          textAlign: 'center',
          backgroundColor: 'black',
        }}
      >
        <div style={{ color: appTheme.palette.themeTertiary }}>Image not available</div>
        {/* <div style={{ color: appTheme.palette.themeTertiary }}>Please share?</div> */}
      </div>
    </>}

    {match && <>
      <div
        style={{
          position: 'relative',
          width: width,
          height: height,
          border: `2px solid ${appTheme.palette.themeTertiary}`,
          background: 'black',
          backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${props.buildType}.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >

        {!props.noCredits && <>
          <span
            style={{
              position: 'absolute',
              padding: '0 4px',
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              color: 'wheat'
            }}
          >
            Cmdr {match.cmdr}
          </span>

          {match.location && <span
            style={{
              position: 'absolute',
              padding: '0 4px',
              bottom: 0,
              backgroundColor: 'black',
              color: 'wheat'
            }}
          >
            {match.location}
          </span>}

          <IconButton
            title='View full size in another tab'
            iconProps={{ iconName: 'OpenInNewTab', style: { fontSize: 10 } }}
            style={{
              position: 'absolute',
              right: 2,
              top: 2,
              color: 'wheat',
              padding: 0,
              margin: 0,
              width: 16,
              height: 16,
            }}
            href={`https://njthomson.github.io/SrvSurvey/colony/${props.buildType}.jpg`}
            target='visprops.buildType'
          />
        </>}
      </div>
    </>}

  </>;
}
