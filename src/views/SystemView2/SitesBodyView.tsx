import { Component, FunctionComponent } from "react";
import { Bod, BodyType } from "../../types2";
import { Icon, Stack, Toggle } from "@fluentui/react";
import { appTheme } from "../../theme";
import { BodyMap2, SysMap2 } from "../../system-model2";
import { SitesViewProps, SystemView2 } from "./SystemView2";
import { store } from "../../local-storage";
import { mapBodyFeature } from "../../types";
import { SiteLink } from "./SiteLink";

let nnn = 0;
const indent = 20;

const rootBC = {
  name: '_root barycentre',
  num: 0,
  distLS: 0,
  features: [],
  parents: [],
  subType: 'barycentre',
  type: 'bc',
} as Bod;

class BodyMapTreeNode {
  body: Bod;
  map?: BodyMap2;
  children: Record<string, BodyMapTreeNode>
  parent: BodyMapTreeNode | undefined;
  hasSites?: boolean;

  constructor(body: Bod | BodyMap2, parent?: BodyMapTreeNode) {
    this.body = body;
    this.children = {};
    this.parent = parent;

    if (!!(body as BodyMap2).sites) {
      this.map = body as BodyMap2;
      this.hasSites = !!this.map.sites.length;
    }
  }
};

type BodyMapTree = Record<string, BodyMapTreeNode>;

interface SitesBodyViewState {
  dropDown: boolean;
  location: string;
  showTable: boolean;
  bodyTree: BodyMapTree;
  hideEmpties: boolean;
  lastSiteId?: string;
}

export class SitesBodyView extends Component<SitesViewProps, SitesBodyViewState> {

  constructor(props: SitesViewProps) {
    super(props);

    const defaultHideEmpties = store.sysViewHideEmpties;

    this.state = {
      dropDown: false,
      location: 'both',
      showTable: false,
      bodyTree: this.prepBodyTree(props.sysMap, defaultHideEmpties),
      hideEmpties: defaultHideEmpties,
    };
  }

  componentDidUpdate(prevProps: Readonly<SitesViewProps>, prevState: Readonly<SitesBodyViewState>, snapshot?: any): void {
    if (prevProps.sysMap !== this.props.sysMap) {
      this.setState({
        bodyTree: this.prepBodyTree(this.props.sysMap, this.state.hideEmpties),
      })
    }

    if (prevProps.selectedSite !== this.props.selectedSite) {
      this.setState({ lastSiteId: this.props.selectedSite?.id });
    }
  }

