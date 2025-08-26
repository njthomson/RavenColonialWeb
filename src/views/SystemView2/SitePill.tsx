import { ActionButton, Icon } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { SiteMap2 } from "../../system-model2";
import { cn } from "../../theme";
import { SystemView2 } from "./SystemView2";
import { SiteCard } from "./SiteCard";
import { Bod } from "../../types2";
import { SitesBodyView } from "./SitesBodyView";

export const SitePill: FunctionComponent<{ site: SiteMap2, fieldHighlight?: string, keyPrefix: string, sysView: SystemView2 }> = (props) => {
  const { site, keyPrefix, sysView } = props;
  const [showCard, setShowCard] = useState(false);

  const id = `${keyPrefix}-${site.id.replace('&', '')}`;

  return <div style={{ display: 'inline-block' }}>
    <ActionButton
      id={id}
      className={`${cn.bBox2}  ${cn.pillSmall}`}
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

export const BodyPill: FunctionComponent<{ bod: Bod, sysView: SystemView2, sitesBodyViewRef: React.RefObject<SitesBodyView> }> = (props) => {

  const bodyShortName = props.bod.name.replace(props.sysView.props.systemName + ' ', '');

  return <ActionButton
    className={`${cn.bBox2} ${cn.pillSmall}`}
    text={bodyShortName}
    onClick={() => {
      // can we find the body element ...?
      const targetId = `sbv-${props.bod.num}`;
      const element = document.getElementById(targetId);
      if (element) {
        // ... yes - scroll to it
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (props.sitesBodyViewRef.current) {
        // ... no - reset the filters and then scroll
        props.sitesBodyViewRef.current.clearAllFilters();
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }}
  />;
}
