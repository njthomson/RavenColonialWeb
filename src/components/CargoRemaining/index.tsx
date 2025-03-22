import './index.css';

import { FunctionComponent } from 'react';
import { Store } from '../../local-storage';

export const CargoRemaining: FunctionComponent<{ sumTotal: number; }> = (props) => {
  const cmdr = Store.getCmdr();
  const tripsLarge = Math.ceil(props.sumTotal / (cmdr?.largeMax ?? 794));
  const tripsMed = Math.ceil(props.sumTotal / (cmdr?.medMax ?? 400));

  return <div className="cargo-remaining hint">
    Remaining cargo to deliver: <span className='grey'>{props.sumTotal.toLocaleString()}</span>
    <br />
    Large ship:<span className='grey'>{tripsLarge} trips</span> or Medium ship:<span className='grey'>{tripsMed} trips</span>
  </div>;
};
