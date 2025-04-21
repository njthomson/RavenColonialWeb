import "./ProjectLink.css";

import { Icon, Link } from "@fluentui/react";
import { FunctionComponent } from "react";
import { BuildTypeDisplay } from '..';
import { ProjectRefLite } from "../../types";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  // {!props.noSys && <><Icon iconName='LocationOutline' /> {props.proj.systemName}: </>}<Link href={`#build=${props.proj.buildId}`}><Icon iconName='CityNext2' /> {props.proj.buildName}</Link> ({props.proj.buildType})
  return <span className="project-link">
    {!props.noSys && <><Link href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</Link> : </>}
    <Link className="project-name" href={`#build=${props.proj.buildId}`}><Icon iconName='Manufacturing' /> {props.proj.buildName}</Link>
    &nbsp;- <BuildTypeDisplay buildType={props.proj.buildType} />
  </span>;
};