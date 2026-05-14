import { DirectionalHint, mergeStyles } from '@fluentui/react';
import { FunctionComponent } from 'react';
import { appTheme } from '../theme';
import { getRelativeDuration } from '../util';
import { CalloutMsg } from './CalloutMsg';
import { KnownFC, ProjectFC } from '../types';

const css = mergeStyles({
  '.marketBox': {
    display: 'inline-block',
    position: 'absolute',
    top: 0,
    left: 0,
    height: 42,

    '.ms-Button--icon': {
      'i': { fontSize: 14, },
    }
  },

  '.marketBox.purchase': {
    '.ms-Button--icon': {
      backgroundColor: appTheme.palette.blueDark,
      'i': { color: appTheme.palette.blue, },
      ':hover': {
        border: `1px solid ${appTheme.palette.blueLight}`,
        'i': { color: appTheme.palette.blue, },
      },
    }
  },

  '.marketBox.sale': {
    '.ms-Button--icon': {
      backgroundColor: appTheme.palette.greenDark,
      'i': { color: appTheme.palette.green, },
      ':hover': {
        border: `1px solid ${appTheme.palette.green}`,
        'i': { color: appTheme.palette.greenLight, },
      },
    }
  },
});

export const InlineMarketOrders: FunctionComponent<{ fc: ProjectFC | KnownFC, cargo: string, count: number }> = (props) => {
  const orderSale = props.count > 0 && props.fc.sales?.find(x => x.name === props.cargo)
  const orderPurchase = props.count > 0 && props.fc.purchases?.find(x => x.name === props.cargo)
  const lastRefresh = props.fc.lastRefresh && new Date(props.fc.lastRefresh);

  return <div className={css}>
    {!!orderSale && <CalloutMsg
      title='View FC market sell order'
      className='marketBox sale'
      iconName='CaretLeft8'
      backgroundColor={appTheme.palette.neutralTertiaryAlt}
      width={14}
      height={21}
      directionalHint={DirectionalHint.leftCenter}
      msg={<div>
        <div style={{ color: appTheme.palette.themeDark }}>Sell order set</div>
        Price: {orderSale.price.toLocaleString()} cr<br />
        {!!lastRefresh && <div style={{ marginTop: 16, fontSize: 10, color: appTheme.palette.themeDarker }}>Last update: {getRelativeDuration(lastRefresh)}</div>}
      </div>}
    />}
    {!!orderPurchase && <CalloutMsg
      title='View FC market purchase order'
      className='marketBox purchase'
      iconName='CaretRight8'
      backgroundColor={appTheme.palette.neutralTertiaryAlt}
      width={14}
      height={21}
      directionalHint={DirectionalHint.leftCenter}
      msg={<div>
        <div style={{ color: appTheme.palette.themeDark }}>Purchase order set</div>
        {orderPurchase.total?.toLocaleString()} units total<br />
        Price: {orderPurchase.price.toLocaleString()} cr<br />
        {!!lastRefresh && <div style={{ marginTop: 16, fontSize: 10, color: appTheme.palette.themeDarker }}>Last update: {getRelativeDuration(lastRefresh)}</div>}
      </div>}
    />}
  </div>;
};
