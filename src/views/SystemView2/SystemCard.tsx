import { Callout, DirectionalHint, ActionButton, Icon, ContextualMenu } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme } from "../../theme";
import { ViewEditName } from "./ViewEditName";
import { SystemView2 } from "./SystemView2";
import { ReserveLevel } from "../../types";

export const SystemCard: FunctionComponent<{ targetId: string, sysView: SystemView2, onClose: () => void }> = (props) => {
  const [dropDown, setDropDown] = useState(false);

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
        }}>

          <div>Architect:</div>
          <div>
            <ViewEditName
              name={props.sysView.state.sysMap.architect}
              onChange={newName => {
                props.sysView.state.sysMap.architect = newName;
                props.sysView.setState({ sysMap: props.sysView.state.sysMap });
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
            {props.sysView.state.sysMap.reserveLevel ?? 'Unknown'}
            <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
          </ActionButton>

        </div>
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
          props.sysView.state.sysMap.reserveLevel = item?.key.replace('reserve-', '') as ReserveLevel;
          props.sysView.setState({ sysMap: props.sysView.state.sysMap });
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

