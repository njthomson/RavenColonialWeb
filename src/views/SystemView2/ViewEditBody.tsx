import { Stack, DirectionalHint, ActionButton, Icon, Callout } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../../theme";
import { Bod, BT } from "../../types2";
import { BodyMap2, getUnknownBody, useBarycentreAsStationParent } from "../../system-model2";
import { App } from "../../App";
import { BodyFeature } from "../../types";
import { stellarRemnants } from "../../economy-model2";

interface ViewEditBodyProps {
  onChange: (num: number) => void;
  bodyNum: number;
  systemName: string;
  bodies: Bod[];
  bodyMap: Record<string, BodyMap2>;
  pinnedSiteId: string | undefined;
  shortName?: boolean;
  dim?: boolean;
}

interface ViewEditBodyState {
  dropDown: boolean;
  bodies: Bod[];
}

export class ViewEditBody extends Component<ViewEditBodyProps, ViewEditBodyState> {
  private mouseInside: boolean = false;

  constructor(props: ViewEditBodyProps) {
    super(props);

    // start with the unknown body + all non-barycentre's ...
    const bodies = [getUnknownBody(), ...props.bodies].filter(b => b.type !== BT.bc);
    // ... then insert (between the relevant stars) any barycentre's that could be viable parents for a station
    for (let b of props.bodies) {
      if (!b.hostBC) { continue; }
      let children = bodies.filter(c => c.parents[0] === b.num && ([...stellarRemnants, BT.st].includes(c.type)));
      if (children.length === 2) {
        const idx = bodies.indexOf(children[0]);
        // auto-shift any stations to the barycentre? Not right now
        if (useBarycentreAsStationParent && false) {
          bodies.splice(idx, 2, b);
        } else {
          bodies.splice(idx + 1, 0, b);
        }
      }
    }

    this.state = {
      dropDown: false,
      bodies,
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
    const { systemName, pinnedSiteId, bodyNum, shortName, bodyMap } = this.props;
    const { dropDown, bodies } = this.state;
    const id = Date.now().toString();

    const bodyName = bodies.find(b => b.num === bodyNum)?.name;
    const shortBodyName = bodyName?.replace(systemName, '').trim();
    let bodyNameElement = <></>;
    if (!bodyName) {
      bodyNameElement = <>?</>;
    } else if (shortName) {
      bodyNameElement = <>{shortBodyName}</>;
    } else {
      bodyNameElement = <span>
        {systemName}
        &nbsp;
        <span style={{ fontWeight: 'bolder' }}>{shortBodyName}</span>
      </span>;
    }

    const rows = bodies.map((body, i) => {
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
          borderBottom: body.num === -1 ? '1px solid ' + appTheme.palette.themeTertiary : undefined,
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
            <span style={{ fontWeight: 'bold' }}> {body.name.replace(systemName, '').trim()}</span>
          </div>

          <div style={{ color: appTheme.palette.themeSecondary }}>
            {body.subType} {body.distLS > 0 && <>~{Math.round(body.distLS).toLocaleString()}ls</>}
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
        style={{ paddingRight: 10, color: this.props.dim ? 'grey' : undefined }}
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