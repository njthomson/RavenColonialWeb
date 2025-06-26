import { Stack, Link, Icon, IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { EconomyBlock } from "../../components/EconomyBlock";
import { MarketLinkBlocks } from "../../components/MarketLinks/MarketLinks";
import { getSiteType } from "../../site-data";
import { SiteMap2 } from "../../system-model2";
import { appTheme } from "../../theme";
import { SiteCard } from "./SiteCard";
import { SystemView2 } from "./SystemView2";

export const SiteLink: FunctionComponent<{ site: SiteMap2, sysView: SystemView2, prefix: string }> = (props) => {
  const { site, sysView } = props;
  const [isCurrent, setIsCurrent] = useState(false);
  const isPinned = sysView.state.pinnedSite?.id === site.id;

  const id = `id-${props.prefix}-${site.id.replace('&', '')}`;
  const isNotUsed = !sysView.state.useIncomplete && site.status !== 'complete';
  let nameColor = isNotUsed
    ? 'grey'
    : (site.status === 'plan' ? appTheme.palette.yellowDark : appTheme.palette.themePrimary);

  return <div
    style={{ cursor: 'default' }}
    onMouseUp={() => setIsCurrent(!isCurrent)}
  >
    <div>
      <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>

        <Icon
          iconName={site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'}
          style={{ color: isNotUsed ? nameColor : undefined }}
        />

        {site.primaryEconomy && <EconomyBlock economy={site.primaryEconomy} size='10px' />}

        <span id={id} style={{ position: 'absolute', left: 80 }} />

        {<Link style={{ color: 'unset', fontStyle: site.status === 'plan' ? 'italic' : undefined }}>
          <span style={{ color: nameColor }}>{site.name}</span>
          &nbsp;
          <span style={{ color: isNotUsed ? appTheme.palette.themeTertiary : undefined }}>{getSiteType(site.buildType).displayName2}</span>
        </Link>}

        {site.sys.primaryPortId === site.id && <Icon iconName='CrownSolid' style={{ marginLeft: 4 }} className='icon-inline' title='Primary port' />}
        {site.status === 'plan' && <Icon iconName='WebAppBuilderFragment' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Planned site' />}
        {site.status === 'build' && <Icon iconName='ConstructionCone' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} className='icon-inline' title='Under construction' />}

        {isPinned && !site.links && <Icon iconName='PinnedSolid' style={{ marginLeft: 8, color: appTheme.palette.accent }} />}

      </Stack>
      {/* {!isCurrent && <>{s.name}</>} */}
      {/* {isCurrent && <SiteLink site={s} noSys noBold iconName={s.status === 'complete' ? (s.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite') : ''} />} */}

      {site.links && <Stack horizontal>
        <MarketLinkBlocks site={site as any} width={200} height={10} />
        <IconButton
          iconProps={{ iconName: isPinned ? 'PinnedSolid' : 'Pinned' }}
          onMouseUp={(ev) => {
            ev.preventDefault();
            sysView.sitePinned(site.id);
          }}
        />
      </Stack>}
    </div>

    {isCurrent && <SiteCard targetId={id} site={site} sysView={sysView} onClose={() => setIsCurrent(false)} />}

  </div>;
}

