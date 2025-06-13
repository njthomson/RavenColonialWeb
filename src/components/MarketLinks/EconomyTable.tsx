import { FunctionComponent, useState } from "react";
import { SiteMap, EconomyMap } from "../../system-model";
import { Icon, Stack, Link, Panel, PanelType, IconButton, DefaultButton } from "@fluentui/react";
import { mapName } from "../../site-data";
import { cn, appTheme } from "../../theme";
import { asPosNegTxt, isMobile, asPosNegTxt2 } from "../../util";
import { CopyButton } from "../CopyButton";
import { EconomyBlock } from "../EconomyBlock";

const journalEconomiesCache: Record<string, { timestamp: string; map: EconomyMap }> = {};
type StationEconomies = { Name: string, Name_Localised: string, Proportion: number };

/*
{ "timestamp":"2025-06-07T04:51:16Z", "event":"Docked", "StationName":"Cotton Depot", "StationType":"CraterOutpost", "Taxi":false, "Multicrew":false, "StarSystem":"IC 2391 Sector LH-V b2-5", "SystemAddress":11673586574745, "MarketID":4248291075, "StationFaction":{ "Name":"Exphiay for Equality", "FactionState":"Expansion" }, "StationGovernment":"$government_Democracy;", "StationGovernment_Localised":"Democracy", "StationAllegiance":"Federation", "StationServices":[ "dock", "autodock", "blackmarket", "commodities", "contacts", "missions", "outfitting", "rearm", "refuel", "repair", "engineer", "missionsgenerated", "flightcontroller", "stationoperations", "powerplay", "searchrescue", "stationMenu", "shop", "livery", "socialspace", "vistagenomics", "registeringcolonisation", "refinery" ], "StationEconomy":"$economy_Refinery;", "StationEconomy_Localised":"Refinery", "StationEconomies":[ { "Name":"$economy_Refinery;", "Name_Localised":"Refinery", "Proportion":1.300000 }, { "Name":"$economy_Industrial;", "Name_Localised":"Industrial", "Proportion":1.000000 }, { "Name":"$economy_Military;", "Name_Localised":"Military", "Proportion":0.900000 }, { "Name":"$economy_Agri;", "Name_Localised":"Agriculture", "Proportion":0.200000 }, { "Name":"$economy_Extraction;", "Name_Localised":"Extraction", "Proportion":0.150000 }, { "Name":"$economy_HighTech;", "Name_Localised":"High Tech", "Proportion":0.150000 }, { "Name":"$economy_Tourism;", "Name_Localised":"Tourism", "Proportion":0.050000 } ], "DistFromStarLS":15.382965, "Wanted":true, "ActiveFine":true, "LandingPads":{ "Small":4, "Medium":4, "Large":2 } }
*/
const parseJournalEntry = (json: string) => {
  try {
    const entry = JSON.parse(json);

    const map: EconomyMap = {
      agriculture: 0,
      extraction: 0,
      hightech: 0,
      industrial: 0,
      military: 0,
      refinery: 0,
      terraforming: 0,
      tourism: 0,
      service: 0,
    };

    for (const economy of entry.StationEconomies as StationEconomies[]) {
      let key = economy.Name.slice(9, -1).toLowerCase();
      if (key === 'agri') { key = 'agriculture' }
      map[key as keyof EconomyMap] = Math.round(economy.Proportion * 100) / 100;
    }

    return map;
  } catch (err: any) {
    console.error('parseJournalEntry', err.stack)
  }
};

const parseJournalFiles = async (files: FileList, site: SiteMap) => {
  try {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.log')) continue;
      const text = await file.text();
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.includes('"event":"Docked"')) continue;
        const { timestamp, StarSystem, StationName } = JSON.parse(line);
        const key = `${StarSystem}/${StationName}`;
        // add or replace current entry if this is newer
        const entry = journalEconomiesCache[key];
        if (!entry || timestamp > entry.timestamp) {
          const map = parseJournalEntry(line);
          if (map) {
            journalEconomiesCache[key] = { timestamp, map };
          }
        }
      }
    }

    const cacheKey = `${site.systemName}/${site.buildName}`;
    if (cacheKey in journalEconomiesCache) {
      return journalEconomiesCache[cacheKey].map;
    }
  } catch (err: any) {
    console.error('parseJournalEntry', err.stack)
  }
};

