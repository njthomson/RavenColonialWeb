import { ActionButton, Icon, Stack, Link, Panel, PanelType } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { EconomyBlock } from "../../components/EconomyBlock";
import { EconomyMap, mapName } from "../../site-data";
import { SiteMap2 } from "../../economy/system-model2";
import { appTheme, cn } from "../../theme";
import { BodyFeature, mapBodyFeature } from "../../types";
import { asPosNegTxt, isMobile, asPosNegTxt2 } from "../../util";
import { BodyOverride } from "./BodyOverride";
import { SystemView2 } from "./SystemView2";
import { mapBodyTypeNames } from "../../types2";
import { EconomyBlocks } from "../../components/MarketLinks/MarketLinks";
import { isFacilityWithEconomy, stellarRemnants } from "../../economy";
import { App } from "../../App";
import { findRealEconomiesRow, getSpanshCompareFailureReason, isConstructionSpanshPlaceholder } from "../../economy/compare/spansh-economy-resolve";
import {
  isSpanshCompareExcluded,
  isUndockableFacility,
  SPANSH_COMPARE_EXCLUDED_NOTE,
  SPANSH_COMPARE_LIMITED_BODY,
} from "../../economy/compare/spansh-compare-reliability";
import { SpanshCompareCaveat } from "../../components/SpanshCompareCaveat";

