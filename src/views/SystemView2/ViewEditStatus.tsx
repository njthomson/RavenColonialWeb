import { DirectionalHint, ActionButton, Icon, ContextualMenu, IContextualMenuItem } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { BuildStatus, mapStatus } from "../../types2";

export const ViewEditBuildStatus: FunctionComponent<{ status: BuildStatus, onChange: (status: BuildStatus) => void }> = (props) => {
  const [dropDown, setDropDown] = useState(false);
  const id = `view-edit-status-${Date.now()}`;

  return <div>
    <ActionButton
      id={id}
      className={`${cn.abm} ${cn.bBox}`}
      style={{ justifyContent: 'left' }}
      onClick={(ev) => {
        ev.preventDefault();
        setDropDown(!dropDown);
      }}
    >
      {mapStatus[props.status]}
      <Icon className='icon-inline arr' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10 }} />
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
        props.onChange(item?.key.replace('status-', '') as BuildStatus);
      }}
      items={Object.entries(mapStatus).map(([key, name]) => ({
        iconProps: { iconName: mapStatusIcon[key] },
        key: `status-${key}`,
        className: cn.bBox,
        text: name,
      } as IContextualMenuItem))}
    />}
  </div>;
}

export const mapStatusIcon: Record<string, string> = {
  plan: 'WebAppBuilderFragment',
  build: 'ConstructionCone',
  complete: 'CityNext2',
}