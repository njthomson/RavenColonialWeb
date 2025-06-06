
import { ActionButton, Link, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme } from "../theme";
import { siteTypes } from "../site-data";
import { CopyButton } from "./CopyButton";

interface ImageData {
  cmdr: string;
  location?: string;
}
const supportedTypes: Record<string, ImageData> = {
  'angelia': { cmdr: 'grinning2001', location: `Samos Gateway, IC 2391 Sector LH-V b2-5, A 8` },
  'dicaeosyne': { cmdr: 'grinning2001', location: `Acton's Pride, IC 2391 Sector LH-V b2-5, A 2` },
  'enodia': { cmdr: 'grinning2001', location: `Katzenstein Legacy, IC 2391 Sector LH-V b2-5, B 10` },
  'eupraxia': { cmdr: 'grinning2001', location: `Fonda's Inheritance, IC 2391 Sector LH-V b2-5, A 3` },
  'hermes': { cmdr: 'grinning2001' },
  'pistis': { cmdr: 'grinning2001', location: `Walotsky Reach, IC 2391 Sector LH-V b2-5, B 10` },
  'polemos': { cmdr: 'grinning2001', location: `Faiers Command Garrison, IC 2391 Sector LH-V b2-5, B 3 a` },
  'vulcan': { cmdr: 'grinning2001', location: `Garvey Gateway, IC 2391 Sector LH-V b2-5, A 3` },
};

export const VisualIdentify: FunctionComponent<{ buildType?: string }> = (props) => {
  const [zoom, setZoom] = useState<string | undefined>(props.buildType);
  const type = siteTypes.find(st => st.subTypes.includes(zoom ?? ''))!;

  const rows = Object.keys(supportedTypes).map(t => (<div
    onClick={() => {
      setZoom(t);
      window.location.replace(`#vis=${t}`);
    }}
  >
    <Link style={{ textTransform: 'capitalize' }}>{t}</Link>
    <div
      style={{
        width: 200,
        height: 200,
        border: `2px solid ${appTheme.palette.themePrimary}`,
        backgroundColor: 'black',
        backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${t}.png)`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        cursor: 'pointer',
      }}
    />
  </div>));

  // return <Panel
  //   isOpen
  //   type={PanelType.large}
  //   headerText='Visual identification:'
  //   allowTouchBodyScroll={isMobile()}
  //   styles={{
  //     overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
  //   }}
  //   // onDismiss={() => this.setState({ showList: false })}
  //   onKeyDown={(ev) => {
  //     // if (ev.key === 'Escape') { this.setState({ showList: false }); }
  //   }}
  // > ... </Panel>

  // prepare rich copy link
  var copyLink = new ClipboardItem({
    'text/plain': `https://ravencolonial.com/#vis=${zoom}`,
    'text/html': new Blob([`<a href='${`https://ravencolonial.com/#vis=${zoom}`}'>${type.displayName2}: ${zoom}</a>`], { type: 'text/html' }),
  });

  return <div style={{ marginTop: 20, width: 1000, padding: 10, fontSize: 12 }}>

    {!zoom && <Stack horizontal wrap tokens={{ childrenGap: 10 }}>
      {rows}
    </Stack>}

    {zoom && <div
      onClick={() => {
        setZoom(undefined);
        window.location.replace(`#vis`);
      }}
    >
      <Stack horizontal verticalAlign='center' tokens={{ padding: 0 }} style={{ textTransform: 'capitalize', padding: 0, marginLeft: -4 }}>
        <ActionButton
          iconProps={{ iconName: 'DoubleChevronLeft' }}
          style={{ height: 28, padding: 0, margin: 0 }}
          text='back'
          onClick={() => setZoom(undefined)}
        />
        <h3 style={{ color: 'grey' }}>|</h3>
        <h3>{zoom}</h3>
        <CopyButton text={copyLink} title='Copy link to this page' fontSize={12} />
      </Stack>

      {type && <div style={{ marginBottom: 4 }}>
        <b>{type.displayName2}</b>
        <span style={{ color: 'grey' }}> | </span>
        Tier: {type.tier}
      </div>}

      <div
        style={{
          position: 'relative',
          width: 1000,
          height: window.innerHeight - 180,
          border: `2px solid ${appTheme.palette.themePrimary}`,
          background: 'black',
          backgroundImage: `url(https://njthomson.github.io/SrvSurvey/colony/${zoom}.png)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute',
            padding: '0 4px',
            right: 4,
            bottom: 0,
            backgroundColor: 'black',
            color: 'wheat'
          }}
        >
          credit: {supportedTypes[zoom].cmdr}
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

      </div>
    </div>}
  </div>;
};
