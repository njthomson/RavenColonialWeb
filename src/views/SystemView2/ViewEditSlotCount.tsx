import { ActionButton, DirectionalHint, mergeStyles, Callout, Stack, ContextualMenu, IContextualMenuItem } from "@fluentui/react";
import { CSSProperties, FunctionComponent, useState } from "react";
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
const mbsm = mergeStyles({
  backgroundColor: appTheme.palette.neutralQuaternary,
  borderWidth: 1,
  fontWeight: 'bold',
});


export const ViewEditSlotCount: FunctionComponent<{ max: number, current: number, isOrbital: boolean, showIcon: boolean, bright?: boolean, onChange: (count: number) => void, style?: CSSProperties }> = (props) => {
  const [dropDown, setDropDown] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const id = `view-edit-slots-${Date.now()}`;
  const tooMany = props.max >= 0 && props.current > props.max;
  const unknown = props.max === -1;

  const onSelect = (count: number) => {
    setDropDown(false);
    setShowMore(false);
    props.onChange(count);
  }

  const moreItems = [];
  for (let n = 8; n < 17; n++) {
    moreItems.push({
      key: `bs-${n}`,
      className: `${cn.bBox} ${props.max === n ? mbsm : undefined}`,
      style: { textAlign: 'center' },
      text: n.toString(),
      title: `Set slot count to ${n}`,
      onClick: () => onSelect(n),
    } as IContextualMenuItem);
  }

  return <div style={{ ...props.style }}>
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
      onDismiss={() => {
        setDropDown(false);
        setShowMore(false);
      }}
    >
      <div style={{ marginBottom: 8, color: appTheme.palette.themeSecondary }}>{props.isOrbital ? 'Orbital slots:' : 'Surface slots:'}</div>
      <Stack
        horizontal wrap
        tokens={{ childrenGap: 4 }}
        style={{ maxWidth: 150 }}
      >
        <ActionButton
          className={`${cn.bBox2} ${mb68} ${props.max === 0 ? mbs : undefined}`}
          text="None"
          title='Set count to zero'
          onClick={() => onSelect(0)}
        />

        {Array.from({ length: 7 },).map((_, i) => {
          const n = i + 1;
          return <ActionButton
            key={`bs-${n}`}
            className={`${cn.bBox2} ${mb32} ${props.max === n ? mbs : undefined}`}
            text={n.toString()}
            title={`Set slot count to ${n}`}
            onClick={() => onSelect(n)}
          />;
        })}

        <ActionButton
          id='more-slots'
          className={`${cn.bBox2} ${mb32} ${props.max > 7 ? mbs : undefined}`}
          text='+'
          title={`Set slot count to larger numbers`}
          onClick={() => setShowMore(true)}
        />

        <ActionButton
          className={`${cn.bBox2} ${mb68} ${props.max === -1 ? mbs : undefined}`}
          text='Unknown'
          title='Reset count to unknown'
          onClick={() => onSelect(-1)}
        />
      </Stack>

      {showMore && <ContextualMenu
        target={`#more-slots`}
        styles={{ list: { width: 102 } }}
        calloutProps={{ style: { margin: 0, padding: 0, width: 102, border: '1px solid ' + appTheme.palette.themePrimary }, }}
        directionalHint={DirectionalHint.rightTopEdge}
        gapSpace={-32}
        onDismiss={() => setShowMore(false)}
        items={moreItems}
      />}
    </Callout>}
  </div>;
}