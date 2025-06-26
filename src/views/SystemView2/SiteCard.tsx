import { Stack, IconButton, Callout, DirectionalHint } from "@fluentui/react";
import { FunctionComponent } from "react";
import { SiteMap2 } from "../../system-model2";
import { appTheme } from "../../theme";
import { mapStatus } from "./SitesTableView";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";

export const SiteCard: FunctionComponent<{ targetId: string, site: SiteMap2, sysView: SystemView2, onClose: () => void }> = (props) => {
  const s = props.site;
  const isPinned = props.sysView.state.pinnedSite?.id === s.id;

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
      onDismiss={() => props.onClose()}
      dismissOnTargetClick={true}
    >
      <div className='system-view2' style={{ position: 'relative', padding: 10 }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'max-content max-content',
          gap: '2px 10px',
          fontSize: '14px',
          marginBottom: 10,
        }}>

          <div>Site:</div>
          <h2>
            <ViewEditName
              name={s.name}
              onChange={newName => {
                s.original.name = newName;
                props.sysView.siteChanged(s.original);
              }}
            />
          </h2>

          <div>Type:</div>
          <ViewEditBuildType
            buildType={s.buildType}
            onChange={(newType) => {
              s.original.buildType = newType;
              props.sysView.siteChanged(s.original);
            }}
          />

          <div>Body:</div>
          <ViewEditBody
            bodyNum={s.bodyNum}
            systemName={props.sysView.state.sysMap.name}
            bodies={props.sysView.state.sysMap.bodies}
            bodyMap={props.sysView.state.sysMap.bodyMap}
            pinnedSiteId={props.sysView.state.pinnedSite?.id}
            onChange={newNum => {
              s.original.bodyNum = newNum;
              props.sysView.siteChanged(s.original);
            }}
          />

          <div>Status:</div>
          <div>{mapStatus[s.status]}</div>

        </div>

        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <IconButton
            iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
            text='Pin?'
            title='Pin this site'
            onClick={() => {
              props.sysView.sitePinned(s.id);
            }}
          />

          <IconButton
            iconProps={{ iconName: 'Delete' }}
            text='Delete'
            title='Remove this site'
            onClick={() => props.sysView.siteDeleted(s.id)}
          />

        </Stack>
      </div>
    </Callout>

  </div>;
}

