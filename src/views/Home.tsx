import { DefaultButton, Link, PrimaryButton } from '@fluentui/react';
import { RecentProjects } from '../components';
import { store } from '../local-storage';
import { Commander } from './Commander/Commander';
import { learnAbout } from './About';
import { ShowGlobalStats } from '../components/ShowGlobalStats/ShowGlobalStats';
import { Component } from 'react';
import { LinkSrvSurvey } from '../components/LinkSrvSurvey';

interface HomeProps { }

interface HomeState { }

export class Home extends Component<HomeProps, HomeState> {
  constructor(props: HomeProps) {
    super(props);
    this.state = {};
  }

  render() {
    window.document.title = `Raven Colonial Corporation`;

    if (!store.cmdrName) {
      // NOT signed-in
      return <>
        <div className='contain-vert'>
          {renderQuote()}

          <div className='home-box'>
            <DefaultButton iconProps={{ iconName: 'SignIn' }} text='Login' onClick={() => document.getElementById('current-cmdr')?.click()} /> to see your projects and assignments
          </div>

          <ShowGlobalStats />

          {learnAbout()}
        </div>
      </>;
    } else {
      // signed-in
      return <>
        <div className=''>
          <Commander />
          <RecentProjects />

          <ShowGlobalStats />

          {learnAbout()}
          <br />
        </div>
      </>;
    }
  }
}


export const renderQuote = () => {
  return <div className='hint' style={{ textAlign: 'center', minWidth: 400, flexGrow: 1, margin: 8 }}>
    From the earliest times in history, mankind has looked to expand.  We have sought to explore and thrive.
    <br />
    From the old earth Abrahamic religions, we were told to "go forth, and multiply."
    <br />
    <div style={{ marginTop: 20 }}>Watch <LinkSrvSurvey href='https://youtu.be/Kt4MpUJ-ISI?si=FPTNMEBlNP4a3lQl' text="CMDR Mechan's tutorial" title=''></LinkSrvSurvey></div>
    <br />
    <PrimaryButton text='Find or start a project ...' onClick={() => {
      window.location.assign("#sys");
      window.location.reload();
    }} />
    &nbsp;or view an existing system: <Link href='https://ravencolonial.com/#sys=HIP%2090297' target='_blank'>HIP 90297</Link>
  </div>
};
