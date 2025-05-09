import { FunctionComponent } from 'react';
import { getBuildTypeDisplayName } from '../site-data';

export const BuildTypeDisplay: FunctionComponent<{ buildType: string; }> = (props) => {
  if (!props.buildType) {
    return <span>?</span>;
  }

  const displayName = getBuildTypeDisplayName(props.buildType)
  return <span key={`bt${props.buildType}`}>{displayName} </span>;
};
