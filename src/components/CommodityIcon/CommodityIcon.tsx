import "./CommodityIcon.css";

import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { getTypeForCargo } from "../../util";
import { mapCommodityIcon } from "../../types";

export const CommodityIcon: FunctionComponent<{ name: string; }> = (props) => {

  let commodityClass = '';
  let iconName = '';

  if (props.name in mapCommodityIcon) {
    commodityClass = props.name;

    iconName = mapCommodityIcon[props.name];
  }
  if (!iconName) {
    commodityClass = getTypeForCargo(props.name);
    iconName = mapCommodityIcon[commodityClass]!;
  }
  if (!iconName) {
    console.error(`Unexpected: ${props.name}`);
    commodityClass = 'Unknown';
    iconName = 'ChromeClose';
  }

  return <Icon className="commodity-icon icon-inline" iconName={iconName} title={commodityClass} />;
};
