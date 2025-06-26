import { Stack, ContextualMenu, DirectionalHint, ActionButton, IContextualMenuItem, Icon } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../../theme";
import { Bod } from "../../types2";
import { BodyMap2 } from "../../system-model2";
import { App } from "../../App";

interface ViewEditBodyProps {
  onChange: (num: number) => void;
  bodyNum: number;
  systemName: string;
  bodies: Bod[];
  bodyMap: Record<string, BodyMap2>;
  pinnedSiteId: string | undefined;
  shortName?: boolean;
}

interface ViewEditBodyState {
  dropDown: boolean;
}

export class ViewEditBody extends Component<ViewEditBodyProps, ViewEditBodyState> {
  private mouseInside: boolean = false;

  constructor(props: ViewEditBodyProps) {
    super(props);

    this.state = {
      dropDown: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<ViewEditBodyProps>, prevState: Readonly<ViewEditBodyState>, snapshot?: any): void {
    if (!this.state.dropDown || prevState.dropDown) {
      this.mouseInside = false;
    }
  }

  render() {
    const { systemName, bodies, pinnedSiteId, bodyNum, shortName, bodyMap } = this.props;
    const { dropDown } = this.state;
    const id = Date.now().toString();

    const bodyName = bodies.find(b => b.num === bodyNum)?.name;
    let bodyNameElement = <></>;
    if (!bodyName) {
      bodyNameElement = <>?</>;
    } else if (shortName) {
      bodyNameElement = <>{bodyName.slice(systemName.length + 1)}</>;
    } else {
      bodyNameElement = <span>
        {systemName}
        &nbsp;
        <span style={{ fontWeight: 'bolder' }}>{bodyName.slice(systemName.length + 1)}</span>
      </span>;
    }

    const items = bodies.filter(b => b.type !== 'bc').map(b => ({ key: `bd-${b.num}`, text: b.name, data: b })) as IContextualMenuItem[];
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
          this.setState({ dropDown: !dropDown });
        }}
      >
        {bodyNameElement}
        <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
      </ActionButton>

      {<ContextualMenu
        id={`cm${id}`}
        hidden={!dropDown}
        alignTargetEdge={false}
        target={`#body-${id}`}
        directionalHint={DirectionalHint.rightTopEdge}
        styles={{
          container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer', width: 270 }
        }}
        onDismiss={(ev) => {
          this.setState({ dropDown: false });
        }}
        calloutProps={{
          setInitialFocus: true,
          className: cn.bodyScroll,
          style: { width: 270, },
          // dismissOnTargetClick: true,
          preventDismissOnEvent: (ev) => {
            if (this.mouseInside) {
              ev.preventDefault();
            }
            return this.mouseInside;
          },
          onMouseEnter: () => {
            this.mouseInside = true;
            if (document.body.clientHeight < document.body.scrollHeight) {
              App.fakeScroll.style.display = 'block';
              document.body.style.marginRight = `${App.scrollBarWidth}px`;
              document.body.style.overflow = 'hidden';
            }
          },
          onMouseLeave: () => {
            this.mouseInside = false;
            App.fakeScroll.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.body.style.marginRight = '0';
          }
        }}

        items={items}

        onRenderContextualMenuItem={(item) => {
          const body = item?.data as Bod;
          if (!body) return null;

          const sites = bodyMap[body.name]?.sites;
          return <div
            key={`bdd-${systemName}-${body.num}`}
            className={cn.trh}
            style={{ padding: 1 }}
            onClick={() => {
              this.setState({ dropDown: false });
              this.props.onChange(body.num);
            }}
          >
            <div>
              <span style={{ color: appTheme.palette.neutralSecondary }}>{systemName}</span>
              <span style={{ fontWeight: 'bold' }}> {body.name.slice(systemName.length + 1)}</span>
            </div>

            <div style={{ color: appTheme.palette.themeSecondary }}>
              {body.subType} ~{Math.round(body.distLS).toLocaleString()}ls
              {body.landable && <Icon iconName='GlobeFavorite' className='icon-inline' style={{ marginLeft: 8, paddingTop: 0 }} title='Landable body' />}
            </div>
            {!!sites && <Stack>{sites.map(s => <div
              key={`bdd-${systemName}-${body.num}-${s.id}`}
              className='sub-site'
              style={{
                color: pinnedSiteId === s.id ? appTheme.palette.yellowDark : undefined,
                // fontWeight: pinnedSiteId === s.id ? 'bold' : undefined
              }}
            >
              <span>&nbsp;»&nbsp;{s.name}</span>
              {s.sys.primaryPortId === s.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' title='Primary port' />}
              {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
              {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
              {pinnedSiteId === s.id && <Icon iconName='PinnedSolid' style={{ marginLeft: 4, color: appTheme.palette.yellow }} className='icon-inline' title='Pinned site' />}
            </div>)}</Stack>}
          </div>;
        }}
      />}
    </div>;
  }
}