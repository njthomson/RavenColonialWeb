import { ActionButton, Callout, DirectionalHint, Icon, Stack } from "@fluentui/react";
import { Component } from "react";
import { appTheme } from "../../theme";
import { getSiteType, SiteType, siteTypes } from "../../site-data";
import { delayFocus } from "../../util";
import { BuildType } from "../../components/BuildType/BuildType";
import { store } from "../../local-storage";
import { App } from "../../App";

interface ViewEditBuildTypeProps {
  buildType: string
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

    this.state = {
      dropDown: false,
      location: store.viewEditBuiltTypeTab ?? 'both',
      showTable: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<ViewEditBuildTypeProps>, prevState: Readonly<ViewEditBuildTypeState>, snapshot?: any): void {
    if (!this.state.dropDown || prevState.dropDown) {
      this.mouseInside = false;
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
        onDismiss={() => this.setState({ dropDown: false })}
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

    let typeJustSet: string | undefined = undefined;
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
          console.log(`AA: ${typeJustSet}`);
          if (!type.subTypes.includes(this.props.buildType)) {
            this.props.onChange(type.subTypes[0] + (type.subTypes.length === 1 ? '' : '?'));
          }
          this.setState({ dropDown: false });
        }
      }}
    >
      <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
      <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>

      <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
        {type.subTypes.map(st => (<ActionButton
          key={`st-${st}`}
          id={`st-${st}`}
          style={{
            color: selection === st ? appTheme.palette.black : undefined,
            backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
            fontSize: 12,
            height: 16,
            padding: '0 0 2px 0',
            margin: 1,
            border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,
          }}
          onClick={(ev) => {
            console.log(`BB: ${st}`);
            typeJustSet = st;
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