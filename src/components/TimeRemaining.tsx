import { FunctionComponent, useState } from 'react';
import { Icon, Stack } from '@fluentui/react';
import { cn } from '../theme';

const getTimeRemaining = (timeDue: string): [weeks: number, days: number, hours: number, mins: number] => {

  // in milliSeconds
  let delta = new Date(timeDue).getTime() - Date.now();

  // to minutes
  delta = Math.trunc(delta / 60_000);
  const mins = delta % 60;
  // to hours
  delta = (delta - mins) / 60;
  const hours = delta % 24;
  // to days
  delta = (delta - hours) / 24;
  const days = delta % 7;
  // to weeks
  delta = (delta - days) / 7;
  const weeks = delta;

  return [weeks, days, hours, mins];
}

const calcNewTimeDue = (w: number, d: number, h: number, m: number): string => {
  let dueTime = (m * 60_000) + (h * 60 * 60_000) + (d * 24 * 60 * 60_000) + (w * 7 * 24 * 60 * 60_000);
  let t = new Date(Date.now() + dueTime).toISOString();
  return t;
};

export const TimeRemaining: FunctionComponent<{ timeDue: string, onChange?: ((newTimeDue: string) => void) | undefined }> = (props) => {
  const [w, d, h, m] = getTimeRemaining(props.timeDue);
  const [weeks, setWeeks] = useState(w);
  const [days, setDays] = useState(d);
  const [hours, setHours] = useState(h);
  const [mins, setMins] = useState(m);

  if (props.onChange) {
    // edit mode: 3 numeric inputs + X
    return <Stack horizontal verticalAlign='baseline'>

      Weeks:&nbsp;
      <input min={0} max={4} type='number' value={weeks} style={{ width: 44, textAlign: 'right' }} onChange={(ev) => {
        let w = ev.target.valueAsNumber || 0;
        props.onChange!(calcNewTimeDue(w, days, hours, mins));
        setWeeks(w);
      }} />

      &nbsp;Days:&nbsp;
      <input min={0} max={24} type='number' value={days} style={{ width: 44, textAlign: 'right' }} onChange={(ev) => {
        let d = ev.target.valueAsNumber || 0;
        props.onChange!(calcNewTimeDue(weeks, d, hours, mins));
        setDays(d);
      }} />

      &nbsp;Hours:&nbsp;
      <input min={0} max={60} type='number' value={hours} style={{ width: 44, textAlign: 'right' }} onChange={(ev) => {
        let h = ev.target.valueAsNumber || 0;
        props.onChange!(calcNewTimeDue(weeks, days, h, mins));
        setHours(h);
      }} />

      &nbsp;Mins:&nbsp;
      <input min={0} max={60} type='number' value={mins} style={{ width: 44, textAlign: 'right' }} onChange={(ev) => {
        let m = ev.target.valueAsNumber || 0;
        props.onChange!(calcNewTimeDue(weeks, days, hours, m));
        setMins(m);
      }} />

      &nbsp;
      <Icon
        className={`icon-btn ${cn.btn}`}
        iconName='Clear'
        title='Remove time remaining'
        onClick={() => props.onChange!(undefined!)}
      />

    </Stack>;
  } else {
    // read mode: show a string of time remaining
    let timeRemaining = [
      w > 0 ? `${w} weeks,` : '',
      d > 0 ? `${d} days,` : '',
      h > 0 ? `${h} hours,` : '',
      m > 0 ? `${m} mins` : '',
    ].join(' ');
    return <>{timeRemaining}</>;
  }
};
