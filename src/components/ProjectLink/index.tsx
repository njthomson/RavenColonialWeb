import "./index.css";

import { Icon } from "@fluentui/react";
import { FunctionComponent } from "react";
import { BuildTypeDisplay } from '../';
import { ProjectRefLite } from "../../types";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  // {!props.noSys && <><Icon iconName='LocationOutline' /> {props.proj.systemName}: </>}<a href={`#build=${props.proj.buildId}`}><Icon iconName='CityNext2' /> {props.proj.buildName}</a> ({props.proj.buildType})
  return <span className="project-link">
    {!props.noSys && <><a href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</a> : </>}
    <a className="project-name" href={`#build=${props.proj.buildId}`}><Icon iconName='Manufacturing' /> {props.proj.buildName}</a>
    &nbsp;- <BuildTypeDisplay buildType={props.proj.buildType} />
  </span>;
};