import './RecentProjects.css';

import { ProjectLink } from '..';
import { store } from "../../local-storage";

export const RecentProjects: React.FunctionComponent = () => {

  const listItems = store.recentProjects.map(p => <li key={`rp-${p.buildId}`}><ProjectLink proj={p} /></li>)

  if (listItems.length === 0) {
    return <></>;
  } else {
    return <>
      <div className='half'>
        <h3>{listItems.length} Recent projects:</h3>
        <ul>
          {listItems}
        </ul>
      </div>
    </>;
  }
};
