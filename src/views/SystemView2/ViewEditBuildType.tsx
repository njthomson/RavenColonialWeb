import { ActionButton, Callout, DirectionalHint, Icon, Stack } from "@fluentui/react";
import { Component } from "react";
import { appTheme } from "../../theme";
import { getSiteType, SiteType, siteTypes } from "../../site-data";
import { delayFocus } from "../../util";
import { BuildType } from "../../components/BuildType/BuildType";

// const getItems = (location: string) => {
//   const items = siteTypes
//     .slice(1)
//     .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'))
//     .map(type => ({
//       key: `bd-${type.displayName2}`,
//       text: type.displayName2,
//       data: type,
//     }));
//   items.unshift({
//     key: '!!',
//     text: '!!',
//   } as any);
//   return items;
// };

// export const ViewEditBuildType0: FunctionComponent<{ buildType: string, onChange: (buildType: string) => void }> = (props) => {
//   const [dropDown, setDropDown] = useState(false);
//   const [location, setLocation] = useState('both');
//   const [items, setItems] = useState(getItems(location));
//   const [foo, setFoo] = useState<string | undefined>(undefined);
//   const selection = props.buildType;

//   const id = Date.now().toString();



//   // const rows = siteTypes
//   //   .slice(1)
//   //   .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'))
//   //   .map((type, idx) => {
//   //     const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));

//   //     return <div
//   //       key={`bbt-${type.displayName2}`}
//   //       style={{
//   //         backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
//   //         borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
//   //         fontWeight: isCurrentSelection ? 'bold' : undefined,
//   //         paddingLeft: isCurrentSelection ? 4 : undefined,
//   //       }}

//   //       onClick={() => {

//   //       }}
//   //     >
//   //       <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
//   //       <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>


//   //       <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
//   //         {type.subTypes.map(st => (<ActionButton
//   //           key={`st-${st}`}
//   //           id={`st-${st}`}
//   //           style={{
//   //             color: selection === st ? appTheme.palette.black : undefined,
//   //             backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
//   //             // fontWeight: selection === st ? 'bold' : undefined,
//   //             fontSize: 12,
//   //             height: 16,
//   //             padding: '0 0 2px 0',
//   //             margin: 1,
//   //             border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

//   //           }}
//   //           onClick={() => {
//   //             // this.props.onChange(st);
//   //             // this.setState({ showList: false });
//   //           }}
//   //         >
//   //           {st.replace('_i', '').replace('_e', '')}
//   //         </ActionButton>))}
//   //       </Stack>
//   //     </div>;
//   //   });

//   let idx = 0;

//   let foo2: string | undefined = undefined;

//   const rows = siteTypes
//     .slice(1)
//     // .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'))
//     .map((type, idx) => {
//       const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));

//       return <div
//         key={`bbt-${type.displayName2}`}
//         style={{
//           backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
//           borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
//           fontWeight: isCurrentSelection ? 'bold' : undefined,
//           paddingLeft: isCurrentSelection ? 4 : undefined,
//         }}

//         onClick={() => {

//         }}
//       >
//         <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
//         <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>


//         <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
//           {type.subTypes.map(st => (<ActionButton
//             key={`st-${st}`}
//             id={`st-${st}`}
//             style={{
//               color: selection === st ? appTheme.palette.black : undefined,
//               backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
//               // fontWeight: selection === st ? 'bold' : undefined,
//               fontSize: 12,
//               height: 16,
//               padding: '0 0 2px 0',
//               margin: 1,
//               border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

//             }}
//             onClick={() => {
//               // this.props.onChange(st);
//               // this.setState({ showList: false });
//             }}
//           >
//             {st.replace('_i', '').replace('_e', '')}
//           </ActionButton>))}
//         </Stack>
//       </div>;
//     });

//   return <div>
//     {false && <ComboBox
//       styles={{
//         root: { maxHeight: 20 },
//         callout: {
//           border: '1px solid ' + appTheme.palette.themePrimary,
//           padding: 0,
//           margin: 0,
//         },

//       }}

//       text={selection}
//       options={items}

