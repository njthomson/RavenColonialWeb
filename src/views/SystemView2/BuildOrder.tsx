import { ActionButton, Callout, DefaultButton, DirectionalHint, Icon, IconButton, Link, mergeStyles, Panel, PanelType, Stack } from "@fluentui/react";
import { Component, CSSProperties, FunctionComponent } from "react";
import { appTheme, cn } from "../../theme";
import { asPosNegTxt, isMobile } from "../../util";
import { getPreReqNeeded, hasPreReq2, isTypeValid2, SiteMap2, SiteTypeValidity, sumTierPoints, SysMap2, TierPoints } from "../../system-model2";
import { getSiteType } from "../../site-data";
import { TierPoint } from "../../components/TierPoints";
import { App } from "../../App";

const onMobile = isMobile();

const ts = mergeStyles({
  "th": {
    borderBottom: `1px solid ${appTheme.palette.purpleDark}`,
    borderRight: `1px solid ${appTheme.palette.purpleDark}`,
  },
  "td": {
    padding: '0 4px',
  },
  ".cc": {
    textAlign: 'center',
  },
  ".cr": {
    textAlign: 'right',
  },
  ".dc": {
    cursor: 'default',
  },
} as Record<string, CSSProperties>);

const icb = mergeStyles({
  width: 20,
  height: 20,
});

interface BuildOrderProps {
  sysMap: SysMap2;
  orderIDs: string[];
  onClose: (orderIDs: string[] | undefined, cutoffIdx: number | undefined) => void
};

interface BuildOrderState {
  map: Record<string, SiteMap2>
  sortedIDs: string[];
  dragId: string | undefined;
  dragging: boolean;
  tierPoints: TierPoints;
  totalTierPoints: TierPoints;
  targetId?: string;
  targetValidity?: SiteTypeValidity,
  cutoffIdx: number;
  calcIds: string[];
  invalidOrdering: boolean;
}

export class BuildOrder extends Component<BuildOrderProps, BuildOrderState> {

  constructor(props: BuildOrderProps) {
    super(props);

    const map = props.sysMap.siteMaps.reduce((m, site) => {
      m[site.id] = site;
      return m;
    }, {} as Record<string, SiteMap2>);

    const sortedIDs = [...props.orderIDs];
    const cutoffIdx = props.sysMap.idxCalcLimit ?? props.sysMap.sites.length;
    const calcIds = this.getNewCalcIDs(map, sortedIDs, cutoffIdx);

    const { tierPoints } = sumTierPoints(props.sysMap.siteMaps, calcIds);
    const { tierPoints: totalTierPoints } = sumTierPoints(props.sysMap.siteMaps, props.orderIDs);

    this.state = {
      map: map,
      sortedIDs: sortedIDs,
      dragId: undefined,
      dragging: false,
      tierPoints: tierPoints,
      totalTierPoints: totalTierPoints,
      cutoffIdx: cutoffIdx,
      calcIds: calcIds,
      invalidOrdering: this.isOrderingInvalid(map, sortedIDs),
    };
  }

  getNewCalcIDs(map: Record<string, SiteMap2>, sortedIDs: string[], cutoffIdx: number) {
    const newCalcIds = sortedIDs.filter((id, i) => cutoffIdx < 0 ? map[id].status === 'complete' : i < cutoffIdx);
    return newCalcIds;
  }

  isOrderingInvalid(map: Record<string, SiteMap2>, sortedIDs: string[]) {
    let foundIncomplete = false;
    for (const id of sortedIDs) {
      const site = map[id];
      if (site.status !== 'complete') {
        foundIncomplete = true;
      } else if (foundIncomplete) {
        return true;
      }
    }

    return false;
  }

