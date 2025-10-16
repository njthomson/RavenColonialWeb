
import { Callout, DirectionalHint, IconButton } from "@fluentui/react";
import { CSSProperties, FunctionComponent, useState } from "react";
import { appTheme, cn } from "../theme";

let nn = 0;

export const CalloutMsg: FunctionComponent<{ msg: string | JSX.Element; iconName?: string; width?: number; height?: number; iconStyle?: CSSProperties; directionalHint?: DirectionalHint }> = (props) => {
  const [showBubble, setShowBubble] = useState(false);
  const [cid] = useState(`cid--${++nn}`);
  return <span id={cid}>
    <IconButton
      className={cn.bBox}
      iconProps={{
        iconName: props.iconName ?? 'Info',
        style: { ...props.iconStyle }
      }}
      style={{
        width: props.width ?? 18,
        height: props.height ?? 18,
        padding: 0,
        margin: 0,
      }}
      onClick={ev => {
        ev.preventDefault();
        setShowBubble(!showBubble);
      }}
    />

    {showBubble && <Callout
      directionalHint={props.directionalHint}
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
      target={`#${cid}`}
    >
      {props.msg}
    </Callout>}
  </span>;
};