//       onChange={(ev, o, i, v) => {
//         const subTypes = o?.data.subTypes! as string[];
//         console.log(`!Z: ${o?.text} /  ${foo} / ${v} / ${i}`, o);
//         if (subTypes.length === 1) {
//           props.onChange(subTypes[0]);
//         } else if (foo && subTypes.includes(foo)) {
//           props.onChange(foo);
//         } else {
//           props.onChange(subTypes[0] + '?');
//         }
//       }}

//       onRenderUpperContent={() => {
//         return <div
//           style={{
//             position: 'sticky',
//             top: -10,
//             zIndex: 1,
//             backgroundColor: 'navy',
//             margin: '-10px -10px 0 -10px',
//             // marginTop: -10,
//             height: 22,
//           }}
//         >
//           hello
//         </div>;
//       }}

//       onRenderOption={(item?: ISelectableOption) => {
//         const type = item?.data as SiteType;
//         const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));

//         return <div
//           key={`bbt-${type.displayName2}`}
//           style={{
//             // position: 'relative',
//             // backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
//             borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
//             fontWeight: isCurrentSelection ? 'bold' : undefined,
//             paddingLeft: isCurrentSelection ? 4 : undefined,
//             marginLeft: -10,
//             // backgroundColor: 'navy',
//             // position: 'absolute',
//             // left: 0, right: 0,
//             // padding: 4,
//           }}
//         >
//           {/* <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span> */}
//           {/* <Stack horizontal horizontalAlign='start' style={{ backgroundColor: 'navy' }}> */}
//           <div style={{
//             color: appTheme.palette.themePrimary,
//             position: 'absolute',
//             left: 4, right: 0,
//             height: 22,
//             // backgroundColor: 'navy'
//           }}>
//             <span>{type.displayName2}</span>
//             <span className='small' style={{ float: 'right' }}>Tier: 2</span>

//           </div>
//           {/* </Stack> */}

//           <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{
//             // marginLeft: 8,
//             padding: 0, margin: 0,
//             fontSize: 12,
//             marginTop: 22
//           }}>
//             {type.subTypes.map(st => (<ActionButton
//               key={`st-${st}`}
//               id={`st-${st}`}
//               style={{
//                 color: selection === st ? appTheme.palette.black : undefined,
//                 backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
//                 // fontWeight: selection === st ? 'bold' : undefined,
//                 fontSize: 12,
//                 height: 16,
//                 padding: '0 0 2px 0',
//                 margin: 1,
//                 border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

//               }}
//               onMouseUp={() => {
//                 console.log(`!B: `, st);
//                 // foo2 = st;
//                 setFoo(st);
//                 props.onChange(st);
//                 // this.setState({ showList: false });
//               }}

//             >
//               {st.replace('_i', '').replace('_e', '')}
//             </ActionButton>))}
//           </Stack>

//         </div>;
//       }}
//     />}
//     {false && <>
//       <ActionButton
//         id={`bt-${id}`}

//         onClick={() => setDropDown(true)}
//       >{props.buildType}</ActionButton>

//       <ContextualMenu
//         id={`cm${id}`}
//         hidden={!dropDown}
//         alignTargetEdge={false}
//         target={`#bt-${id}`}
//         shouldFocusOnContainer
//         // allowTouchBodyScroll={isMobile()}
//         directionalHint={DirectionalHint.topRightEdge}
//         styles={{
//           container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer' }
//         }}
//         onDismiss={(ev) => {
//           console.log(ev)
//           setDropDown(false);
//         }}

//         items={items}

//         onRenderMenuList={(p, dr) => {
//           return <div>
//             <div style={{ height: 32, padding: 0, margin: 0 }}>
//               <Stack
//                 horizontal
//                 tokens={{ childrenGap: 8 }}
//                 style={{
//                   left: 10,
//                   right: 20,
//                   backgroundColor: 'navy', //appTheme.palette.white,
//                   position: 'fixed',
//                   zIndex: 1,
//                   top: 10,
//                   margin: '-10px -4px 0 -9px',
//                   borderTop: '1px solid ' + appTheme.palette.themePrimary
//                 }}
//               >
//                 <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('both')); }}>Both</ActionButton>
//                 <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('orbital')); }}>Orbital</ActionButton>
//                 <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('surface')); }}>Surface</ActionButton>
//               </Stack>
//             </div>
//             <div>{dr!(p)}</div>
//           </div>;
//         }}

