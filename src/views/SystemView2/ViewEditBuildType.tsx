import { ActionButton, Callout, DirectionalHint, Icon, Stack } from "@fluentui/react";
import { Component } from "react";
import { appTheme, cn } from "../../theme";
import { getSiteType, SiteType, siteTypes } from "../../site-data";
import { delayFocus } from "../../util";
import { BuildType } from "../../components/BuildType/BuildType";
import { store } from "../../local-storage";
import { App } from "../../App";
import { CalloutMsg } from "../../components/CalloutMsg";
import { isTypeValid2, SysMap2 } from "../../system-model2";

interface ViewEditBuildTypeProps {
  buildType: string;
  sysMap?: SysMap2;
  onChange: (buildType: string) => void;
}

interface ViewEditBuildTypeState {
  dropDown: boolean;
  location: string;
  showTable: boolean;
}

export class ViewEditBuildType extends Component<ViewEditBuildTypeProps, ViewEditBuildTypeState> {
  private mouseInside: boolean = false;

  constructor(props: ViewEditBuildTypeProps) {
    super(props);

    // match the current site's location where if possible
    let defaultLocation = store.viewEditBuiltTypeTab;
    const isOrbital = props.buildType && getSiteType(props.buildType, true).orbital;
    if (typeof isOrbital === 'boolean') {
      defaultLocation = isOrbital ? 'orbital' : 'surface';
    }

    this.state = {
      dropDown: false,
      location: defaultLocation,
      showTable: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<ViewEditBuildTypeProps>, prevState: Readonly<ViewEditBuildTypeState>, snapshot?: any): void {
    if (!this.state.dropDown || prevState.dropDown) {
      this.mouseInside = false;
      App.resumePageScroll();
    }
  }

  componentWillUnmount(): void {
    App.resumePageScroll();
  }

  render() {
    const { dropDown, location, showTable } = this.state;

    const id = Date.now().toString();

    const validTypes = siteTypes
      .slice(1)
      .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'));

    const displayName2 = getSiteType(this.props.buildType, true)?.displayName2 ?? '?';

    return <div>

      <ActionButton
        id={`bt-${id}`}
        className={cn.bBox}
        onClick={(ev) => {
          ev.preventDefault();
          this.setState({ dropDown: !dropDown, showTable: false, });
        }}
      >
        {displayName2} ({this.props.buildType || '?'})
        <Icon className='icon-inline' iconName={dropDown ? 'CaretSolidRight' : 'CaretSolidDown'} style={{ marginLeft: 4, fontSize: 10, color: 'grey' }} />
      </ActionButton>

      {dropDown && <Callout
        target={`#bt-${id}`}
        setInitialFocus
        isBeakVisible={false}
        role="dialog"
        directionalHint={DirectionalHint.rightTopEdge}
        calloutWidth={380}
        style={{
          border: '1px solid ' + appTheme.palette.themePrimary,
          padding: 0,
        }}
        preventDismissOnEvent={(ev) => {
          if (this.mouseInside) {
            ev.preventDefault();
          }
          return this.mouseInside;
        }}
        onDismiss={() => {
          this.setState({ dropDown: false });
        }}
      >
        <div
          className='build-type'
          style={{
            position: 'relative',
            height: window.innerHeight * 0.6,
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
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            style={{
              backgroundColor: appTheme.palette.white,
              top: 0,
              paddingTop: 5,
              paddingLeft: 5,
            }}
          >
            {this.renderLocationButton('both')}
            {this.renderLocationButton('orbital')}
            {this.renderLocationButton('surface')}
            <ActionButton
              iconProps={{ iconName: 'ViewListGroup' }}
              text='Table'
              className={cn.bBox}
              onClick={() => {
                this.setState({ dropDown: false, showTable: true });
              }}
            >
            </ActionButton>
          </Stack>

          <div style={{
            overflowY: 'scroll',
            padding: 10,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 30,
            bottom: 0,
          }}>
            <div className='list'>
              {validTypes.map(this.renderTypeRow)}
            </div>
          </div>
        </div>
      </Callout>}

      {showTable && <BuildType
        buildType={this.props.buildType}
        tableOnly={true}
        sysMap2={this.props.sysMap}
        onChange={(newValue) => {
          this.props.onChange(newValue);
          this.setState({ showTable: false });
        }}
      />}

    </div>;
  }

  renderLocationButton(targetLocation: string) {
    return <>
      <ActionButton
        text={targetLocation}
        style={{
          textTransform: 'capitalize',
          backgroundColor: this.state.location === targetLocation ? appTheme.palette.themeLight : undefined,
        }}
        className={cn.bBox}
        onClick={() => {
          this.setState({ dropDown: false });
          setTimeout(() => {
            this.setState({
              location: targetLocation,
              dropDown: true,
            });
            store.viewEditBuiltTypeTab = targetLocation;
          }, 5);
        }}
      />
    </>;
  }

  renderTypeRow = (type: SiteType, idx: number) => {
    const selection = this.props.buildType;
    const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection) || type.subTypes[0] === selection.slice(0, -1));

    const id = `bbt-${type.subTypes[0]}`;
    if (isCurrentSelection) {
      delayFocus(id);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element?.offsetParent && element.offsetParent.clientHeight < element.offsetTop) {
          element.offsetParent.scrollTo(0, element.offsetTop - 2);
        }
      }, 10);
    }

    const { isValid, msg } = isTypeValid2(this.props.sysMap, type);

    return <div
      key={id}
      id={id}
      style={{
        backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
        borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
        fontWeight: isCurrentSelection ? 'bold' : undefined,
        paddingLeft: isCurrentSelection ? 4 : undefined,
      }}

      onClick={(ev) => {
        if (!ev.defaultPrevented) {
          if (!type.subTypes.includes(this.props.buildType)) {
            this.props.onChange(type.subTypes[0] + (type.subTypes.length === 1 ? '' : '?'));
          }
          this.setState({ dropDown: false });
        }
      }}
    >
      <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>

      <Stack horizontal verticalAlign='center' style={{ color: appTheme.palette.themePrimary }}>
        <span>{type.displayName2}</span>
        {msg && <span style={{ marginLeft: 8, marginTop: 4, }}>
          <CalloutMsg
            directionalHint={DirectionalHint.rightCenter}
            msg={msg}
            iconName={isValid ? undefined : 'Warning'}
            style={{
              fontSize: 12,
              fontWeight: isValid ? undefined : 'bold',
              color: isValid ? appTheme.palette.black : appTheme.palette.yellowDark,
            }} />
        </span>}
      </Stack>

      <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
        {type.subTypes.map(st => (<ActionButton
          key={`st-${st}`}
          id={`st-${st}`}
          className={cn.bBold}
          style={{
            color: selection === st ? appTheme.palette.black : undefined,
            backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
            fontSize: 12,
            fontWeight: selection === st ? 'bold' : undefined,
            height: 16,
            padding: '0 0 2px 0',
            margin: 1,
            border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,
          }}
          onClick={(ev) => {
            ev.preventDefault();
            this.props.onChange(st);
            this.setState({ dropDown: false });
          }}
        >
          {st.replace('_i', '').replace('_e', '')}
        </ActionButton>))}
      </Stack>
    </div>;
  }
}