import { ActionButton, Callout, ContextualMenu, ContextualMenuItemType, DefaultButton, Dialog, DialogFooter, DirectionalHint, Icon, IconButton, IContextualMenuItem, Link, MessageBar, MessageBarType, PrimaryButton, Spinner, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import * as api from '../../api';
import { TierPoint } from '../../components/TierPoints';
import { store } from '../../local-storage';
import { getSiteType } from '../../site-data';
import { SiteMap2 } from "../../system-model2";
import { appTheme, cn } from "../../theme";
import { ProjectLink2 } from "./ProjectLink2";
import { SystemView2 } from "./SystemView2";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ViewEditName } from "./ViewEditName";
import { ViewEditBuildStatus } from "./ViewEditStatus";

export const SiteCard: FunctionComponent<{ targetId: string, site: SiteMap2, sysView: SystemView2, onClose: () => void }> = (props) => {
  const [confirmBuildIt, setConfirmBuildIt] = useState(false);
  const [pending, setPending] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [buildType, setBuildType] = useState<string>('');
  const site = props.site;
  const isPinned = props.sysView.state.pinnedSite?.id === site.id;
  const couldBuildIt = props.site.status !== 'complete' && !props.site.buildId && !!props.site.buildType;
  const couldRemoveDupes = props.site.status !== 'plan' && !!props.site.buildId;
  const vagueBuildType = props.site.buildType?.endsWith('?');

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

        <div style={{ float: 'right', marginTop: 2 }}>
          {site.type.needs.count > 0 && <TierPoint tier={site.type.needs.tier} count={-site.type.needs.count} titlePrefix='Needs' />}
          {site.type.gives.count > 0 && <TierPoint tier={site.type.gives.tier} count={site.type.gives.count} titlePrefix='Gives' />}
        </div>

        <IconButton
          className={cn.bBox}
          iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
          title={`Pin this site to see:\n• Estimated economies and commodities\n• Strong and weak links\n• System effects`}
          style={{ position: 'absolute', right: 4, top: 4, width: 24, height: 24 }}
          onClick={() => {
            props.sysView.sitePinned(site.id);
          }}
        />

        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>

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
        dialogContentProps={{ title: 'Ready to build?', subText: 'If you are currently docked at this construction site, a build project can be created using data from Frontier.' }}
        minWidth={480}
      >
        {!vagueBuildType && <div style={{ paddingBottom: 16 }}>
          {getSiteType(props.site.buildType, true)?.displayName2} ({props.site.buildType})
        </div>}

        {vagueBuildType && <div>
          <div style={{ color: appTheme.palette.yellow }}>
            <Icon className='icon-inline' iconName='Warning' style={{ fontSize: 16, marginRight: 4 }} />
            <span>Please choose an explicit build type:</span>
          </div>
          <Stack horizontal wrap tokens={{ childrenGap: 8 }} style={{ margin: 8 }}>
            {getSiteType(site.buildType)?.subTypes.map(st => <ActionButton
              className={cn.bBox2}
              key={`mbt-${st}`}
              iconProps={{ iconName: buildType === st ? 'SkypeCheck' : undefined }}
              style={{ height: 22, textTransform: 'capitalize' }}
              text={st}
              onClick={() => setBuildType(st)}
            />)}
          </Stack>
        </div>}

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
          <DefaultButton text='I am docked here' disabled={pending || !store.apiKey || props.sysView.isDirty() || !!errMsg || (vagueBuildType && !buildType)} iconProps={{ iconName: 'CheckMark' }} onClick={async () => {
            setPending(true);
            setErrMsg('');
            try {
              // create the project
              const newProject = await api.project.createFrom(props.sysView.state.sysMap.id64, props.site.id, buildType);
              // inject buildId in various places, without triggering dirtyness
              if (newProject?.buildId) {
                props.sysView.siteBuilding(props.site.id, newProject);
              }
              setConfirmBuildIt(false);
            } catch (err: any) {
              if (err.statusCode === 409) {
                setErrMsg('A build project has already beed created. Please reload the page.');
              } else if (err.statusCode === 424) {
                // show special message for Epic users
                window.alert(`✋ Frontier/Epic account link expired?\n\nPlease start playing the game with your Epic account and try again.`);
              } else if (err.statusCode === 418) {
                window.alert(`Frontier servers appear to be offline. Please try again later.`);
              } else {
                console.error(err.stack)
                setErrMsg(err.message ?? 'Something failed, see browser console');
              }
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