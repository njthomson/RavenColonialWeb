import { Callout, DirectionalHint, ActionButton, Icon, ContextualMenu } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";
import { ReserveLevel } from "../../types";
import { store } from "../../local-storage";

export const SystemCard: FunctionComponent<{ targetId: string, sysView: SystemView2, onClose: () => void }> = (props) => {
  const { sysMap, sysOriginal } = props.sysView.state;
  const [dropDown, setDropDown] = useState(false);

  const isOpen = sysMap.open;
  const isArchitect = !!sysOriginal.architect && sysOriginal.architect?.toLowerCase() === store.cmdrName?.toLowerCase();
  const canEditOpen = !!store.cmdrName && (sysOriginal.open || !sysOriginal.architect || isArchitect);
  const canEditArchitect = !!store.cmdrName && (isArchitect || !sysOriginal.architect);

  return <div>

    <Callout
      target={`#${props.targetId}`}
      setInitialFocus
      isBeakVisible={false}
      alignTargetEdge
      directionalHint={DirectionalHint.bottomLeftEdge}
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
          <div>
            <ViewEditName
              disabled={!canEditArchitect}
              name={sysMap.architect || '?'}
              onChange={newName => {
                sysMap.architect = newName;
                props.sysView.setState({ sysMap: sysMap });
              }}
            />
          </div>

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

        {canEditOpen && <><div
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
              title='Download a copy of data for this system'
              onClick={() => {
                // download original state
                const blob = new Blob([JSON.stringify(sysOriginal, null, 2)], { type: 'text/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-${props.sysView.state.systemName}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
            {false && <>
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
                  console.log(json);
                  // TODO: do something with this .json
                }}
              />
            </>}
          </div>

        </div>
        </>}
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

