import { ActionButton, Icon, Modal, ResponsiveMode, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { SysMap2, SysUnlocks, mapSysUnlocks } from "../../system-model2";

export const ViewUnlockedFeatures: FunctionComponent<{ sysMap: SysMap2 }> = (props) => {
  const [showMore, setShowMore] = useState(false);

  return <>
    <ActionButton
      id='btn-view-unlocked'
      className={`${cn.bBox}`}
      onClick={() => setShowMore(v => !showMore)}
    >
      <Stack horizontal wrap verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ fontSize: 13, color: appTheme.palette.themeTertiary }}>
        {Object.entries(mapSysUnlocks).map(([k, v], i) => {
          return <Icon key={`view-unlocked-${i}`} iconName={v.icon} title={`${v.title}\nNeeds: ${v.needs}`} style={{ color: props.sysMap.sysUnlocks[k as SysUnlocks] ? appTheme.palette.themePrimary : 'grey' }} />;
        })}
      </Stack>

    </ActionButton>
    {showMore && <Modal
      isOpen
      responsiveMode={ResponsiveMode.large}
      onDismiss={() => setShowMore(false)}
      styles={{
        main: { border: '1px solid ' + appTheme.palette.themePrimary },
        scrollableContent: { overflow: 'hidden' },
      }}
    >
      <h3>System wide unlocks:</h3>

      <Stack verticalAlign='center' tokens={{ childrenGap: 4 }} style={{ fontSize: 14, maxWidth: 740 }}>
        {Object.entries(mapSysUnlocks).map(([k, v], i) => {
          const unlocked = props.sysMap.sysUnlocks[k as SysUnlocks];
          return <div
            key={`view-unlocked-${i}-big`}
            style={{
              position: 'relative',
              paddingLeft: 32,
              paddingRight: 32,
              width: 360,
              backgroundColor: i % 2 ? undefined : appTheme.semanticColors.bodyBackgroundHovered,
              color: unlocked ? appTheme.palette.themePrimary : 'grey',
            }}
          >
            {unlocked && <Icon className='icon-inline' iconName='CheckMark' style={{ position: 'absolute', right: 4, top: 4, fontSize: 24, fontWeight: 'bold', color: appTheme.palette.greenLight }} />}
            <Icon className='icon-inline' iconName={v.icon} style={{ position: 'absolute', left: 4, top: 4, fontSize: 24 }} />
            <div style={{ fontSize: 12, fontWeight: 'bold' }}>{v.title}</div>
            <div style={{ fontSize: 11, textTransform: 'capitalize' }}>
              Needs: {v.needs}
            </div>
          </div>
        })}
      </Stack>

    </Modal>}
  </>;
}