export const EconomyTable: FunctionComponent<{ site: SiteMap, showName?: boolean }> = (props) => {
  const cacheKey = `${props.site.systemName}/${props.site.buildName}`;

  const [journalMap, setJournalMap] = useState<EconomyMap | undefined>(journalEconomiesCache[cacheKey]?.map);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // exit early if the site is not complete it cannot be landed at
  if (!props.site || props.site.type.padSize === 'none') return null;

  let economyRatioRows: JSX.Element[] = [];
  if (props.site.economies) {
    const economyRatioKeys = Array.from(new Set([...Object.keys(props.site.economies ?? {}), ...Object.keys(journalMap ?? {})]));
    economyRatioRows = economyRatioKeys
      .map(key => ([key, props.site.economies![key as keyof EconomyMap] ?? 0]) as [keyof EconomyMap, number])
      .filter(([key, val]) => val > 0 || (journalMap && journalMap[key] > 0))
      .sort((a, b) => b[1] - a[1])
      .map(([key, val]) => {
        val = Math.round(val * 100);

        // if we have entries from journal files to compare ...
        let journalMapElements: JSX.Element[] = [];
        if (journalMap) {
          const journalMapVal = Math.round(journalMap && journalMap[key] * 100);
          const greyDash = <td className={cn.bl} style={{ textAlign: 'center', color: 'grey' }}>-</td>;
          const redX = <td className={cn.bl} style={{ textAlign: 'center' }}>
            <Icon className='icon-inline' iconName='Cancel' style={{ cursor: 'Default', textAlign: 'center', width: '100%', color: appTheme.palette.red, fontWeight: 'bold' }} />
          </td>;

          if (journalMapVal) {
            // value from journal
            journalMapElements.push(<td className={cn.bl}>{journalMapVal.toFixed(0)} %</td>);

            // match?
            const match = journalMapVal === val;
            let journalMapDiff = <Icon
              className='icon-inline'
              iconName={match ? 'CheckMark' : 'Cancel'}
              style={{
                cursor: 'Default',
                textAlign: 'center',
                width: '100%',
                color: match ? appTheme.palette.greenLight : appTheme.palette.red,
                fontWeight: 'bold'

              }}
            />;
            journalMapElements.push(<td className={cn.bl}>{journalMapDiff}</td>);

            // diff
            if (journalMapVal && journalMapVal !== val && val > 0) {
              const diff = val - journalMapVal;
              journalMapDiff = <span style={{ color: appTheme.palette.yellow }}>{asPosNegTxt(diff)} %</span>;
              journalMapElements.push(<td >{journalMapDiff}</td>);
            }
          } else {
            // no value from journal?
            journalMapElements.push(greyDash);
            journalMapElements.push(redX);
          }
        }

        return <tr key={`link${props.site.buildId}econ${key}`}>
          <td className={`cl ${cn.br}`} >
            <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
              <EconomyBlock economy={key} size='10px' />
              <span>{mapName[key]}</span>
            </Stack>
          </td>
          {val ? <td className='cr'>{val.toFixed(0)} %</td> : <td className='cr' style={{ textAlign: 'center', color: 'grey' }}>-</td>}
          {journalMapElements}
        </tr>;
      });
  }

  let flip = false;
  return <div>

    {props.site.economies && <div style={{ position: 'relative' }}>
      <h3 className={cn.h3}>
        Economy Ratios:
        <div style={{ fontSize: 10, fontWeight: 'normal', float: 'right', marginTop: 6 }}>
          <Link
            title='Compare estimated values with real values from your journal files'
            onClick={() => { setShowUpload(true); setDragOver(false); }}
          >
            Compare?
          </Link>
          &nbsp;
          {!!props.site.economyAudit && <Link
            title='See a breakdown of economy calculations'
            onClick={() => { setShowAudit(true); }}
          >
            Audit?
          </Link>}
        </div>
      </h3>

      {showAudit && props.site.economyAudit && <Panel
        isLightDismiss
        isOpen
        type={PanelType.medium}
        headerText={`Economy audit: ${props.site.buildName}`}
        allowTouchBodyScroll={isMobile()}
        styles={{
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
        }}
        onDismiss={() => setShowAudit(false)}
      >
        <div className='audit' >
          <div style={{ padding: 8, marginBottom: 10, color: appTheme.palette.themePrimary }}>

            <div>Body type:&nbsp;{props.site.bodyType?.toUpperCase() ?? <span style={{ color: 'grey' }}>unknown</span>} ({props.site.bodyName ?? <span style={{ color: 'grey' }}>unknown</span>})</div>
            <div>Body features:&nbsp;{props.site.bodyFeatures?.join(', ').toUpperCase() ?? <span style={{ color: 'grey' }}>none</span>}</div>
            <div>System features:&nbsp;{props.site.systemFeatures?.join(', ').toUpperCase() ?? <span style={{ color: 'grey' }}>none</span>}</div>
            <div>Reserve level:&nbsp;{props.site.reserveLevel?.toUpperCase() ?? <span style={{ color: 'grey' }}>unknown</span>}</div>
          </div>

          <table cellPadding={0} cellSpacing={0}>
            <colgroup>
              <col width='5%' />
              <col width='15%' />
              <col width='12%' />
              <col width='70%' />
            </colgroup>
            <tbody>
              {props.site.economyAudit!.map((x, i) => {
                // flip the background color?
                const newPrev = x.inf !== props.site.economyAudit![i - 1]?.inf;
                const newNext = x.inf !== props.site.economyAudit![i + 1]?.inf;
                if (newPrev) { flip = !flip; }
                return <tr key={`audit${i}`} style={{ backgroundColor: flip ? appTheme.palette.neutralLight : '' }}>
                  <td style={{ textTransform: 'capitalize' }}>{newPrev ? x.inf : ''}</td>
                  <td>{x.before.toFixed(2)} {asPosNegTxt2(x.delta)}</td>
                  <td className='cl'>= {x.after.toFixed(2)}</td>
                  <td className='cl' style={{ paddingBottom: newNext ? 8 : 0 }} >{x.reason}</td>
                </tr>;
              })}
            </tbody>
          </table>

          <div className='small' style={{ marginTop: 16, marginBottom: 8 }}>
            Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
          </div>
        </div>
      </Panel>}


      {showUpload && <div style={{
        zIndex: 1,
        position: 'absolute',
        top: -10,
        left: 10,
        width: '90%',
        backgroundColor: appTheme.palette.neutralLight,
      }}>
        <div
          style={{
            margin: 2,
            border: dragOver ? `3px solid ${appTheme.palette.themePrimary}` : `3px dashed ${appTheme.palette.themeTertiary}`,
            padding: 4
          }}
          onDragOver={(ev) => {
            ev.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(ev) => {
            ev.preventDefault();
            setDragOver(false);
          }}
          onDrop={(ev) => {
            ev.preventDefault();
            parseJournalFiles(ev.dataTransfer.files, props.site)
              .then(map => setJournalMap(map))
              .finally(() => setShowUpload(false));
          }}
        >
          <IconButton
            title='Cancel loading journal files'
            iconProps={{ iconName: 'Cancel' }}
            style={{ width: 20, height: 20, position: 'absolute', top: 0, right: 0, backgroundColor: appTheme.palette.neutralLight, margin: 0, padding: 0 }}
            onClick={() => setShowUpload(false)}
          />
          <div style={{ fontSize: 14, margin: '4px 0' }}>
            Drag or choose journal files where you have docked at:&nbsp;
            <b>{props.site.buildName}</b> in <b>{props.site.systemName}</b>
          </div>
          <div style={{ fontSize: 10, margin: '4px 0' }}>
            Journal files can be found in: <code className={cn.grey}>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code> <CopyButton text='%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous' />
          </div>
          <div style={{ textAlign: 'right' }}>
            <input
              type="file"
              multiple
              id='browse-files'
              name="Journal*.log"
              style={{ display: 'none' }}
              onChange={(ev) => {
                parseJournalFiles(ev.target.files!, props.site)
                  .then(map => setJournalMap(map))
                  .finally(() => setShowUpload(false));
              }}
            />
            <DefaultButton
              onClick={() => document.getElementById('browse-files')?.click()}
              text='Choose file(s)'
            />
          </div>
        </div>
      </div>}

      <table className='economy-ratios' cellPadding={0} cellSpacing={0} style={{ fontSize: 14 }}>
        <thead>
          <tr>
            <th className={`${cn.bb} ${cn.br}`}>Economy</th>
            <th className={`${cn.bb}`}>Estimate</th>
            {!!journalMap && <th className={`${cn.bb} ${cn.bl}`} colSpan={3}>From journals</th>}
          </tr>
        </thead>
        <tbody>
          {economyRatioRows}
        </tbody>
      </table>

    </div>
    }

    <div className='small' style={{ marginTop: 8, marginBottom: 8 }}>
      Economy modelling calculations are a work in progress, please <Link href='https://github.com/njthomson/SrvSurvey/issues' target="_blank">report errors or issues</Link>
    </div>
  </div>;
};
