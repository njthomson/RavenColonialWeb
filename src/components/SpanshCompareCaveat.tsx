import { CSSProperties, FunctionComponent } from "react";
import { Icon } from "@fluentui/react";
import { appTheme } from "../theme";
import {
  SPANSH_COMPARE_LIMITED_BODY,
  SPANSH_COMPARE_LIMITED_TITLE,
} from "../economy/compare/spansh-compare-reliability";

export const SpanshCompareCaveat: FunctionComponent<{ compact?: boolean; style?: CSSProperties }> = (props) => {
  const colorYellow = appTheme.isInverted ? appTheme.palette.yellow : "goldenrod";

  return (
    <div
      style={{
        fontSize: 11,
        color: appTheme.palette.neutralSecondary,
        marginBottom: props.compact ? 4 : 8,
        ...props.style,
      }}
      title={props.compact ? SPANSH_COMPARE_LIMITED_BODY : undefined}
    >
      <Icon iconName="Warning" style={{ color: colorYellow, marginRight: 4 }} className="icon-inline" />
      {props.compact ? SPANSH_COMPARE_LIMITED_TITLE : (
        <>
          <span style={{ fontWeight: 600, color: colorYellow }}>{SPANSH_COMPARE_LIMITED_TITLE}. </span>
          {SPANSH_COMPARE_LIMITED_BODY}
        </>
      )}
    </div>
  );
};
