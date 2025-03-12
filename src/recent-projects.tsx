import './recent-projects.css';
import { Store } from "./local-storage";
import { ProjectLink } from './misc';

export const RecentProjects: React.FunctionComponent = () => {

  const listItems = Store.getRecentProjects().map(p =>  <li key={`rp-${p.buildId}`}><ProjectLink proj={p} /></li>)

  if (listItems.length === 0) {
    return <></>;
  } else {
    return <>
      <div className='half recent'>
      {listItems.length} Recent projects:
        <ul>
          {listItems}
        </ul>
      </div>
    </>;
  }
};
