import { FunctionComponent, useState } from "react";
import { appTheme } from "../theme";
import { Coachmark, DirectionalHint, TeachingBubbleContent, Icon, Checkbox, Link } from "@fluentui/react";
import { store } from "../local-storage";
import { LinkSrvSurvey } from "./LinkSrvSurvey";

export const ShowManyCoachingMarks: FunctionComponent<{ targets: string[] }> = (props) => {
  const notAgainId = props.targets[0];
  const [complete, setComplete] = useState(store.notAgain.includes(notAgainId));
  const [notAgainPending, setNotAgainPending] = useState(complete);

  const total = props.targets.length;
  const [idx, setIdx] = useState(0);
  const [quick, setQuick] = useState(false);

  const id = props.targets[idx];
  const target = `#${id}`;
  const match = coachingContent[id];
  const lastOne = idx + 1 === total;

  if (complete || !match) { return null; }

  return <>
    <Coachmark
      key={`cm${id}`}
      target={target}
      persistentBeak
      delayBeforeCoachmarkAnimation={100}
      isCollapsed={!quick}
      positioningContainerProps={{ directionalHint: match.directionalHint }}
      beaconColorOne={appTheme.palette.black}
    >
      <TeachingBubbleContent
        headline={match.headline}
        target={target}
        footerContent={`${1 + idx} of ${total}`}
        isWide
        styles={{
          bodyContent: {
            zIndex: 3,
            backgroundColor: appTheme.palette.white,
            border: '1px solid ' + appTheme.palette.accent,
          },
          headline: { color: appTheme.palette.black },
          footer: { color: appTheme.palette.accent },
        }}

        primaryButtonProps={!idx ? undefined : {
          text: 'Previous',
          onClick: () => {
            // move prev
            if (idx > 0) {
              setIdx(idx - 1);
            }
          }
        }}

        secondaryButtonProps={{
          text: lastOne ? 'Okay' : 'Next',
          style: { border: `1px solid ${appTheme.palette.accent}` },
          onClick: () => {
            if (lastOne) {
              if (!!notAgainPending) {
                store.notAgain = [...store.notAgain, notAgainId];
              }
              setComplete(true);
            } else {
              // move next
              setQuick(true);
              setIdx(idx + 1);
            }
          }
        }}
      >
        <div style={{ color: appTheme.palette.black }}>
          <div style={{ marginBlock: 10 }}>
            {match.body}
          </div>
          {!lastOne && <br />}
          {lastOne && <Checkbox
            label='Do not show me this again'
            checked={notAgainPending}
            styles={{
              checkbox: { borderColor: appTheme.palette.themeTertiary },
              text: { color: appTheme.palette.themeTertiary },
            }}
            onChange={(_, checked) => setNotAgainPending(!!checked)}
          />}
        </div>

        <Coachmark
          key={`cmi${id}`}
          target={target}
          preventFocusOnMount
          positioningContainerProps={{ directionalHint: match.directionalHint }}
        />

      </TeachingBubbleContent>
    </Coachmark>
  </>;
}

export const ShowCoachingMarks: FunctionComponent<{ target: string, id: string, onOpen?: (id: string) => void, onDismiss?: (id: string) => void }> = (props) => {
  const [show, setShow] = useState(!store.notAgain.includes(props.id));
  const [notAgainPending, setNotAgainPending] = useState(false);

  const match = coachingContent[props.id]!;
  return <>
    {show && <Coachmark
      target={props.target}
      onAnimationOpenStart={() => {
        if (props.onOpen) { props.onOpen(props.id); }
      }}
      delayBeforeCoachmarkAnimation={100}
      positioningContainerProps={{ directionalHint: match.directionalHint }}
      persistentBeak
    >
      <TeachingBubbleContent
        headline={match.headline}
        target={props.target}
        isWide
        styles={{
          bodyContent: {
            zIndex: 3,
            backgroundColor: appTheme.palette.white,
            border: '1px solid ' + appTheme.palette.accent,
          },
          headline: { color: appTheme.palette.black }
        }}
        primaryButtonProps={{
          primary: true,
          text: 'Okay',
          style: { border: `1px solid ${appTheme.palette.accent}` },
          onClick: () => {
            setShow(false);
            if (!!notAgainPending) {
              store.notAgain = [...store.notAgain, props.id];
            }
            if (props.onDismiss) {
              props.onDismiss(props.id);
            }
          }
        }}
      >
        <div style={{ color: appTheme.palette.black }}>
          <div style={{ marginBlock: 10 }}>
            {match.body}
          </div>
          <Checkbox
            label='Do not show me this again'
            styles={{
              checkbox: { borderColor: appTheme.palette.themeTertiary },
              text: { color: appTheme.palette.themeTertiary },
            }}
            onChange={(_, checked) => setNotAgainPending(!!checked)}
          />
        </div>
      </TeachingBubbleContent>
    </Coachmark>}
  </>;
};

