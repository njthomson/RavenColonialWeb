
import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { appTheme } from "../theme";

export const Chevrons: FunctionComponent<{ name: string, count: number | undefined, extra?: number, title?: string }> = (props) => {
  const neg = props.count && props.count < 0;
  const rootKey = props.name + Date.now().toString();

  const count = Math.abs(props.count ?? 0);
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
      className="icon-inline"
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
    title={props.title}
    style={{
      display: 'inline-block',
      width: (maxCount * w) + 5,
    }}>
    {chevrons}
  </div>;
};
