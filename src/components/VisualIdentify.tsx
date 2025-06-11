
import { ActionButton, Checkbox, IconButton, Label, Link, Panel, Stack } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../theme";
import { SiteType, siteTypes } from "../site-data";
import { CopyButton } from "./CopyButton";
import { isMobile } from "../util";

interface ImageData {
  cmdr: string;
  location?: string;
}

const supportedTypes: Record<string, ImageData> = {
  'aergia': { cmdr: 'kekosummer', location: `Mahama's Club - Col 285 Sector GL-X c1-11` },
  'angelia': { cmdr: 'grinning2001', location: `Samos Gateway - IC 2391 Sector LH-V b2-5, A 8` },
  'annona': { cmdr: 'kekosummer', location: `Zabuzhko Botanical Garden - Col 285 Sector GL-X c1-11, A 4` },
  'artemis': { cmdr: 'Alora Anophis', location: `Besonders Reach - Pru Euq XO-Z d13-11, 2 a` },
  'asteroid': { cmdr: 'grinning2001', location: `Fairey Mines - Synuefe AN-H d11-120` },
  'atropos': { cmdr: 'Disnaematter', location: `Piazza Enterprise - Synuefe EM-M c23-8` },
  'ceres': { cmdr: 'kekosummer', location: `Doroshenko Nutrition Biome - Col 285 Sector GL-X c1-11, A 4` },
  'coeus': { cmdr: 'Abe Andet', location: `Magnus Enterprise - Pegasi Sector MS-T b3-5` },
  'comus': { cmdr: 'kekosummer', location: `Vynnychenko Entertainment Zone - Col 285 Sector GL-X c1-11, B 5 a` },
  'consus': { cmdr: 'kekosummer', location: `Tersoo Cultivation Collection - Col 285 Sector GL-X c1-11, A 4` },
  'demeter': { cmdr: 'Abe Andet', location: `Hedley Horizons - Arietis Sector PJ-Q B5-5` },
  'dicaeosyne': { cmdr: 'grinning2001', location: `Acton's Pride - IC 2391 Sector LH-V b2-5, A 2` },
  'eirene': { cmdr: 'Abe Andet', location: `Gibbs Point - Arietis Sector PJ-Q B5-5` },
  'enodia': { cmdr: 'grinning2001', location: `Katzenstein Legacy - IC 2391 Sector LH-V b2-5, B 10` },
  'eupraxia': { cmdr: 'Abe Andet', location: `Hooper Vison - Arietis Sector PJ-Q B5-5` },
  'fontus': { cmdr: 'kekosummer', location: `Ahn's Industrial - Col 285 Sector GL-X c1-11, A 6` },
  'fornax': { cmdr: 'kekosummer', location: `Hakimi Horticultural Centre - Col 285 Sector GL-X c1-11, A 6` },
  'fufluns': { cmdr: 'kekosummer', location: `Oliveira Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'gaea': { cmdr: 'grinning2001', location: `Villalba Synthetics Workshop - IC 2391 Sector LH-V b2-5, A 3` },
  'gelos': { cmdr: 'kekosummer', location: `Burn Tourist Resort - Col 285 Sector GL-X c1-11, A 1` },
  'harmonia': { cmdr: 'Disnaematter', location: `Huberath Reach - Synuefe EM-M c23-8` },
  'hermes': { cmdr: 'grinning2001' },
  'hestia': { cmdr: 'Abe Andet', location: ` Farias Berth - Pegasi Sector MS-T b3-5` },
  'ioke': { cmdr: 'Disnaematter', location: `Yamaguchi Arms Hub - Synuefe FI-Z b46-1` },
  'minerva': { cmdr: 'kekosummer', location: `Ponomarenko Hold - Col 285 Sector GL-X c1-11, A 1` },
  'no_truss': { cmdr: 'Abe Andet', location: `Joe T. Cline Memorial Starport - Pegasi Sector DL-y D60` },
  'nona': { cmdr: 'Abe Andet', location: `Anderson Vision - Pegasi Sector MS-T b3-5` },
  'pheobe': { cmdr: 'kekosummer', location: `Vytrebenko Biochemical Centre - Col 285 Sector GL-X c1-11, B 4` },
  'picumnus': { cmdr: 'kekosummer', location: `Orellana Botanical Nursery - Col 285 Sector GL-X c1-11, A 4` },
  'pistis': { cmdr: 'Disnaematter', location: `Pogue Terminal - Synuefe EM-M c23-8` },
  'plutus': { cmdr: 'grinning2001', location: `Rahman Town - IC 2391 Sector EL-Y c9, B 10, A 3` },
  'polemos': { cmdr: 'grinning2001', location: `Faiers Command Garrison - IC 2391 Sector LH-V b2-5, B 3 a` },
  'porrima': { cmdr: 'Disnaematter', location: `Pettitt Nook - Synuefe EM-M c23-8` },
  'prometheus': { cmdr: 'Abe Andet', location: `Fuller Depot - Arietis Sector PJ-Q B5-5` },
  'quad_truss': { cmdr: 'grinning2001', location: `Crowley Gateway - Synuefe DL-N c23-20` },
  'silenus': { cmdr: 'grinning2001', location: `Hornby Vista - IC 2391 Sector LH-V b2-5, A 3` },
  'soter': { cmdr: 'Abe Andet', location: `Zhukovsky Point - Pegasi Sector MS-T b3-5` },
  'vacuna': { cmdr: 'Disnaematter', location: `Paton Beacon - Synuefe EM-M c23-8` },
  'vulcan': { cmdr: 'grinning2001', location: `Garvey Gateway - IC 2391 Sector LH-V b2-5, A 3` },
};

const origin = window.location.origin;

const typeTypes = Object.keys(supportedTypes).reduce((map, key) => {
  map[key] = siteTypes.find(st => st.subTypes.includes(key))!;
  return map;
}, {} as Record<string, SiteType>);

interface VisualIdentifyProps {
  buildType?: string
}

interface VisualIdentifyState {
  zoom: string;
  showOrbital: boolean;
  showSurface: boolean;
  typeNames: string[];
  showMissing?: boolean;
}

export class VisualIdentify extends Component<VisualIdentifyProps, VisualIdentifyState> {

  constructor(props: VisualIdentifyProps) {
    super(props);

    this.state = {
      zoom: props.buildType ?? '',
      showOrbital: true,
      showSurface: true,
      typeNames: Object.keys(supportedTypes),
    };
  }

  componentDidMount(): void {
    // force an initial sort + filter
    this.setFilter('');
  }

  componentDidUpdate(prevProps: Readonly<VisualIdentifyProps>, prevState: Readonly<VisualIdentifyState>, snapshot?: any): void {
    if (prevProps.buildType !== this.props.buildType) {
      this.setZoom(this.props.buildType ?? '');
    }
  }

  render() {
    const { zoom } = this.state;

    return <div style={{ padding: 10, fontSize: 12 }}>
      {!zoom && this.renderGrid()}
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

  setFilter = (toggleName: string) => {
    let { showOrbital, showSurface } = this.state;
    if (toggleName === 'showOrbital') { showOrbital = !showOrbital; }
    if (toggleName === 'showSurface') { showSurface = !showSurface; }

    if (!showOrbital && !showSurface) {
      if (toggleName === 'showOrbital') { showSurface = true; }
      if (toggleName === 'showSurface') { showOrbital = true }
    }

    const typeNames = Object.keys(supportedTypes)
      .sort()
      .filter(key => typeTypes[key].orbital === showOrbital || typeTypes[key].orbital !== showSurface);

    this.setState({
      showOrbital: showOrbital,
      showSurface: showSurface,
      typeNames: typeNames,
    });
  };

  renderGrid() {
    const { showOrbital, showSurface, typeNames, showMissing } = this.state;

    const rows = typeNames.map(t => (<div
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

    return <div style={{ width: 880 }}>
      <Stack horizontal horizontalAlign='space-between'>

        <Stack horizontal horizontalAlign='start' verticalAlign='center' tokens={{ childrenGap: 10, padding: 0 }} style={{ textTransform: 'capitalize', padding: 0, marginLeft: -4 }}>
          <Label>Filter:</Label>
          <Checkbox
            label="Orbital"
            checked={showOrbital}
            onChange={() => this.setFilter('showOrbital')}
          />
          <Checkbox
            label="Surface"
            checked={showSurface}
            onChange={() => this.setFilter('showSurface')}
          />
        </Stack>

        <ActionButton
          text='What is missing?'
          iconProps={{ iconName: 'ImageSearch' }}
          style={{ position: 'relative', right: 0 }}
          onClick={() => this.setState({ showMissing: !showMissing })}
        />
      </Stack>

      <Stack horizontal wrap tokens={{ childrenGap: 10 }}>
        {rows}
      </Stack>

      {showMissing && this.renderMissing()}
    </div>;
  }

  renderMissing() {
    const { typeNames, showMissing } = this.state;

    let countMissing = 0;
    const groups = siteTypes
      .slice(1)
      .reduce((map, t) => {
        const missing = t.subTypes.filter(st => !typeNames.includes(st));
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
      allowTouchBodyScroll={isMobile()}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={() => {
        this.setState({ showMissing: false });
      }}
    >
      <div style={{ textTransform: 'capitalize' }}>
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
      'text/plain': `${origin}/#vis=${zoom}`,
      'text/html': new Blob([`<a href='${`${origin}/#vis=${zoom}`}'>${type.displayName2}: ${zoom}</a>`], { type: 'text/html' }),
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
          <CopyButton text={copyLink} title='Copy link to this page' fontSize={14} />
          <div style={{ fontWeight: 'bold' }}>{zoom}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <div>{type.displayName2}</div>
          <div style={{ color: 'grey', margin: '0 8px' }}>|</div>
          <div>Tier: {type.tier}</div>
        </Stack>
      </div>

      <div
        style={{
          position: 'relative',
          width: sz * 1.5,
          height: sz,
          border: `2px solid ${appTheme.palette.themePrimary}`,
          background: 'black',
          backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${zoom}.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
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
          Cmdr {supportedTypes[zoom].cmdr}
        </span>

        {supportedTypes[zoom].location && <span
          style={{
            position: 'absolute',
            padding: '0 4px',
            bottom: 0,
            backgroundColor: 'black',
            color: 'wheat'
          }}
        >
          {supportedTypes[zoom].location}
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
          href={`https://njthomson.github.io/SrvSurvey/colony/${zoom}.jpg`}
          target='visZoom'
        />
      </div>
    </div>;
  }
}
