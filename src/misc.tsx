import './misc.css';
import { FunctionComponent } from "react";
import { mapCommodityIcon, mapCommodityType, ProjectRefLite } from "./types";
import { Icon } from "@fluentui/react";
import { Store } from "./local-storage";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  // {!props.noSys && <><Icon iconName='LocationOutline' /> {props.proj.systemName}: </>}<a href={`#build=${props.proj.buildId}`}><Icon iconName='CityNext2' /> {props.proj.buildName}</a> ({props.proj.buildType})
  return <span className="project-link">
    {!props.noSys && <><a href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</a> : </>}<a className="project-name" href={`#build=${props.proj.buildId}`}><Icon iconName='Manufacturing' /> {props.proj.buildName}</a> ({props.proj.buildType})
  </span>;
};


export const CommodityIcon: FunctionComponent<{ name: string }> = (props) => {

  let commodityClass = '';
  let iconName = '';

  if (props.name in mapCommodityType) {
    commodityClass = mapCommodityType[props.name];
    iconName = mapCommodityIcon[commodityClass]!;
  } else if (props.name in mapCommodityIcon) {
    commodityClass = props.name;
    iconName = mapCommodityIcon[props.name];
  } else {
    console.error(`Unexpected: ${props.name}`);
    commodityClass = 'Unknown';
    iconName = 'Close';

    mapCommodityType[props.name] = 'xxx'
    console.log(mapCommodityType);
  }

  return <Icon className="commodity-icon" iconName={iconName} title={commodityClass} />;
};


export const CargoRemaining: FunctionComponent<{ sumTotal: number }> = (props) => {
  const cmdr = Store.getCmdr();
  const tripsLarge = Math.ceil(props.sumTotal / (cmdr?.largeMax ?? 794));
  const tripsMed = Math.ceil(props.sumTotal / (cmdr?.medMax ?? 400));

  return <div className="cargo-remaining hint">
    Remaining cargo to deliver: <span className='grey'>{props.sumTotal.toLocaleString()}</span>
    <br />
    Large ship:<span className='grey'>{tripsLarge} trips</span> or Medium ship:<span className='grey'>{tripsMed} trips</span>
  </div>;
};
