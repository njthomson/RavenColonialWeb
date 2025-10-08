import { Callout, DirectionalHint, ActionButton, Icon, ContextualMenu, Link, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";
import { ReserveLevel } from "../../types";
import { isMobile } from "../../util";
import { Sys } from "../../types2";
import { store } from "../../local-storage";

export const SystemCard: FunctionComponent<{ targetId: string, sysView: SystemView2, onClose: () => void }> = (props) => {
  const { sysMap, sysOriginal, canEditAsArchitect } = props.sysView.state;
  const [dropDown, setDropDown] = useState(false);
  const [showStuckHelp, setShowStuckHelp] = useState(false);

  const isOpen = sysMap.open;

  return <div>

    <Callout
      target={`#${props.targetId}`}
      setInitialFocus
      isBeakVisible={false}
      alignTargetEdge
      directionalHint={DirectionalHint.bottomLeftEdge}
      preventDismissOnScroll={isMobile()}
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
    >
      <div className='system-view2' style={{ position: 'relative', padding: 10 }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'max-content max-content',
          gap: '2px 10px',
          fontSize: '14px',
          alignItems: 'center'
        }}>

          <div>Architect:</div>
          <Stack horizontal verticalAlign='center'>
            {!canEditAsArchitect && <span style={{ cursor: 'default' }}>Cmdr {sysMap.architect}</span>}
            {canEditAsArchitect && <ViewEditName
              name={sysMap.architect || '?'}
              prefix='Cmdr '
              onChange={newName => {
                sysMap.architect = newName;
                props.sysView.setState({ sysMap: sysMap });
              }}
            />}
          </Stack>

          <div>Reserve level:</div>
          <ActionButton
            id={`drop-reserve-level`}
            style={{ justifyContent: 'left' }}
            onClick={(ev) => {
              ev.preventDefault();
              setDropDown(!dropDown);
            }}
          >
            {sysMap.reserveLevel ?? 'Unknown'}
            <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
          </ActionButton>

        </div>

        <div
          className={cn.bt}
          style={{
            marginTop: 8,
            paddingTop: 8,
            display: 'grid',
            gridTemplateColumns: 'max-content max-content',
            gap: '2px 10px',
            fontSize: '14px',
            alignItems: 'baseline',
          }}>

          <div>Edit security:</div>
          <div>
            <ActionButton
              className={cn.bBox}
              iconProps={{ iconName: isOpen ? 'Unlock' : 'LockSolid', style: { fontSize: 12 } }}
              text={isOpen ? 'Open' : 'Secured'}
              title='Only architects can edit a secured system'
              disabled={!canEditAsArchitect}
              onClick={() => {
                props.sysView.updateOpen(!isOpen);
              }}
            />
          </div>

          <div />
          <div>
            <ActionButton
              className={cn.bBox}
              iconProps={{ iconName: 'Download', style: { fontSize: 12 } }}
              text='Download'
              title='Download a copy of this system'
              onClick={() => {
                // download original state
                const json = serializeSystem(props.sysView);
                const blob = new Blob([json], { type: 'text/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${props.sysView.state.systemName}_#${sysOriginal.rev}_${store.cmdrName}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
            <ActionButton
              className={cn.bBox}
              iconProps={{ iconName: 'Upload', style: { fontSize: 12 } }}
              text='Restore'
              title='Restore data from a download'
              onClick={() => {
                document.getElementById('backupRestore')?.click();
              }}
            />
            <input
              type="file"
              id="backupRestore"
              style={{ display: 'none' }}
              onChange={async (ev) => {
                if (ev.target.files?.length !== 1) { return; }
                const json = await ev.target.files[0].text();
                const newSys = JSON.parse(json) as Sys;
                props.sysView.useLoadedData(newSys)
              }}
            />
          </div>

        </div>

        {!canEditAsArchitect && <div style={{ textAlign: 'center' }}>
          <Link id='sys-card-stuck' style={{ fontSize: 12, color: appTheme.palette.themeTertiary }} onClick={() => setShowStuckHelp(true)}>Cannot change architect?</Link>
          {showStuckHelp && <Callout
            styles={{
              beak: { backgroundColor: appTheme.palette.themeTertiary, },
              calloutMain: {
                backgroundColor: appTheme.palette.themeTertiary,
                color: appTheme.palette.neutralDark,
              }
            }}
            onDismiss={() => setShowStuckHelp(false)}
            target='#sys-card-stuck'
          >
            <div>
              Get help through&nbsp;
              <Link href='https://discord.gg/QZsMu2SkSA' target='_blank' style={{ fontWeight: 'bold', color: 'unset' }}>Discord</Link>
              &nbsp;or&nbsp;
              <Link href='https://github.com/njthomson/SrvSurvey/issues' target='_blank' style={{ fontWeight: 'bold', color: 'unset' }}>GitHub</Link>
            </div>
          </Callout>}
        </div>}
      </div>

      {<ContextualMenu
        hidden={!dropDown}
        alignTargetEdge={false}
        target={`#drop-reserve-level`}
        directionalHint={DirectionalHint.bottomLeftEdge}
        styles={{
          container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer' }
        }}
        onDismiss={(ev) => {
          setDropDown(false);
        }}
        onItemClick={(ev, item) => {
          sysMap.reserveLevel = item?.key.replace('reserve-', '') as ReserveLevel;
          props.sysView.setState({ sysMap: sysMap });
        }}
        items={[
          {
            key: 'reserve-depleted',
            text: 'Depleted'
          },
          {
            key: 'reserve-low',
            text: 'Low'
          },
          {
            key: 'reserve-common',
            text: 'Common'
          },
          {
            key: 'reserve-major',
            text: 'Major'
          },
          {
            key: 'reserve-pristine',
            text: 'Pristine'
          },
        ]}
      />}
    </Callout>
  </div>;
}

const serializeSystem = (sysView: SystemView2) => {
  const { sysOriginal, sysMap, orderIDs } = sysView.state;

  // re-order sites according to orderIDs
  const sites = sysMap.sites.sort((a, b) => orderIDs.indexOf(a.id) - orderIDs.indexOf(b.id));

  // prep an object for serialization, using the keys from sysOriginal but the values from sysMap
  const obj = {} as any;
  for (const key in sysOriginal) {
    obj[key] = sysMap[key as keyof Sys];
  }
  obj.sites = sites;
  delete obj.cmdr;
  delete obj.primaryPortId;
  delete obj.revs;

  // serialize to 1 line per field, or 1 line per array entry
  const parts = Object.keys(obj)
    .map(key => {
      var value = obj[key];
      let json = JSON.stringify(value);
      if (['bodies', 'sites'].includes(key) && Array.isArray(value)) {
        const parts = value.map(v => JSON.stringify(v)).join(',\n    ');
        json = `[\n    ${parts}\n  ]`;
      }
      return `  "${key}": ${json}`;
    })
    .join(',\n');

  return `{\n${parts}\n}`;
}
