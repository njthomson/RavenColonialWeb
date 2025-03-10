import { TextField, PrimaryButton } from '@fluentui/react';
import { useState } from 'react';

export const ProjectQuery: React.FunctionComponent = () => {
  const [txt, setTxt] = useState('');

  const onFind = () => {
    console.log('ProjectQuery.onFind', txt)
    window.location.assign(`#find=${txt}`);
  };

  const onKeyDown = (event) => {
    console.log("ProjectQuery.onKeyDown");
    if (event.key === 'Enter') { onFind(); }
  };

  return <>
    <div className="projects-query">
      <TextField
        label="System name:"
        required description="Enter complete system name"
        value={txt}
        onChange={(e, v) => setTxt(v)}
        onKeyDown={onKeyDown}
      />
      <br />
      <PrimaryButton text="find" onClick={onFind} />
    </div>
  </>;
};
