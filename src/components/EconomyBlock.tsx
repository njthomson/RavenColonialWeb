import { FunctionComponent } from "react";
import { economyColors } from "../site-data";
import { Icon } from "@fluentui/react";

export const EconomyBlock: FunctionComponent<{ economy: string }> = (props) => {

  let sz = 18;

  let economies = props.economy.split(',');

  if (economies[0] === 'near/akhenaten') {
    economies = ['industrial', 'hightech']
  }

  let innerBlock = <></>;
  if (economies.length > 1) {
    const bgColor1 = economyColors[economies[1].split('/', 1)[0]];
    innerBlock = <div style={{
      backgroundColor: bgColor1,
      position: 'relative',
      top: 6,
      left: 0,
      width: sz * 2,
      height: sz * 2,
      rotate: '45deg',
      border: '1px solid rgba(0,0,0,0.5)',
    }} />;
  }

  if (economies.length > 2) {
    // shift innerBlock inside a new innerBlock
    innerBlock.props.style.left = 8;
    innerBlock.props.style.rotate = '0deg';
    const bgColor2 = innerBlock.props.style.backgroundColor;
    innerBlock.props.style.backgroundColor = economyColors[economies[2].split('/', 1)[0]];

    innerBlock = <div style={{
      backgroundColor: bgColor2,
      position: 'relative',
      top: 1,
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
  const bgColor0 = economyColors[economies[0].split('/', 1)[0]];

  return <div
    title={economies[0]}
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
    {isSurface && <Icon
      iconName='GlobeFavorite' style={{ position: 'absolute', left: 3, top: 3, color: 'black' }} />}
  </div>;
};
