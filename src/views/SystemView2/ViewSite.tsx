import { FunctionComponent, useState } from 'react';
import { SiteMap2 } from '../../system-model2';
import { BuildType } from '../../components/BuildType/BuildType';
import { ContextualMenu, IconButton, Stack } from '@fluentui/react';
import { appTheme, cn } from '../../theme';
import { Bod } from '../../types2';
import { BuildEffects } from '../../components/BuildEffects';
import { EconomyTable } from '../../components/MarketLinks/EconomyTable';
import { SiteMap } from '../../system-model';

export const ViewSite: FunctionComponent<{ site: SiteMap2 }> = (props) => {
  const { site } = props;

  const [dropBodies, setDropBodies] = useState(false);
  console.warn(site.sys.bodies);

  return <div className='view-site'>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'max-content max-content',
      gap: '2px 10px',
      fontSize: '14px',
      backgroundColor: 'black'
    }}>

      <div>Site:</div>
      <div>{site.name}</div>

      <div>Build type:</div>
      <BuildType
        buildType={site.buildType}
        onChange={() => {
          // TODO: change the build type...
        }}
      />

      <div>Body:</div>
      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
        <div id={`body-${site.id.substring(1)}`}>{site.body?.name}</div>
        <IconButton
          iconProps={{ iconName: 'Edit' }}
          style={{ width: 20, height: 20 }}
          onClick={() => setDropBodies(true)}
        />
        {dropBodies && <ContextualMenu
          target={`#body-${site.id.substring(1)}`}
          styles={{
            container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, cursor: 'pointer' }
          }}
          onDismiss={() => setDropBodies(false)}

          items={site.sys.bodies.filter(b => b.type !== 'bc').map(b => ({ key: `bd-${site.sys.id64}-${b.num}`, text: b.name, data: b }))}

          onRenderContextualMenuItem={(item) => {
            const body = item?.data as Bod;
            const sites = site.sys.bodyMap[body.name]?.sites;
            return <div
              key={`bdd-${site.sys.id64}-${body.num}`}
              className={cn.trh}
              style={{ padding: 1 }}
              onClick={() => {
                // TODO: change the body ...
                setDropBodies(false);
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{item?.text}</div>
              <div style={{ color: appTheme.palette.themeSecondary }}>
                {body.subType} ~{Math.round(body.distLS).toLocaleString()}ls
              </div>
              {!!sites && <Stack>{sites.map(s => <div key={`bdd-${site.sys.id64}-${body.num}-${s.id}`} className='sub-site'>&nbsp;»&nbsp;{s.name}</div>)}</Stack>}
            </div>;
          }}
        />}
      </Stack>

    </div>
    <EconomyTable site={site as any as SiteMap} />
    <BuildEffects buildType={site.buildType} />
  </div>;
}
