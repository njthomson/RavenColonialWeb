
import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { cn } from "../theme";

export const CopyButton: FunctionComponent<{ text: string | ClipboardItem, title?: string, fontSize?: number | undefined }> = (props) => {
  return <Icon
    className={`icon-btn ${cn.btn}`}
    iconName='Copy'
    title={props.title ?? `Copy: "${props.text.toString()}"`}
    style={{ fontSize: props.fontSize, userSelect: 'none' }}
    onClick={(ev) => {
      ev.stopPropagation();
      if (typeof props.text === 'string') {
        // write a plain string
        navigator.clipboard.writeText(props.text);
      } else {
        // write the given items
        navigator.clipboard.write([props.text]);
      }
    }}
  />;
};
