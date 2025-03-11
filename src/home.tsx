import { PrimaryButton } from '@fluentui/react';

export const Home: React.FunctionComponent = () => {
  console.log('render home');

  return <>
    <div style={{ textAlign: 'center' }}>
      <br />
      From the earliest times in history, mankind has looked to expand.  We have sought to explore and thrive.
      <br />
      From the old earth Abrahamic religions, we were told to "go forth, and multiply."
      <br />
      <br />
      <br />
      <PrimaryButton text='Find a project?' onClick={() => {
        window.location.assign("#find");
        window.location.reload();
      }} />
    </div>
  </>;
};
