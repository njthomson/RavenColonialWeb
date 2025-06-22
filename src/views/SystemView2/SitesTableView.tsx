import { FunctionComponent, useState } from "react";
import { Site } from "../../types2";
import { ViewEditBody } from "./ViewEditBody";
import { ViewEditBuildType } from "./ViewEditBuildType";
import { ActionButton, Icon, IconButton } from "@fluentui/react";
import { ViewEditName } from "./ViewEditName";
import { appTheme, cn } from "../../theme";
import { SitesViewProps } from "./SystemView2";

export const SitesTableView: FunctionComponent<SitesViewProps> = (props) => {
  const { sysMap } = props;
  const [sortColumn, setSortColumn] = useState('bodyNum');
  const [sortOrder, setSortOrder] = useState(true);

  const idMap = sysMap.sites.reduce((map, site) => {
    map[site.id] = site;
    return map;
  }, {} as Record<string, Site>);

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
          const s = idMap[sm.id];
          return <tr
            key={`r${props.sysMap.id64}${s.id}`}
            className={cn.trhi}
            onClick={(ev) => { if (!ev.defaultPrevented) { props.onPin(s.id); } }}
            style={{ backgroundColor: i % 2 ? appTheme.palette.neutralLighter : undefined }}
          >
            <td style={{ paddingLeft: 10 }}
            >{props.pinnedId === s.id && <Icon iconName='PinnedSolid' />}</td>

            <td style={{ textAlign: 'end' }}>
              <ViewEditBody
                shortName
                bodyNum={s.bodyNum}
                sysMap={sysMap}
                onChange={newNum => {
                  s.bodyNum = newNum;
                  props.onChange(s);
                }}
              />
            </td>

            <td>
              <ViewEditName
                name={s.name}
                onChange={newName => {
                  s.name = newName;
                  props.onChange(s);
                }}
              />
            </td>

            <td>
              <ViewEditBuildType
                buildType={s.buildType}
                onChange={(newType) => {
                  s.buildType = newType;
                  props.onChange(s);
                }}
              />
            </td>

            <td>{mapStatus[s.status]}</td>
            <td>
              <IconButton
                title='Delete this site'
                iconProps={{ iconName: 'Delete' }}
                onClick={(ev) => {
                  ev.preventDefault();
                  props.onRemove(s.id);
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
}
