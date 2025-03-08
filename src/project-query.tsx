import { TextField, PrimaryButton } from '@fluentui/react';

export const ProjectQuery: React.FunctionComponent = () => {
  const onFind = () => {
    console.log("finding!");
  };
  return <>
    <span>
      <TextField label="System name:" required description="Enter complete system name" />
      <br />
      <PrimaryButton text="find" onClick={onFind} />
    </span>
  </>;
};