export const EconomyTable2: FunctionComponent<{ site: SiteMap2; sysView?: SystemView2; noTableHeader?: boolean; noDisclaimer?: boolean; noChart?: boolean }> = (props) => {
  const resolvedSpansh = props.sysView?.resolveSpanshEconomyForSite(props.site);
  const realMatch = resolvedSpansh?.row;
  const realEconomy = realMatch?.economies;
  const spanshMarketId = resolvedSpansh?.spanshMarketId ?? props.site.marketId;
  const spanshMatchNote = resolvedSpansh?.note;
  const journalRow = findRealEconomiesRow(props.sysView?.state.realEconomies, props.site.marketId ?? 0);
  const journalIsConstructionPlaceholder = isConstructionSpanshPlaceholder(journalRow?.economies);
  const systemName = props.site.sys.name;

  const [showAudit, setShowAudit] = useState(false);
  const [bodyOverride, setBodyOverride] = useState(false);
  const compareLoaded = props.sysView?.state.realEconomies !== undefined;
  const loadingCompare = !!props.sysView?.state.spanshCompareLoading;
  const spanshCompareExcluded = props.site && isSpanshCompareExcluded(props.site.type);
  const undockableFacility = props.site && isUndockableFacility(props.site.type);
  const spanshCompareLimited =
    !spanshCompareExcluded &&
    (resolvedSpansh?.reliability === "limited" || !!undockableFacility);

  if (!props.site) return null;
  // Surface ports only — unless economy-bearing hub/installation (no pads after build).
  if (props.site.type.padSize === "none" && !isFacilityWithEconomy(props.site)) return null;

  const colorYellow = appTheme.isInverted ? appTheme.palette.yellow : 'goldenrod';

  let economyRatioRows: JSX.Element[] = [];
  let spanshHeader = undefined
  if (props.site.economies) {
    const economyRatioKeys = Array.from(new Set([
      ...Object.keys(props.site.economies ?? {}),
      ...Object.keys(realEconomy ?? {})
    ]));

    economyRatioRows = economyRatioKeys
      .map(key => ([key, (props.site.economies && props.site.economies[key as keyof EconomyMap]) ?? 0]) as [keyof EconomyMap, number])
      .filter(([key, val]) => val > 0 || (realEconomy && realEconomy[key] > 0))
      .sort((a, b) => b[1] - a[1])
      .map(([key, val]) => {
        val = Math.round(val * 100);

        // if we have realEconomy data to compare ...
        let comparisonElements = <></>;
        if (realEconomy && !spanshCompareExcluded) {
          const realVal = realEconomy[key];

          // show values from Spansh
          if (typeof realVal !== 'undefined') {

            // diff
            let diffElement = undefined;
            if (realVal !== val && val > 0) {
              const diff = val - realVal;
              diffElement = <span style={{ color: colorYellow }}>{asPosNegTxt(diff)} %</span>;
            }

            const match = realVal === val;
            const softMismatch = !match && spanshCompareLimited;
            comparisonElements = <>
              <td className={cn.bl}>{realVal.toFixed(0)} %</td>
              <td className={cn.bl}>
                <Icon
                  className='icon-inline'
                  iconName={match ? 'CheckMark' : softMismatch ? 'Warning' : 'Cancel'}
                  title={softMismatch ? 'Spansh snapshot may not reflect in-game facility economies' : undefined}
                  style={{
                    cursor: 'Default',
                    textAlign: 'center',
                    width: '100%',
                    color: match ? appTheme.palette.greenLight : softMismatch ? colorYellow : appTheme.palette.red,
                    fontWeight: 'bold'
                  }}
                />
              </td>
              <td>{diffElement}</td>
            </>;
          } else {
            // no value to compare?
            comparisonElements = <>
              <td className={cn.bl} style={{ textAlign: 'center', color: 'grey' }}>-</td>
              <td className={cn.bl} style={{ textAlign: 'center' }}>
                <Icon className='icon-inline' iconName='Cancel' style={{ cursor: 'Default', textAlign: 'center', width: '100%', color: appTheme.palette.red, fontWeight: 'bold' }} />
              </td>
            </>;
          }
        }

        return <tr key={`link${props.site.buildId}econ${key}`}>
          <td className={`cl ${cn.br}`} >
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
              <EconomyBlock economy={key} size='10px' />
              <span>{mapName[key]}</span>
            </Stack>
          </td>
          {val > 0 ? <td className='cr'>{val.toFixed(0)} %</td> : <td className='cr' style={{ textAlign: 'center', color: 'grey' }}>-</td>}
          {comparisonElements}
        </tr>;
      });

    const canShowSpanshCompare =
      !!props.sysView &&
      (!props.site.status || props.site.status === 'complete') &&
      !spanshCompareExcluded;

    if (canShowSpanshCompare && props.sysView) {
      const sysView = props.sysView;
      if (realMatch) {
        const edsmNameMatch = resolvedSpansh?.kind === 'edsmName';
        spanshHeader = <div style={{ fontWeight: 'bold' }}>
          {spanshCompareLimited && <SpanshCompareCaveat compact style={{ marginBottom: 6 }} />}
          {!!sysView.state.useIncomplete && <Icon iconName='Warning' style={{ color: colorYellow }} />}
          <div style={{ position: 'relative' }}>
            {edsmNameMatch && (
              <Icon
                iconName='Switch'
                title={spanshMatchNote ?? 'Matched by station name via EDSM'}
                className='icon-inline'
                style={{ marginRight: 4, color: colorYellow, verticalAlign: 'middle' }}
              />
            )}
            <span style={{ color: colorYellow }}>From&nbsp;</span>
            <Link
              href={`https://spansh.co.uk/station/${spanshMarketId}`}
              target='spansh'
              style={{ color: colorYellow, fontWeight: 'bold' }}
            >
              Spansh <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ textDecoration: 'none' }} />
            </Link>
            {realMatch?.updated && (
              <span
                style={{
                  fontWeight: 'normal',
                  position: 'absolute',
                  width: 'max-content',
                  color: 'grey',
                  whiteSpace: 'nowrap',
                }}
              >
                &nbsp;As of: {new Date(realMatch.updated).toLocaleString()}
              </span>
            )}
          </div>
          {spanshMatchNote && (
            <div style={{ color: colorYellow, fontWeight: 'normal', fontSize: 11, marginTop: 2 }}>
              {spanshMatchNote}
            </div>
          )}
        </div>;
      } else if (compareLoaded) {
        const noDataMsg =
          getSpanshCompareFailureReason(
            {
              name: props.site.name,
              marketId: props.site.marketId,
              status: props.site.status,
              buildClass: props.site.type.buildClass,
              padSize: props.site.type.padSize,
            },
            sysView.state.realEconomies,
            sysView.state.edsmMarketIdByName,
            {
              edsmLoadError: sysView.state.edsmCompareError,
              edsmStationCount: sysView.state.edsmStationCount,
            },
          ) ??
          (journalIsConstructionPlaceholder
            ? 'Journal marketId is a construction placeholder (Colony only on Spansh). No operational match via EDSM name.'
            : 'No operational Spansh data for this station');
        spanshHeader = <span style={{ color: 'grey' }}>{noDataMsg}
          {props.site.marketId && props.site.marketId > 0 && <>
            &nbsp;
            <Link href={`https://spansh.co.uk/station/${props.site.marketId}`} target='spansh'>
              journal id <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ textDecoration: 'none' }} />
            </Link>
          </>}
        </span>;
      } else if (loadingCompare) {
        spanshHeader = <span style={{ color: 'grey' }}>Loading Spansh and EDSM…</span>;
      } else {
        spanshHeader = <Link
          title={
            undockableFacility
              ? `Compare RC model vs Spansh snapshot.\n\n${SPANSH_COMPARE_LIMITED_BODY}`
              : `Compare estimated values with real values from Spansh.\n\nUses journal marketId when set; otherwise EDSM station name → marketId, then Spansh economies.`
          }
          onClick={() => sysView.doGetRealEconomies(true)}
        >
          Compare with Spansh?
        </Link>;
      }
    }
  }

  const bodyFeatures = props.site.body?.features?.filter(f => f !== BodyFeature.landable).map(f => mapBodyFeature[f]).join(', ').toUpperCase();
  const systemFeatureStarTypes = Array.from(new Set(props.site.sys.bodies.filter(b => stellarRemnants.includes(b.type)).map(b => b.type)));
  const systemFeatures = systemFeatureStarTypes.map(t => mapBodyTypeNames[t]).join(', ').toUpperCase();
  const sotlLink = getSotlLink(props.site.economies);
  let flip = false;
  return <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>

    {props.site.economies && <div style={{ position: 'relative' }}>
      <h3 className={cn.h3}>
        {!props.noTableHeader && <>
          <span>Economy Ratios:</span>
          {sotlLink && <Link href={sotlLink} target='sotl' style={{ marginLeft: 8, fontSize: 10, fontWeight: 'normal' }} title='See estimated commodities at: cdb.sotl.org.uk'>Estimate commodities<Icon className="icon-inline" iconName='OpenInNewWindow' style={{ textDecoration: 'none', marginLeft: 4 }} /></Link>}
        </>}
        {!!props.noTableHeader && <>&nbsp;</>}
        <div style={{ fontSize: 10, fontWeight: 'normal', float: 'right', marginTop: 2, marginRight: 12 }}>
          {!!props.site.economyAudit && <ActionButton
            iconProps={{ iconName: 'SearchData' }}
            className={cn.bBox}
            styles={{
              root: {
                height: 22,
                padding: '0 6px',
                minWidth: 0,
                fontSize: 11,
              },
              icon: {
                fontSize: 12,
                marginRight: 3,
              },
            }}
            title='See a breakdown of economy calculations'
            onClick={() => { setShowAudit(true); }}
          >
            Audit?
          </ActionButton>}
        </div>
      </h3>

      {!props.noChart && <Stack horizontal verticalAlign='baseline' style={{ position: 'relative', marginBottom: 2 }}>
        <Icon iconName='FinancialSolid' style={{ marginRight: 4, color: appTheme.palette.themeTertiary }} />
        <EconomyBlocks economies={props.site.economies} width={360} height={14} />
      </Stack>}
      {!props.noChart && <div className='small' style={{ color: 'grey', marginBottom: 8 }}>
        Bar width is each economy&apos;s share of the total on this port. Percentages are absolute strengths (may exceed 100%).
      </div>}
      {spanshCompareExcluded && (!props.site.status || props.site.status === 'complete') && (
        <div className='small' style={{ color: 'grey', marginBottom: 8 }}>{SPANSH_COMPARE_EXCLUDED_NOTE}</div>
      )}

      {showAudit && props.site.economyAudit && <Panel
        isLightDismiss
        isOpen
        type={isMobile(true) ? PanelType.medium : PanelType.custom}
        customWidth='780px'
        headerText={`Economy audit: ${props.site.name}`}
        allowTouchBodyScroll={isMobile()}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => setShowAudit(false)}
      >
        <div className='audit' >
          <div style={{ padding: 8, marginBottom: 10, color: appTheme.palette.themePrimary }}>

            <div style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
              <Icon className='icon-inline' iconName={props.site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
              &nbsp;
              {props.site.type.displayName2} (Tier: {props.site.type.tier} - {props.site.type.buildClass})
            </div>
            <div>Body type:&nbsp;{(props.site.body?.type && mapBodyTypeNames[props.site.body?.type]?.toUpperCase()) ?? <span style={{ color: 'grey' }}>unknown</span>} - {props.site.body?.name ?? <span style={{ color: 'grey' }}>unknown</span>}</div>
            {props.site.body && props.sysView && <Link style={{ float: 'right', fontSize: 10 }} onClick={() => setBodyOverride(true)}>Override?</Link>}
            <div>Body features:&nbsp;{bodyFeatures || <span style={{ color: 'grey' }}>none</span>}</div>
            <div>System features:&nbsp;{systemFeatures || <span style={{ color: 'grey' }}>none</span>}</div>
            <div>Reserve level:&nbsp;
              {props.site.sys.reserveLevel?.toUpperCase() ?? <span style={{ color: 'grey' }}>unknown, assuming PRISTINE</span>}
            </div>
          </div>

          <table cellPadding={0} cellSpacing={0}>
            <colgroup>
              <col width='5%' />
              <col width='10%' />
              <col width='14%' />
              <col width='70%' />
            </colgroup>
            <tbody>
              {props.site.economyAudit!.map((x, i) => {
                // flip the background color?
                const newPrev = x.inf !== props.site.economyAudit![i - 1]?.inf;
                const newNext = x.inf !== props.site.economyAudit![i + 1]?.inf;
                const realMatchKnown = !spanshCompareExcluded && newNext && !!realMatch?.economies;
                const spanshValue = realMatch?.economies && x.inf in realMatch.economies ? Math.round(realMatch.economies[x.inf as keyof EconomyMap]) : 0;
                const realMatchEqual = realMatchKnown && realMatch?.economies && spanshValue === Math.round(x.after * 100);

                if (newPrev) { flip = !flip; }
                return <tr key={`audit${i}`} style={{ backgroundColor: flip ? appTheme.palette.neutralLight : '' }}>
                  <td style={{ textTransform: 'capitalize' }}>
                    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
                      {newPrev && <EconomyBlock economy={x.inf} size='10px' />}
                      {newPrev && <span>{x.inf}</span>}
                    </Stack>
                  </td>
                  <td>{asPosNegTxt2(x.delta)}</td>
                  <td className='cl'>
                    {newNext && <>
                      <>= {x.after.toFixed(2)}</>
                      {realMatchKnown && <>
                        <Icon
                          className='icon-inline'
                          iconName={realMatchEqual ? 'CheckMark' : 'Cancel'}
                          style={{ marginLeft: 4, fontWeight: 'bold', color: realMatchEqual ? appTheme.palette.greenLight : appTheme.palette.red }}
                        />
                        {!realMatchEqual && <div style={{ color: appTheme.palette.accent, fontWeight: 'bold' }}>= {(spanshValue / 100).toFixed(2)}</div>}
                      </>}
                    </>}
                  </td>
                  <td className='cl' style={{ paddingBottom: newNext ? 8 : 0, color: x.reason.startsWith('Skipped weak link') ? 'grey' : undefined }} >
                    {x.reason}
                    {realMatchKnown && !realMatchEqual && <div style={{ color: appTheme.palette.accent, fontWeight: 'bold' }}>According to Spansh</div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>

          <div className='small' style={{ marginTop: 16, marginBottom: 8 }}>
            Economy modelling calculations are a work in progress, please <Link onClick={() => App.showFeedback(`Economy modelling issue for "${props.site.name}" (${props.site.marketId}) in: ${systemName}`)}>report errors or issues</Link>
          </div>

          {props.site.body && bodyOverride && props.sysView && <>
            <BodyOverride
              body={props.site.body}
              sysView={props.sysView}
              onClose={() => setBodyOverride(false)}
            />
          </>}
        </div>
      </Panel>}

      {economyRatioRows.length > 0 && <>
        <table className='economy-ratios' cellPadding={0} cellSpacing={0} style={{ fontSize: 14 }}>
          <thead>
            <tr>
              <th className={`${cn.bb} ${cn.br}`} style={{ width: 100, height: 16 }}>Economy</th>
              <th className={`${cn.bb}`}>Estimate</th>
              {spanshHeader && <th className={`cl ${cn.bb} ${cn.bl}`} colSpan={3}>
                {spanshHeader}
              </th>}
            </tr>
          </thead>
          <tbody>
            {economyRatioRows}
          </tbody>
        </table>
      </>}

    </div>
    }

    {!props.noDisclaimer && <>
      <div className='small' style={{ marginTop: 8, marginBottom: 8 }}>
        {!!realEconomy && <>
          {!!props.sysView?.state.useIncomplete && <div style={{ color: colorYellow }}>
            <Icon iconName='Warning' /> Spansh comparison may not match if calculating with incomplete sites <Icon iconName='TestBeakerSolid' />
          </div>}
          <div>
            <Icon iconName='LightBulb' /> To update Spansh data - dock at stations with a client that uploads to EDDN
          </div>
        </>}
        Economy modelling calculations are a work in progress, please <Link onClick={() => App.showFeedback(`Economy modelling issue for "${props.site.name}" (${props.site.marketId}) in: ${systemName}`)}>report errors or issues</Link>
      </div>
    </>}
  </div>;
};

const getSotlLink = (economies: EconomyMap | undefined) => {
  if (!economies) { return undefined; }

  const query = Object.keys(economies).map(key => `${mapEconomyToSotlEco[key as keyof (EconomyMap)]}=${economies[key as keyof (EconomyMap)]}`).join('&');
  return 'https://cdb.sotl.org.uk/specialisation/hybrid?mode=c&' + query;
}

const mapEconomyToSotlEco = {
  'agriculture': 'eco3',
  'service': 'eco21', // The 'Contraband' economy is the 'new' Service type used by newly-colonised systems, while the 'Service' economy is the traditional type used rarely by older systems.
  'extraction': 'eco2',
  'hightech': 'eco7',
  'industrial': 'eco5',
  'military': 'eco8',
  'tourism': 'eco1',
  'refinery': 'eco4',
  'colony': 'eco9',
  'terraforming': 'eco10',
};
