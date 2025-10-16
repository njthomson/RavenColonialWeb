import * as api from '../../api';
import { Stack, IconButton, Callout, DirectionalHint, ActionButton, ContextualMenu, ContextualMenuItemType, Icon, IContextualMenuItem, Dialog, DefaultButton, DialogFooter, PrimaryButton, Link, Spinner, MessageBar, MessageBarType } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { SiteMap2 } from "../../system-model2";
import { appTheme, cn } from "../../theme";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";
import { ViewEditBuildStatus } from "./ViewEditStatus";
import { ProjectLink2 } from "./ProjectLink2";
import { store } from '../../local-storage';
import { getSiteType } from '../../site-data';

export const SiteCard: FunctionComponent<{ targetId: string, site: SiteMap2, sysView: SystemView2, onClose: () => void }> = (props) => {
  const [confirmBuildIt, setConfirmBuildIt] = useState(false);
  const [pending, setPending] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const site = props.site;
  const isPinned = props.sysView.state.pinnedSite?.id === site.id;
  const couldBuildIt = props.site.status !== 'complete' && !props.site.buildId && !!props.site.buildType;
  const couldRemoveDupes = props.site.status !== 'plan' && !!props.site.buildId;

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
      onDismiss={ev => {
        if (!ev?.defaultPrevented) {
          props.onClose();
        }
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
            sysMap={props.sysView.state.sysMap}
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
          <Stack horizontal verticalAlign='center'>
            <ViewEditBuildStatus
              status={site.status}
              onChange={newStatus => {
                site.original.status = newStatus;
                props.sysView.siteChanged(site.original);
              }}
            />
            <ProjectLink2 site={site} sysView={props.sysView} />
          </Stack>

        </div>

        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
          <IconButton
            className={cn.bBox}
            iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
            title='Pin this site'
            style={{ width: 24, height: 24 }}
            onClick={() => {
              props.sysView.sitePinned(site.id);
            }}
          />

          <IconButton
            className={cn.bBox}
            iconProps={{ iconName: 'Delete' }}
            title='Remove this site'
            style={{ width: 24, height: 24 }}
            onClick={() => props.sysView.siteDeleted(site.id)}
          />

          {couldBuildIt && <ActionButton
            className={cn.bBox}
            iconProps={{ iconName: 'ConstructionCone' }}
            text='Docked? Build it'
            style={{ height: 24 }}
            onClick={() => {
              setErrMsg('');
              setConfirmBuildIt(true);
            }}
          />}

          {couldRemoveDupes && <DeleteSibling site={site} sysView={props.sysView} />}
        </Stack>

      </div>

      {confirmBuildIt && <Dialog
        hidden={false}
        dialogContentProps={{ title: 'Ready to build?', subText: 'If you are currently docked at this construction site, a build project can be created using data from Fontier.' }}
        minWidth={480}
      >
        <div style={{ paddingBottom: 16 }}>
          {getSiteType(props.site.buildType, true)?.displayName2} ({props.site.buildType})
        </div>

        {props.sysView.isDirty() && <div style={{ color: appTheme.palette.yellow }}>
          <Icon className='icon-inline' iconName='Warning' style={{ fontSize: 16, marginRight: 4 }} />
          <span style={{ fontWeight: 'bold' }}>You must save first</span>
        </div>}

        {!store.apiKey && <div style={{ color: appTheme.palette.yellow }}>
          <Icon className='icon-inline' iconName='Warning' style={{ fontSize: 16, marginRight: 4 }} />
          <span style={{ fontWeight: 'bold' }}>You must to <Link onClick={() => { document.getElementById('current-cmdr')?.click(); }}>login</Link> to use this feature</span>
        </div>}

        {!!errMsg && <MessageBar messageBarType={MessageBarType.error}>{errMsg}</MessageBar>}

        <DialogFooter>
          {pending && <Spinner />}
          <DefaultButton text='I am docked here' disabled={pending || !store.apiKey || props.sysView.isDirty()} iconProps={{ iconName: 'CheckMark' }} onClick={async () => {
            setPending(true);
            setErrMsg('');
            try {
              // create the project
              const newProject = await api.project.createFrom(props.site.id);
              // inject buildId in various places, without triggering dirtyness
              if (newProject?.buildId) {
                props.sysView.siteBuilding(props.site.id, newProject);
              }
              setConfirmBuildIt(false);
            } catch (err: any) {
              console.error(err.stack)
              setErrMsg(err.message ?? 'Something failed, see browser console');
            } finally {
              setPending(false);
            }
          }} />
          <PrimaryButton text='Cancel' disabled={pending} iconProps={{ iconName: 'Cancel' }} onClick={() => setConfirmBuildIt(false)} />
        </DialogFooter>
      </Dialog>}
    </Callout>

  </div>;
}

export const DeleteSibling: FunctionComponent<{ site: SiteMap2; sysView: SystemView2 }> = (props) => {
  const [dropDown, setDropDown] = useState(false);

  // if anything is being built on the same body WITHOUT a buildId - offer to remove it
  const matches = props.sysView.state.sysMap.siteMaps.filter(s => !s.buildId && s.bodyNum === props.site.bodyNum && s.buildType === props.site.buildType && s.type.orbital === props.site.type.orbital);
  if (!matches.length) { return null; }

  const id = `pl2r-${Date.now()}`;
  return <div>
    <ActionButton
      id={id}
      className={`${cn.abm} ${cn.bBox}`}
      onClick={() => setDropDown(!dropDown)}
    >
      <Icon iconName={'EngineeringGroup'} style={{ fontSize: 16 }} />
      <span>&nbsp;Remove duplicates</span>
      <Icon className='arr' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} />
    </ActionButton>

    {dropDown && <ContextualMenu
      hidden={!dropDown}
      alignTargetEdge={false}
      target={`#${id}`}
      directionalHint={DirectionalHint.bottomLeftEdge}
      styles={{
        container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer' }
      }}
      onDismiss={(ev) => {
        ev?.preventDefault();
        setDropDown(false);
      }}
      onItemClick={(ev, item) => {
        ev?.preventDefault();
        props.sysView.siteDeleted(item?.data);
      }}
      items={[
        {
          key: 'pl2rh',
          text: 'Delete redundant planning site?',
          itemType: ContextualMenuItemType.Header,
        },
        ...matches.map(s => ({
          key: `pl2rm-${s.id.slice(1)}`,
          data: s.id,
          text: `${s.name}`,
          secondaryText: `${s.type.displayName2} (${s.buildType || '?'})`,
          iconProps: { iconName: s.status === 'plan' ? 'WebAppBuilderFragment' : 'ConstructionCone' },
          className: cn.bBox,
        } as IContextualMenuItem))]}
    />}
  </div>;
}