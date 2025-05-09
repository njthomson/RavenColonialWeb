import { Icon, Link } from "@fluentui/react";
import { FunctionComponent } from "react";
import { BuildTypeDisplay } from '..';
import { ProjectRefLite } from "../../types";
import { appTheme } from "../../theme";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
  noBold?: boolean;
  iconName?: string;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  const color = props.proj.isMock ? appTheme.palette.yellowDark : undefined;

  return <span className="project-link" style={{ color, fontStyle: props.proj.isMock ? 'italic' : undefined }}>
    {!props.noSys && <><Link href={`#find=${props.proj.systemName}`}>{props.proj.systemName}</Link> : </>}

    <Link
      disabled={props.proj.isMock}
      className="project-name"
      href={`#build=${props.proj.buildId}`}
      style={{
        fontWeight: props.noBold ? 'normal' : 'bold',
        color,
      }}
    >
      <Icon iconName={props.iconName || 'Manufacturing'} /> {props.proj.buildName}
    </Link>

    &nbsp;- <BuildTypeDisplay buildType={props.proj.buildType} />

    {props.proj.isPrimaryPort && <Icon className='icon-inline' iconName='CrownSolid' style={{ marginLeft: 8, fontWeight: 'bold' }} title='System primary port' />}
  </span>;
};