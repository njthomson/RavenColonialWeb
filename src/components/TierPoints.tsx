import { Stack, Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { appTheme } from "../theme";
import { asPosNegTxt } from "../util";

export const TierPoint: FunctionComponent<{ tier: number, count: number, disabled?: boolean, titlePrefix?: string }> = (props) => {
  if (props.tier !== 2 && props.tier !== 3) return null;

  let { disabled } = props;
  if (typeof props.count === 'undefined') {
    disabled = true;
  }

  const title = disabled ? '' :
    props.titlePrefix
      ? `${props.titlePrefix} ${asPosNegTxt(Math.abs(props.count))} Tier ${props.tier} points`
      : `${asPosNegTxt(props.count)} Tier ${props.tier} points`;

  let iconColor = props.disabled ? 'grey' : (props.tier === 2 ? appTheme.palette.yellow : appTheme.palette.green);


  return <Stack
    title={title}
    horizontal
    verticalAlign='center'
    tokens={{ childrenGap: 8 }}
    style={{ display: 'inline-block', cursor: 'default' }}
  >
    <span>
      {props.disabled && <span style={{ color: 'grey' }}>--</span>}
      {!props.disabled && asPosNegTxt(props.count)}
      &nbsp;
      <Icon
        className="icon-inline"
        iconName={props.tier === 2 ? 'Product' : 'ProductVariant'}
        style={{ color: iconColor }}
      />
    </span>
  </Stack>;
};
