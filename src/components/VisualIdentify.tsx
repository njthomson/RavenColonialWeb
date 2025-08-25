
import { ActionButton, Icon, IconButton, Link, Panel, Stack, Toggle } from "@fluentui/react";
import { Component, FunctionComponent, useState } from "react";
import { appTheme, cn } from "../theme";
import { getSiteType, SiteType, siteTypes } from "../site-data";
import { CopyButton } from "./CopyButton";
import { isMobile } from "../util";
import { BuildEffects } from "./BuildEffects";

interface ImageData {
  cmdr: string;
  location?: string;
  more?: ImageRef[];
}

interface ImageRef {
  n: string;
  c?: string;
  l?: string;
}


const supportedTypes: Record<string, ImageData> = {
  'aerecura': { cmdr: 'Kekosummer', location: `Correa Prospecting Platform - LTT 1873, B 1` },
  'aergia': { cmdr: 'Kekosummer', location: `Mahama's Club - Col 285 Sector GL-X c1-11` },
  'alastor': { cmdr: 'Abe Andet', location: `Bierce Platform - Arietis Sector PJ-Q B5-5` },
  'aletheia': { cmdr: 'Disnaematter', location: `Taylor Sanctuary - Synuefe EM-M c23-8` },
  'ananke': { cmdr: 'Kai Thoreau', location: `Nakayama Landing - HIP 87968, 4 A` },
  'angelia': { cmdr: 'Grinning2001', location: `Samos Gateway - IC 2391 Sector LH-V b2-5, A 8` },
  'annona': { cmdr: 'Kekosummer', location: `Zabuzhko Botanical Garden - Col 285 Sector GL-X c1-11, A 4`, more: [{ n: 'annona-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'apate': { cmdr: 'Abe Andet', location: `Hamuy's Pride - Col 285 Sector LK-D b13-8` },
  'apollo': { cmdr: 'Kai Thoreau', location: `Ore Depot - HIP 87968, 5 A` },
  'artemis': { cmdr: 'Alora Anophis', location: `Besonders Reach - Pru Euq XO-Z d13-11, 2 a` },
  'asteria': { cmdr: 'Kekosummer', location: `Enju genetics laboratory - Col 285 Sector GL-X c1-11, B 4` },
  'asteroid': { cmdr: 'Grinning2001', location: `Fairey Mines - Synuefe AN-H d11-120` },
  'atropos': { cmdr: 'Disnaematter', location: `Piazza Enterprise - Synuefe EM-M c23-8`, more: [{ n: 'atropos-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'bacchus': { cmdr: 'Abe Andet', location: `Galouye Vista - Arietis Sector PJ-Q B5-5`, more: [{ n: 'bacchus-2.jpg', l: 'Bus Gateway - HIP 13131', c: 'Cmdr Disnaematter' }] },
  'bellona': { cmdr: 'Kekosummer', location: `Xie arsenal - Col 285 Sector GL-X c1-11, B 2`, more: [{ n: 'belona-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'bia': { cmdr: 'Disnaematter', location: `Wolff Facility - Synuefe EM-M c23-8`, more: [{ n: 'bia-plan.jpg', c: 'Cmdr Kekosummer' }] },
  'caelus': { cmdr: 'Disnaematter', location: `Hooker Horizons - Synuefe CN-Z b46-1` },
  'caerus': { cmdr: 'Kekosummer', location: `Pozandr astrophysics site - Col 285 Sector GL-X c1-11, B 4` },
  'ceres': { cmdr: 'Kekosummer', location: `Doroshenko Nutrition Biome - Col 285 Sector GL-X c1-11, A 4` },
  'chronos': { cmdr: 'Kekosummer', location: `Neborak Astrophysics Enterprise - Col 285 Sector GL-X c1-11, B 4` },
  'clotho': { cmdr: 'Abe Andet', location: `Morelli Gateway - Arietis Sector PJ-Q B5-5` },
  'coeus': { cmdr: 'Abe Andet', location: `Magnus Enterprise - Pegasi Sector MS-T b3-5` },
  'comus': { cmdr: 'Disnaematter', location: `Emem's Leisure - Synuefe FI-Z b46-1` },
  'consus': { cmdr: 'Kekosummer', location: `Tersoo Cultivation Collection - Col 285 Sector GL-X c1-11, A 4`, more: [{ n: 'consus-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'decima': { cmdr: 'Kekosummer', location: `Venegas holdings - Col 285 Sector GL-X c1-11, A 2 a`, more: [{ n: 'decima-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'demeter': { cmdr: 'Abe Andet', location: `Hedley Horizons - Arietis Sector PJ-Q B5-5` },
  'dicaeosyne': { cmdr: 'Grinning2001', location: `Acton's Pride - IC 2391 Sector LH-V b2-5, A 2` },
  'dionysus': { cmdr: 'Abe Andet', location: `Poyser's Inheritance - Col 285 Sector LK-D b13-8` },
  'dodona': { cmdr: 'Abe Andet', location: `Karman Vision - Arietis Sector PJ-Q B5-5` },
  'dual_truss': { cmdr: 'Abe Andet', location: `McCulley Gateway - Pegasi Sector IM-S a5-0` },
  'dysnomia': { cmdr: 'Disnaematter', location: `Campus Hub - Synuefe EM-M c23-8` },
  'eirene': { cmdr: 'Abe Andet', location: `Gibbs Point - Arietis Sector PJ-Q B5-5` },
  'enodia': { cmdr: 'Locke Denman', location: `Glaser Relay - 37 Sextantis, 2 e` },
  'enyo': { cmdr: 'Abe Andet', location: `Pasichnyk Arms Garrison, Pegasi Sector MS-T b3-5`, more: [{ n: 'enyo-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'erebus': { cmdr: 'Kekosummer', location: `Dhillion Mineralogic Exchange - LTT 1873, B 1` },
  'eunomia': { cmdr: 'Smartee' },
  'eupraxia': { cmdr: 'Abe Andet', location: `Hooper Vison - Arietis Sector PJ-Q B5-5` },
  'euthenia': { cmdr: 'Disnaematter', location: `McMullen's Progress - Synuefe EM-M c23-8` },
  'fontus': { cmdr: 'Kekosummer', location: `Ahn's Industrial - Col 285 Sector GL-X c1-11, A 6`, more: [{ n: 'fontus-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'fornax': { cmdr: 'Kekosummer', location: `Hakimi Horticultural Centre - Col 285 Sector GL-X c1-11, A 6` },
  'fufluns': { cmdr: 'Kekosummer', location: `Oliveira Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'gaea': { cmdr: 'Grinning2001', location: `Villalba Synthetics Workshop - IC 2391 Sector LH-V b2-5, A 3` },
  'gelos': { cmdr: 'Kekosummer', location: `Burn Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'harmonia': { cmdr: 'Disnaematter', location: `Huberath Reach - Synuefe EM-M c23-8` },
  'hephaestus': { cmdr: 'Disnaematter', location: `Chaly Foundry - Synuefe XK-O c22-4` },
  'hera': { cmdr: 'Jayzet', location: `Manuwa Berth - HIP 7860` }, // more: [{ n: 'hera-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'hermes': { cmdr: 'Grinning2001' },
  'hestia': { cmdr: 'Abe Andet', location: `Farias Berth - Pegasi Sector MS-T b3-5`, more: [{ n: 'hestia-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'ichnaea': { cmdr: 'Locke Denman', location: `Sullivan's Folly - Col 285 Sector CM-G b13-2, 1` },
  'io': { cmdr: 'Abe Andet', location: `Sakers Laboratory - Pegasi Sector IM-S a5-0` },
  'ioke': { cmdr: 'Disnaematter', location: `Yamaguchi Arms Hub - Synuefe FI-Z b46-1`, more: [{ n: 'ioke-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'lachesis': { cmdr: 'Abe Andet', location: `Crossland Reach - Col 285 Sector SU-O c6-3`, more: [{ n: 'lachesis-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'laverna': { cmdr: 'Disnaematter', location: `Riess Sanctuary - Synuefe XK-O c22-4` },
  'mantus': { cmdr: 'Kekosummer', location: `Jarvis drilling rigs - Col 285 Sector GL-X c1-11, B 3` },
  'meteope': { cmdr: 'Kekosummer', location: `Nwadike synthetics facility - Col 285 Sector GL-X c1-11, A 6` },
  'minerva': { cmdr: 'Kekosummer', location: `Ponomarenko Hold - Col 285 Sector GL-X c1-11, A 1` },
  'minthe': { cmdr: 'Kekosummer', location: `Tolmie - Col 285 Sector GL-X c1-11, A 6`, more: [{ n: 'minthe-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'necessitas': { cmdr: 'Abe Andet', location: `Lenthall Gateway - Arietis Sector PJ-Q B5-5` },
  'nemesis': { cmdr: 'Grinning2001', location: `Celebi Arsenal - Synuefe EN-H d11-108` },
  'no_truss': { cmdr: 'Abe Andet', location: `Joe T. Cline Memorial Starport - Pegasi Sector DL-y D60` },
  'nomos': { cmdr: 'Smartee' },
  'nona': { cmdr: 'Abe Andet', location: `Anderson Vision - Pegasi Sector MS-T b3-5`, more: [{ n: 'nona-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'opis': { cmdr: 'Kekosummer', location: `Morgan Base - LTT 1873, B 2` },
  'orcus': { cmdr: 'Kekosummer', location: `Weber metalurgic station - Col 285 Sector GL-X c1-11, B 3`, more: [{ n: 'orcus-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'ourea': { cmdr: 'Kekosummer', location: `Polubotok drilling station - Col 285 Sector GL-X c1-11, B 3`, more: [{ n: 'ourea-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'palici': { cmdr: 'Kekosummer', location: `Greko chemical workshop - Col 285 Sector GL-X c1-11, A 6`, more: [{ n: 'palici-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'pheobe': { cmdr: 'Kekosummer', location: `Vytrebenko Biochemical Centre - Col 285 Sector GL-X c1-11, B 4` },
  'phorcys': { cmdr: 'Artemwaynes', location: ` Montgomery Enterprise - HIP 60611, 7` },
  'picumnus': { cmdr: 'Kekosummer', location: `Orellana Botanical Nursery - Col 285 Sector GL-X c1-11, A 4`, more: [{ n: 'picumnus-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'pistis': { cmdr: 'Disnaematter', location: `Pogue Terminal - Synuefe EM-M c23-8` },
  'plutus': { cmdr: 'Grinning2001', location: `Rahman Town - IC 2391 Sector EL-Y c9, B 10, A 3` },
  'poena': { cmdr: 'Smartee' },
  'polemos': { cmdr: 'Kekosummer', location: `Ferreyra Defense Base - Col 285 Sector GL-X c1-11, B 5 a`, more: [{ n: 'polemos-plan.jpg', c: 'Cmdr Grinning2001' }] },
  'ponos': { cmdr: 'Grinning2002', location: `Nakayama Holding - IC 2602 Sector DL-Y d62` },
  'porrima': { cmdr: 'Disnaematter', location: `Pettitt Nook - Synuefe EM-M c23-8` },
  'poseidon': { cmdr: 'Disnaematter', location: `David Lynch Memorial - Synuefe EM-M c23-8` },
  'prometheus': { cmdr: 'Abe Andet', location: `Fuller Depot - Arietis Sector PJ-Q B5-5` },
  'providentia': { cmdr: 'Grinning2002', location: `Okpara Honour - IC 2602 Sector DL-Y d62` },
  'quad_truss': { cmdr: 'Grinning2001', location: `Crowley Gateway - Synuefe DL-N c23-20` },
  'silenus': { cmdr: 'Grinning2001', location: `Hornby Vista - IC 2391 Sector LH-V b2-5, A 3` },
  'soter': { cmdr: 'Abe Andet', location: `Zhukovsky Point - Pegasi Sector MS-T b3-5` },
  'vacuna': { cmdr: 'Disnaematter', location: `Paton Beacon - Synuefe EM-M c23-8` },
  'vesta': { cmdr: 'Locke Denman', location: `Kusama Depot - 37 Sextantis, 2 D` },
  'vulcan': { cmdr: 'Grinning2001', location: `Garvey Gateway - IC 2391 Sector LH-V b2-5, A 3` },
  'zeus': { cmdr: 'EDExplorer', location: `Ascendia City - Col 285 Sector ZX-R b5-0, A 4` }, //, more: [{ n: 'zeus-plan.jpg', c: 'Cmdr Grinning2001' }] },
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

    const isSurface = !!props.buildType && !getSiteType(props.buildType)?.orbital;

    this.state = {
      zoom: props.buildType ?? '',
      showSurface: isSurface,
      typeNames: sortedTypes,
      showInGroups: true,
    };
  }

  componentDidMount(): void {
    // force an initial sort + filter
    this.setFilter(this.state.showSurface, this.state.showInGroups);
  }

  componentDidUpdate(prevProps: Readonly<VisualIdentifyProps>, prevState: Readonly<VisualIdentifyState>, snapshot?: any): void {
    if (prevProps.buildType !== this.props.buildType) {
      this.setZoom(this.props.buildType ?? '');
    }
  }

  render() {
    const { zoom, showInGroups, showMissing, showSurface } = this.state;

    return <div style={{ marginLeft: 10, fontSize: 12 }}>
      {!zoom && <>
        <Stack horizontal horizontalAlign='space-between'>

          <Stack horizontal horizontalAlign='start' verticalAlign='center' tokens={{ childrenGap: 10 }} style={{ textTransform: 'capitalize', marginLeft: 0 }}>
            <div style={{ fontSize: 14, marginBottom: 10, cursor: 'default', userSelect: 'none' }}>
              <b>Show:</b>
              <span style={{ cursor: 'pointer' }} onClick={() => this.setFilter(!showSurface, showInGroups)}>
                &nbsp;
                Orbital
              </span>
            </div>
            <Toggle
              onText='Surface'
              offText='Surface'
              checked={showSurface}
              styles={{ root: { cursor: 'pointer' }, text: { cursor: 'pointer' } }}
              onChange={() => {
                this.setFilter(!showSurface, showInGroups);
              }}
            />
            <Toggle
              onText='Grouped'
              offText='Grouped'
              checked={showInGroups}
              styles={{ root: { cursor: 'pointer' }, text: { cursor: 'pointer' } }}
              onChange={() => {
                this.setFilter(showSurface, !showInGroups);
              }}
            />
            <ActionButton
              className={cn.bBox}
              title='View table of site properties in a new tab'
              iconProps={{ iconName: 'ViewListGroup', style: { cursor: 'pointer' } }}
              style={{ height: 24, marginBottom: 8, padding: '14px 8px' }}
              href='/table'
              target='table'
            >
              Table&nbsp;
              <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ cursor: 'pointer' }} />
            </ActionButton>
          </Stack>

          <ActionButton
            className={cn.bBox}
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

  setFilter = (showSurface: boolean, showInGroups: boolean) => {

    const typeNames = showInGroups ?
      sortedGroups
        .filter(t => t.orbital !== showSurface)
        .flatMap(t => t.subTypes.filter(st => st in supportedTypes))
      : sortedTypes
        .filter(key => typeTypes[key].orbital !== showSurface);

    this.setState({
      showInGroups: showInGroups,
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
          backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${t}-thumb.jpg)`,
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

    const onMobile = isMobile(true);
    const ww = onMobile ? window.outerWidth : window.innerWidth;
    const hh = window.innerHeight;

    const h = ww > hh
      ? hh - (onMobile ? 150 : 200)
      : ww - (onMobile ? 40 : 60);

    const w = ww > hh ? h * 1.5 : h;

    return <div>
      <Stack horizontal horizontalAlign='start' verticalAlign='center' tokens={{ padding: 0 }} style={{ textTransform: 'capitalize', padding: 0, marginLeft: -4 }}>

        <div style={{ width: 120, textAlign: 'right' }} onClick={() => this.setZoom(namePrev)}>
          <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'DoubleChevronLeft' }}
            style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0, textAlign: 'right' }}
            styles={{ flexContainer: { flexDirection: 'row-reverse' } }}
            text={namePrev}
          />
        </div>

        <IconButton
          className={cn.bBox}
          title='Back to grid'
          iconProps={{ iconName: 'DoubleChevronUp' }}
          style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0 }}
          onClick={() => this.setZoom('')}
        />

        <div style={{ width: 120, textAlign: 'left' }} onClick={() => this.setZoom(nameNext)}>
          <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'DoubleChevronRight' }}
            style={{ textTransform: 'capitalize', height: 28, padding: 0, margin: 0 }}
            text={nameNext}
          />
        </div>
      </Stack>

      <div style={{ textTransform: 'capitalize', marginBottom: 4, fontSize: onMobile ? 16 : 22 }} >
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
          <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <CopyButton text={copyLink} title='Copy link to this page' fontSize={14} />
          <div style={{ fontWeight: 'bold' }}>{zoom}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <div style={{ color: appTheme.palette.themePrimary }}>Tier:&nbsp;{type.tier}&nbsp;</div>
        </Stack>
      </div>

      <Stack horizontal wrap>
        <div style={{ marginBottom: 10, marginRight: 10 }}>
          <SiteImage buildType={zoom} width={w} height={h} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <BuildEffects buildType={zoom} noType noTitle />
        </div>
      </Stack>
    </div>;
  }
}


export const SiteImage: FunctionComponent<{ buildType: string; height: number; width: number; noCredits?: boolean; }> = (props) => {

  let width = props.width;
  let height = props.height;
  const img = {
    n: width <= 200 ? `${props.buildType}-thumb.jpg` : `${props.buildType}.jpg`,
  } as ImageRef;

  const match = supportedTypes[props.buildType];
  if (match && !props.noCredits) {
    img.c = `Cmdr ${match.cmdr}`;
    img.l = match.location;
  }

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
      <SiteImages imgs={[img, ...match.more ?? []]} width={width} height={height} noCredits={props.noCredits} />
    </>}
  </>;
}

export const SiteImages: FunctionComponent<{ imgs: ImageRef[]; height: number; width?: number; noCredits?: boolean; }> = (props) => {

  const [imgIdx, setImgIdx] = useState(0);

  if (imgIdx + 1 > props.imgs.length) {
    // reset sub-image index and render nothing this time around
    setImgIdx(0);
    return null;
  }

  const img = props.imgs[imgIdx];
  const imgUrl = `https://njthomson.github.io/SrvSurvey/colony/${img.n}`;

  return <>
    <div
      style={{
        position: 'relative',
        width: props.width,
        height: props.height,
        border: `2px solid ${appTheme.palette.themeTertiary}`,
        background: 'black',
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >

      {img.c && <span
        style={{
          position: 'absolute',
          padding: '0 4px',
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          color: 'wheat'
        }}
      >
        {img.c}
      </span>}

      {img.l && <span
        style={{
          position: 'absolute',
          padding: '0 4px',
          bottom: 0,
          backgroundColor: 'black',
          color: 'wheat'
        }}
      >
        {img.l}
      </span>}

      {!props.noCredits && <>
        <span style={{
          position: 'absolute',
          right: 2,
          top: 2,
          color: 'wheat',
          backgroundColor: 'black',
        }}
        >
          <IconButton
            className={cn.bBox}
            title='View full size in another tab'
            iconProps={{ iconName: 'OpenInNewTab', style: { fontSize: 10, cursor: 'pointer' } }}
            style={{
              color: 'wheat',
              padding: 0,
              margin: 0,
              width: 16,
              height: 16,
            }}
            href={imgUrl}
            target='visprops.buildType'
          />
        </span>
        {props.imgs.length > 1 && <>
          <Stack horizontal style={{
            position: 'absolute',
            left: 2,
            top: 2,
            backgroundColor: 'black',
            padding: 0,
            margin: 0,
          }}
          >
            <IconButton
              className={cn.bBox}
              title='Previous image'
              iconProps={{ iconName: 'DoubleChevronLeft', style: { fontSize: 10 } }}
              style={{
                color: 'wheat',
                padding: 0,
                margin: 0,
                width: 16,
                height: 16,
              }}
              onClick={() => {
                let idx = imgIdx > 0 ? imgIdx - 1 : props.imgs.length - 1;
                setImgIdx(idx);
              }}
            />
            <IconButton
              className={cn.bBox}
              title='Next image'
              iconProps={{ iconName: 'DoubleChevronRight', style: { fontSize: 10 } }}
              style={{
                color: 'wheat',
                padding: 0,
                margin: 0,
                width: 16,
                height: 16,
              }}
              onClick={() => {
                let idx = imgIdx === props.imgs.length - 1 ? 0 : imgIdx + 1;
                setImgIdx(idx);
              }}
            />
          </Stack>
        </>}
      </>}

    </div>
  </>;
}