  shiftRow(dragId: string, rowId: string) {
    const { sortedIDs, cutoffIdx } = this.state;

    if (dragId === 'cut') {
      let newCutOffIdx = sortedIDs.indexOf(rowId);
      if (newCutOffIdx === cutoffIdx) {
        newCutOffIdx++;
      }
      this.setNewCalcIDs(sortedIDs, newCutOffIdx || 1);
    } else {
      // filter dragging item out of the list, then insert it ahead of the current row (getting idx before filtering, so we can drag it to the very bottom)
      const idx = sortedIDs.indexOf(rowId);
      const newSorted = sortedIDs.filter(id => id !== dragId);
      newSorted.splice(idx, 0, dragId);

      this.setNewCalcIDs(newSorted, cutoffIdx);
    }
  }

  setNewCalcIDs(newSorted: string[], newCutOffIdx: number) {
    const { map } = this.state;
    const sortedSiteMaps = newSorted.map(id => map[id]);

    const newCalcIds = this.getNewCalcIDs(map, newSorted, newCutOffIdx);

    const { tierPoints } = sumTierPoints(sortedSiteMaps, newCalcIds);
    const { tierPoints: totalTierPoints } = sumTierPoints(sortedSiteMaps, newSorted);
    this.setState({
      sortedIDs: newSorted,
      tierPoints, totalTierPoints,
      calcIds: newCalcIds,
      cutoffIdx: newCutOffIdx,
      invalidOrdering: this.isOrderingInvalid(map, newSorted),
    });
  }

