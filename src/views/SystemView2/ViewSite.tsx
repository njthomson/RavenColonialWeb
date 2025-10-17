import { FunctionComponent } from 'react';
import { Site } from '../../types2';
import { BuildEffects } from '../../components/BuildEffects';
import { EconomyTable2 } from './EconomyTable2';
import { ViewEditName } from './ViewEditName';
import { ViewEditBuildType } from './ViewEditBuildType';
import { ViewEditBody } from './ViewEditBody';
import { MarketLinks } from '../../components/MarketLinks/MarketLinks';
import { SystemView2 } from './SystemView2';
import { ViewEditBuildStatus } from './ViewEditStatus';
import { Stack } from '@fluentui/react';
import { ProjectLink2 } from './ProjectLink2';

export const ViewSite: FunctionComponent<{ site: Site, sysView: SystemView2, onChange: (site: Site) => void }> = (props) => {
  const { site, sysView } = props;
  const sysMap = sysView.state.sysMap;

  const siteMap = site && sysMap.siteMaps.find(s => s.id === site.id)!;

  return <div className='view-site' style={{ position: 'relative' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'max-content max-content',
      gap: '2px 10px',
      fontSize: '14px',
      marginBottom: 10,
      alignItems: 'center',
    }}>

      <div>Site:</div>
      <h2>
        <ViewEditName
          name={site.name}
          onChange={newName => {
            site.name = newName;
            props.onChange(site);
          }}
        />
      </h2>

      <div>Build type:</div>
      <ViewEditBuildType
        buildType={site.buildType}
        sysMap={sysMap}
        onChange={(newType) => {
          site.buildType = newType;
          props.onChange(site);
        }}
      />

      <div>Body:</div>
      <ViewEditBody
        bodyNum={site.bodyNum}
        systemName={sysMap.name}
        bodies={sysMap.bodies}
        bodyMap={sysMap.bodyMap}
        pinnedSiteId={props.sysView.state.pinnedSite?.id}
        onChange={newNum => {
          site.bodyNum = newNum;
          props.onChange(site);
        }}
      />

      <div>Status:</div>
      <Stack horizontal verticalAlign='center'>
        <ViewEditBuildStatus
          status={site.status}
          onChange={newStatus => {
            site.status = newStatus;
            props.onChange(site);
          }}
        />
        <ProjectLink2 site={site} sysView={props.sysView} />
      </Stack>

    </div>
    <EconomyTable2 site={siteMap} sysView={sysView} />
    {siteMap?.links && <MarketLinks site={siteMap as any} sysView={props.sysView} />}
    {site.buildType && <BuildEffects buildType={site.buildType} siteMap={siteMap} />}

  </div>;
}
