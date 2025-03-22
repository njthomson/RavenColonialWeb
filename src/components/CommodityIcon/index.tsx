import "./index.css";

import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { getTypeForCargo } from "../../misc";
import { mapCommodityIcon, mapCommodityType } from "../../types";

export const CommodityIcon: FunctionComponent<{ name: string; }> = (props) => {

  let commodityClass = getTypeForCargo(props.name);
  let iconName = mapCommodityIcon[commodityClass]!;

  if (commodityClass) {
    iconName = mapCommodityIcon[commodityClass]!;
  } else if (props.name in mapCommodityIcon) {
    iconName = mapCommodityIcon[props.name];
  } else {
    console.error(`Unexpected: ${props.name}`);
    commodityClass = 'Unknown';
    iconName = 'ChromeClose';

    mapCommodityType[props.name] = 'xxx';
    console.log(mapCommodityType);
  }

  return <Icon className="commodity-icon" iconName={iconName} title={commodityClass} />;
};
