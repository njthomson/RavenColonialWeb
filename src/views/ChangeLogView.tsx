import { ActionButton, DefaultButton, Icon, IconButton, Link, mergeStyles } from '@fluentui/react';
import { FunctionComponent } from 'react';
import { appTheme } from '../theme';
import { Link2 } from '../components/LinkSrvSurvey';
import { StackH } from '../components/Widgets';
import { App } from '../App';

const css = mergeStyles({
  '.sub1': {
    fontSize: 14,
    color: appTheme.palette.themePrimary,
  },
  '.sub2': {
    fontSize: 11,
    color: appTheme.palette.themeTertiary,
  },
  '.date': {
    color: appTheme.palette.themeDark,
    float: 'right',
    fontSize: 12,
  },
  '.head': {
    fontWeight: 'bold',
    fontSize: 20,
  },
  '.block': {
    color: appTheme.palette.themePrimary,
    paddingBottom: 16,
    marginBottom: 24,
    borderBottom: '2px dashed ' + appTheme.palette.themeLight,
    'a': {
      color: appTheme.palette.themeDarker,
    },
  },
  '.gap': {
    marginTop: 16,
  },
  '.soon': {
    color: appTheme.palette.themeDarker,
  },
  '.ms-Button--action, .ms-Button--icon': {
    border: `1px solid ${appTheme.palette.themeTertiary}`,
    height: 22,
    '.ms-Icon': {
      color: appTheme.semanticColors.bodyText,
    },
    ':hover': {
      zIndex: 2,
      border: `1px solid ${appTheme.palette.themeDark}`,
    },
    ':disabled': {
      border: `1px solid transparent`,
    },
  },
  '.fakeBtn': {
    ':disabled': {
      color: appTheme.semanticColors.bodyText,
      border: `1px solid ${appTheme.palette.themeTertiary}`,
    },
  },
  '.feedback': {
    float: 'right',
    ':hover': {
      backgroundColor: appTheme.palette.neutralTertiaryAlt,
    },
  }
});


export const lastEntry = new Date('2026-05-14T04:00:00.433Z');

