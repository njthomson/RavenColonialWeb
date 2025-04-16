import { Icon } from '@fluentui/react';
import { FunctionComponent } from 'react';

export const LinkSrvSurvey: FunctionComponent<{ href?: string, text?: string; }> = (props) => {
  return <>
    <a href={props.href ?? 'https://github.com/njthomson/SrvSurvey/wiki/Colonization'} target='_blank' rel="noreferrer">
      {props.text ?? 'SrvSurvey'} <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ textDecoration: 'none' }} />
    </a>
  </>;
};
