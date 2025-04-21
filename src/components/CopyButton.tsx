
import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { cn } from "../theme";

export const CopyButton: FunctionComponent<{ text: string; }> = (props) => {
  return <Icon
    className={`icon-btn ${cn.btn}`}
    iconName='Copy'
    title={`Copy: "${props.text}"`}
    onClick={() => {
      navigator.clipboard.writeText(props.text);
    }}
  />;
};
