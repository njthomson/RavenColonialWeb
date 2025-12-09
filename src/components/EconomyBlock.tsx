import { FunctionComponent } from "react";
import { economyColors, mapName } from "../site-data";
import { Icon } from "@fluentui/react";

export const EconomyBlock: FunctionComponent<{ economy: string, size?: '18px' | '10px', ratio?: Record<string, number> }> = (props) => {

  let sz = props.size === '10px' ? 10 : 18;

  let economies = props.economy.split(',');
  let titleRatios = undefined;

  if (props.ratio) {
    const sorted = Object.entries(props.ratio).sort((a, b) => {
      // sort by the market share, or alpha if they match
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      } else {
        return b[1] - a[1];
      }
    })
      .filter(([t, n], idx) => n >= 100 || idx === 0);

    economies = sorted
      .filter((_, idx) => idx < 3)
      .map(([t, n]) => t.toLowerCase().replaceAll(' ', ''));

    const maxLength = Math.max(...sorted.map(([t]) => t.length));
    titleRatios = sorted
      .map(([t, n]) => `${t.padEnd(maxLength)}    ${n}%`)
      .join('\n');
  }

  if (economies[0] === 'near/akhenaten') {
    economies = ['industrial', 'hightech']
  }

  let innerBlock = <></>;
  if (economies.length > 1) {
    const bgColor1 = economyColors[economies[1].split('/', 1)[0]] ?? '#FFF';
    innerBlock = <div style={{
      backgroundColor: bgColor1,
      position: 'relative',
      top: props.size === '10px' ? 3 : 6,
      left: 0,
      width: sz * 2,
      height: sz * 2,
      rotate: '45deg',
      border: '1px solid rgba(0,0,0,0.5)',
    }} />;
  }

  if (economies.length > 2) {
    // shift innerBlock inside a new innerBlock
    innerBlock.props.style.left = props.size === '10px' ? 3 : 8;
    innerBlock.props.style.rotate = '0deg';
    const bgColor2 = innerBlock.props.style.backgroundColor;
    innerBlock.props.style.backgroundColor = economyColors[economies[2].split('/', 1)[0]] ?? '#FFF';

    innerBlock = <div style={{
      backgroundColor: bgColor2,
      position: 'relative',
      top: props.size === '10px' ? 0 : 1,
      left: 0,
      width: sz * 2,
      height: sz * 2,
      rotate: '45deg',
      border: '1px solid rgba(0,0,0,0.5)',
    }} >
      {innerBlock}
    </div>;
  }

  if (economies[0] === 'not/agri') {
    economies = ['agriculture'];
    innerBlock = <Icon
      iconName='Blocked'
      style={{
        position: 'absolute',
        left: 3,
        top: 3,
        fontWeight: 'bold'
      }}
    />;
  }

  const isSurface = economies[0].endsWith('/surface');
  const isOrbital = economies[0].endsWith('/orbital');
  const bgColor0 = economyColors[economies[0].split('/', 1)[0]] ?? '#FFF';
  const titleTxt = (titleRatios ?? economies.map(t => mapName[t]).join(', ')) || 'Unknown';

  return <div
    title={titleTxt}
    style={{
      backgroundColor: bgColor0,
      border: '1px solid rgba(0,0,0,0.5)',
      position: 'relative',
      width: sz,
      height: sz,
      overflow: 'hidden',
      fontSize: 12
    }}
  >
    {innerBlock}
    {isSurface && <Icon iconName='GlobeFavorite' style={{ position: 'absolute', left: 3, top: 3, color: 'black' }} />}
    {isOrbital && <Icon iconName='ProgressRingDots' style={{ position: 'absolute', left: 3, top: 3, color: 'black' }} />}
  </div>;
};
