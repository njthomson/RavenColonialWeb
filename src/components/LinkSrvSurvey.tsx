import { Icon, Link } from '@fluentui/react';
import { FunctionComponent } from 'react';

export const LinkSrvSurvey: FunctionComponent<{ href?: string, text?: string; title?: string }> = (props) => {
  return <>
    <Link
      href={props.href ?? 'https://github.com/njthomson/SrvSurvey/wiki/Colonization'}
      title={props.title ?? 'Learn more about SrvSurvey'}
      target='_blank'
    >
      {props.text ?? 'SrvSurvey'} <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ textDecoration: 'none' }} />
    </Link>
  </>;
};
