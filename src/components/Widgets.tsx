import { Stack, Alignment } from '@fluentui/react';
import { CSSProperties, FunctionComponent } from 'react';

export const StackH: FunctionComponent<{ className?: string; gap?: number; verticalAlign?: Alignment; style?: CSSProperties; }> = (props) => {
  return <Stack
    className={props.className}
    horizontal
    verticalAlign={props.verticalAlign ?? 'center'}
    tokens={{ childrenGap: props.gap }}
    style={props.style}
  >
    {props.children}
  </Stack>;
};

