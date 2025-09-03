import { ActionButton, DirectionalHint, mergeStyles, Callout, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { cn, appTheme } from "../../theme";

/** Button Slot Number (no icon) */
const bsn = mergeStyles({
  marginLeft: 5.5,
  padding: 0,
  width: 16,
  height: 16,
  color: appTheme.palette.themeTertiary,
  ':hover': {
    color: appTheme.palette.themePrimary,
    border: `1px solid ${appTheme.palette.themeTertiary} !important`,
  },
});

/** DIM Button Slot number (showing icon) */
const bsni = mergeStyles({
  color: appTheme.palette.themeTertiary,
  border: `1px solid ${appTheme.palette.neutralQuaternary}`,
  ':hover': {
    color: appTheme.palette.themePrimary,
    border: `1px solid ${appTheme.palette.themeTertiary}`,
  },
});

/** Bright Button Slot number (showing icon) */
const bsnib = mergeStyles({
  color: appTheme.semanticColors.bodyText,
  border: `1px solid ${appTheme.palette.themeTertiary}`,
  ':hover': {
    color: appTheme.palette.themePrimary,
    border: `1px solid ${appTheme.palette.themeSecondary}`,
  },
});

/** Callout buttons */
const mb32 = mergeStyles({ width: 32, height: 32, });
const mb68 = mergeStyles({ width: 68, height: 32, });

/** Callout button Selected */
const mbs = mergeStyles({
  backgroundColor: appTheme.palette.neutralQuaternary,
  borderWidth: 2,
  fontWeight: 'bold',
});

export const ViewEditSlotCount: FunctionComponent<{ max: number, current: number, isOrbital: boolean, showIcon: boolean, bright?: boolean, onChange: (count: number) => void }> = (props) => {
  const [dropDown, setDropDown] = useState(false);

  const id = `view-edit-slots-${Date.now()}`;
  const tooMany = props.max >= 0 && props.current > props.max;
  const unknown = props.max === -1;
  return <div style={{ marginLeft: props.showIcon ? 4 : undefined }}>
    <ActionButton
      id={id}
      className={props.showIcon ? (props.bright ? bsnib : bsni) : bsn}
      style={{ border: tooMany ? `2px dashed ${appTheme.palette.redDark}` : undefined }}
      styles={{
        icon: { color: props.bright ? appTheme.semanticColors.bodyText : appTheme.palette.themeTertiary },
        textContainer: { color: tooMany || unknown ? appTheme.palette.red : 'unset' },
      }}
      iconProps={{ iconName: !props.showIcon ? undefined : (props.isOrbital ? 'ProgressRingDots' : 'GlobeFavorite'), }}
      text={props.max >= 0 ? props.max.toString() : '?'}
      title={`${props.isOrbital ? 'Orbital' : 'Surface'} slots: ${props.max < 0 ? 'unknown' : props.max}`}
      onClick={() => setDropDown(!dropDown)}
    />

    {dropDown && <Callout
      target={`#${id}`}
      className={cn.fp}
      setInitialFocus
      isBeakVisible={false}
      role="dialog"
      coverTarget
      directionalHint={DirectionalHint.topCenter}
      gapSpace={-60}
      onDismiss={() => setDropDown(false)}
    >
      <div style={{ marginBottom: 8, color: appTheme.palette.themeSecondary }}>{props.isOrbital ? 'Orbital slots:' : 'Surface slots:'}</div>
      <Stack
        horizontal wrap
        tokens={{ childrenGap: 4 }}
        style={{ maxWidth: 150 }}
        onClick={() => setDropDown(false)}
      >
        <ActionButton
          className={`${cn.bBox2} ${mb68} ${props.max === 0 ? mbs : undefined}`}
          text="None"
          title='Set count to zero'
          onClick={() => props.onChange(0)}
        />

        {Array.from({ length: 8 },).map((_, i) => {
          const n = i + 1;
          return <ActionButton
            key={`bs-${n}`}
            className={`${cn.bBox2} ${mb32} ${props.max === n ? mbs : undefined}`}
            text={n.toString()}
            title={`Set slot count to ${n}`}
            onClick={() => props.onChange(n)}
          />;
        })}

        <ActionButton
          className={`${cn.bBox2} ${mb68} ${props.max === -1 ? mbs : undefined}`}
          text='Unknown'
          title='Reset count to unknown'
          onClick={() => props.onChange(-1)}
        />
      </Stack>
    </Callout>}
  </div>;
}