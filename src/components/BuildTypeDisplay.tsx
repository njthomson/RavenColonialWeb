import { FunctionComponent } from 'react';
import { buildTypes } from '.';

export const BuildTypeDisplay: FunctionComponent<{ buildType: string; }> = (props) => {

  const match = buildTypes.find(i => i.text.toLowerCase().includes(props.buildType));

  if (!match) {
    console.error(`Why no match for: ${props.buildType} ?`);
    return <span>{props.buildType}</span>;
  }

  // remove the trailing "(aa, bb, cc)" so we can use just the build type in question
  const displayName = match.text.substring(0, match.text.indexOf('('));
  return <span key={`bt${props.buildType}`}>{displayName}({props.buildType})</span>;
};
