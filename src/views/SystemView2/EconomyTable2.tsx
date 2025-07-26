import { Icon, Stack, Link, Panel, PanelType } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { EconomyBlock } from "../../components/EconomyBlock";
import { mapName } from "../../site-data";
import { EconomyMap } from "../../system-model";
import { SiteMap2 } from "../../system-model2";
import { appTheme, cn } from "../../theme";
import { BodyFeature, mapBodyFeature } from "../../types";
import { asPosNegTxt, isMobile, asPosNegTxt2 } from "../../util";
import { BodyOverride } from "./BodyOverride";
import { SystemView2 } from "./SystemView2";
import { mapBodyTypeNames } from "../../types2";
import { EconomyBlocks } from "../../components/MarketLinks/MarketLinks";
import { stellarRemnants } from "../../economy-model2";

export const EconomyTable2: FunctionComponent<{ site: SiteMap2; sysView: SystemView2; noTableHeader?: boolean; noDisclaimer?: boolean; noChart?: boolean }> = (props) => {
  const realMatch = props.sysView.state.realEconomies?.find(r => r.id === props.site?.id);
  const realEconomy = realMatch?.economies;

  const [showAudit, setShowAudit] = useState(false);
  const [bodyOverride, setBodyOverride] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(!!realEconomy);

  // exit early if the site is not complete it cannot be landed at
  if (!props.site || props.site.type.padSize === 'none') return null;

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
        if (realEconomy) {
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
            comparisonElements = <>
              <td className={cn.bl}>{realVal.toFixed(0)} %</td>
              <td className={cn.bl}>
                <Icon
                  className='icon-inline'
                  iconName={match ? 'CheckMark' : 'Cancel'}
                  style={{
                    cursor: 'Default',
                    textAlign: 'center',
                    width: '100%',
                    color: match ? appTheme.palette.greenLight : appTheme.palette.red,
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

    if (props.site.id.startsWith('&')) {
      if (realMatch) {
        spanshHeader = <>
          {!!props.sysView.state.useIncomplete && <Icon iconName='Warning' style={{ color: colorYellow }} />}
          From&nbsp;
          <Link
            href={`https://spansh.co.uk/station/${props.site.id.slice(1)}`}
            target='spansh'
          >
            Spansh <Icon iconName='OpenInNewWindow' style={{ textDecoration: 'none' }} />
          </Link>

          {realMatch?.updated && <>
            <span
              style={{
                fontWeight: 'normal',
                position: 'absolute',
                width: 'max-content',
                color: 'grey',
              }}
            >
              &nbsp;As of: {new Date(realMatch.updated).toLocaleString()}
            </span>
          </>}
        </>;
      } else if (loadingCompare) {
        spanshHeader = <span style={{ color: 'grey' }}>Loading ...</span>;
      } else {
        spanshHeader = <Link
          title={`Compare estimated values with real values from Spansh.\n\nNOTE: Comparisons are only valid when everything in the system is known to Raven Colonial.`}
          onClick={() => {
            props.sysView.doGetRealEconomies();
            setLoadingCompare(true);
          }}
        >
          Compare with Spansh?
        </Link>;
      }
    }

  }

  const bodyFeatures = props.site.body?.features?.filter(f => f !== BodyFeature.landable).map(f => mapBodyFeature[f]).join(', ').toUpperCase();
  const systemFeatureStarTypes = Array.from(new Set(props.site.sys.bodies.filter(b => stellarRemnants.includes(b.type)).map(b => b.type)));
  const systemFeatures = systemFeatureStarTypes.map(t => mapBodyTypeNames[t]).join(', ').toUpperCase();
  let flip = false;
  return <div style={{ minWidth: 380 }}>

    {props.site.economies && <div style={{ position: 'relative' }}>
      <h3 className={cn.h3}>
        {!props.noTableHeader && <>Economy Ratios:</>}
        {!!props.noTableHeader && <>&nbsp;</>}
        <div style={{ fontSize: 10, fontWeight: 'normal', float: 'right', marginTop: 6 }}>
          {!!props.site.economyAudit && <Link
            title='See a breakdown of economy calculations'
            onClick={() => { setShowAudit(true); }}
          >
            Audit?
          </Link>}
        </div>
      </h3>

      {!props.noChart && <Stack horizontal verticalAlign='baseline' style={{ position: 'relative', marginBottom: 2 }}>
        <Icon iconName='FinancialSolid' style={{ marginRight: 4, color: appTheme.palette.themeTertiary }} />
        <EconomyBlocks economies={props.site.economies} width={370} height={14} />
      </Stack>}

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
            {props.site.body && <Link style={{ float: 'right', fontSize: 10 }} onClick={() => setBodyOverride(true)}>Override?</Link>}
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
                const realMatchKnown = newNext && !!realMatch?.economies;
                const spanshValue = realMatch?.economies && x.inf in realMatch.economies ? Math.round(realMatch.economies[x.inf as keyof EconomyMap]) : 0;
                const realMatchEqual = realMatchKnown && realMatch?.economies && spanshValue === Math.round(x.after * 100);

                if (newPrev) { flip = !flip; }
                return <tr key={`audit${i}`} style={{ backgroundColor: flip ? appTheme.palette.neutralLight : '' }}>
                  <td style={{ textTransform: 'capitalize' }}>{newPrev ? x.inf : ''}</td>
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
                  <td className='cl' style={{ paddingBottom: newNext ? 8 : 0 }} >
                    {x.reason}
                    {realMatchKnown && !realMatchEqual && <div style={{ color: appTheme.palette.accent, fontWeight: 'bold' }}>According to Spansh</div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>

          <div className='small' style={{ marginTop: 16, marginBottom: 8 }}>
            Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
          </div>

          {props.site.body && bodyOverride && <>
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
          {!!props.sysView.state.useIncomplete && <div style={{ color: colorYellow }}>
            <Icon iconName='Warning' /> Spansh comparison may not match if calculating with incomplete sites <Icon iconName='TestBeakerSolid' />
          </div>}
          <div>
            <Icon iconName='LightBulb' /> To update Spansh data - dock at stations with a client that uploads to EDDN
          </div>
        </>}
        Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
      </div>
    </>}
  </div>;
};
