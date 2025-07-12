import * as api from '../../api';
import { ActionButton, Icon, Stack } from "@fluentui/react";
import { FunctionComponent, useMemo, useState } from "react";
import { BuildStatus } from "../../types2";
import { SystemView2 } from "./SystemView2";
import { ChartGeneralProgress } from "../../components";
import { mapStatusIcon } from "./ViewEditStatus";
import { Project } from "../../types";

export const ProjectLink2: FunctionComponent<{ status: BuildStatus, buildId: string, sysView: SystemView2 }> = (props) => {
  let showChart = false;
  const [proj, setProj] = useState<Project | undefined | null>(undefined);

  useMemo(async () => {
    if (props.status !== 'build' || !props.buildId) {
      // make no request
      return undefined;
    } else if (typeof props.sysView.state.activeProjects[props.buildId] === 'undefined') {
      // make a request
      try {
        const p = await api.project.get(props.buildId);
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
      return props.sysView.state.activeProjects[props.buildId];
    }
  }, [props.status, props.buildId, props.sysView.state.activeProjects]).then(proj => {
    setProj(proj);
  });

  if (props.status === 'plan' || !props.buildId) { return null; }

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

  return <>
    <ActionButton
      iconProps={{ iconName: mapStatusIcon[props.status] }}
      title='Open project page'
      href={`${window.location.origin}/#build=${props.buildId}`}
      target='build'
    >
      {!showChart && <>View project</>}
      {showChart && progressElement}
      <Icon iconName='OpenInNewWindow' style={{ marginLeft: 4, fontSize: 12 }} />
    </ActionButton >
  </>;
}