  prepBodyTree(sysMap: SysMap2, hideEmpties: boolean) {
    // console.log('prepBodyTree');

    const bs = sysMap.bodies;
    // console.log(Object.values(sysMap.bodyMap));

    const initialTree = {} as BodyMapTree;

    const bodyUnknown = sysMap.bodyMap['Unknown'];
    if (bodyUnknown) {
      const pn = new BodyMapTreeNode(bodyUnknown);
      initialTree[bodyUnknown.name] = pn;
    }

    //const tree = Object.values(sysMap.bodyMap).reduce((map, bm) => {
    const tree = sysMap.bodies.reduce((map, b) => {
      if (b.type === 'bc') { return map; }
      let bm = sysMap.bodyMap[b.name] ?? b;

      let bpn: BodyMapTreeNode | undefined = undefined;

      if (bm.num === -1) {
        // this is on the "Unknown" body
        bpn = map[bm.name];
        if (!bpn) {
          bpn = new BodyMapTreeNode(bm);
          map[bm.name] = bpn;
        }
      } else if (bm.num === 0 && bm.parents.length === 0) {
        // this is the system primary star
        bpn = new BodyMapTreeNode(bm);
        map[bm.name] = bpn;
      } else {
        // process parents into the tree
        for (const p of [...bm.parents].reverse()) {
          let bp = bs.find(_ => _.num === p);

          if (!bp && p === 0) {
            // inject a root barycentre if needed
            bpn = map[rootBC.name];
            if (!bpn) {
              bpn = new BodyMapTreeNode(rootBC);
              map[bpn.body.name] = bpn;
            }
          } else {
            // match parent body
            if (!bp) { throw new Error(`Why no Body Parent? p:${p}`); }
            if (!bpn) {
              bpn = map[bp?.name];
            } else {
              // add this parent to the tree?
              let pn: BodyMapTreeNode = bpn.children[bp.name];
              if (!pn) {
                pn = new BodyMapTreeNode(bp, bpn);
                bpn.children[bp.name] = pn;
              }
              bpn = pn;
            }
          }

          if (!bpn) { throw new Error(`Why no BPN? p:${p}`); }
        }

        if (!bpn && bm.num > 0 && bm.parents.length === 0) {
          // find the barycentre somewhere in the tree?
          bpn = Object.values(map).map(n => this.findInTree(n, bm.name))[0];
          console.error(bpn);
        }

        if (!bpn) {
          console.error(`Why no Body Parent Node? "${bm.name}" [${bm.parents}]\n`, map, `\n`, bm);
          throw new Error(`Why no Body Parent Node? "${bm.name}" [${bm.parents}]`);
        }

        // once finished processing parents, add ourself to the immediate parent
        bpn.children[bm.name] = new BodyMapTreeNode(bm, bpn);
      }

      return map;
    }, initialTree);


    // post process for empties...
    Object.values(tree).map(n => this.sortAndFilterBodyTree(n, hideEmpties));

    // console.log(tree);
    return tree;
  }

  sortAndFilterBodyTree(node: BodyMapTreeNode, hideEmpties: boolean): boolean {
    node.hasSites = !!node.map?.sites.length;

    // no, recurse ....
    const sortedChildren: BodyMapTree = {};
    const sorted = Object.keys(node.children)
      .sort((a, b) => {
        return node.children[a].body.num - node.children[b].body.num;
        // return node.children[a].body.name.localeCompare(node.children[b].body.name);
        // const an = node.children[a].body.name.replace(this.props.systemName + ' ', '').replace(' ', '');
        // const bn = node.children[b].body.name.replace(this.props.systemName + ' ', '').replace(' ', '');
        // return an.localeCompare(bn);
      });

    // pre-process, so we know the state of all sibling nodes
    const processed = sorted.map(key => {
      const childNode = node.children[key];
      // console.log(`*** ${childNode.body.name} => ${childHasSites} / ${childNode.parent?.body.name}:${childNode.parent?.body.type}`);
      const childHasSites = this.sortAndFilterBodyTree(childNode, hideEmpties);
      node.hasSites ||= childHasSites;
      return { key, childNode, childHasSites };
    })

    for (const { key, childNode, childHasSites } of processed) {
      if (hideEmpties) {
        if (childNode.parent?.body.type !== 'bc') {
          // parent not barycenter - skip if no sites
          if (!childHasSites) { continue; }
        } else {
          // parent is barycenter ...
          const idx = sorted.indexOf(key);
          if (idx < 2) {
            // ideally: keep the alternate if either of the 1st two bodies have sites
            // but this requires us to pre-process the whole tree, not just immediate siblings
            if (!(processed[0].childHasSites && processed[0].childNode.body.type === 'bc') && (!processed[1].childHasSites && processed[1].childNode.body.type === 'bc')) { continue; }
          } else {
            // treat the rest as normal
            if (!childHasSites) { continue; }
          }
        }
      }

      sortedChildren[key] = childNode;
    }

    node.children = sortedChildren;
    return node.hasSites;
  }

  // fooTree2(node: BodyMapTreeNode) {
  //   const children = Object.values(node.children);
  //   if (children.length === 0) {
  //     return node.hasSites;
  //   } else {

  //   }

  //   // node.children = Object.entries(node.children)
  //   //   .filter(([k, v]) => {
  //   //     return !this.state.hideEmpties || v.hasSites;
  //   //   })
  //   //   .reduce((map, [k, v]) => {
  //   //     map[k] = v;
  //   //     return map;
  //   //   }, {} as BodyMapTree);
  // }


