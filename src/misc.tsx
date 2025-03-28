import './misc.css';
import { FunctionComponent } from "react";
import { mapCommodityIcon, mapCommodityNames, ProjectRefLite, SortMode } from "./types";
import { Icon } from "@fluentui/react";
import { store } from "./local-storage";
import { buildTypes } from './project-create';
import cargoTypes from './assets/cargo-types.json';

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  // {!props.noSys && <><Icon iconName='LocationOutline' /> {props.proj.systemName}: </>}<a href={`#build=${props.proj.buildId}`}><Icon iconName='CityNext2' /> {props.proj.buildName}</a> ({props.proj.buildType})
  return <span className="project-link">
    {!props.noSys && <><a href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</a> : </>}
    <a className="project-name" href={`#build=${props.proj.buildId}`}><Icon iconName='Manufacturing' /> {props.proj.buildName}</a>
    &nbsp;- <BuildType buildType={props.proj.buildType} />
  </span>;
};


export const CommodityIcon: FunctionComponent<{ name: string }> = (props) => {

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

  return <Icon className="commodity-icon" iconName={iconName} title={commodityClass} />;
};


export const CargoRemaining: FunctionComponent<{ sumTotal: number }> = (props) => {
  const cmdr = store.cmdr;
  const tripsLarge = Math.ceil(props.sumTotal / (cmdr?.largeMax ?? 794));
  const tripsMed = Math.ceil(props.sumTotal / (cmdr?.medMax ?? 400));

  return <div className="cargo-remaining hint">
    Remaining cargo to deliver: <span className='grey'>{props.sumTotal.toLocaleString()}</span>
    <br />
    Large ship:<span className='grey'>{tripsLarge} trips</span> or Medium ship:<span className='grey'>{tripsMed} trips</span>
  </div>;
};

export const BuildType: FunctionComponent<{ buildType: string }> = (props) => {

  const match = buildTypes.find(i => i.text.toLowerCase().includes(props.buildType));

  if (!match) {
    console.error(`Why no match for: ${props.buildType} ?`)
    return <span>{props.buildType}</span>;
  }

  // remove the trailing "(aa, bb, cc)" so we can use just the build type in question
  const displayName = match.text.substring(0, match.text.indexOf('('));
  return <span key={`bt${props.buildType}`}>{displayName}({props.buildType})</span>;
};

export const getTypeForCargo = (cargo: string) => {

  const mapCargoType = cargoTypes as Record<string, string[]>;
  for (const type in mapCargoType) {
    if (mapCargoType[type].includes(mapCommodityNames[cargo]))
      return type;
  }

  console.warn(`Unexpected type for cargo: ${cargo}`);
  return '?';
};

export const getGroupedCommodities = (cargoNames: string[], sort: SortMode): Record<string, string[]> => {

  const sorted = cargoNames
  sorted.sort();

  // just alpha sort
  if (sort === SortMode.alpha) {
    return { alpha: sorted };
  }

  const dd = sorted.reduce((d, c) => {
    const t = getTypeForCargo(c);
    if (!d[t]) d[t] = [];
    d[t].push(c);

    return d;
  }, {} as Record<string, string[]>);
  return dd;
};

export const flattenObj = (obj: Record<string, string[]>): string[] => {
  const list: string[] = [];
  const sortedKeys = Object.keys(obj);
  sortedKeys.sort();

  for (const key of sortedKeys) {
    list.push(key);
    list.push(...obj[key]);
  }

  return list;
};
