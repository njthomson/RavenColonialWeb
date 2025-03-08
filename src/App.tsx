import React from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import './App.css';
import { About } from './about';
import { Home } from './home';
import { ProjectQuery } from './project-query';
import { Page3 } from './page3';

export const App: React.FunctionComponent = () => {
  return (
    <Pivot>
      <PivotItem headerText="Raven Colonial Corporation">
        <Home />
      </PivotItem>
      <PivotItem headerText="Find">
        <ProjectQuery />
      </PivotItem>
      <PivotItem headerText="Build">
        <Page3 />
      </PivotItem>
      <PivotItem headerText="About">
        <About />
      </PivotItem>
    </Pivot>
  );
};
