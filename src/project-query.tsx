import { TextField, PrimaryButton } from '@fluentui/react';
import { useState } from 'react';

export const ProjectQuery: React.FunctionComponent = () => {
  const [txt, setTxt] = useState('');

  const onFind = () => {
    console.log('ProjectQuery.onFind', txt)
    window.location.assign(`#find=${txt}`);
  };

  return <>
    <div className="projects-query">
      <TextField
        name='systemName'
        label="System name:"
        required description="Enter complete system name"
        value={txt}
        onChange={(_, v) => setTxt(v ?? '')}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') { onFind(); }
        }}
      />
      <br />
      <PrimaryButton text="find" onClick={onFind} />
    </div>
  </>;
};
