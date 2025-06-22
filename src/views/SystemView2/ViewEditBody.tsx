import { Stack, ContextualMenu, DirectionalHint, ActionButton, IContextualMenuItem, Icon } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { Bod } from "../../types2";
import { SysMap2 } from "../../system-model2";

export const ViewEditBody: FunctionComponent<{ bodyNum: number, sysMap: SysMap2, onChange: (num: number) => void, shortName?: boolean }> = (props) => {
  const [dropDown, setDropDown] = useState(false);

  const id = Date.now().toString();

  let bodyName = props.sysMap.bodies
    .find(b => b.num === props.bodyNum)?.name
    ?? '?';
  if (props.shortName) {
    bodyName = bodyName.replace(`${props.sysMap.name} `, '');
  }

  const items = props.sysMap.bodies.filter(b => b.type !== 'bc').map(b => ({ key: `bd-${b.num}`, text: b.name, data: b })) as IContextualMenuItem[];
  items.unshift(...[{
    key: 'aaa',
    text: 'Both',
  }]);

  return <div>
    <ActionButton
      id={`body-${id}`}
      style={{ paddingRight: 10 }}
      onClick={(ev) => {
        ev.preventDefault();
        setDropDown(true);
      }}
    >
      {bodyName}
      <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
    </ActionButton>

    {<ContextualMenu
      id={`cm${id}`}
      hidden={!dropDown}
      alignTargetEdge={false}
      target={`#body-${id}`}
      directionalHint={DirectionalHint.rightTopEdge}
      styles={{
        root: { width: 250 },
        container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer' }
      }}
      onDismiss={(ev) => {
        setDropDown(false);
      }}

      items={items}

      onRenderContextualMenuItem={(item) => {
        const body = item?.data as Bod;
        if (!body) return null;

        const sites = props.sysMap.bodyMap[body.name]?.sites;
        return <div
          key={`bdd-${props.sysMap.id64}-${body.num}`}
          className={cn.trh}
          style={{ padding: 1 }}
          onClick={() => {
            setDropDown(false);
            props.onChange(body.num);
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{item?.text}</div>
          <div style={{ color: appTheme.palette.themeSecondary }}>
            {body.subType} ~{Math.round(body.distLS).toLocaleString()}ls
          </div>
          {!!sites && <Stack>{sites.map(s => <div key={`bdd-${props.sysMap.id64}-${body.num}-${s.id}`} className='sub-site'>&nbsp;»&nbsp;{s.name}</div>)}</Stack>}
        </div>;
      }}
    />}
  </div>;
}


