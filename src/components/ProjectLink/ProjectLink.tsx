import { Icon, Link } from "@fluentui/react";
import { FunctionComponent } from "react";
import { BuildTypeDisplay } from '..';
import { ProjectRefLite } from "../../types";
import { appTheme } from "../../theme";
import { SiteMap2 } from "../../system-model2";

interface ProjectLinkProps {
  proj: ProjectRefLite;
  noSys?: boolean;
  noBold?: boolean;
  noType?: boolean;
  iconName?: string;
  greyIncomplete?: boolean;
}

export const ProjectLink: FunctionComponent<ProjectLinkProps> = (props) => {
  let color = props.proj.isMock ? appTheme.palette.yellowDark : undefined;
  if (props.greyIncomplete && !props.proj.complete) {
    color = 'grey'; //appTheme.palette.neutralTertiary;
  }

  return <span
    className="project-link" style={{
      color,
      fontStyle: props.proj.isMock ? 'italic' : undefined
    }}
  >
    {!props.noSys && <><Link href={`#sys=${encodeURIComponent(props.proj.systemName)}`}>{props.proj.systemName}</Link> : </>}

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

    {!props.noType && <>
      &nbsp;- <BuildTypeDisplay buildType={props.proj.buildType} />

      {props.proj.isPrimaryPort && <Icon className='icon-inline' iconName='CrownSolid' style={{ marginLeft: 8, fontWeight: 'bold' }} title='System primary port' />}
    </>}
  </span>;
};

interface ProjectLink2Props extends Omit<ProjectLinkProps, 'proj'> {
  site: SiteMap2;
}

export const SiteLink: FunctionComponent<ProjectLink2Props> = (props) => {
  let color = props.site.status === 'plan' ? appTheme.palette.yellowDark : undefined;
  if (props.greyIncomplete && props.site.status !== 'complete') {
    color = 'grey'; //appTheme.palette.neutralTertiary;
  }

  return <span
    className="project-link" style={{
      color,
      fontStyle: props.site.status === 'plan' ? 'italic' : undefined
    }}
  >
    {!props.noSys && <><Link href={`#sys=${encodeURIComponent(props.site.sys.name)}`}>{props.site.sys.name}</Link> : </>}

    <Link
      disabled={props.site.status === 'plan'}
      className="project-name"
      href={`#build=${props.site.buildId}`}
      style={{
        fontWeight: props.noBold ? 'normal' : 'bold',
        color,
      }}
    >
      <Icon iconName={props.iconName || 'Manufacturing'} /> {props.site.name}
    </Link>

    {!props.noType && <>
      &nbsp;- <BuildTypeDisplay buildType={props.site.buildType} />

      {props.site.id === props.site.sys.primaryPortId && <Icon className='icon-inline' iconName='CrownSolid' style={{ marginLeft: 8, fontWeight: 'bold' }} title='System primary port' />}
    </>}
  </span>;
};