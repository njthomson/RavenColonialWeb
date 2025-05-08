
import { Icon, Stack } from "@fluentui/react";
import { FunctionComponent } from "react";
import { asPosNegTxt } from "../util";
import { appTheme } from "../theme";

export const Chevrons: FunctionComponent<{ name: string, count: number, extra?: number }> = (props) => {
  const neg = props.count < 0;
  const rootKey = props.name + Date.now().toString();

  const count = Math.abs(props.count);
  const maxCount = count + (props.extra ?? 0);
  if (maxCount === 0) return null;

  const w = 6;

  const chevrons = [];
  for (let n = 0; n < maxCount; n++) {

    let color = neg ? appTheme.palette.red : appTheme.palette.green;
    if (n >= count) {
      color = neg ? appTheme.palette.redDark : appTheme.palette.greenLight;
    }

    const nextIcon = <Icon
      key={`${rootKey}${n}`}
      iconName={neg ? 'ChevronLeftSmall' : 'ChevronRightSmall'}
      style={{
        width: w,
        color: color
      }}
    />;
    if (neg) {
      chevrons.unshift(nextIcon);
    } else {
      chevrons.push(nextIcon);
    }
  }

  return <div
    // title={`${props.name}: ${asPosNegTxt(props.count)}`}
    style={{
      display: 'inline-block',
      width: (maxCount * w) + 5,
    }}>
    {chevrons}
  </div>;
};

export const TierPoints: FunctionComponent<{ tier: number, count: number }> = (props) => {
  if (props.tier !== 2 && props.tier !== 3) return null;

  const title = `${asPosNegTxt(props.count)} Tier ${props.tier} points`;

  return <Stack
    title={title}
    horizontal
    verticalAlign='center'
    tokens={{ childrenGap: 8 }}
    style={{ display: 'inline-block', cursor: 'default' }}
  >
    <span>
      {props.count}
      &nbsp;
      <Icon
        iconName={props.tier === 2 ? 'Product' : 'ProductVariant'}
        style={{
          color: props.tier === 2 ? appTheme.palette.yellow : appTheme.palette.green
        }} />
    </span>
  </Stack>;
};
