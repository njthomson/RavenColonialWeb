import { DefaultButton } from "@fluentui/react";

export const GalMap: React.FunctionComponent = () => {

  return <>
    <div style={{ position: 'relative', margin: 0, padding: 0 }}>
      <div>
        <DefaultButton text='My systems' />
      </div>

      <iframe
        src='https://njthomson.github.io/SrvSurvey/map/demo_galnet'
        title='Map'
        style={{
          position: 'relative',
          left: 0,
          top: 0,
          width: '99.75%',
          height: 800,
          border: 0,
        }}
      />
    </div>
  </>;
};