  findInTree(node: BodyMapTreeNode, name: string): BodyMapTreeNode | undefined {
    if (node.body.name === name) {
      return node;
    }

    // no, recurse ....
    for (const childNode of Object.values(node.children)) {
      const match = this.findInTree(childNode, name);
      if (match) {
        return match;
      };
    }

    // not found
    return undefined;
  }

  selectSite(id?: string) {
    // this.props.onSelect(id);
    this.setState({ lastSiteId: id });
  }

  render() {
    const { bodyTree, hideEmpties } = this.state;

    const topNodes = Object.values(bodyTree); //.filter(n => Object.keys(n.children).length > 0);

    return <div style={{}}>
      <div style={{
        float: 'right',
        marginTop: 8,
        position: 'sticky',
        zIndex: 1,
        top: 54,
      }}>
        <Toggle
          onText='Hide empty bodies'
          offText='Hide empty bodies'
          checked={hideEmpties}
          styles={{
            text: { fontSize: 12 }
          }}
          onChange={(ev, checked) => {
            this.setState({
              bodyTree: this.prepBodyTree(this.props.sysMap, !!checked),
              hideEmpties: !!checked,
            });
            store.sysViewHideEmpties = !!checked;
          }}
        />
      </div>
      <br />
      <div style={{ marginLeft: bodyTree[rootBC.name] ? indent : 0 }}>
        {topNodes.map((n, i) => this.renderBody(n, i).element)}
      </div>
      {/* <>
        <hr />
        {true && <BBaryCentre
          orbitals={['x1', 'x2', 'x3']}
          bodyA={<BBody name="HIP 90297 A" orbitals={['x1']} down >
            <BBody name="Body 1 a" up orbitals={['x1', 'x1']} surfaces={['x9']} />
          </BBody>}
          bodyB={<BBody name="HIP 90297 B" up >

          </BBody>}
        />}
        <hr />
        {false && <><BBaryCentre
          bodyA={<BBody name="HIP 90297 A" down />}
          bodyB={<BBody name="HIP 90297 B" up />}
        />
          <hr />
        </>}
        {true && <BBody name="Main star" root >
          <BBody name="Body 1" orbitals={['x1', 'x1', 'x1']} surfaces={['x9']} up down>
            <BBody name="Body 1 a" orbitals={['x1', 'x1']} surfaces={['x9']} up />
          </BBody>

          <BBody name="Body 2" up down >

            <BBody name="Body 2 a" up down />
            <BBaryCentre
              hasParent
              orbitals={['x1', 'x2']}
              bodyA={<BBody name="Body 2 b" down orbitals={['x1']} surfaces={['x9', 'x9']} />}
              bodyB={<BBody name="Body 2 c" up orbitals={['x1', 'x1', 'x1']} surfaces={['x9']} />}
            />

          </BBody>

          <BBody name="Body 3" up orbitals={['x1', 'x1', 'x1']} surfaces={['x9', 'x9', 'x9']} />

        </BBody>}
        <hr />
        {false && <BBody name="_root BC" root>
          <BBody name="HIP 90297 A" down >

            <BBody name="A 1" orbitals={['abc', 'def', 'ghi']} surfaces={['mno', 'qqq']} up down>
              <BBody name="A 1 a" up />
              <BBody name="A 1 b" up />
            </BBody>

            <BBody name="A 2" surfaces={['z 99', 'z88']} up>
              <BBody name="A 2 a" orbitals={['a11', 'a22']} surfaces={['aa a', 'bb bb bb', 'cc', 'aa a', 'bb bb bb', 'cc']} up down />
              <BBody name="A 2 b" orbitals={['yy']} up down />
              <BBody name="A 2 c" orbitals={['x1']} surfaces={['x 99']} up down />
              <BBody name="A 2 d" surfaces={['z 99']} up />
            </BBody>

          </BBody>
          <BBody name="HIP 90297 B" up />
        </BBody>}
        <hr />
      </> */}
    </div >;
  }

