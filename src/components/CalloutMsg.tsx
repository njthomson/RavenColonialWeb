
import { Callout, Icon } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme } from "../theme";

export const CalloutMsg: FunctionComponent<{ id: string, msg: string | JSX.Element; marginLeft?: number; }> = (props) => {
  const [showBubble, setShowBubble] = useState(false);
  return <>
    <Icon
      className='small'
      iconName='Info'
      style={{ marginLeft: props.marginLeft }}
      onClick={() => setShowBubble(!showBubble)}
    />

    {showBubble && <Callout
      styles={{
        beak: {
          backgroundColor: appTheme.palette.themeTertiary,
        },
        calloutMain: {
          backgroundColor: appTheme.palette.themeTertiary,
          color: appTheme.palette.neutralDark,
        }
      }}
      onDismiss={() => setTimeout(() => setShowBubble(false), 0)}
      target={`#${props.id}`}
    >
      {props.msg}
    </Callout>}
  </>;
};