  render() {
    const { map, sortedIDs, dragId, dragging, tierPoints, totalTierPoints, targetId, targetValidity, cutoffIdx, calcIds, invalidOrdering } = this.state;

    const priorSiteMaps: SiteMap2[] = [];
    const tp: TierPoints = { tier2: 0, tier3: 0 };

    let foundIncomplete = false;
    const rows = sortedIDs.map((id, i) => {
      const s = map[id];
      let backgroundColor = i % 2 ? appTheme.palette.neutralLighter : undefined;
      if (dragId === id) {
        backgroundColor = appTheme.palette.blackTranslucent40;
      }
      const validity = isTypeValid2(undefined, s.type, undefined);
      validity.isValid = !s.type.preReq || hasPreReq2(priorSiteMaps, s.type);
      const showValidityHint = !!validity.msg || !!validity?.unlocks;
      priorSiteMaps.push(s);

      const key = `bol${id.substring(1)}${i}`;
      const demolished = s.status === 'demolish';
      const isCutOff = !calcIds.includes(id) || demolished;
      if (s.status !== 'complete' && !demolished) { foundIncomplete = true; }

      return <tr
        key={key}
        style={{
          backgroundColor: backgroundColor,
          cursor: onMobile ? 'pointer' : 'row-resize',
          color: isCutOff ? 'grey' : undefined,
        }}
        onMouseOver={ev => {
          if (!onMobile) {
            ev.preventDefault();
            if (!dragging) { this.setState({ dragId: id }); }
          }
        }}
        onMouseDown={ev => {
          if (ev.defaultPrevented) { return; }
          ev.preventDefault();
          if (onMobile) {
            this.setState({ dragId: dragId === id ? undefined : id, targetId: undefined });
          } else {
            this.setState({ dragging: true, dragId: id, targetId: undefined });
          }
        }}
        onMouseUp={ev => {
          if (!onMobile) {
            ev.preventDefault();
            this.setState({ dragging: false, dragId: undefined });
          }
        }}
        onMouseEnter={ev => {
          if (ev.defaultPrevented || onMobile) { return; }
          ev.preventDefault();
          if (ev.buttons > 0 && dragId && id !== dragId) {
            this.shiftRow(dragId, id);
          }
        }}
      >
        <td className={`cr ${cn.br}`} style={{}}>
          {foundIncomplete && s.status === 'complete' && <Icon className='icon-inline' style={{ color: appTheme.palette.yellowDark, float: 'left' }} iconName='WarningSolid' title='Completed sites should be ordered ahead of incomplete ones' />}
          <div>{i + 1}</div>
        </td>

        <td style={{ position: 'relative' }}>
          <span style={{ color: isCutOff ? 'grey' : s.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.accent, marginRight: 8 }}>
            <Icon iconName={s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} style={{ color: isCutOff ? 'grey' : undefined }} />
            &nbsp;
            {s.name}
          </span>

          <span style={{ fontSize: 12 }}>{getSiteType(s.buildType, true)?.displayName2} ({s.buildType})</span>
          {i === 0 && <Icon iconName='CrownSolid' style={{ marginLeft: 8 }} title='Primary port' />}
          {s.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
          {s.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}
          {demolished && <Icon iconName='Broom' style={{ marginLeft: 4, textDecorationLine: 'unset' }} className='icon-inline' title='Demolished' />}
          {showValidityHint && !demolished && <IconButton
            id={key}
            className={cn.bBox}
            iconProps={{ iconName: validity.isValid ? 'Info' : 'Warning', style: { fontSize: 14 } }}
            style={{ position: 'absolute', right: 10, width: 20, height: 20, color: validity.isValid ? undefined : appTheme.palette.yellow }}
            onClick={() => {
              this.setState({
                targetId: targetId === key ? undefined : key,
                targetValidity: validity,
              });
            }}
          />}
        </td>

        <td className={`${cn.br}`}>
          <Stack horizontal>
            {(dragId === id || !dragId) && <Icon
              iconName={dragId === id ? 'GripperBarHorizontal' : 'GripperDotsVertical'}
              style={{ cursor: 'row-resize', }}
            />}
          </Stack>
        </td>

        <td className={`cc dc ${cn.br}`}>
          {(!onMobile || dragId !== id) && !demolished && getTierPointsDelta(s, 2, tp, i === 0, isCutOff)}
          {onMobile && dragId === id && i > 0 && <IconButton
            className={`${icb} ${cn.bBox2}`}
            iconProps={{ iconName: 'ChevronUpSmall' }}
            style={{ backgroundColor: appTheme.palette.white, height: 16 }}
            onMouseDown={ev => {
              ev.preventDefault();
              const priorIdx = sortedIDs.indexOf(id);
              if (priorIdx === cutoffIdx) {
                this.shiftRow('cut', dragId);
              } else {
                this.shiftRow(dragId, sortedIDs[priorIdx - 1]);
              }
            }}
          />}
        </td>
        <td className={`cc dc ${cn.br}`}>
          {(!onMobile || dragId !== id) && !demolished && getTierPointsDelta(s, 3, tp, i === 0, isCutOff)}
          {onMobile && dragId === id && i < sortedIDs.length - 1 && <IconButton
            className={`${icb} ${cn.bBox2}`}
            iconProps={{ iconName: 'ChevronDownSmall' }}
            style={{ backgroundColor: appTheme.palette.white, height: 16 }}
            onMouseDown={ev => {
              ev.preventDefault();
              const nextIdx = sortedIDs.indexOf(id);
              if (nextIdx + 1 === cutoffIdx) {
                this.shiftRow('cut', dragId);
              } else {
                this.shiftRow(dragId, sortedIDs[nextIdx + 1]);
              }
            }}
          />}
        </td>

        <td className='cr'>{s.body?.name?.replace(this.props.sysMap.name, '')}</td>
      </tr>;
    });

    // and add a totals row
    rows.push(<tr key='bol-totals' style={{ fontSize: 16 }}>
      <td className={cn.bt} />
      <td className={`${cn.bt} ${cn.br}`} style={{ textAlign: 'right', color: 'grey' }} colSpan={2}>Total points:</td>
      <td className={`cc ${cn.bt} ${cn.br}`} style={{ fontWeight: 'bold', color: totalTierPoints.tier2 < 0 ? appTheme.palette.redDark : appTheme.palette.green }}>
        {asPosNegTxt(totalTierPoints.tier2)}
      </td>
      <td className={`cc ${cn.bt} ${cn.br}`} style={{ fontWeight: 'bold', color: totalTierPoints.tier3 < 0 ? appTheme.palette.redDark : appTheme.palette.green }}>
        {asPosNegTxt(totalTierPoints.tier3)}
      </td>
      <td className={cn.bt} />
    </tr>);

    // insert CUT LINE row
    if (cutoffIdx >= 0) {
      const stripeBackground = dragId === 'cut' ? appTheme.palette.blackTranslucent40 : appTheme.palette.themeLight;
      const tierPointsBackground = appTheme.palette.white;
      rows.splice(cutoffIdx, 0, <tr
        key='bol-cutoff'
        className="cutRow"
        style={{
          height: 28,
          cursor: onMobile ? 'pointer' : 'row-resize',
          background: `repeating-linear-gradient(45deg, ${stripeBackground}, ${stripeBackground} 10px, ${appTheme.palette.white} 10px, ${appTheme.palette.white} 20px)`,
          color: cutoffIdx === sortedIDs.length ? 'grey' : undefined,
        }}
        onMouseOver={ev => {
          if (!onMobile) {
            ev.preventDefault();
            if (!dragging) { this.setState({ dragId: 'cut' }); }
          }
        }}
        onMouseDown={ev => {
          if (ev.defaultPrevented) { return; }
          ev.preventDefault();
          if (onMobile) {
            this.setState({ dragId: dragId === 'cut' ? undefined : 'cut' });
          } else {
            this.setState({ dragging: true, dragId: 'cut', targetId: undefined });
          }
        }}
        onMouseUp={ev => {
          if (!onMobile) {
            ev.preventDefault();
            this.setState({ dragging: false, dragId: undefined });
          }
        }}
        onMouseEnter={ev => {
          if (ev.defaultPrevented || onMobile || !dragging) { return; }
          ev.preventDefault();
          if (ev.buttons > 0 && dragId && 'cut' !== dragId) {
            this.shiftRow('cut', dragId);
          }
        }}
      >
        <td className={cn.br} />
        <td className={`cc`} colSpan={1}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>CUT LINE</div>
        </td>

        <td className={cn.br} >
          {dragId === 'cut' && <Icon
            iconName='GripperBarHorizontal'
            style={{ cursor: onMobile ? undefined : 'row-resize', }}
          />}
        </td>

        <td className={`cc ${cn.br}`} style={{}}>
          {(!onMobile || dragId !== 'cut') && <div style={{ fontWeight: 'bold', color: tierPoints.tier2 < 0 ? appTheme.palette.red : appTheme.palette.greenLight, backgroundColor: tierPointsBackground }}
          >
            {asPosNegTxt(tierPoints.tier2)}
          </div>}
          {onMobile && dragId === 'cut' && cutoffIdx > 1 && <IconButton
            className={`${icb} ${cn.bBox2}`}
            iconProps={{ iconName: 'ChevronUpSmall' }}
            style={{ backgroundColor: appTheme.palette.white }}
            onMouseDown={ev => {
              ev.preventDefault();
              this.setNewCalcIDs(sortedIDs, cutoffIdx - 1);
            }}
          />}
        </td>
        <td className={`cc ${cn.br}`}>
          {(!onMobile || dragId !== 'cut') && <div style={{ fontWeight: 'bold', color: tierPoints.tier3 < 0 ? appTheme.palette.red : appTheme.palette.greenLight, backgroundColor: tierPointsBackground }}
          >
            {asPosNegTxt(tierPoints.tier3)}
          </div>}
          {onMobile && dragId === 'cut' && cutoffIdx < sortedIDs.length && <IconButton
            className={`${icb} ${cn.bBox2}`}
            iconProps={{ iconName: 'ChevronDownSmall' }}
            style={{ backgroundColor: appTheme.palette.white }}
            onMouseDown={ev => {
              ev.preventDefault();
              this.setNewCalcIDs(sortedIDs, cutoffIdx + 1);
            }}
          />}
        </td>
        <td />

      </tr >)
    }

    return <>
      <Panel
        isOpen
        isLightDismiss

        headerText='Order for calculations:'
        allowTouchBodyScroll={onMobile}
        type={PanelType.custom}
        customWidth='800px'
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={(ev) => this.props.onClose(undefined, undefined)}
        onRenderFooterContent={() => <div style={{ marginBottom: 10 }}>
          <Stack horizontal horizontalAlign='end' verticalAlign='center' tokens={{ childrenGap: 10 }}>

            {invalidOrdering && <div style={{ fontSize: 14, color: appTheme.semanticColors.disabledBodyText }}>
              <Icon className='icon-inline' style={{ color: appTheme.palette.yellowDark, marginRight: 4 }} iconName='WarningSolid' />
              Completed sites should be ordered ahead of incomplete ones
            </div>}

            <DefaultButton
              iconProps={{ iconName: 'Accept' }}
              text='Okay'
              style={{ marginLeft: 40 }}
              onClick={() => this.props.onClose(this.state.sortedIDs, this.state.cutoffIdx)}
            />
            <DefaultButton
              iconProps={{ iconName: 'Cancel' }}
              text='Cancel'
              onClick={() => this.props.onClose(undefined, undefined)}
            />
          </Stack>
        </div>}
      >
        <div style={{ marginBottom: 8, color: appTheme.palette.themeDark }}>
          Calculations are performed using the following order until the cut line. The primary port should be the first row.
          <br />
          {onMobile && <>Tap any row to adjust it up and down.</>}
          {!onMobile && <>Drag rows up and down to adjust the order.</>}
        </div>

        <Stack horizontal tokens={{ childrenGap: 8 }} style={{ marginBottom: 8 }}>
          {<ActionButton
            className={cn.bBox2}
            style={{ height: 30 }}
            iconProps={{ iconName: 'AutoEnhanceOn' }}
            text='Auto re-order sites'
            title={`Re-orders sites by:\n\n1st  : Completed sites\n2nd : Building in-progress\n3rd  : Planning sites\n\nThen attempts to satisfy any pre-reqs or tier point deficits.`}
            onClick={() => {
              const newSortedIDs = autoReOrderSites(map);
              this.setNewCalcIDs(newSortedIDs, cutoffIdx);
            }}
          />}

          <ActionButton
            className={cn.bBox2}
            style={{ height: 30 }}
            iconProps={{ iconName: 'TestBeaker' }}
            text="Completed sites only"
            title='Set cut line before the first non-complete site'
            onClick={() => {
              const firstIncomplete = sortedIDs.findIndex(id => map[id].status !== 'complete');
              this.setNewCalcIDs(sortedIDs, firstIncomplete);
            }}
          />

          <ActionButton
            className={cn.bBox2}
            style={{ height: 30 }}
            iconProps={{ iconName: 'TestBeakerSolid' }}
            text='Use all Sites'
            title='Set cut line to the bottom'
            onClick={() => {
              this.setNewCalcIDs(sortedIDs, sortedIDs.length);
            }}
          />
        </Stack>

        <table className={ts} cellPadding={0} cellSpacing={0} style={{ userSelect: 'none', fontSize: 14, width: '100%' }}>
          <colgroup>
            <col width='40px' />
            <col width='auto' />
            <col width='30px' />
            <col width='36px' />
            <col width='36px' />
            <col width='max-content' />
          </colgroup>

          <thead>
            <tr style={{ fontSize: 16 }}>
              <th >#</th>
              <th colSpan={2} style={{ textAlign: 'left', paddingLeft: 24 }}>Site</th>
              <th title='Tier 2 points'><Icon className="icon-inline" iconName='Product' style={{ color: appTheme.palette.yellow, fontSize: 24 }} /></th>
              <th title='Tier 3 points'><Icon className="icon-inline" iconName='ProductVariant' style={{ color: appTheme.palette.green, fontSize: 24 }} /></th>
              <th style={{ borderRight: 'unset' }}>Body</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>

        <div className='small' style={{ marginBottom: 8 }}>
          Auto re-ordering sites is a work in progress, please <Link onClick={() => App.showFeedback(`Auto re-order issue in: ${this.props.sysMap.name}`)}>report errors or issues</Link>
        </div>

        {!!targetId && targetValidity && <Callout
          target={`#${targetId}`}
          directionalHint={DirectionalHint.topRightEdge}
          gapSpace={4}
          styles={{
            beak: { backgroundColor: appTheme.palette.neutralTertiaryAlt, },
            calloutMain: {
              backgroundColor: appTheme.palette.neutralTertiaryAlt,
              color: appTheme.palette.neutralDark,
            }
          }}
          onDismiss={() => this.setState({ targetId: '' })}
        >
          {targetValidity.msg && <Stack horizontal verticalAlign='center'>
            <Icon iconName={targetValidity.isValid ? 'Accept' : 'ChromeClose'} style={{ marginRight: 4, fontWeight: 'bolder', color: targetValidity.isValid ? appTheme.palette.greenLight : appTheme.palette.red }} />
            <span>{targetValidity.msg}</span>
          </Stack>}
          {targetValidity.unlocks && <>
            {targetValidity.unlocks.map(t => {
              return <div>
                <Icon iconName={t.startsWith('System') ? 'UnlockSolid' : 'Unlock'} style={{ marginRight: 4 }} />
                <span>{t}</span>
              </div>;
            })}
          </>}
        </Callout>}
      </Panel>
    </>;
  }
}

export const BothTierPoints: FunctionComponent<{ tier2: number; tier3: number; disable: boolean; fontSize: number; }> = (props) => {
  return <div
    style={{
      marginLeft: 10,
      color: props.disable ? 'grey' : undefined,
      fontSize: props.fontSize
    }}>
    <span style={{ width: 20 }} />
    <span
      className='bubble'
      style={props.tier2 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
    >
      <TierPoint tier={2} count={props.tier2} disabled={props.disable} />
    </span>
    <span style={{ width: 4 }} />
    <span
      className='bubble'
      style={props.tier3 < 0 ? { color: appTheme.palette.red, border: `2px dashed ${appTheme.palette.redDark}` } : { border: '2px dashed transparent' }}
    >
      <TierPoint tier={3} count={props.tier3} disabled={props.disable} />
    </span>
  </div>;
}

const getTierPointsDelta = (s: SiteMap2, tier: number, tp: TierPoints, first: boolean, isCutOff: boolean) => {
  let p = 0;

  let taxed = false;
  if (s.type.needs.tier === tier && !first) {
    taxed = s.calcNeeds?.count !== s.type.needs.count;
    p = -(s.calcNeeds?.count ?? s.type.needs.count);
  } else if (s.type.gives.tier === tier) {
    p = s.type.gives.count;
  }

  let title = '';
  let deficit = false;
  if (tier === 2) {
    tp.tier2 += p;
    title = `Current total: ${tp.tier2}\n`;
    deficit = p < 0 && tp.tier2 < 0;
  } else {
    tp.tier3 += p;
    title = `Current total: ${tp.tier3}\n`;
    deficit = p < 0 && tp.tier3 < 0;
  }

  // exit early if nothing to render
  if (!p) { return null; }

  const style = {} as CSSProperties;
  if (taxed) {
    title = 'Points tax applied.'
    style.color = isCutOff ? appTheme.palette.yellowDark : appTheme.palette.yellow;
    style.fontWeight = 'bold';
  }
  if (deficit) {
    if (taxed) { title += '\n'; }
    const d = tier === 2 ? tp.tier2 : tp.tier3;
    title += `Insufficient points.\nNeed ${asPosNegTxt(-d)} Tier ${tier} points`;
    style.color = isCutOff ? appTheme.palette.redDark : appTheme.palette.red;
    style.fontWeight = 'bold';
  }

  return <span style={style} title={title}>{asPosNegTxt(p)}</span>;
}

const getStatusNum = (status: string) => {
  switch (status) {
    case 'complete': return 1;
    case 'build': return 2;
    case 'plan': return 3;
    case 'demolish': return 1;
    default: throw new Error(`Unexpected status: ${status}`);
  }
}

const autoReOrderSites = (map: Record<string, SiteMap2>) => {

  // FIRST: re-order sites based on status: complete < build < plan ... and by marketID if known
  let sortedIDs = Object.values(map)
    .sort((a, b) => {

      // give precedent to status
      const as = getStatusNum(a.status);
      const bs = getStatusNum(b.status);
      if (as !== bs) { return as - bs; }

      // then to market IDs (but do not attempt to compare recycled marketIDs)
      if (!!a.marketId && !!b.marketId && a.marketId > 4_200_000_000 && b.marketId > 4_200_000_000) {
        return a.marketId - b.marketId;
      }

      // do not order by the timestamp component of IDs - I think it is more harmful than helpful
      return 0;
    })
    .map(s => s.id);

  console.log(`** FIRST sort **\n\n${sortedIDs.map((id, i) => `#${i} : ${id} (${map[id].status}) / ${map[id].name} / ${map[id].buildType} - ${map[id].type.displayName2}`).join(`\n`)}\n\n`);

  // SECOND: re-order to satisfy pre-reqs and tier point deficits
  let n = 0;
  const allSites = sortedIDs.map(id => map[id]);
  for (let i = 0; i < sortedIDs.length; i++) {
    n++;
    if (n > sortedIDs.length * 3) {
      console.warn(`Interrupting run away 2nd sort`);
      break;
    }
    const id = sortedIDs[i];
    const site = map[id];
    const priorSiteIDs = sortedIDs.slice(0, i);
    const priorSites = priorSiteIDs.map(id => map[id]);
    const trailingSites = sortedIDs.slice(i).map(id => map[id]);

    // do we have any pre-reqs to satisfy?
    if (site.type.preReq) {
      const isValid = hasPreReq2(priorSites, site.type);
      if (!isValid) {
        // find the next site that satisfies the pre-req
        const neededBuildTypes = getPreReqNeeded(site.type);
        if (!neededBuildTypes.length) { continue; }

        const fixIdx = trailingSites.findIndex(s => neededBuildTypes.includes(s.buildType));
        if (fixIdx < 0) {
          console.log(`AutoSort: #${i + 1} '${site.name}' (${site.buildType}) needs pre-req: ${site.type.preReq} - no fix found`);
          continue;
        }

        // inject satisfying pre-req where we are, then process that item next
        const [fixSite] = trailingSites.splice(fixIdx, 1);
        console.log(`AutoSort: #${i + 1} '${site.name}' (${site.buildType}) needs pre-req: ${site.type.preReq} - fixing with: '${fixSite.name}' (${fixSite.buildType}, ${fixSite.id})`);
        const [fixId] = sortedIDs.splice(i + fixIdx, 1);
        sortedIDs.splice(i, 0, fixId);
        i--;
        continue;
      }
    }

    // do we have a tier-point decifit?
    const { tierPoints } = sumTierPoints(allSites, [...priorSiteIDs, id]);
    let pointsDelta = site.type.needs.tier === 2 ? tierPoints.tier2 : tierPoints.tier3;
    if (i > 0 && pointsDelta < 0) {
      // find next site that can provide points for needed tier
      const fixIdx = trailingSites.findIndex(s => s.type.gives.tier === site.type.needs.tier && s.type.gives.count > 0);
      if (fixIdx < 0) {
        console.log(`AutoSort: #${i + 1} '${site.name}' (${site.buildType}) needs ${Math.abs(pointsDelta)} T${site.type.needs.tier} points - no fix found`);
        continue;
      }

      // inject fix where we are
      const [fixSite] = trailingSites.splice(fixIdx, 1);
      console.log(`AutoSort: #${i + 1} '${site.name}' (${site.buildType}) needs ${Math.abs(pointsDelta)} T${site.type.needs.tier} points - fixing with: '${fixSite.name}' (${fixSite.buildType}, ${fixSite.id}) for +${fixSite.type.gives.count} T${fixSite.type.gives.tier} points`);
      const [fixId] = sortedIDs.splice(i + fixIdx, 1);
      sortedIDs.splice(i, 0, fixId);
      pointsDelta += fixSite.type.gives.count;
      i--;
      continue;
    }
  }

  console.log(`** FINAL sort (${n} iterations over ${sortedIDs.length}) **\n\n${sortedIDs.map((id, i) => `#${i} : ${id} (${map[id].status}) / ${map[id].name} / ${map[id].buildType} - ${map[id].type.displayName2}`).join(`\n`)}\n\n`);
  return sortedIDs;
}
