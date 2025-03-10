import './App.css';
import rcc from './assets/rcc.webp'
import { ProjectQuery } from './project-query';

export const Home: React.FunctionComponent = () => {
  console.log('render home');

  return <>
    <img className='rcc' src={rcc} alt="rxcc" />
    From the earliest times in history, mankind has looked to expand.  We have sought to explore and thrive.
    <br />
    From the old earth Abrahamic religions, we were told to "go forth, and multiply."
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <br />
    <ProjectQuery />
  </>;
};
