import { Stack, DirectionalHint, ActionButton, Icon, Callout } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../../theme";
import { Bod } from "../../types2";
import { BodyMap2 } from "../../system-model2";
import { App } from "../../App";
import { BodyFeature } from "../../types";

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

  componentWillUnmount(): void {
    App.resumePageScroll();
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

    const rows = bodies.filter(b => b.type !== 'bc').map((body, i) => {
      if (!body) return null;

      const sites = bodyMap[body.name]?.sites;
      const isLandable = body.features.includes(BodyFeature.landable);

      const isCurrent = this.props.bodyNum === body.num;
      const borderLine = isCurrent
        ? `4px solid ${appTheme.palette.accent}`
        : '4px solid transparent';

      return <div
        id={isCurrent ? 'bdd-current-row' : undefined}
        key={`bdd-${systemName}-${body.num}`}
        className={`${cn.trh} ${cn.bBox}`}
        style={{
          userSelect: 'none',
          cursor: 'pointer',
        }}
        onClick={() => {
          this.setState({ dropDown: false });
          this.props.onChange(body.num);
        }}
      >
        <div style={{
          borderLeft: borderLine,
          padding: '0 4px',
        }}
        >
          <div>
            <span style={{ color: appTheme.palette.neutralSecondary }}>{systemName}</span>
            <span style={{ fontWeight: 'bold' }}> {body.name.slice(systemName.length + 1)}</span>
          </div>

          <div style={{ color: appTheme.palette.themeSecondary }}>
            {body.subType} ~{Math.round(body.distLS).toLocaleString()}ls
            {isLandable && <Icon iconName='GlobeFavorite' className='icon-inline' style={{ marginLeft: 8, paddingTop: 0 }} title='Landable body' />}
          </div>
          {!!sites && <Stack>
            {sites.map(s => <div
              key={`bdd-${systemName}-${body.num}-${s.id}`}
              className='sub-site'
              style={{
                color: pinnedSiteId === s.id ? appTheme.palette.yellowDark : undefined,
              }}
            >
              <span>&nbsp;»&nbsp;{s.name}</span>
              {s.sys.primaryPortId === s.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' title='Primary port' />}
              {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
              {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
              {pinnedSiteId === s.id && <Icon iconName='PinnedSolid' style={{ marginLeft: 4, color: appTheme.palette.yellow }} className='icon-inline' title='Pinned site' />}
            </div>)}
          </Stack>}
        </div>
      </div>;
    });

    return <div>
      <ActionButton
        id={`body-${id}`}
        style={{ paddingRight: 10 }}
        className={cn.bBox}
        onClick={(ev) => {
          ev.preventDefault();
          this.setState({ dropDown: !dropDown });
          setTimeout(() => {
            document.getElementById('bdd-current-row')?.scrollIntoView({
              block: 'center',
            });
          }, 10);
        }}
      >
        {bodyNameElement}
        <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
      </ActionButton>

      {dropDown && <>
        <Callout
          id={`cm${id}`}
          setInitialFocus
          isBeakVisible={false}
          role="dialog"
          directionalHint={DirectionalHint.rightTopEdge}
          target={`#body-${id}`}
          style={{
            border: '1px solid ' + appTheme.palette.themePrimary,
            padding: 4,
          }}
          onDismiss={ev => {
            this.setState({ dropDown: false });
          }}
          onMouseEnter={() => {
            this.mouseInside = true;
            App.suspendPageScroll();
          }}
          onMouseLeave={() => {
            this.mouseInside = false;
            App.resumePageScroll();
          }}
        >
          <div
            className='build-type'
            style={{
              position: 'relative',
              height: window.innerHeight * 0.6,
              margin: 0,
              padding: 0,
            }}
          >
            <Stack style={{ paddingBottom: 4 }}>
              {rows}
            </Stack>
          </div>
        </Callout>
      </>}

    </div>;
  }
}