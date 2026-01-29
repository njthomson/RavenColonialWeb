import { FunctionComponent, useState } from "react";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ActionButton, Icon, IconButton, Stack } from "@fluentui/react";
import { ViewEditName } from "./ViewEditName";
import { appTheme, cn } from "../../theme";
import { mapSiteGraphTypeIcon, SitesViewProps } from "./SystemView2";
import { SiteMap2 } from "../../system-model2";
import { EconomyBlocks, MarketLinkBlocks } from "../../components/MarketLinks/MarketLinks";
import { ViewEditBuildStatus } from "./ViewEditStatus";
import { BuildStatus } from "../../types2";

export const SitesTableView: FunctionComponent<SitesViewProps> = (props) => {
  const { sysMap, pinnedId } = props;
  const [sortColumn, setSortColumn] = useState<keyof SiteMap2>('bodyNum');
  const [sortOrder, setSortOrder] = useState(true);

  let sortedSites = [...sysMap.siteMaps]
    .sort((a, b) => {
      let n = 0;
      switch (sortColumn) {
        case 'bodyNum': n = a.bodyNum - b.bodyNum; break;
        case 'name': n = a.name.localeCompare(b.name); break;
        case 'status': n = getBuildStatusNum(a.status) - getBuildStatusNum(b.status); break;
        case 'buildType':
          n = a.type.displayName2 === b.type.displayName2
            ? a.buildType.localeCompare(b.buildType)
            : a.type.displayName2.localeCompare(b.type.displayName2);
          break;
      }
      return sortOrder ? n : n * -1;
    });

  // force sites not on any body to be last
  const nobodied = sortedSites.filter(s => s.bodyNum < 0);
  sortedSites = sortedSites.filter(s => s.bodyNum >= 0);
  sortedSites.push(...nobodied);

  const clickHeader = (newSort: keyof SiteMap2) => {
    if (newSort === sortColumn) {
      setSortOrder(!sortOrder);
    } else if (newSort) {
      setSortColumn(newSort);
    }
  };

  let lastGroupVal = sortedSites.length > 0 ? sortedSites[0][sortColumn] : undefined;
  const borderTop = `2px dotted ${appTheme.palette.blackTranslucent40}`;
  const rows: JSX.Element[] = [];
  const siteGraphType = props.sysView.state.siteGraphType;

  sortedSites.forEach((site, i) => {
    const inCalcIds = !!sysMap.calcIds?.includes(site.id);
    const isNewGroup = site[sortColumn] !== lastGroupVal && sortColumn !== 'name';
    lastGroupVal = site[sortColumn];

    // inject a separator row if changing between relevant sort values
    if (isNewGroup) {
      rows.push(<tr key={`p${props.sysMap.id64}${site.id}`}><td colSpan={6} style={{ borderTop }} /></tr>);
    }
    const isPrimary = !!site.links || site.body?.surfacePrimary === site || site.body?.orbitalPrimary === site;

    rows.push(<tr
      key={`r${props.sysMap.id64}${site.id}`}
      className={cn.trhi}
      style={{
        backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined,
        color: site.status === 'complete' ? undefined : (!inCalcIds ? 'grey' : appTheme.palette.yellowDark),
        fontStyle: site.status === 'plan' ? 'italic' : undefined,
      }}
      onClick={(ev) => { if (!ev.defaultPrevented) { props.onPin(site.id); } }}
    >

      <td style={{ textAlign: 'center' }}>
        <IconButton className={props.pinnedId === site.id ? cn.ibBri : cn.ibDim} iconProps={{ iconName: site.id === pinnedId ? 'PinnedSolid' : 'Pinned' }} title={`Pin this site to see:\n• Estimated economies and commodities\n• Strong and weak links\n• System effects`} />
      </td>

      <td style={{ textAlign: 'end' }}>
        <ViewEditBody
          shortName
          bodyNum={site.bodyNum}
          systemName={sysMap.name}
          bodies={sysMap.bodies}
          bodyMap={sysMap.bodyMap}
          pinnedSiteId={props.sysView.state.pinnedSite?.id}
          dim={!inCalcIds}
          onChange={newNum => {
            site.original.bodyNum = newNum;
            props.onChange(site.original);
          }}
        />
      </td>

      <td>
        <Stack horizontal verticalAlign='center'>
          <ViewEditName
            noBold
            disabled={site.status === 'demolish'}
            name={site.name}
            dim={!inCalcIds}
            onChange={newName => {
              site.original.name = newName;
              props.onChange(site.original);
            }}
          />
          {site.sys.primaryPortId === site.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} title='Primary port' />}
          {site.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} title='Planned site' />}
          {site.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} title='Build in-progress' />}
          {site.status === 'demolish' && <Icon iconName='Broom' style={{ marginLeft: 4 }} title='Demolished' />}
        </Stack>


        {siteGraphType !== 'none' && <>

          {site.economies && !isPrimary && siteGraphType === 'all' && <div style={{ marginLeft: 38, marginBottom: 3, marginTop: -5 }}>
            <EconomyBlocks economies={site.economies} width={200} height={2} />
          </div>}

          {isPrimary && <>
            <Stack horizontal verticalAlign='baseline' style={{ position: 'relative', marginLeft: 18, marginBottom: 3, marginTop: -4 }}>

              {siteGraphType === 'links' && site.links && <>
                <Icon iconName={mapSiteGraphTypeIcon.links} style={{ marginRight: 4, color: appTheme.palette.themeTertiary, position: 'relative', top: 1 }} />
                <MarketLinkBlocks site={site as any} width={200} height={12} />
              </>}

              {siteGraphType !== 'links' && site.economies && <>
                <Icon iconName={mapSiteGraphTypeIcon.major} style={{ marginRight: 4, color: appTheme.palette.themeTertiary }} />
                <EconomyBlocks economies={site.economies} width={200} height={12} />
              </>}

            </Stack>
          </>}
        </>}
      </td>

      <td style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon iconName={site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
          <ViewEditBuildType
            buildType={site.buildType}
            sysMap={sysMap}
            dim={!inCalcIds}
            onChange={(newType) => {
              site.original.buildType = newType;
              props.onChange(site.original);
            }}
          />
        </div>
      </td>

      <td>
        <ViewEditBuildStatus
          status={site.status}
          dim={!inCalcIds}
          onChange={newStatus => {
            site.original.status = newStatus;
            props.sysView.siteChanged(site.original);
          }}
        />
      </td>

      <td style={{ paddingRight: 4 }}>
        <IconButton
          title='Remove this site'
          iconProps={{ iconName: 'Delete' }}
          className={cn.bBox}
          onClick={(ev) => {
            ev.preventDefault();
            props.onRemove(site.id);
          }}
        />
      </td>
    </tr>);
  });

  return <div className='basic-table'>
    <table cellPadding={0} cellSpacing={0}>
      <colgroup>
        <col width='auto' />
        <col width='auto' />
        <col width='260px' />
        <col width='320px' />
        <col width='auto' />
        <col width='auto' />
      </colgroup>

      <thead>
        <tr>
          <th><Icon iconName='Pinned' /></th>
          <th className={`${cn.trh} ${cn.bBox}`} onClick={() => clickHeader('bodyNum')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'bodyNum' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Body'
            />
          </th>
          <th className={`${cn.trh} ${cn.bBox}`} onClick={() => clickHeader('name')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'name' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Name'
            />
          </th>
          <th className={`${cn.trh} ${cn.bBox}`} onClick={() => clickHeader('buildType')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'buildType' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Type'
            />
          </th>
          <th className={`${cn.trh} ${cn.bBox}`} onClick={() => clickHeader('status')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'status' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Status'
            />
          </th>
        </tr>
      </thead>

      <tbody>
        {rows}
      </tbody>
    </table>

    {rows.length === 0 && <div style={{ color: 'grey', margin: 10 }}>
      No sites yet ...
    </div>}

  </div >;
}

const getBuildStatusNum = (status: BuildStatus): number => {
  switch (status) {
    case 'plan': return 0;
    case 'build': return 1;
    case 'complete': return 2;
    case 'demolish': return 3;
    default: throw new Error(`Unexpected: ${status}`);
  }
}