  renderBody(node: BodyMapTreeNode, idx: number): ChildParts {

    const childParts = Object.values(node.children).map((n, i) => this.renderBody(n, i));
    const hasSites = childParts.some(cp => cp.hasSites) || !!node.map?.sites.length;
    // console.log(`** ${node.body.name}: ${hasSites} / ${!!node.map?.sites.length}`);

    const siblings = Object.keys(node.parent?.children ?? {});
    const parentIsBaryCentre = node.parent?.body.type === 'bc';

    // if (node.body.name === 'DM99 54.2 AB 1') { //'DM99 54.2 B') {
    //   console.log(idx, node);
    // }

    if (node.body.type === 'bc') {
      const childElements = childParts.length < 3 ? undefined : childParts.slice(2).map(cp => cp.element);
      return {
        hasSites: hasSites || !!node.map?.sites.length,
        element: <BBaryCentre
          key={`barycentre-${node.body.name}${idx}`}
          hasParent={!!node.parent}
          bodyA={childParts[0]?.element}
          bodyB={childParts[1]?.element}
          children={childElements}
          up={node.parent && (idx > 0 || !parentIsBaryCentre)}
          down={siblings.length > 1 && idx !== siblings.length - 1}
        />
      };
    } else {

      const name = ['bh', 'ns', 'wd', 'st'].includes(node.body.type)
        ? node.body.name
        : node.body.name.replace(this.props.systemName + ' ', '');

      let drawUp = node.parent && (parentIsBaryCentre
        ? idx === 1 || idx > 2
        : (idx > 0 || !parentIsBaryCentre));

      let drawDown = parentIsBaryCentre
        ? idx === 0 || (idx > 1 && idx !== siblings.length - 1)
        : siblings.length > 1 && idx !== siblings.length - 1;

      return {
        hasSites: hasSites || !!node.map?.sites.length,
        element: <BBody
          sysView={this.props.sysView}
          key={`body-${node.body.name}${idx}`}
          node={node}
          name={name}
          children={childParts.length ? childParts.map(cp => cp.element) : undefined}
          root={!node.parent}
          up={drawUp}
          down={drawDown}
          leftDotted={parentIsBaryCentre && idx > 1}
          onSelect={id => {
            this.setState({ lastSiteId: id });
          }}
        />
      };
    }
  }
}

type ChildParts = {
  hasSites: boolean;
  element: JSX.Element;
}

export const BBaryCentre: FunctionComponent<{ bodyA: JSX.Element, bodyB: JSX.Element, hasParent?: boolean, up?: boolean, down?: boolean }> = (props) => {

  return <>
    <div style={{
      position: 'relative',
      // marginLeft: props.hasParent ? 0 : indent,
      paddingLeft: props.hasParent ? indent : 0,
    }}>

      {props.bodyA}

      {!!props.children && <>
        <Stack
          horizontal
          verticalAlign='center'
          style={{ borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, }}
        >
          <div style={{
            borderBottom: `2px dotted ${appTheme.palette.themeTertiary}`,
            marginLeft: indent,
            paddingRight: 20,
            color: 'grey'
          }}>x</div>

          <div style={{
            borderLeft: `2px dotted ${appTheme.palette.themeTertiary}`,
            fontSize: 12,
            margin: '10px 0',
          }}>
            {props.children}
          </div>
        </Stack>
      </>}

      {props.bodyB}

      {props.hasParent && <>
        {props.up && <div style={{
          position: 'absolute',
          borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //grey`,
          borderBottom: `2px solid ${appTheme.palette.themeSecondary}`, //grey`,
          left: 0,
          top: 0,
          width: indent,
          height: '30%',
        }} />}

        {props.down && <div style={{
          position: 'absolute',
          borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //red`,
          borderTop: `2px solid ${appTheme.palette.themeSecondary}`, //red`,
          left: 0,
          top: '30%',
          width: indent,
          bottom: 0,
        }} />}
      </>}
    </div>
  </>;
}

