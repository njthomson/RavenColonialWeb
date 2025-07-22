import * as api from '../../api';
import { ActionButton, Icon, Link, Stack } from "@fluentui/react";
import { FunctionComponent, useMemo, useState } from "react";
import { SystemView2 } from "./SystemView2";
import { ChartGeneralProgress } from "../../components";
import { mapStatusIcon } from "./ViewEditStatus";
import { Project } from "../../types";
import { Site } from '../../types2';
import { appTheme, cn } from '../../theme';
import { HaulList } from './HaulList';

export const ProjectLink2: FunctionComponent<{ site: Site; sysView: SystemView2; bigLink?: boolean; }> = (props) => {
  let showChart = false;
  const [proj, setProj] = useState<Project | undefined | null>(undefined);

  useMemo(async () => {
    if (props.site.status !== 'build' || !props.site.buildId) {
      // make no request
      return undefined;
    } else if (typeof props.sysView.state.activeProjects[props.site.buildId] === 'undefined') {
      // make a request
      try {
        const p = await api.project.get(props.site.buildId);
        props.sysView.state.activeProjects[p.buildId] = p ?? null!;
        return p;
      } catch (err: any) {
        if (err.statusCode !== 404) {
          // ignore cases where a project is not found
          console.error(`ProjectLink2: getProject: ${err.stack}`);
        }
      }
    } else {
      // use cached value
      return props.sysView.state.activeProjects[props.site.buildId];
    }
  }, [props.site, props.sysView.state.activeProjects]).then(proj => {
    setProj(proj);
  });

  if (props.site.status !== 'complete' && !props.site.buildId) {
    return <HaulList buildTypes={[props.site.buildType]} />;
  }

  if (!props.site.buildId) { return null; }

  let progressElement = <></>;
  if (proj) {
    const progress = (100 - (100 / proj.maxNeed * proj.sumNeed));
    progressElement = <Stack horizontal verticalAlign='center' horizontalAlign='start'>
      <div style={{ width: 160, height: 20, padding: 0, margin: '10px 10px 0 10px' }}>
        <ChartGeneralProgress progress={proj.maxNeed - proj.sumNeed} maxNeed={proj.maxNeed} readyOnFC={0} minimal width={160} />
      </div>
      <div>{progress.toFixed(0)}%</div>
    </Stack>
    showChart = true;
  }

  if (props.bigLink) {
    return <>
      <Link
        title='Open project page'
        className={`${cn.bBox} ${cn.ibText}`}
        href={`${window.location.origin}/#build=${props.site.buildId}`}
        target='build'
        style={{ display: 'inline-block', padding: '0px 6px', textDecoration: 'none' }}
      >
        <Stack horizontal verticalAlign='center'>
          <span>{props.site.name}</span>
          <Icon iconName={mapStatusIcon.build} style={{ marginLeft: 4, fontSize: 14, color: appTheme.palette.yellowDark }} />
        </Stack>
        <Stack horizontal verticalAlign='center'>
          {progressElement}
          {!proj && <span style={{ color: appTheme.palette.themeTertiary, marginRight: 10 }}>Loading ... </span>}
          <Icon iconName='OpenInNewWindow' style={{ marginLeft: 4, fontSize: 12 }} />
        </Stack>
      </Link>
    </>;
  }
  return <>
    <ActionButton
      iconProps={{ iconName: mapStatusIcon[props.site.status], style: { color: appTheme.palette.yellowDark } }}
      title='Open project page'
      className={cn.bBox}
      href={`${window.location.origin}/#build=${props.site.buildId}`}
      target='build'
    >
      {!showChart && <>View project</>}
      {showChart && progressElement}
      <Icon iconName='OpenInNewWindow' style={{ marginLeft: 4, fontSize: 12 }} />
    </ActionButton>
  </>;
}
