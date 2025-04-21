import './CargoRemaining.css';
import { FunctionComponent } from 'react';
import { store } from '../../local-storage';
import { appTheme } from '../../theme';

export const CargoRemaining: FunctionComponent<{ label: string, sumTotal: number; }> = (props) => {
  const cmdr = store.cmdr;
  const tripsLarge = Math.ceil(props.sumTotal / (cmdr?.largeMax ?? 794));
  const tripsMed = Math.ceil(props.sumTotal / (cmdr?.medMax ?? 400));

  return <div className='hint' style={{ display: store.hideShipTrips ? 'inline-block' : undefined }}>
    <span className='ib'>{props.label}:&nbsp;<span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{props.sumTotal.toLocaleString()}</span>&nbsp;</span>
    {!store.hideShipTrips && <>
      <span className='ib'>Large ship:&nbsp;<span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{tripsLarge} trips</span></span> <span className='ib'>Medium ship:&nbsp;<span className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>{tripsMed} trips</span></span>
    </>}
  </div>;
};
