import { FunctionComponent } from 'react';
import { SysMap2 } from '../../system-model2';
import { Site } from '../../types2';
import { BuildEffects } from '../../components/BuildEffects';
import { EconomyTable } from '../../components/MarketLinks/EconomyTable';
import { SiteMap } from '../../system-model';
import { ViewEditName } from './ViewEditName';
import { ViewEditBuildType } from './ViewEditBuildType';
import { ViewEditBody } from './ViewEditBody';
import { IconButton } from '@fluentui/react';
import { MarketLinks } from '../../components/MarketLinks/MarketLinks';

export const ViewSite: FunctionComponent<{ site: Site, sysMap: SysMap2, onChange: (site: Site) => void, onClose: () => void }> = (props) => {
  const { site } = props;

  // const [dropBodies, setDropBodies] = useState(false);
  const siteMap = site && props.sysMap.siteMaps.find(s => s.id === site.id);
  // console.warn(site.sys.bodies);

  return <div className='view-site' style={{ position: 'relative' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'max-content max-content',
      gap: '2px 10px',
      fontSize: '14px',
      marginBottom: 10,
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
        onChange={(newType) => {
          site.buildType = newType;
          props.onChange(site);
        }}
      />

      <div>Body:</div>
      <ViewEditBody
        bodyNum={site.bodyNum}
        sysMap={props.sysMap}
        onChange={newNum => {
          site.bodyNum = newNum;
          props.onChange(site);
        }}
      />


    </div>
    <EconomyTable site={siteMap as any as SiteMap} />
    {siteMap?.links && <MarketLinks site={siteMap as any} />}
    <BuildEffects buildType={site.buildType} />

    <IconButton
      iconProps={{ iconName: 'StatusCircleErrorX' }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: 20,
      }}
      onClick={() => props.onClose()}
    />
  </div>;
}