//         onRenderContextualMenuItem={(item) => {
//           if (!item?.data) {
//             return null;
//           }

//           const type = item.data as SiteType;
//           const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));

//           return <div
//             key={`bbt-${type.displayName2}`}
//             style={{
//               backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
//               borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
//               fontWeight: isCurrentSelection ? 'bold' : undefined,
//               paddingLeft: isCurrentSelection ? 4 : undefined,
//             }}

//             onClick={() => {
//               console.log(`AA: ${foo} / ${foo2}`);
//               if (type.subTypes.length === 1) {
//                 props.onChange(type.subTypes[0]);
//               } else if (foo2 && type.subTypes.includes(foo2)) {
//                 props.onChange(foo2);
//               } else if (type.subTypes.includes(props.buildType)) {
//                 // no op
//               } else {
//                 props.onChange(type.subTypes[0] + '?');
//               }
//               setDropDown(false);
//             }}
//           >
//             <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
//             <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>


//             <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
//               {type.subTypes.map(st => (<ActionButton
//                 key={`st-${st}`}
//                 id={`st-${st}`}
//                 style={{
//                   color: selection === st ? appTheme.palette.black : undefined,
//                   backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
//                   // fontWeight: selection === st ? 'bold' : undefined,
//                   fontSize: 12,
//                   height: 16,
//                   padding: '0 0 2px 0',
//                   margin: 1,
//                   border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

//                 }}
//                 onClick={(ev) => {
//                   console.log(`BB: ${st}`);
//                   ev.preventDefault();
//                   setFoo(st);
//                   foo2 = st;
//                   // props.onChange(st);
//                   // setDropDown(false);
//                   // this.setState({ showList: false });
//                 }}
//               >
//                 {st.replace('_i', '').replace('_e', '')}
//               </ActionButton>))}
//             </Stack>
//           </div>;

//         }}
//       />
//     </>}

//     {true && <>
//       <ActionButton
//         id={`bt-${id}`}
//         onClick={() => setDropDown(!dropDown)}
//       >
//         {props.buildType}
//       </ActionButton>

//       {dropDown && <Callout
//         target={`#bt-${id}`}
//         setInitialFocus
//         isBeakVisible={false}
//         role="dialog"
//         onDismiss={() => setDropDown(false)}
//         directionalHint={DirectionalHint.rightTopEdge}
//         style={{
//           border: '1px solid ' + appTheme.palette.themePrimary,
//           maxHeight: window.innerHeight * 0.75,
//           padding: 0,
//         }}
//       >
//         <div className='build-type'>
//           <Stack
//             horizontal
//             tokens={{ childrenGap: 8 }}
//             style={{
//               // left: 10,
//               // right: 20,
//               backgroundColor: appTheme.palette.white,
//               position: 'sticky',
//               zIndex: 1,
//               top: 0,
//               paddingTop: 5,
//               // margin: '-10px -4px 0 -9px',
//               // borderTop: '1px solid ' + appTheme.palette.themePrimary
//             }}
//           >
//             {/* <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('orbital')); }}>Orbital</ActionButton>
//             <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('surface')); }}>Surface</ActionButton>
//             <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('both')); }}>Both</ActionButton> */}
//             <ActionButton onClick={(ev) => { setLocation('orbital'); }}>Orbital</ActionButton>
//             <ActionButton onClick={(ev) => { setLocation('surface'); }}>Surface</ActionButton>
//             <ActionButton onClick={(ev) => { setLocation('both'); }}>Both</ActionButton>
//             <div>{location}</div>
//           </Stack>

//           <div className='list'>
//             {rows}
//           </div>
//         </div>
//       </Callout>}
//     </>}

//   </div>;
// }



// const Foo: FunctionComponent<{ buildType: string }> = (props) => {
//   const [dropDown, setDropDown] = useState(false);
//   const [location, setLocation] = useState('both');
//   const [items, setItems] = useState(getItems(location));
//   const [foo, setFoo] = useState<string | undefined>(undefined);
//   const selection = props.buildType;

