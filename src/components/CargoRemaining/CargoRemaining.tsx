import './CargoRemaining.css';

import { FunctionComponent } from 'react';
import { store } from '../../local-storage';

export const CargoRemaining: FunctionComponent<{ label: string, sumTotal: number; }> = (props) => {
  const cmdr = store.cmdr;
  const tripsLarge = Math.ceil(props.sumTotal / (cmdr?.largeMax ?? 794));
  const tripsMed = Math.ceil(props.sumTotal / (cmdr?.medMax ?? 400));

  return <div className='hint'>
    <span className='ib'>{props.label}:&nbsp;<span className='grey'>{props.sumTotal.toLocaleString()}</span>&nbsp;</span>
    <span className='ib'>Large ship:&nbsp;<span className='grey'>{tripsLarge} trips</span></span> <span className='ib'>Medium ship:&nbsp;<span className='grey'>{tripsMed} trips</span></span>
  </div>;
};
