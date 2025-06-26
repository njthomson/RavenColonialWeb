import { FunctionComponent } from 'react';
import { SysMap2 } from '../../system-model2';
import { Site } from '../../types2';
import { BuildEffects } from '../../components/BuildEffects';
import { EconomyTable2 } from '../../components/MarketLinks/EconomyTable';
import { ViewEditName } from './ViewEditName';
import { ViewEditBuildType } from './ViewEditBuildType';
import { ViewEditBody } from './ViewEditBody';
import { MarketLinks } from '../../components/MarketLinks/MarketLinks';
import { SystemView2 } from './SystemView2';

export const ViewSite: FunctionComponent<{ site: Site, sysView: SystemView2, sysMap: SysMap2, onChange: (site: Site) => void, onClose: () => void }> = (props) => {
  const { site } = props;

  // const [dropBodies, setDropBodies] = useState(false);
  const siteMap = site && props.sysMap.siteMaps.find(s => s.id === site.id)!;
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
        systemName={props.sysMap.name}
        bodies={props.sysMap.bodies}
        bodyMap={props.sysMap.bodyMap}
        pinnedSiteId={props.sysView.state.pinnedSite?.id}
        onChange={newNum => {
          site.bodyNum = newNum;
          props.onChange(site);
        }}
      />


    </div>
    <EconomyTable2 site={siteMap} noCompare />
    {siteMap?.links && <MarketLinks site={siteMap as any} sysView={props.sysView} />}
    <BuildEffects buildType={site.buildType} />

    {/* <IconButton
      iconProps={{ iconName: 'StatusCircleErrorX' }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: 20,
      }}
      onClick={() => props.onClose()}
    /> */}
  </div>;
}
