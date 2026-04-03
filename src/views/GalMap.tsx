import { Icon } from "@fluentui/react";
import { store } from "../local-storage";
import { appTheme } from "../theme";

export const GalMap: React.FunctionComponent = () => {

  return <>
    <div style={{ position: 'relative', margin: 0, padding: 0, overflow: 'auto' }}>
      <div style={{ color: appTheme.palette.yellow, fontSize: 10, textAlign: 'center', marginBottom: 4 }}>
        <Icon className='icon-inline' iconName='Warning' />
        &nbsp;Experimental feature - work in progress&nbsp;
        <Icon className='icon-inline' iconName='Warning' />
      </div>

      <iframe
        src={`/map/map_architect.html?cmdr=${store.cmdrName}`}
        title='Map'
        style={{
          position: 'fixed',
          left: 0,
          top: 60,
          width: '100vw',
          height: '100vh',
          border: 0,
        }}
      />
    </div>
  </>;
};

