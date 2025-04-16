import { DefaultButton, PrimaryButton } from '@fluentui/react';
import { RecentProjects } from '../components';
import { store } from '../local-storage';
import { Commander } from './Commander/Commander';
import { learnAbout } from './About';

export const Home: React.FunctionComponent = () => {
  window.document.title = `Raven Colonial Corporation`;

  if (!store.cmdrName) {
    // NOT signed-in
    return <>
      <div className='contain-vert'>
        {renderQuote()}

        <div className='home-box'>
          <DefaultButton text='Sign-in' onClick={() => document.getElementById('current-cmdr')?.click()} /> to see your projects and assignments
        </div>

        {learnAbout()}
      </div>
    </>;
  } else {
    // signed-in
    return <>
      <div className=''>
        <Commander cmdr={store.cmdrName} />
        <RecentProjects />

        {learnAbout()}
      </div>
    </>;
  }
};


const renderQuote = () => {
  return <div className='hint' style={{ textAlign: 'center', minWidth: 400, flexGrow: 1, margin: 8 }}>
    From the earliest times in history, mankind has looked to expand.  We have sought to explore and thrive.
    <br />
    From the old earth Abrahamic religions, we were told to "go forth, and multiply."
    <br />
    <br />
    <PrimaryButton text='Find or start a project ...' onClick={() => {
      window.location.assign("#find");
      window.location.reload();
    }} />
  </div>
};