export const ChangeLog: FunctionComponent<{}> = (props) => {

  return <div className={css} >
    <DefaultButton
      className='feedback'
      text='Feedback?'
      iconProps={{ iconName: 'FeedbackRequestSolid' }}
      onClick={() => App.showFeedback('Change log feedback or suggestions')}
    />
    <div className='sub1'>Recent changes and additions to Raven Colonial:</div>
    <div className='sub2'>(Something I should have been sharing since the beginning)</div>

    <div style={{ marginTop: 20 }}>
      <div className='date'>May 13th 2026</div>
      <StackH className='head' gap={8}>
        <Icon iconName='Bank' style={{ fontSize: 24 }} />
        <span>Fleet Carrier Market Orders</span>
      </StackH>
      <ul className='block'>
        <li>As promised below, when refreshing Fleet Carriers, market purchase and sell orders will now be stored along with cargo counts.</li>
        <li>These will show up in Cargo grids with <Icon className="btn icon-inline" iconName='CaretLeft8' style={{ color: appTheme.palette.green, background: appTheme.palette.greenDark, padding: '3px 1px' }} /> for sell orders, and <Icon className="btn icon-inline" iconName='CaretRight8' style={{ color: appTheme.palette.blue, background: appTheme.palette.blueDark, padding: '3px 1px' }} /> for purchase orders.</li>
        <li>Clicking these will show the relevant price and when this data was last updated.</li>
        <li>To see all purchase and sell orders for a Fleet Carrier, hit the <IconButton className='fakeBtn' disabled iconProps={{ iconName: 'Shop' }} /> button in any Fleet Carrier edit panel.</li>
        <li className='gap soon'>Coming Soon™</li>
        <ul>
          <li>Make the FC refresh button work for Fleet Carriers.</li>
          <li>Start showing Fleet Carriers on a Nexus map.</li>
        </ul>
      </ul>
    </div>

    <div style={{ marginTop: 20 }}>
      <div className='date'>May 5th 2026</div>
      <StackH className='head' gap={8}>
        <Icon iconName='fleetCarrierBlack' />
        <span>Fleet Carrier Improvements and Server-Side Settings</span>
      </StackH>
      <ul className='block'>
        <li>When hitting <IconButton className='fakeBtn' disabled iconProps={{ iconName: 'Edit' }} /> links for FCs, below the owner, it is now possible to see docking-access and allow-notorious settings. (This is in addition to showing the last known system that was added a few weeks ago)</li>
        <li>These fields will be populated when hitting the <ActionButton className='fakeBtn' disabled text='My FC' /> button from <ActionButton className='fakeBtn' disabled iconProps={{ iconName: 'Contact' }} text='Cmdr' /> in the top/right corner.</li>
        <li>As that 'My FC' button is a bit buried, I'm also adding a <IconButton className='fakeBtn' disabled iconProps={{ iconName: 'Refresh' }} /> button to pull latest data from Frontier's API, which has the nice effect of enabling others to trigger that refresh, besides the owner. This is rate-limited on the server, per Fleet Carrier, so that requests are at least 5 minutes apart.</li>
        <li>Making calls to Frontier APIs relies on server-side tokens, which naturally expire after 30 days. Alas Frontier have not implemented the means to refresh those tokens beyond that, so we are all obligated to re-login every 30 days.</li>
        <li>This is relevant because, if I haven't re-logged in within 30 days, that refresh button for my FC will always fail for everyone else. The owner of an FC is the only person who can fix that. So ... we want owners to re-login, I don't expect anyone to remember, so I'm going to keep track of the duration and highlight the top/right button in yellow after 28 days: <ActionButton className='fakeBtn' disabled iconProps={{ iconName: 'SkypeCircleClock', style: { color: appTheme.palette.yellowDark } }} text='Cmdr' style={{ color: appTheme.palette.yellowDark }} /></li>
        <li>And as I needed a way to store that duration, I decided to start supporting general server-side settings - something I've wanted to do since the beginning but never had a good enough reason for it.</li>
        <li>Along with these change I am starting to filter FC cargo contents, excluding commodities that are unrelated to colonisation. There's an exception for FC owners - they will continue to see all cargo contents for their own FCs.</li>
        <li className='gap'>These changes are now deployed but will be in live-testing for a few days. Let me know if you run across any issues. Bugs can be <Link2 href='https://github.com/njthomson/SrvSurvey/issues' text='reported on GitHub' title='Submit suggestions and bug reports' /> and general discussion happens through <Link2 href='https://discord.gg/nEWMqZNBdy' text="Discord" title='Discuss SrvSurvey' /></li>
        <li className='gap soon'>Coming Soon™</li>
        <ul>
          <li style={{ textDecoration: 'line-through' }}>Show FC market buy and sell orders.</li>
          <li>Make the new FC refresh button work for Fleet Carriers.</li>
          <li>Start showing Fleet Carriers on a Nexus map.</li>
        </ul>
      </ul>
    </div>

    <div>
      <div className='date'>April 24th 2026</div>
      <StackH className='head' gap={8}>
        <Icon className='title' iconName='BuildQueue' />
        <span>Plan for multiple systems with a Nexus</span>
      </StackH>
      <ul className='block' style={{ lineBreak: 'loose' }}>
        <li>As folks build ever longer bridges out into the black there is a need to plan across those systems, orchestrating FC loading and unloading.</li>
        <li>Developed with active feedback from <Link2 href='https://projectgaltea.org/' text='Project Galtea' /> and The Mercs of Mikunn ... a Nexus is intended to address this need.</li>
        <li>A nexus is simply a plan for many systems.</li>
        <li>They could be a bridge or chain, or just some systems you plan to build in.</li>
        <li>A nexus helps gather supplies across many FCs and co-ordinate progress as you build your plans across the systems.</li>
        <li>And you can even view the systems of a nexus on the galaxy map, look for <ActionButton className='fakeBtn' disabled iconProps={{ iconName: 'Globe' }} text='Show on a map' /></li>
        <li>Get started with the new <ActionButton className='fakeBtn' disabled iconProps={{ iconName: 'BuildQueue' }} text='Nexus' /> button on <Link href='https://ravencolonial.com/#build'>https://ravencolonial.com/#build</Link></li>
      </ul>
    </div>

  </div >;
};

