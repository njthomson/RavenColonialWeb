import { Icon, Link } from "@fluentui/react";
import { FunctionComponent } from "react";
import { BuildTypeDisplay } from '..';
import { ProjectRefLite } from "../../types";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
  noBold?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  return <span className="project-link">
    {!props.noSys && <><Link href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</Link> : </>}
    <Link
      className="project-name"
      href={`#build=${props.proj.buildId}`}
      style={{ fontWeight: props.noBold ? 'normal' : 'bold' }}
    >
      <Icon iconName='Manufacturing' /> {props.proj.buildName}
    </Link>
    &nbsp;- <BuildTypeDisplay buildType={props.proj.buildType} />
  </span>;
};