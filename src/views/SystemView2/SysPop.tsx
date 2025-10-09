import * as api from '../../api';
import { FunctionComponent, useMemo, useState } from "react";
import { Pop } from "../../types2";
import { ActionButton, Icon, IconButton, Link, Modal, ResponsiveMode, Spinner, SpinnerSize, Stack } from "@fluentui/react";
import { appTheme, cn } from "../../theme";
import { ILineChartDataPoint, ILineChartPoints, LineChart } from '@fluentui/react-charting';
import { HistoryEvent } from '../../api/v2-system';
import { IEventAnnotation } from '@fluentui/react-charting/lib/types/IEventAnnotation';
import { getRelativeDuration } from '../../util';

export const SysPop: FunctionComponent<{ id64: number, name: string, pop: Pop | undefined, onChange: (newPop: Pop) => void }> = (props) => {
  const [pop, setPop] = useState(props.pop);
  const [disableUpdate, setDisableUpdate] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetch, setFetch] = useState(0);
  const [data, setChartData] = useState<{ data: ILineChartPoints[], events: IEventAnnotation[], lastDate: number }>({ data: [], events: [], lastDate: 0 });

  const updateFromSpansh = () => {
    setLoading(true);
    setDisableUpdate(true);

    api.systemV2.refreshPop(props.id64)
      .then(newPop => {
        setPop(newPop);
        props.onChange(newPop);

        setFetch(fetch + 1);
        setDisableUpdate(false);
      })
      .catch(err => {
        console.error(`SysPop-updateFromSpansh: ${err.stack}`);
      });
  };

  // fetch history data
  useMemo(async () => {
    if (fetch === 0) { return; }

    try {
      setLoading(true);

      const popData: ILineChartDataPoint[] = [];
      const events: IEventAnnotation[] = [];

      const history = await api.systemV2.popHistory(props.id64);
      let latest = 0;
      for (const entry of history) {
        const dd = new Date(entry.time);
        latest = Math.max(latest, dd.getTime());
        const parsed = JSON.parse(entry.json);

        switch (entry.event) {
          default: throw new Error(`Unexpected event: ${entry.event}`);

          case HistoryEvent.pop:
            popData.push({
              xAxisCalloutData: dd.toLocaleString(),
              x: dd,
              y: JSON.parse(entry.json),
            });
            break;

          case HistoryEvent.build:
            events.push({
              date: dd,
              event: parsed.name,
              onRenderCard: () => {
                // This is a total hack: to force styles on the Callout containing these elements :(
                setTimeout(() => {
                  let ep = document.getElementById('hack-me')?.parentElement;
                  while (ep?.parentElement && !ep.classList.contains('ms-Callout-main')) { ep = ep.parentElement; }
                  if (ep) {
                    ep.style.border = '1px solid ' + appTheme.palette.themeTertiary;
                    if (ep.parentElement) { ep.parentElement.style.boxShadow = `${appTheme.palette.blackTranslucent40} -1px 0px 20px 10px`; }
                    const eb = ep.parentElement?.firstElementChild as HTMLElement;
                    if (eb) { eb.style.backgroundColor = appTheme.palette.themeSecondary; }
                  }
                }, 25);
                return <div id='hack-me'>•&nbsp;{parsed.name}</div>;
              },
            });
            break;
        }
      }

      const newData: ILineChartPoints[] = [];
      if (popData.length > 0) { newData.push({ legend: 'Population', data: popData }); }

      setChartData({
        data: newData,
        events: events,
        lastDate: latest,
      });

      // delay a little to avoid flicker
      setTimeout(() => setLoading(false), 500);

    } catch (err: any) {
      if (err.statusCode !== 404) {
        console.error(`SysPop-popHistory: ${err.stack}`);
      }
    }
  }, [props.id64, fetch]);

  const popVal = pop?.pop.toLocaleString() ?? '?';
  const color = disableUpdate ? appTheme.palette.neutralTertiaryAlt : undefined;

  return <div>
    <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }}>
      <div>{popVal}</div>

      <IconButton
        className={cn.ibBri} style={{ width: 22, height: 22 }}
        iconProps={{ iconName: 'LineChart' }}
        onClick={() => {
          if (!props.pop) {
            // trigger immediate update from Spansh if population is not known
            updateFromSpansh();
          } else if (fetch === 0) {
            // fetch pop history data if not known
            setFetch(fetch + 1);
          }
          setShowCharts(true);
        }}
      />
    </Stack>

    {showCharts && <>
      <Modal
        isOpen
        responsiveMode={ResponsiveMode.large}
        onDismiss={() => setShowCharts(false)}
        styles={{
          main: { border: '1px solid ' + appTheme.palette.themePrimary }
        }}
      >
        <div style={{ width: 800, minHeight: 400 }}>
          <IconButton className={cn.ibBri} iconProps={{ iconName: 'Cancel' }} style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => setShowCharts(false)} />
          <h3 className={cn.h3}>Population history for: {props.name}</h3>
          {loading && <Spinner size={SpinnerSize.large} style={{ position: 'absolute', left: 400, top: 250 }} labelPosition='bottom' label='Loading ...' />}

          <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 8 }} style={{ margin: '8px 0' }}>
            <div>Current population:</div>
            <div style={{ color }}>{popVal}</div>

            <ActionButton
              className={cn.ibBri}
              iconProps={{ iconName: 'Refresh', style: { color } }}
              style={{ height: 24, color }}
              text='Update'
              disabled={disableUpdate}
              onClick={updateFromSpansh}
            />

            <div style={{ color: appTheme.palette.themeTertiary }}>
              History data based on manual updates from&nbsp;
              <Link href='https://spansh.co.uk' target='spansh'>
                Spansh
                <Icon className='icon-inline' iconName='OpenInNewWindow' style={{ marginLeft: 4, textDecoration: 'none', color: appTheme.palette.themeTertiary }} />
              </Link>
              &nbsp;
            </div>
          </Stack>

          {data.data.length === 0 && <div style={{ position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center', color: appTheme.palette.themeTertiary }}>No data for chart</div>}

          <LineChart
            width={800}
            height={400}
            calloutProps={{ style: { border: '1px solid ' + appTheme.palette.themeTertiary, padding: 0, boxShadow: `${appTheme.palette.blackTranslucent40} -1px 0px 20px 10px` } }}
            enablePerfOptimization hideLegend
            allowMultipleShapesForPoints={true}
            data={{ lineChartData: data.data, }}
            eventAnnotationProps={{
              mergedLabel: num => `${num} events`,
              events: data.events,
              strokeColor: appTheme.palette.themeSecondary,
            }}
            customDateTimeFormatter={data.data.every(d => d.data.length <= 1) ? dt => dt.toLocaleString() : undefined}
          />
          <div style={{ fontSize: 10, color: appTheme.palette.themeTertiary }}>Last updated: <span key={`spu-${data.lastDate}`} style={{ color: appTheme.palette.themeSecondary }}>{getRelativeDuration(new Date(data.lastDate))}</span></div>
        </div>
      </Modal>
    </>}
  </div>;
}
