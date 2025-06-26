import { FunctionComponent, useState } from "react";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ActionButton, Icon, IconButton, Stack } from "@fluentui/react";
import { ViewEditName } from "./ViewEditName";
import { appTheme, cn } from "../../theme";
import { SitesViewProps } from "./SystemView2";

export const SitesTableView: FunctionComponent<SitesViewProps> = (props) => {
  const { sysMap } = props;
  const [sortColumn, setSortColumn] = useState('bodyNum');
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

  const clickHeader = (newSort: string) => {
    if (newSort === sortColumn) {
      setSortOrder(!sortOrder);
    } else if (newSort) {
      setSortColumn(newSort);
    }
  };

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
          <th>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'bodyNum' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Body'
              onClick={() => clickHeader('bodyNum')}
            />
          </th>
          <th>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'name' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Name'
              onClick={() => clickHeader('name')}
            />
          </th>
          <th>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'buildType' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Type'
              onClick={() => clickHeader('buildType')}
            />
          </th>
          <th>
            <ActionButton
              iconProps={{ iconName: sortColumn === 'status' ? (sortOrder ? 'CaretSolidUp' : 'CaretSolidDown') : 'CalculatorSubtract' }}
              text='Status'
              onClick={() => clickHeader('status')}
            />
          </th>
        </tr>
      </thead>

      <tbody>
        {sortedSites.map((sm, i) => {
          return <tr
            key={`r${props.sysMap.id64}${sm.id}`}
            className={cn.trhi}
            onClick={(ev) => { if (!ev.defaultPrevented) { props.onPin(sm.id); } }}
            style={{
              backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined,
              color: sm.status === 'complete' ? undefined : (!props.sysView.state.useIncomplete ? 'grey' : appTheme.palette.yellowDark),
              fontStyle: sm.status === 'plan' ? 'italic' : undefined,
            }}
          >
            <td style={{ paddingLeft: 10 }}
            >{props.pinnedId === sm.id && <Icon iconName='PinnedSolid' />}</td>

            <td style={{ textAlign: 'end' }}>
              <ViewEditBody
                shortName
                bodyNum={sm.bodyNum}
                systemName={sysMap.name}
                bodies={sysMap.bodies}
                bodyMap={sysMap.bodyMap}
                pinnedSiteId={props.sysView.state.pinnedSite?.id}
                onChange={newNum => {
                  sm.original.bodyNum = newNum;
                  props.onChange(sm.original);
                }}
              />
            </td>

            <td>
              <Stack horizontal>
                <ViewEditName
                  name={sm.name}
                  onChange={newName => {
                    sm.original.name = newName;
                    props.onChange(sm.original);
                  }}
                />
                {sm.sys.primaryPortId === sm.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' />}
                {sm.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' />}
                {sm.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' />}
              </Stack>
            </td>

            <td>
              <ViewEditBuildType
                buildType={sm.buildType}
                onChange={(newType) => {
                  sm.original.buildType = newType;
                  props.onChange(sm.original);
                }}
              />
            </td>

            <td>{mapStatus[sm.status]}</td>
            <td style={{ paddingRight: 4 }}>
              <IconButton
                title='Delete this site'
                iconProps={{ iconName: 'Delete' }}
                onClick={(ev) => {
                  ev.preventDefault();
                  props.onRemove(sm.id);
                }}
              />
            </td>
          </tr>;
        })}

      </tbody>
    </table>

  </div >;
}

export const mapStatus = {
  plan: 'Planning',
  build: 'Building',
  complete: 'Complete',
  // skip: 'Skip',
}
