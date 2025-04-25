import { FunctionComponent, useState } from 'react';
import { Icon, Stack } from '@fluentui/react';
import { appTheme, cn } from '../theme';

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
      <input
        min={-1} max={4}
        type='number'
        value={weeks}
        style={{ width: 44, textAlign: 'right', backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }}
        onChange={(ev) => {
          let ww = ev.target.valueAsNumber || 0;
          if (ww === 4) { ww = 0; }
          if (ww === -1) { ww = 3; }
          props.onChange!(calcNewTimeDue(ww, days, hours, mins));
          setWeeks(ww);
        }}
        onFocus={(ev) => {
          ev.target.type = 'text';
          ev.target.setSelectionRange(0, 10);
          ev.target.type = 'number';
        }}
      />

      &nbsp;Days:&nbsp;
      <input
        min={-1} max={7}
        type='number'
        value={days}
        style={{ width: 44, textAlign: 'right', backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }}
        onChange={(ev) => {
          let dd = ev.target.valueAsNumber || 0;
          if (dd === 7) { dd = 0; }
          if (dd === -1) { dd = 6; }
          props.onChange!(calcNewTimeDue(weeks, dd, hours, mins));
          setDays(dd);
        }}
        onFocus={(ev) => {
          ev.target.type = 'text';
          ev.target.setSelectionRange(0, 10);
          ev.target.type = 'number';
        }}
      />

      &nbsp;Hours:&nbsp;
      <input
        min={-1} max={24}
        type='number'
        value={hours}
        style={{ width: 44, textAlign: 'right', backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }}
        onChange={(ev) => {
          let hh = ev.target.valueAsNumber || 0;
          if (hh === 24) { hh = 0; }
          if (hh === -1) { hh = 23; }
          props.onChange!(calcNewTimeDue(weeks, days, hh, mins));
          setHours(hh);
        }}
        onFocus={(ev) => {
          ev.target.type = 'text';
          ev.target.setSelectionRange(0, 10);
          ev.target.type = 'number';
        }}
      />

      &nbsp;Mins:&nbsp;
      <input
        min={-1} max={60}
        type='number'
        value={mins}
        style={{ width: 44, textAlign: 'right', backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }}
        onChange={(ev) => {
          let mm = ev.target.valueAsNumber || 0;
          if (mm === 60) { mm = 0; }
          if (mm === -1) { mm = 59; }
          props.onChange!(calcNewTimeDue(weeks, days, hours, mm));
          setMins(mm);
        }}
        onFocus={(ev) => {
          ev.target.type = 'text';
          ev.target.setSelectionRange(0, 10);
          ev.target.type = 'number';
        }}
      />

      &nbsp;
      &nbsp;
      <Icon
        className={`icon-btn ${cn.btn}`}
        iconName='Clear'
        title='Remove time remaining'
        onClick={() => props.onChange!('')}
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
