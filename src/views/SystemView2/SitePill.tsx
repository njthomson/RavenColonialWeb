import { ActionButton, Icon } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { SiteMap2 } from "../../system-model2";
import { cn, appTheme } from "../../theme";
import { SystemView2 } from "./SystemView2";
import { SiteCard } from "./SiteCard";

export const SitePill: FunctionComponent<{ site: SiteMap2, fieldHighlight?: string, keyPrefix: string, sysView: SystemView2 }> = (props) => {
  const { site, keyPrefix, sysView } = props;
  const [showCard, setShowCard] = useState(false);

  const id = `${keyPrefix}-${site.id.replace('&', '')}`;

  return <div style={{ display: 'inline-block' }}>
    <ActionButton
      id={id}
      className={`bubble ${cn.bBox2}`}
      style={{
        height: 18,
        padding: '0 3px',
        margin: 0,
        fontSize: 12,
        backgroundColor: appTheme.palette.neutralTertiaryAlt,
      }}
      onClick={ev => {
        if (!ev.isDefaultPrevented()) {
          setShowCard(true);
        }
      }}
    >
      <Icon iconName={site.type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} style={{ marginRight: 4 }} />
      {site.name}
    </ActionButton>

    {showCard && <SiteCard
      targetId={id}
      site={site}
      sysView={sysView}
      onClose={() => {
        setShowCard(false);
      }}
    />}
  </div>;
}
