import { FunctionComponent, useState } from "react";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ActionButton, Icon, IconButton, Stack } from "@fluentui/react";
import { ViewEditName } from "./ViewEditName";
import { appTheme, cn } from "../../theme";
import { SitesViewProps } from "./SystemView2";
import { SiteMap2 } from "../../system-model2";
import { MarketLinkBlocks } from "../../components/MarketLinks/MarketLinks";
import { ViewEditBuildStatus } from "./ViewEditStatus";

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
        case 'status': n = a.status.localeCompare(b.status); break;
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

  let lastGroupVal = sortedSites[0][sortColumn];
  const borderTop = `2px dotted ${appTheme.palette.blackTranslucent40}`;
  const rows: JSX.Element[] = [];

  sortedSites.forEach((site, i) => {
    const isNewGroup = site[sortColumn] !== lastGroupVal && sortColumn !== 'name';
    lastGroupVal = site[sortColumn];

    // inject a separator row if changing between relevant sort values
    if (isNewGroup) {
      rows.push(<tr key={`p${props.sysMap.id64}${site.id}`}><td colSpan={6} style={{ borderTop }} /></tr>);
    }

    rows.push(<tr
      key={`r${props.sysMap.id64}${site.id}`}
      className={cn.trhi}
      style={{
        backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined,
        color: site.status === 'complete' ? undefined : (!props.sysView.state.useIncomplete ? 'grey' : appTheme.palette.yellowDark),
        fontStyle: site.status === 'plan' ? 'italic' : undefined,
      }}
      onClick={(ev) => { if (!ev.defaultPrevented) { props.onPin(site.id); } }}
    >

      <td style={{ textAlign: 'center' }}>
        {props.pinnedId === site.id && <Icon iconName='PinnedSolid' />}
      </td>

      <td style={{ textAlign: 'end' }}>
        <ViewEditBody
          shortName
          bodyNum={site.bodyNum}
          systemName={sysMap.name}
          bodies={sysMap.bodies}
          bodyMap={sysMap.bodyMap}
          pinnedSiteId={props.sysView.state.pinnedSite?.id}
          onChange={newNum => {
            site.original.bodyNum = newNum;
            props.onChange(site.original);
          }}
        />
      </td>

      <td>
        <Stack horizontal>
          <ViewEditName
            name={site.name}
            onChange={newName => {
              site.original.name = newName;
              props.onChange(site.original);
            }}
          />
          {site.sys.primaryPortId === site.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' />}
          {site.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' />}
          {site.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' />}
        </Stack>

        {site.links && <Stack horizontal style={{ marginLeft: 30 }}>
          <MarketLinkBlocks site={site as any} width={200} height={10} />
          <IconButton iconProps={{ iconName: site.id === pinnedId ? 'PinnedSolid' : 'Pinned' }} />
        </Stack>}
      </td>

      <td style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon iconName={site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
          <ViewEditBuildType
            buildType={site.buildType}
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
        <col width='5%' />
        <col width='5%' />
        <col width='45%' />
        <col width='40%' />
        <col width='10%' />
        <col width='5%' />
      </colgroup>

      <thead>
        <tr>
          <th><Icon iconName='Pinned' /></th>
          <th className={cn.trh} onClick={() => clickHeader('bodyNum')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'bodyNum' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Body'
            />
          </th>
          <th className={cn.trh} onClick={() => clickHeader('name')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'name' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Name'
            />
          </th>
          <th className={cn.trh} onClick={() => clickHeader('buildType')}>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'buildType' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Type'
            />
          </th>
          <th className={cn.trh} onClick={() => clickHeader('status')}>
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

  </div >;
}
