import { PrimaryButton } from '@fluentui/react';
import { RecentProjects } from '../components';

export const Home: React.FunctionComponent = () => {
  window.document.title = `Raven Colonial Corporation`;

  return <>
    <div className='contain-vert'>
      <div className='half' style={{ textAlign: 'center' }}>
        <br />
        From the earliest times in history, mankind has looked to expand.  We have sought to explore and thrive.
        <br />
        From the old earth Abrahamic religions, we were told to "go forth, and multiply."
        <br />
        <br />
        <PrimaryButton text='Find a project ...' onClick={() => {
          window.location.assign("#find");
          window.location.reload();
        }} />
      </div>

      <RecentProjects />
    </div>
  </>;
};
