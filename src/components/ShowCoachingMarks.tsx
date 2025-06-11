import { FunctionComponent, useState } from "react";
import { appTheme } from "../theme";
import { Coachmark, DirectionalHint, TeachingBubbleContent, Icon, Checkbox, Stack, PrimaryButton } from "@fluentui/react";
import { store } from "../local-storage";
import { LinkSrvSurvey } from "./LinkSrvSurvey";

export const ShowCoachingMarks: FunctionComponent<{ target: string, id: string }> = (props) => {
  const [show, setShow] = useState(!store.notAgain.includes(props.id));
  const [notAgainPending, setNotAgainPending] = useState(false);

  const foo = coachingContent[props.id]!;
  return <>
    {show && <Coachmark
      target={props.target}
      delayBeforeCoachmarkAnimation={100}
      positioningContainerProps={{ directionalHint: foo.directionalHint }}
    >
      <TeachingBubbleContent
        headline={foo.headline}
        target={props.target}
        isWide
        styles={{
          bodyContent: {
            backgroundColor: appTheme.palette.white,
            border: '1px solid ' + appTheme.palette.accent,
          },
          headline: { color: appTheme.palette.black }
        }}
      >
        <div style={{ color: appTheme.palette.black }}>
          <div style={{ marginBlock: 10 }}>
            {foo.body}
          </div>

          <Checkbox
            label='Do not show me this again'
            onChange={(_, checked) => {
              setNotAgainPending(!!checked);
            }}
          />
          <Stack horizontal horizontalAlign='end'>

            <PrimaryButton text='Okay' onClick={() => {
              setShow(false);
              if (!!notAgainPending) {
                store.notAgain = [...store.notAgain, props.id];
              }
            }} />

          </Stack>
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
  }
}
