import { Stack, IconButton, Callout, DirectionalHint } from "@fluentui/react";
import { FunctionComponent } from "react";
import { SiteMap2 } from "../../system-model2";
import { appTheme } from "../../theme";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";
import { ViewEditBuildStatus } from "./ViewEditStatus";
import { ProjectLink2 } from "./ProjectLink2";

export const SiteCard: FunctionComponent<{ targetId: string, site: SiteMap2, sysView: SystemView2, onClose: () => void }> = (props) => {
  const site = props.site;
  const isPinned = props.sysView.state.pinnedSite?.id === site.id;

  return <div>

    <Callout
      target={`#${props.targetId}`}
      setInitialFocus
      isBeakVisible={false}
      alignTargetEdge
      directionalHint={DirectionalHint.rightCenter}
      style={{
        border: '1px solid ' + appTheme.palette.themePrimary,
        padding: 0,
      }}
      styles={{
        calloutMain: {
          boxShadow: `${appTheme.palette.blackTranslucent40}  -1px 0px 20px 10px`,
        }
      }}
      role="dialog"
      onDismiss={() => {
        props.onClose();
      }}
      dismissOnTargetClick={true}
    >
      <div className='system-view2' style={{ position: 'relative', padding: 10 }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'max-content max-content',
          gap: '2px 10px',
          fontSize: '14px',
          marginBottom: 10,
          alignItems: 'center'
        }}>

          <div>Site:</div>
          <h2>
            <ViewEditName
              name={site.name}
              onChange={newName => {
                site.original.name = newName;
                props.sysView.siteChanged(site.original);
              }}
            />
          </h2>

          <div>Type:</div>
          <ViewEditBuildType
            buildType={site.buildType}
            onChange={(newType) => {
              site.original.buildType = newType;
              props.sysView.siteChanged(site.original);
            }}
          />

          <div>Body:</div>
          <ViewEditBody
            bodyNum={site.bodyNum}
            systemName={props.sysView.state.sysMap.name}
            bodies={props.sysView.state.sysMap.bodies}
            bodyMap={props.sysView.state.sysMap.bodyMap}
            pinnedSiteId={props.sysView.state.pinnedSite?.id}
            onChange={newNum => {
              site.original.bodyNum = newNum;
              props.sysView.siteChanged(site.original);
            }}
          />

          <div>Status:</div>
          <Stack horizontal verticalAlign='center' style={{ alignItems: 'center' }}>
            <ViewEditBuildStatus
              status={site.status}
              onChange={newStatus => {
                site.original.status = newStatus;
                props.sysView.siteChanged(site.original);
              }}
            />
            <ProjectLink2 status={site.status} buildId={site.buildId} sysView={props.sysView} />
          </Stack>

        </div>

        <Stack horizontal verticalAlign='baseline' tokens={{ childrenGap: 10 }}>
          <IconButton
            iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
            title='Pin this site'
            onClick={() => {
              props.sysView.sitePinned(site.id);
            }}
          />

          <IconButton
            iconProps={{ iconName: 'Delete' }}
            title='Remove this site'
            onClick={() => props.sysView.siteDeleted(site.id)}
          />

        </Stack>

      </div>
    </Callout>

  </div>;
}

