import { Component, FunctionComponent } from "react";
import { Bod, BT } from "../../types2";
import { ActionButton, ContextualMenu, ContextualMenuItemType, Icon, IconButton, IContextualMenuItem, Stack } from "@fluentui/react";
import { appTheme, cn } from "../../theme";
import { BodyMap2, SysMap2 } from "../../system-model2";
import { SitesViewProps, SystemView2 } from "./SystemView2";
import { store } from "../../local-storage";
import { BodyFeature, mapBodyFeature } from "../../types";
import { SiteLink } from "./SiteLink";
import { stellarRemnants } from "../../economy-model2";

let nnn = 0;
const indent = 20;

const rootBC = {
  name: '_root barycentre',
  num: 0,
  distLS: 0,
  features: [],
  parents: [],
  subType: 'barycentre',
  type: BT.bc,
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
  bodyFilter: Set<BodyFeature>;
  showBodyFilter: boolean;
  bodyFilterExclude: boolean;
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
      showBodyFilter: false,
      bodyFilterExclude: false,
      bodyFilter: new Set<BodyFeature>(),
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
      if (b.type === BT.bc) { return map; }
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
            if (!bp) {
              console.warn(`Assuming missing bodyNum: #${p} is a bary-center, for: ${b.name} (#${b.num})`);
              let bpi = b.parents.indexOf(p);
              let fakeParents = b.parents.slice(bpi + 1);
              bp = {
                num: p,
                name: `Assumed bary-center ${Date.now()}`,
                type: BT.bc,
                subType: 'Barycenter?',
                parents: fakeParents,
              } as Bod;
              sysMap.bodies.push(bp);
            }
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

          if (!bpn) {
            throw new Error(`Why no BPN? p:${p}`);
          }
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
    const sorted = Object.keys(node.children);
    /* I think we can trust sorting on the server now
    .sort((a, b) => {
      let an = node.children[a].body.num;
      let bn = node.children[b].body.num;
      if (an > 100_000 || bn > 100_000) {
        // use distLS if either body is an asteroid cluster
        return node.children[a].body.distLS - node.children[b].body.distLS;
      }

      if (an > 100_000) { an = (an - 100_000) / 100; }
      if (bn > 100_000) { bn = (bn - 100_000) / 100; }
      return an - bn;
      // return node.children[a].body.name.localeCompare(node.children[b].body.name);
      // const an = node.children[a].body.name.replace(this.props.systemName + ' ', '').replace(' ', '');
      // const bn = node.children[b].body.name.replace(this.props.systemName + ' ', '').replace(' ', '');
      // return an.localeCompare(bn);
    });
    */

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
        if (childNode.parent?.body.type !== BT.bc) {
          // parent not barycenter - skip if no sites
          if (!childHasSites) {
            continue;
          }
        } else {
          // parent is barycenter ...
          const idx = sorted.indexOf(key);
          if (idx < 2) {
            // ideally: keep the alternate if either of the 1st two bodies have sites
            // but this requires us to pre-process the whole tree, not just immediate siblings
            if ((!processed[0].childHasSites && processed[0].childNode.body.type === BT.bc) && (!processed[1].childHasSites && processed[1].childNode.body.type === BT.bc)) {
              continue;
            }
          } else {
            // treat the rest as normal
            if (!childHasSites) {
              continue;
            }
          }
        }
      }

      sortedChildren[key] = childNode;
    }

    if (node.hasSites && Object.keys(sortedChildren).length === 0 && node.map?.sites.length === 0) {
      console.warn(`Node ${node.body.name} has sites but no children?`, node);
    }

    node.children = sortedChildren;
    return node.hasSites;
  }

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
    const { bodyTree, hideEmpties, showBodyFilter, bodyFilter, bodyFilterExclude } = this.state;

    const childPartTree = Object.values(bodyTree).map((n, i) => this.renderBody(n, i));
    const bodyElements = childPartTree.map(cp => cp.element);
    const noBodies = !childPartTree.some(cp => cp.hasSome);
    const noSites = hideEmpties && !childPartTree.some(cp => cp.hasSites);

    return <div style={{ width: 'max-content', marginRight: 32 }}>
      <div
        style={{
          marginTop: 8,
          position: 'sticky',
          zIndex: 2,
          top: 54,
          textAlign: 'end',
        }}
      >
        <ActionButton
          className={cn.bBoxS}
          id='btn-body-filter'
          text='Filter bodies'
          iconProps={{ iconName: hideEmpties || bodyFilter.size > 0 ? 'FilterSolid' : 'Filter' }}
          title='Filter bodies, excluding or including, based on their features'
          style={{ marginRight: 6 }}
          onClick={() => this.setState({ showBodyFilter: !showBodyFilter })}
        />
      </div>

      <div style={{
        marginLeft: bodyTree[rootBC.name] && bodyFilter.size === 0 ? indent : 0
      }}
      >
        {bodyElements}
        {noBodies && <div style={{ marginLeft: 40, }}>
          <div>No bodies meet the filter criteria</div>
          <div style={{ marginTop: 20, color: appTheme.palette.themePrimary }}>Try toggling "Including matches" to match bodies without the criteria</div>
        </div>}
        {noSites && <div style={{ marginLeft: 40, marginTop: 20 }}>
          <div>There are no sites in the system</div>
          <div style={{ marginTop: 20, color: appTheme.palette.themePrimary }}>Toggle "Hide empty bodies"</div>
        </div>}
      </div>
      {showBodyFilter && <ContextualMenu
        target={`#btn-body-filter`}
        styles={{
          container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
        }}
        onDismiss={ev => {
          if (!ev?.defaultPrevented) {
            this.setState({ showBodyFilter: false });
          }
        }}

        onItemClick={(ev, item) => {
          // if (ev?.defaultPrevented) { return; }
          ev?.preventDefault();
          const key = item?.key.slice(3) as BodyFeature;
          let newFilter = this.state.bodyFilter;
          if (newFilter.has(key)) {
            newFilter.delete(key);
          } else {
            newFilter.add(key);
          }
          this.setState({ bodyFilter: newFilter });
        }}

        items={[
          {
            key: `bf-empties`,
            text: 'Hide empty bodies',
            title: 'Toggle hiding bodies without any sites',
            iconProps: { iconName: hideEmpties ? 'StatusErrorFull' : 'ErrorBadge' },
            checked: hideEmpties,
            onClick: (ev) => {
              ev?.preventDefault();
              this.setState({
                bodyTree: this.prepBodyTree(this.props.sysMap, !hideEmpties),
                hideEmpties: !hideEmpties,
              });
              store.sysViewHideEmpties = !hideEmpties;
            }
          },

          {
            key: `bf-div1`, itemType: ContextualMenuItemType.Normal,
            onRender: () => (<div style={{ height: 2, backgroundColor: appTheme.palette.themeSecondary }} />)
          },

          ...Object.values(BodyFeature).filter(f => f !== BodyFeature.atmos).map(f => ({
            key: `bf-${f}`,
            text: mapBodyFeature[f],
            title: `Show bodies with ${mapBodyFeature[f]}?`,
            iconProps: { iconName: mapBodyFeatureIcon[f], style: { color: mapBodyFeatureColor[f] } },
            canCheck: true,
            checked: bodyFilterExclude !== bodyFilter.has(f),
          } as IContextualMenuItem)),

          {
            key: `bf-div2`, itemType: ContextualMenuItemType.Normal,
            onRender: () => (<div style={{ height: 1, backgroundColor: appTheme.palette.themeTertiary }} />)
          },

          {
            key: `bf-exclude`,
            text: bodyFilterExclude ? 'Excluding matches' : 'Including matches',
            title: 'Toggle between excluding or including bodies with selected features',
            iconProps: { iconName: bodyFilterExclude ? 'SkypeCircleMinus' : 'CirclePlus' },
            checked: !bodyFilterExclude,
            onClick: (ev) => {
              ev?.preventDefault();
              this.setState({ bodyFilterExclude: !bodyFilterExclude });
            }
          },

          {
            key: `bf-clear`,
            text: 'Clear',
            title: 'Clear body feature filters',
            iconProps: { iconName: 'ClearFilter' },
            canCheck: false,
            onClick: (ev) => {
              ev?.preventDefault();
              bodyFilter.clear();
              this.setState({ showBodyFilter: false });
            }
          },

        ]}
      />}
    </div>;
  }

  renderBody(node: BodyMapTreeNode, idx: number): ChildParts {

    const childParts = Object.values(node.children).map((n, i) => this.renderBody(n, i));
    const hasSites = childParts.some(cp => cp.hasSites) || !!node.map?.sites.length;
    // console.log(`** ${node.body.name}: ${hasSites} / ${!!node.map?.sites.length}`);

    const siblings = Object.keys(node.parent?.children ?? {});
    const parentIsBaryCentre = node.parent?.body.type === BT.bc;

    const { bodyFilter } = this.state;
    const hasSome = bodyFilter.size === 0 || childParts.some(c => c.hasSome);

    if (node.body.type === BT.bc) {
      const childElements = childParts.length < 3 ? undefined : childParts.slice(2).map(cp => cp.element);
      // was everything filtered out?
      return {
        hasSome: hasSome,
        hasSites: hasSites || !!node.map?.sites.length,
        element: <BBaryCentre
          key={`barycentre-${node.body.name}${idx}`}
          hasParent={!!node.parent}
          filtering={this.state.bodyFilter.size > 0}
          bodyA={childParts[0]?.element}
          bodyB={childParts[1]?.element}
          children={childElements}
          up={node.parent && (idx > 0 || !parentIsBaryCentre)}
          down={siblings.length > 1 && idx !== siblings.length - 1}
          leftDotted={parentIsBaryCentre && idx > 1}
        />
      };

    } else {

      const name = [...stellarRemnants, BT.st].includes(node.body.type)
        ? node.body.name
        : node.body.name.replace(this.props.systemName + ' ', '');

      let drawUp = node.parent && (parentIsBaryCentre
        ? idx === 1 || idx > 2
        : (idx > 0 || !parentIsBaryCentre));

      let drawDown = parentIsBaryCentre
        ? idx === 0 || (idx > 1 && idx !== siblings.length - 1)
        : siblings.length > 1 && idx !== siblings.length - 1;


      if (bodyFilter.size > 0) {
        // filtering bodies
        let filterApplies = this.state.bodyFilterExclude
          ? node.body.features.some(f => bodyFilter.has(f))
          : !Array.from(bodyFilter).every(f => node.body.features.includes(f));

        if (filterApplies) {
          // return an element that is not visible itself but still contains the children
          return {
            hasSome: hasSome,
            hasSites: hasSites || !!node.map?.sites.length,
            element: <div key={`filtered-${node.body.num}`}>{childParts.map(cp => cp.element)}</div>,
          };
        }
      }

      // no body filtering or filter does not match
      return {
        hasSome: true,
        hasSites: hasSites || !!node.map?.sites.length,
        element: <BBody
          sysView={this.props.sysView}
          key={`body-${node.body.name}${idx}`}
          node={node}
          name={name}
          children={childParts.length ? childParts.map(cp => cp.element) : undefined}
          root={!node.parent}
          filtering={this.state.bodyFilter.size > 0}
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
  /** Has some child with sites */
  hasSites: boolean;
  /** Has some non-filtered child bodies */
  hasSome: boolean;
  element: JSX.Element;
}

export const BBaryCentre: FunctionComponent<{ bodyA: JSX.Element, bodyB: JSX.Element, hasParent?: boolean, up?: boolean, down?: boolean, filtering: boolean, leftDotted?: boolean }> = (props) => {
  // calculate a rough ratio of the size of each body and adjust how far down is the bottom line connecting to the children
  const na = (props.bodyA?.props as BodyBlockProps)?.node;
  const sa = na?.map?.sites.length || 0;
  const szA = Math.max(getBodySize(na?.body.type), sa * 20);

  const nb = (props.bodyB?.props as BodyBlockProps)?.node;
  const sb = nb?.map?.sites.length || 0;
  const szB = Math.max(getBodySize(nb?.body.type), sb * 20);
  const r = szA / szB;

  let bottomHeight = szA < szB ? '30%' : '45%';
  if (r < 0.1) {
    bottomHeight = '15%';
  } else if (r < 0.3) {
    bottomHeight = '20%';
  } else if (r > 2) {
    bottomHeight = '50%';
  }

  return <>
    <div style={{
      position: 'relative',
      // marginLeft: props.hasParent ? 0 : indent,
      paddingLeft: props.hasParent && !props.filtering ? indent : 0,
    }}>

      {props.bodyA}

      {!!props.children && <>
        <Stack
          horizontal
          verticalAlign='center'
          style={{ borderLeft: props.filtering ? undefined : `2px solid ${appTheme.palette.themeSecondary}`, }}
        >
          {!props.filtering && <div style={{
            borderBottom: `2px dotted ${appTheme.palette.themeTertiary}`,
            marginLeft: indent,
            paddingRight: 20,
            color: 'grey'
          }}>x</div>}

          <div style={{
            borderLeft: props.filtering ? undefined : `2px dotted ${appTheme.palette.themeTertiary}`,
            fontSize: 12,
            margin: '10px 0',
          }}>
            {props.children}
          </div>
        </Stack>
      </>}

      {props.bodyB}

      {props.hasParent && !props.filtering && <>
        {!props.leftDotted && <>
          {props.up && <div style={{
            position: 'absolute',
            borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //grey`,
            borderBottom: `2px solid ${appTheme.palette.themeSecondary}`, //grey`,
            left: 0,
            top: 0,
            width: indent,
            height: bottomHeight,
          }} />}

          {props.down && <div style={{
            position: 'absolute',
            borderLeft: `2px solid ${appTheme.palette.themeSecondary}`, //red`,
            borderTop: `2px solid ${appTheme.palette.themeSecondary}`, //red`,
            left: 0,
            top: bottomHeight,
            width: indent,
            bottom: 0,
          }} />}
        </>}
      </>}
      {props.leftDotted && <>
        {props.up && <div style={{
          position: 'absolute',
          borderBottom: `2px dotted ${appTheme.palette.themeTertiary}`, //grey`,
          left: 0,
          top: 0,
          width: indent,
          height: bottomHeight,
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
  filtering: boolean;
  name?: string,
  up?: boolean;
  down?: boolean;
  leftDotted?: boolean;
}

export const BBody: FunctionComponent<BodyBlockProps> = (props) => {
  const { node, name, up, down, leftDotted, root, filtering } = props;

  const orbitals = node.map?.orbital;
  const surfaces = node.map?.surface;
  const hasSites = !!orbitals?.length || !!surfaces?.length;
  const innerBorders = hasSites ? `2px dashed ${appTheme.palette.themeTertiary}` : undefined;
  const bottomGap = 10;

  let bodyTitle = `${node.body.name}\n${node.body.subType}\nArrival: ~${node.body.distLS.toLocaleString()} ls\n` + node.body.features.map(f => '» ' + mapBodyFeature[f]).join('\n');
  const isLandable = node.body.features.includes(BodyFeature.landable);

  const featureIcons = <Stack
    horizontal
    verticalAlign='center'
    tokens={{ childrenGap: 1 }}
    style={{ fontSize: 10, paddingTop: 0, color: hasSites ? appTheme.palette.themeTertiary : appTheme.palette.themeTertiary }}
  >
    {node.body.features.map(f => <Icon
      key={`bfi-${node.body.num}${f}`}
      title={mapBodyFeature[f]}
      iconName={mapBodyFeatureIcon[f]}
      style={{ color: mapBodyFeatureColor[f].slice(0, -1) + ', 0.4)' }}
    />)}
  </Stack>;

  const canHaveBodySites = isLandable || (node.map?.surface && node.map.surface.length > 0);
  const { c1, c2 } = getBodyColour(props.node?.body.type, props.node?.body.subType);
  const sz = getBodySize(props.node?.body.type);

  // without surface sites, singular orbitals are positioned too high and look disconnected
  const shiftOrbitalsDown = !canHaveBodySites && orbitals?.length === 1 && !orbitals[0].links
    ? sz * 0.70
    : 0;

  const btnAddSite = !store.cmdrName
    ? <Icon iconName="CircleAddition" style={{ marginLeft: 4, paddingTop: 2, color: appTheme.palette.neutralTertiaryAlt }} />
    : <IconButton
      className={cn.ibBri}
      iconProps={{ iconName: 'CircleAddition' }}
      title={`Add a new site to: ${node.body.name}`}
      style={{ marginLeft: 4, paddingTop: 2 }}
      onClick={() => {
        props.sysView.createNewSite(node.body.num);
      }}
    />;

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
            {!root && !filtering && <>
              {!leftDotted && <line x1={0} y1={1 + sz} x2={indent + sz} y2={1 + sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
              {leftDotted && <line x1={0} y1={1 + sz} x2={indent + sz} y2={1 + sz} stroke={appTheme.palette.themeTertiary} strokeWidth={2} strokeDasharray='2, 2' />}

              {up && !leftDotted && <line x1={1} y1={-1} x2={1} y2={sz} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
              {down && !leftDotted && <line x1={1} y1={sz} x2={1} y2={2 + sz * 2} stroke={appTheme.palette.themeSecondary} strokeWidth={2} />}
            </>}

            {/* A basic circle for all but asteroid clusters */}
            {node.body.type !== BT.ac && <>
              <circle cx={indent + sz} cy={1 + sz} r={sz} fill={c1} stroke={c2} strokeWidth={2} />
              {/* TODO: Use an ellipse for rings? */}
            </>}
            {/* A basic circle for all but asteroid clusters */}
            {node.body.type === BT.ac && <>
              <ellipse cx={indent + sz + 2} cy={1 + sz + 4} rx={sz / 4} ry={sz / 3} fill={c1} stroke={c2} strokeWidth={2} />
              <ellipse cx={indent + sz - 4} cy={1 + sz} rx={sz / 2.5} ry={sz / 2.5} fill={c1} stroke={c2} strokeWidth={2} />
              <ellipse cx={indent + sz + 5} cy={1 + sz - 7} rx={sz / 3} ry={sz / 3} fill={c1} stroke={c2} strokeWidth={2} />
            </>}
          </svg>

          <div style={{ position: 'relative', borderBottom: innerBorders, paddingRight: 20 }} >
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 0 }}>
              <span style={{ marginRight: 6, width: 'max-content' }}>{name}</span>
              {(!hasSites || !canHaveBodySites) && featureIcons}
              {!hasSites && btnAddSite}
            </Stack>
            {hasSites && canHaveBodySites && <div style={{ position: 'absolute', right: 10, top: 30 }}>{featureIcons}</div>}

          </div>
        </Stack>

        {hasSites && <div style={{
          borderLeft: innerBorders,
          position: 'relative',
          marginBottom: bottomGap,
          top: shiftOrbitalsDown,
        }}>
          <div style={{ position: 'relative', fontSize: 14, padding: '2px 8px 4px 8px', borderBottom: innerBorders }}>
            {!orbitals?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey', userSelect: 'none' }} ><Icon iconName='ProgressRingDots' /> No orbital sites</div>}
            {orbitals && orbitals.map(s => <SiteLink key={`orbitalsite${s.id}${++nnn}`} doSelect site={s} sysView={props.sysView} prefix='sbv' siteGraphType={props.sysView.state.siteGraphType} />)}
            <div style={{ position: 'absolute', right: -24, bottom: -13 }}>
              {btnAddSite}
            </div>
          </div>

          {canHaveBodySites && <div style={{ fontSize: 14, backgroundColor: appTheme.palette.neutralLight, padding: '2px 8px 3px 8px' }}>
            {!surfaces?.length && <div style={{ paddingLeft: 4, fontSize: 10, color: 'grey', userSelect: 'none' }} ><Icon iconName='GlobeFavorite' /> No surface sites</div>}
            {surfaces && surfaces.map(s => <SiteLink key={`surfacesite${s.id}${++nnn}`} doSelect site={s} sysView={props.sysView} prefix='sbv' siteGraphType={props.sysView.state.siteGraphType} />)}
          </div>}
        </div>}

        {!!props.children && !filtering && <>
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
    {props.children && <div style={{ marginLeft: filtering ? 0 : sz + indent }}>{props.children}</div>}

    {!root && !filtering && <>
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
  bio: 'ClassroomLogo',
  geo: 'DefectSolid',
  volcanism: 'FlameSolid',
  rings: 'Location',
  terraformable: 'World',
  tidal: 'Contrast',
  landable: 'DrillDownSolid',
  atmos: 'Cloudy',
};

const mapBodyFeatureColor = {
  bio: appTheme.isInverted ? 'rgb(100,255,100)' : 'rgb(0, 119, 0)',
  geo: 'rgb(255,100,100)',
  volcanism: 'rgb(255,0,0)',
  rings: appTheme.isInverted ? 'rgb(240,240,0)' : 'rgb(30,30,0)',
  terraformable: 'rgb(100,200,200)',
  tidal: appTheme.isInverted ? 'rgb(170,170,255)' : 'rgb(50,50,255)',
  landable: 'rgb(200,150,100)',
  atmos: 'rgb(167, 203, 218)',
};

// c1 is fill / c2 is stroke
const getBodyColour = (bodyType?: BT, subType?: string) => {
  switch (bodyType) {
    default:
      return { c1: 'blue', c2: 'red' };
    case BT.bh:
      return { c1: 'rgba(23, 0, 26, 1)', c2: 'rgba(46, 46, 46, 1)' };
    case BT.ns:
      return { c1: 'rgb(185, 255, 255)', c2: 'rgb(255, 255, 255)' };
    case BT.wd:
      return { c1: 'rgb(255, 255, 255)', c2: 'rgb(255, 255, 255)' };
    case BT.gg:
      return { c1: 'rgb(233, 73, 121)', c2: 'rgb(173, 97, 117)' };
    case BT.ww:
    case BT.wg:
      return { c1: 'rgb(25, 64, 236)', c2: 'rgb(10, 47, 126)' };
    case BT.elw:
      return { c1: 'rgb(23, 212, 16)', c2: 'rgb(34, 138, 13)' };
    case BT.aw:
      return { c1: 'rgb(202, 108, 31)', c2: 'rgb(255, 255, 255)' };
    case BT.hmc:
      return { c1: 'rgb(119, 117, 115)', c2: 'rgb(87, 72, 59)' };
    case BT.mrb:
      return { c1: 'rgb(150, 110, 73)', c2: 'rgb(73, 45, 22)' };
    case BT.rb:
      return { c1: 'rgb(94, 69, 48)', c2: 'rgb(75, 61, 49)' };
    case BT.ib:
      return { c1: 'rgb(126, 213, 219)', c2: 'rgb(196, 234, 236)' };
    case BT.ri:
      return { c1: 'rgb(114, 145, 146)', c2: 'rgb(134, 166, 168)' };
    case BT.un:
      return { c1: 'rgb(46, 46, 45)', c2: 'rgb(70, 69, 67)' };
    case BT.ac:
      switch (subType) {
        default:
        case 'Icy':
          return { c1: 'rgb(93, 111, 121)', c2: 'rgb(136, 142, 150)' };
        case 'Metal Rich':
          return { c1: 'rgb(92, 87, 82)', c2: 'rgb(133, 120, 110)' };
        case 'Metallic':
          return { c1: 'rgb(124, 113, 102)', c2: 'rgb(153, 143, 134)' };
        case 'Rocky':
          return { c1: 'rgb(92, 79, 64)', c2: 'rgb(150, 123, 102)' };
      }
    case BT.st:
      if (subType?.includes('Blue')) {
        return { c1: 'rgb(167, 227, 245)', c2: 'rgb(176, 241, 243)' };
      } else if (subType?.includes('Yellow-Orange')) {
        return { c1: 'rgb(252, 237, 105)', c2: 'rgb(251, 255, 0)' };
      } else if (subType?.includes('Orange')) {
        return { c1: 'rgb(247, 194, 50)', c2: 'rgb(255, 223, 79)' };
      } else if (subType?.includes('Red')) {
        return { c1: 'rgb(247, 178, 50)', c2: 'rgb(255, 193, 79)' };
      } else if (subType?.includes('Brown')) {
        return { c1: 'rgb(236, 113, 31)', c2: 'rgb(207, 112, 67)' };
      } else {
        return { c1: 'rgb(252, 237, 105)', c2: 'rgb(251, 255, 0)' };
      }
  }
};

const getBodySize = (bodyType?: BT) => {
  switch (bodyType) {
    default:
      return 20;

    case BT.bh:
    case BT.ns:
    case BT.wd:
      return 10;

    case BT.st:
      return 30;

    case BT.gg:
      return 22;

    case BT.wg:
      return 18;

    case BT.ww:
    case BT.elw:
    case BT.aw:
      return 15;

    case BT.hmc:
      return 14;
    case BT.mrb:
      return 13;

    case BT.rb:
      return 12;

    case BT.ri:
      return 12;

    case BT.ib:
      return 6;

    case BT.un:
      return 30;

    case BT.ac:
      return 10;
  }
};
