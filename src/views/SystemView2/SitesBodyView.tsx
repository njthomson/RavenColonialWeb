import { Component, FunctionComponent } from "react";
import { Bod, BodyType, Site } from "../../types2";
import { Stack, Toggle } from "@fluentui/react";
import { appTheme } from "../../theme";
import { BodyMap2, SysMap2 } from "../../system-model2";

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


interface SitesBodyViewProps {
  systemName: string;
  sysMap: SysMap2;
  selectedId?: string;
  onSelect: (site: Site) => void;
  onChange: (site: Site) => void;
  onRemove: (id: string) => void;
}

interface SitesBodyViewState {
  dropDown: boolean;
  location: string;
  showTable: boolean;
  bodyTree: BodyMapTree;
  hideEmpties: boolean;
}

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

export class SitesBodyView extends Component<SitesBodyViewProps, SitesBodyViewState> {

  constructor(props: SitesBodyViewProps) {
    super(props);

    const defaultHideEmpties = true;

    this.state = {
      dropDown: false,
      location: 'both',
      showTable: false,
      bodyTree: this.prepBodyTree(props.sysMap, defaultHideEmpties),
      hideEmpties: defaultHideEmpties,
    };
  }

  componentDidUpdate(prevProps: Readonly<SitesBodyViewProps>, prevState: Readonly<SitesBodyViewState>, snapshot?: any): void {
    if (prevProps.sysMap !== this.props.sysMap) {
      this.setState({
        bodyTree: this.prepBodyTree(this.props.sysMap, this.state.hideEmpties),
      })
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

    for (const key of sorted) {
      const childNode = node.children[key];
      const childHasSites = this.sortAndFilterBodyTree(childNode, hideEmpties);
      // console.log(`*** ${childNode.body.name} => ${childHasSites} / ${childNode.parent?.body.name}:${childNode.parent?.body.type}`);
      if (hideEmpties && !childHasSites && childNode.parent?.body.type !== 'bc') {
        // delete node.children[key];
      } else {
        sortedChildren[key] = childNode;
      }
      node.hasSites ||= childHasSites;
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

  render() {
    const { bodyTree, hideEmpties } = this.state;

    const topNodes = Object.values(bodyTree); //.filter(n => Object.keys(n.children).length > 0);

    return <div>
      <div style={{ float: 'right' }}>
        <Toggle
          onText='Hiding empties'
          offText='Show empties'
          checked={hideEmpties}
          styles={{ root: { marginTop: 8 } }}
          onChange={(ev, checked) => {
            this.setState({
              bodyTree: this.prepBodyTree(this.props.sysMap, !!checked),
              hideEmpties: !!checked,
            });
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
    const childElements = childParts.map(cp => cp.element); //Object.values(node.children).map((n, i) => this.renderBody(n, i).element);
    // console.log(`** ${node.body.name}: ${hasSites} / ${!!node.map?.sites.length}`);

    // if (this.state.hideEmpties && !hasSites) {
    //   return {
    //     hasSites: false,
    //     element: <></>,
    //   };
    // }

    const siblings = Object.keys(node.parent?.children ?? {});
    const isLast = idx === siblings.length - 1;
    const parentIsBaryCentre = node.parent?.body.type === 'bc';


    if (node.body.type === 'bc') {
      return {
        hasSites: hasSites || !!node.map?.sites.length,
        element: <BBaryCentre
          key={`barycentre-${node.body.name}${idx}`}
          hasParent={!!node.parent}
          bodyA={childElements[0]}
          bodyB={childElements[1]}
          up={node.parent && (idx > 0 || !parentIsBaryCentre)}
          down={!isLast && siblings.length > 1}
        />
      };
    }

    const name = ['bh', 'ns', 'wd', 'st'].includes(node.body.type)
      ? node.body.name
      : node.body.name.replace(this.props.systemName + ' ', '');

    return {
      hasSites: hasSites || !!node.map?.sites.length,
      element: <BBody
        key={`body-${node.body.name}${idx}`}
        node={node}
        name={name}
        title={node.body.subType}
        children={childElements.length ? childElements : undefined}
        // up={idx > 0 || !parentIsBaryCentre}
        root={!node.parent}
        up={node.parent && (idx > 0 || !parentIsBaryCentre)}
        down={!isLast && siblings.length > 1}
      />
    };
  }
}

type ChildParts = {
  hasSites: boolean;
  element: JSX.Element;
}

export const BBaryCentre: FunctionComponent<{ bodyA: JSX.Element, bodyB: JSX.Element, orbitals?: string[], hasParent?: boolean, up?: boolean, down?: boolean }> = (props) => {

  return <>
    <div style={{
      position: 'relative',
      // marginLeft: props.hasParent ? 0 : indent,
      paddingLeft: props.hasParent ? indent : 0,
    }}>

      {props.bodyA}

      {props.orbitals && <>
        <Stack
          horizontal
          verticalAlign='center'
          style={{ borderLeft: `2px solid seagreen`, }}
        >
          <div style={{
            borderBottom: `2px dashed ${appTheme.palette.themeTertiary}`,
            marginLeft: indent,
            paddingRight: 20,
            color: 'grey'
          }}>x</div>

          <div style={{
            borderLeft: `2px dashed ${appTheme.palette.themeTertiary}`,
            fontSize: 12,
            padding: '4px 10px',
            margin: '10px 0',
          }}>
            {props.orbitals.map(t => (<div key={`orbitalsite${t}${++nnn}`}>{t}</div>))}
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
  node?: BodyMapTreeNode;
  root?: boolean;
  name?: string,
  title?: string;
  orbitals?: string[];
  surfaces?: string[];
  up?: boolean;
  down?: boolean;
}

let flip = false;

export const BBody: FunctionComponent<BodyBlockProps> = (props) => {
  let { orbitals, surfaces } = props;
  let { name, up, down, root, title } = props;

  const { c1, c2 } = getBodyColour(props.node?.body.type);

  const sz = getBodySize(props.node?.body.type);

  const node = props.node;
  if (node) {
    // root = !node.parent;
    orbitals = node.map?.orbital.map(s => s.name);
    surfaces = node.map?.surface.map(s => s.name);
  }

  const hasSites = !!orbitals?.length || !!surfaces?.length;
  const innerBorders = hasSites ? `2px dashed ${appTheme.palette.themeTertiary}` : undefined;
  const bottomGap = 10;
  flip = !flip;
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
        <Stack horizontal verticalAlign='center' title={title} style={{
          position: 'relative',
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
            {!root && <line x1={0} y1={1 + sz} x2={indent + sz} y2={1 + sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}

            {up && <line x1={1} y1={-1} x2={1} y2={sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
            {down && <line x1={1} y1={sz} x2={1} y2={2 + sz * 2} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}

            <circle cx={indent + sz} cy={1 + sz} r={sz} fill={c1} stroke={c2} strokeWidth={2} />
          </svg>
          <div style={{ borderBottom: innerBorders, paddingRight: 20 }} >{name}</div>
        </Stack>

        {hasSites && <div style={{
          borderLeft: innerBorders,
          position: 'relative',
          marginBottom: bottomGap,
        }}>
          <div style={{ fontSize: 14, padding: '2px 8px', borderBottom: innerBorders }}>
            {!orbitals?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey' }} >none</div>}
            {orbitals && orbitals.map(t => (<div key={`orbitalsite${t}${++nnn}`}>{t}</div>))}
          </div>

          <div style={{ fontSize: 14, backgroundColor: appTheme.palette.neutralLight, padding: '2px 8px' }}>
            {!surfaces?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey' }} >none</div>}
            {surfaces && surfaces.map(t => (<div key={`surfacesite${t}${++nnn}`}>{t}</div>))}
          </div>
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
      {up && <>
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

      {down && <>
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
    case 'elw':
      return { c1: 'rgb(91, 224, 169)', c2: 'rgb(255, 255, 255)' };

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
