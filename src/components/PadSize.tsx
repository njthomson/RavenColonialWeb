import { FunctionComponent } from "react";
import { cn } from "../theme";

export const PadSize: FunctionComponent<{ size: string }> = (props) => {
  if (!props.size || props.size === 'none') return <></>;

  // assume large and reduce as needed
  let w = 20;
  let t = 'L';
  if (props.size === 'medium') {
    w = 13;
    t = 'M';
  } else if (props.size === 'small') {
    w = 7;
    t = 'S';
  }

  return <div
    className={`pad-size ${cn.padSize}`}
    title={`Pad size: ${props.size}`}
    style={{
      display: 'inline-block',
      marginLeft: 4,
      width: w,
      height: 10,
    }}
  >
    <span style={{ position: 'relative', top: -2 }}>{t}</span>
  </div>;
};
