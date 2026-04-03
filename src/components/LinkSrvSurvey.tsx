import { Icon, Link } from '@fluentui/react';
import { FunctionComponent } from 'react';

export const LinkSrvSurvey: FunctionComponent<{ href?: string, text?: string; title?: string }> = (props) => {
  return <>
    <Link2
      href={props.href ?? 'https://github.com/njthomson/SrvSurvey/wiki/Colonization'}
      text={props.text ?? 'SrvSurvey'}
      title={props.title ?? 'Learn more about SrvSurvey'}
      target='_blank'
    />
  </>;
};

export const Link2: FunctionComponent<{ href: string, text: string; title?: string; target?: string }> = (props) => {
  return <>
    <Link
      href={props.href}
      title={props.title}
      target={props.target ?? '_blank'}
    >
      {props.text}<Icon className='icon-inline' iconName='OpenInNewWindow' style={{ textDecoration: 'none', marginLeft: 4 }} />
    </Link>
  </>;
};