interface BodyBlockProps {
  sysView: SystemView2;
  onSelect: (id: string) => void;
  node: BodyMapTreeNode;
  root?: boolean;
  name?: string,
  // orbitals?: string[];
  // surfaces?: string[];
  up?: boolean;
  down?: boolean;
  leftDotted?: boolean;
}

let flip = false;

export const BBody: FunctionComponent<BodyBlockProps> = (props) => {
  // let { orbitals, surfaces } = props;
  let { node, name, up, down, leftDotted, root } = props;

  const { c1, c2 } = getBodyColour(props.node?.body.type);

  const sz = getBodySize(props.node?.body.type);


  let orbitals = node.map?.orbital; //.map(s => s.name);
  let surfaces = node.map?.surface; //.map(s => s.name);

  const hasSites = !!orbitals?.length || !!surfaces?.length;
  const innerBorders = hasSites ? `2px dashed ${appTheme.palette.themeTertiary}` : undefined;
  const bottomGap = 10;
  flip = !flip;

  let bodyTitle = `${node.body.name}\n${node.body.subType}\n` + node.body.features.map(f => '» ' + mapBodyFeature[f]).join('\n');
  if (node.body.landable) {
    bodyTitle += `\n» Landable`;
  }

  const featureIcons = <Stack
    horizontal
    verticalAlign='center'
    tokens={{ childrenGap: 1 }}
    style={{ fontSize: 10, paddingTop: 0, color: hasSites ? appTheme.palette.themeTertiary : appTheme.palette.themeTertiary }}
  >
    {node.body.features.map(f => <Icon key={`bfi-${node.body.num}${f}`} iconName={mapBodyFeatureIcon[f]} title={mapBodyFeature[f]} />)}
  </Stack>;

  const canHaveBodySites = node.body.landable || (node.map?.surface && node.map.surface.length > 0);

  return <div
    style={{
      position: 'relative',
      padding: '4px 0',
      // marginLeft: root ? indent : 0,
      // backgroundColor: flip ? 'rgb(10,40,10)' : 'rgb(10,10,40)',
    }}
  >
    <>
      <Stack horizontal verticalAlign='start' style={{
        position: 'relative',
        // backgroundColor: 'rgb(20,20,20)'
      }}>
        <Stack horizontal verticalAlign='center' title={bodyTitle} style={{
          position: 'relative',
          cursor: 'default',
          // backgroundColor: 'rgb(30,30,30)'
        }}>
          <svg
            width={3 + indent + sz * 2}
            height={2 + sz * 2}
            style={{
              zIndex: 1,
              backgroundColor: appTheme.palette.white, // 'black',
            }}
          >
            {!root && <>
              {!leftDotted && <line x1={0} y1={1 + sz} x2={indent + sz} y2={1 + sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
              {leftDotted && <line x1={0} y1={1 + sz} x2={indent + sz} y2={1 + sz} stroke={appTheme.palette.themeTertiary} strokeWidth={2} strokeDasharray='2, 2' />}
            </>}

            {up && !leftDotted && <line x1={1} y1={-1} x2={1} y2={sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
            {down && !leftDotted && <line x1={1} y1={sz} x2={1} y2={2 + sz * 2} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}

            <circle cx={indent + sz} cy={1 + sz} r={sz} fill={c1} stroke={c2} strokeWidth={2} />
          </svg>

          <div style={{ position: 'relative', borderBottom: innerBorders, paddingRight: 20 }} >
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 0 }}>
              <span style={{ marginRight: 6, width: 'max-content' }}>{name}</span>
              {(!hasSites || !canHaveBodySites) && featureIcons}
            </Stack>
            {hasSites && canHaveBodySites && <div style={{ position: 'absolute', right: 10, top: 30 }}>{featureIcons}</div>}

          </div>
        </Stack>

        {hasSites && <div style={{
          borderLeft: innerBorders,
          position: 'relative',
          marginBottom: bottomGap,
        }}>
          <div style={{ fontSize: 14, padding: '2px 8px', borderBottom: innerBorders }}>
            {!orbitals?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey' }} ><Icon iconName='ProgressRingDots' /> No orbital sites</div>}
            {orbitals && orbitals.map(s => (<div key={`orbitalsite${s.id}${++nnn}`}>
              <SiteLink site={s} sysView={props.sysView} prefix='sbv' />
            </div>))}
          </div>

          {canHaveBodySites && <div style={{ fontSize: 14, backgroundColor: appTheme.palette.neutralLight, padding: '2px 8px' }}>
            {!surfaces?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey' }} ><Icon iconName='GlobeFavorite' /> No surface sites</div>}
            {surfaces && surfaces.map(s => (<div key={`surfacesite${s.id}${++nnn}`}>
              <SiteLink site={s} sysView={props.sysView} prefix='sbv' />
            </div>))}
          </div>}
        </div>}

        {!!props.children && <>
          <div style={{
            position: 'absolute',
            borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //gold`,
            left: sz + indent,
            top: sz,
            bottom: 0,
          }} />
        </>}
      </Stack>
    </>

    {/* Children go after body sites */}
    {props.children && <div style={{ marginLeft: sz + indent }}>{props.children}</div>}

    {!root && <>
      {up && !leftDotted && <>
        {/* Join UP to prior siblings */}
        <div style={{
          position: 'absolute',
          // zIndex: 11,
          borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //lavender`,
          left: 0,
          top: 0,
          // height: mid ? '100%' : sz,
          height: sz + 5,
        }} />
      </>}

      <>
        {/* Join LEFT to vertical bars */}
        {/* <div style={{
          position: 'absolute',
          borderLeft: `2px solid red`,
          borderBottom: `2px solid red`,
          zIndex: 10,
          left: 0,
          width: 10 + sz,
          top: sz + 0.4,
          height: 0,
        }} /> */}
      </>

      {down && !leftDotted && <>
        {/* Join Down to later siblings */}
        <div style={{
          position: 'absolute',
          borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //darkcyan`,
          left: 0,
          width: 1,
          top: sz + 4,
          bottom: 0,
        }} />
      </>}
    </>
    }

  </div >;
};

const mapBodyFeatureIcon = {
  // Body feature icons: Freezing
  // Bio: BugSolid Cotton ClassroomLogo
  // Geo: MountainClimbing FocalPoint D365BusinessCentral Dataverse Diamond FlameSolid
  // Rings: Location BullseyeTarget
  // Tidal: Video360Generic Encryption CircleHalfFull Contrast 
  // Terraformable: World
  // Volcanism: DefectSolid FocalPoint PieDouble ProcessAdvisor

  bio: 'ClassroomLogo',
  geo: 'DefectSolid',
  volcanism: 'FlameSolid',
  rings: 'Location',
  terraformable: 'World',
  tidal: 'Contrast',
};

const getBodyColour = (bodyType?: BodyType) => {
  switch (bodyType) {
    default:
      return { c1: 'brown', c2: 'rgb(255, 255, 255)' };

    case 'bh':// Black Hole
      return { c1: 'rgb(38, 0, 43)', c2: 'rgb(255, 255, 255)' };
    case 'ns':// Neutron Star
      return { c1: 'rgb(185, 255, 255)', c2: 'rgb(255, 255, 255)' };
    case 'wd':// White Dwarf
      return { c1: 'rgb(255, 255, 255)', c2: 'rgb(255, 255, 255)' };

    case 'st': // some kind of star
      return { c1: 'rgb(252, 237, 105)', c2: 'rgb(251, 255, 0)' };

    case 'gg':
      return { c1: 'rgb(233, 73, 99)', c2: 'rgb(207, 136, 136)' };

    case 'ww':
    case 'wg':
      return { c1: 'rgb(51, 191, 216)', c2: 'rgb(8, 108, 148)' };

    case 'elw':
      return { c1: 'rgb(23, 212, 16)', c2: 'rgb(4, 127, 241)' };

    case 'aw':
      return { c1: 'rgb(202, 108, 31)', c2: 'rgb(255, 255, 255)' };

    case 'hmc':
    case 'mrb':
      return { c1: 'rgb(148, 88, 32)', c2: 'rgb(100, 62, 31)' };

    case 'rb':
      return { c1: 'rgb(129, 82, 44)', c2: 'rgb(63, 42, 25)' };

    case 'ib':
    case 'ri':
      return { c1: 'rgb(137, 228, 235)', c2: 'rgb(170, 229, 233)' };

    case 'un':
      return { c1: 'rgb(75, 74, 72)', c2: 'rgb(43, 40, 35)' };

    case 'ac':
      return { c1: 'rgb(139, 139, 138)', c2: 'rgb(255, 255, 255)' };
  }
};

const getBodySize = (bodyType?: BodyType) => {
  switch (bodyType) {
    default:
      return 20;

    case 'bh':// Black Hole
    case 'ns':// Neutron Star
    case 'wd':// White Dwarf
      return 5;

    case 'st': // some kind of star
      return 30;

    case 'gg':
      return 22;

    case 'ww':
    case 'wg':
    case 'elw':
    case 'aw':
      return 15;

    case 'hmc':
    case 'mrb':
      return 15;

    case 'rb':
      return 15;

    case 'ri':
      return 8;

    case 'ib':
      return 6;

    case 'un':
      return 30;

    case 'ac':
      return 10;
  }
};


// const BSiteBlock: FunctionComponent<{ site: SiteMap2, sysView: SystemView2 }> = (props) => {
//   const s = props.site;
//   const isCurrent = props.sysView.state.selectedSite?.id === s.id;
//   const isPinned = props.sysView.state.pinnedSite?.id === s.id;

//   const id = `site-${s.id.replace('&', '')}`;
//   let nameColor = props.site.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.themePrimary;
//   if (!props.sysView.state.useIncomplete && props.site.status !== 'complete') {
//     nameColor = 'grey';
//   }

//   return <div
//     style={{ cursor: 'default' }}
//     onMouseUp={(ev) => {
//       if (!ev.defaultPrevented) {
//         props.sysView.siteSelected(s.original);
//       }
//     }}
//   >
//     <div>
//       <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>

//         {s.primaryEconomy && <EconomyBlock economy={s.primaryEconomy} size='10px' />}

//         <span id={id} style={{ position: 'absolute', left: 80 }} />

//         {<Link style={{ color: 'unset', fontStyle: s.status === 'plan' ? 'italic' : undefined }}>
//           <span style={{ color: nameColor }}>{s.name}</span>
//           &nbsp;
//           {getSiteType(s.buildType).displayName2}

//           {s.sys.primaryPortId === s.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' title='Primary port' />}
//           {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
//           {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
//         </Link>}

//         {isPinned && !s.links && <Icon iconName='PinnedSolid' style={{ marginLeft: 8, color: appTheme.palette.accent }} />}

//       </Stack>
//       {/* {!isCurrent && <>{s.name}</>} */}
//       {/* {isCurrent && <SiteLink site={s} noSys noBold iconName={s.status === 'complete' ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />} */}

//       {s.links && <Stack horizontal>
//         <MarketLinkBlocks site={s as any} width={200} height={10} />
//         <IconButton
//           iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
//           onMouseUp={(ev) => {
//             ev.preventDefault();
//             props.sysView.sitePinned(s.id);
//           }}
//         />
//       </Stack>}
//     </div>

//     {isCurrent && <SiteCard targetId={id} site={s} sysView={props.sysView} onClose={() => props.sysView.siteSelected(undefined)} />}

//   </div>;
// }