//   const id = Date.now().toString();


//   const rows = siteTypes
//     .slice(1)
//     // .filter(type => location === 'both' || location === (type.orbital ? 'orbital' : 'surface'))
//     .map((type, idx) => {
//       const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection));

//       return <div
//         key={`bbt-${type.displayName2}`}
//         style={{
//           backgroundColor: idx % 2 ? appTheme.palette.neutralLighter : undefined,
//           borderLeft: isCurrentSelection ? `4px solid ${appTheme.palette.accent}` : undefined,
//           fontWeight: isCurrentSelection ? 'bold' : undefined,
//           paddingLeft: isCurrentSelection ? 4 : undefined,
//         }}

//         onClick={() => {

//         }}
//       >
//         <span style={{ fontSize: 10, float: 'right', color: appTheme.palette.themeSecondary }}>Tier: {type.tier}</span>
//         <div style={{ color: appTheme.palette.themePrimary }}>{type.displayName2}</div>


//         <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
//           {type.subTypes.map(st => (<ActionButton
//             key={`st-${st}`}
//             id={`st-${st}`}
//             style={{
//               color: selection === st ? appTheme.palette.black : undefined,
//               backgroundColor: selection === st ? appTheme.palette.neutralLighter : undefined,
//               // fontWeight: selection === st ? 'bold' : undefined,
//               fontSize: 12,
//               height: 16,
//               padding: '0 0 2px 0',
//               margin: 1,
//               border: `1px solid ${selection === st ? appTheme.palette.themePrimary : 'grey'}`,

//             }}
//             onClick={() => {
//               // this.props.onChange(st);
//               // this.setState({ showList: false });
//             }}
//           >
//             {st.replace('_i', '').replace('_e', '')}
//           </ActionButton>))}
//         </Stack>
//       </div>;
//     });


//   return <div>
//     <div className='list'>
//       {rows}
//     </div>
//   </div>;
// };

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
      location: 'both',
      showTable: false,
    };
  }

  componentDidUpdate(prevProps: Readonly<ViewEditBuildTypeProps>, prevState: Readonly<ViewEditBuildTypeState>, snapshot?: any): void {
    // if (prevProps.buildType !== this.props.buildType || (!this.state.dropDown || prevState.dropDown)) {
    //   this.setState({ dropDown: false });
    //   this.mouseInside = false;
    // }
    if (!this.state.dropDown || prevState.dropDown) {
      this.mouseInside = false;
    }
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
            // if (document.body.scrollHeight < document.body.clientHeight) {
            //   document.body.style.overflow = 'hidden';
            //   document.body.style.marginRight = `${App.scrollBarWidth}px`;
            // }
          }}
          onMouseLeave={() => {
            this.mouseInside = false;
            // if (document.body.scrollHeight < document.body.clientHeight) {
            //   document.body.style.overflow = 'auto';
            //   document.body.style.marginRight = '0';
            // }
          }}
        >
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            style={{
              // left: 10,
              // right: 20,
              backgroundColor: appTheme.palette.white,
              // position: 'sticky',
              // zIndex: 1,
              top: 0,
              paddingTop: 5,
              paddingLeft: 5,
              // margin: '-10px -4px 0 -9px',
              // borderTop: '1px solid ' + appTheme.palette.themePrimary
            }}
          >
            {/* <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('orbital')); }}>Orbital</ActionButton>
            <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('surface')); }}>Surface</ActionButton>
            <ActionButton onClick={(ev) => { ev.preventDefault(); setItems(getItems('both')); }}>Both</ActionButton> */}
            {/* <ActionButton onClick={(ev) => { this.setLocation('orbital'); }}>Orbital</ActionButton>
            <ActionButton onClick={(ev) => { this.setLocation('surface'); }}>Surface</ActionButton>
            <ActionButton onClick={(ev) => { this.setLocation('both'); }}>Both</ActionButton> */}
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
      // onClose={() => {
      //   this.setState({ dropDown: true, showTable: false });
      // }}
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