const coachingContent: Record<string, {
  headline: string;
  directionalHint: DirectionalHint;
  body: JSX.Element;
}> = {

  whereToShop: {
    headline: 'Search for markets',
    directionalHint: DirectionalHint.rightCenter,
    body: <div>
      <div>Use button <Icon iconName='ShoppingCart' className='icon-inline' /> to find markets near the construction site with the commodities you need.</div>
      <br />
      <LinkSrvSurvey href='#about=markets' text='Learn more?' title='Learn more on the About page' />
      <br />
    </div>,
  },

  largeBuildType: {
    headline: 'Compare and contrast (new!)',
    directionalHint: DirectionalHint.bottomCenter,
    body: <div>
      <div>Expand this panel for an interactive table, showing all relevant criteria for build types. Filter by tier, location, economy, pad size, security, wealth or any other aspect.</div>
      <br />
    </div>,
  },

  sysView2_AddSaveLoad: {
    headline: 'Add to your system ...',
    directionalHint: DirectionalHint.rightTopEdge,
    body: <div>
      <div>
        When first viewing a system, existing stations and bodies are automatically imported using data from <Link href='https://spansh.co.uk' target='spansh'>spansh.co.uk</Link>.
      </div>
      <div style={{ margin: '8px 0', display: 'flex' }}>
        <Icon className='icon-inline' iconName="Add" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Use the add button to create new planned or "what if" sites.
      </div>
      <div>
        <Icon className='icon-inline' iconName="Save" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        You'll need to explicitly save your changes if you want them in future sessions or different computers.
      </div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="OpenFolderHorizontal" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        You can re-load at any time, helpful if you want to undo changes.
      </div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="Build" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Choose import from the submenu should completed station or body information need to be updated.
      </div>
    </div>,
  },

  sysView2_MapType: {
    headline: 'View as a table or a map?',
    directionalHint: DirectionalHint.bottomLeftEdge,
    body: <div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="GridViewSmall" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        The table is best for quickly editing or adding many sites. Click columns to adjust sorting.
      </div>
      <div>
        <Icon className='icon-inline' iconName="Nav2DMapView" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        The map shows all bodies and how your sites are spread across this system.
      </div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="Pinned" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Click any site to pin it, showing the result of calculations in a side panel.
      </div>
    </div>,
  },

  sysView2_UseIncomplete: {
    headline: 'Control the calculations',
    directionalHint: DirectionalHint.bottomLeftEdge,
    body: <div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="TestBeaker" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Choose if calculations should use only completed systems or all planned and in-progress ones too.
      </div>
      <div>
        <Icon className='icon-inline' iconName="SortLines" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Calculations are sensitive to the order sites are built. Use this to view and adjust the order sites are processed.
      </div>
    </div>,
  },

  sysView2_Snapshot: {
    headline: 'Compare as you make changes...',
    directionalHint: DirectionalHint.leftTopEdge,
    body: <div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="Pinned" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Pin sites in the map or table to see their stats and calculations.
      </div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="Camera" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Take a snap shot of a panel, then make changes and observe the differences.
      </div>
    </div>,
  },

  sysView2_SearchNew: {
    headline: 'More systems to plan?',
    directionalHint: DirectionalHint.rightTopEdge,
    body: <div>
      <div>Use this button to navigate to other systems.</div>
      <div style={{ margin: '8px 0' }}>
        <Icon className='icon-inline' iconName="Save" style={{ marginRight: 4, fontSize: 16, color: appTheme.palette.accent }} />
        Don't forget to save your progress first.
      </div>
    </div>,
  },
}

