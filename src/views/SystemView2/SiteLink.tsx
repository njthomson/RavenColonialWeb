import { Stack, Link, Icon, IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { EconomyBlock } from "../../components/EconomyBlock";
import { EconomyBlocks, MarketLinkBlocks } from "../../components/MarketLinks/MarketLinks";
import { getSiteType } from "../../site-data";
import { SiteMap2 } from "../../system-model2";
import { appTheme, cn } from "../../theme";
import { SiteCard } from "./SiteCard";
import { mapSiteGraphTypeIcon, SystemView2 } from "./SystemView2";
import { SiteGraphType } from "../../types2";

export const SiteLink: FunctionComponent<{ site: SiteMap2, sysView: SystemView2, prefix: string, doSelect?: boolean; siteGraphType: SiteGraphType, noPin?: boolean }> = (props) => {
  const { site, sysView } = props;
  const [isCurrent, setIsCurrent] = useState(sysView.state.selectedSite?.id === site.id);
  const isPinned = sysView.state.pinnedSite?.id === site.id;

  const id = `id-${props.prefix}-${site.id.replace('&', '')}`;

  const isNotUsed = !sysView.state.sysMap.calcIds?.includes(site.id);
  let nameColor = isNotUsed
    ? 'grey'
    : (site.status !== 'complete' ? appTheme.palette.yellowDark : appTheme.palette.themePrimary);

  const economy = site.primaryEconomy ?? site.type.inf;
  const siteGraphType = props.siteGraphType;
  const isPrimary = !!site.links || site.body?.surfacePrimary === site || site.body?.orbitalPrimary === site;

  return <div
    id={id + '-div'}
    style={{ cursor: 'default' }}
    onMouseUp={ev => {
      if (props.doSelect && !ev.defaultPrevented) {
        sysView.siteSelected(site);
      } else {
        setIsCurrent(!isCurrent);
      }
    }}
  >
    <div>
      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4, padding: 0 }} style={{ position: 'relative', padding: 0, margin: 0, height: 20 }}>

        <Icon
          iconName={site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'}
          style={{ color: site.status === 'build' ? appTheme.palette.yellowDark : isNotUsed ? nameColor : undefined }}
        />

        {economy && <EconomyBlock economy={economy} size='10px' />}

        <span id={id} style={{ position: 'absolute', left: 80 }} />

        {<Link style={{ color: 'unset', fontStyle: site.status === 'plan' ? 'italic' : undefined }}>
          <span style={{ color: nameColor }}>{site.name}</span>
          &nbsp;
          <span style={{ color: isNotUsed ? appTheme.palette.themeTertiary : undefined, fontSize: props.noPin ? 10 : undefined }}>{getSiteType(site.buildType, true)?.displayName2}</span>
        </Link>}

        {site.sys.primaryPortId === site.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} title='Primary port' />}
        {site.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} title='Planned site' />}
        {site.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} title='Under construction' />}

        {!props.noPin && <IconButton
          className={isPinned ? cn.ibBri : cn.ibDim}
          title={`Pin this site to see:\n• Estimated economies and commodities\n• Strong and weak links\n• System effects`}
          iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
          style={{ marginLeft: 4, width: 20, height: 20 }}
          onMouseUp={(ev) => {
            ev.preventDefault();
            sysView.sitePinned(site.id);
          }}
        />}
      </Stack>

      {siteGraphType !== 'none' && <>

        {site.economies && !isPrimary && siteGraphType === 'all' && <div style={{ marginLeft: 36, marginTop: -2, marginBottom: 2 }}>
          <EconomyBlocks economies={site.economies} width={200} height={2} />
        </div>}

        {isPrimary && <>
          <Stack horizontal verticalAlign='baseline' style={{ position: 'relative', marginLeft: 18 }}>

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
    </div>

    {isCurrent && <SiteCard
      targetId={id}
      site={site}
      sysView={sysView}
      onClose={() => {
        setIsCurrent(false);
        if (props.doSelect) {
          sysView.siteSelected(undefined);
        }
      }}
    />}

  </div>;
}

