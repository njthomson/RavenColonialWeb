import { getColorFromToken, IChartDataPoint, IVerticalStackedChartProps, IVSChartDataPoint, StackedBarChart, VerticalStackedBarChart } from "@fluentui/react-charting";
import { FunctionComponent } from "react";
import { getColorTable } from "../util";
import { SupplyStats, SupplyStatsSummary } from "../types";
import { appTheme } from "../theme";

export const ChartGeneralProgress: FunctionComponent<{ progress: number, readyOnFC: number, maxNeed: number }> = (props) => {

  const points: IChartDataPoint[] = [
    {
      legend: 'Progress',
      data: props.progress,
      color: appTheme.palette.tealLight,
    },
    {
      legend: 'Ready on FCs',
      data: props.readyOnFC,
      color: appTheme.palette.tealDark,
    },
    {
      legend: 'Remaining',
      data: props.maxNeed - props.progress - props.readyOnFC,
      placeHolder: true,
      color: 'grey',
    },
  ];

  if (props.readyOnFC === 0) {
    points.splice(1, 1);
  }

  return <div className="chart" >
    <StackedBarChart
      ignoreFixStyle
      data={{
        chartTitle: `Total progress:`,
        chartData: points,
      }}
    />
  </div>;
};

export const ChartByCmdrs: FunctionComponent<{ summary: SupplyStatsSummary, cmdrColors: Record<string, string> }> = (props) => {
  const { summary, cmdrColors } = props;
  const points: IChartDataPoint[] = Object.keys(summary.cmdrs)
    .map(cmdr => ({
      legend: cmdr,
      data: summary.cmdrs[cmdr],
      color: getColorFromToken(cmdrColors[cmdr]),
    }));


  return <div className="chart" >
    <StackedBarChart
      ignoreFixStyle
      data={{
        chartTitle: 'Cargo delivered by Commander:',
        chartData: points,
      }}
    />
  </div>;
};

export const ChartByCmdrsOverTime: FunctionComponent<{ summary: SupplyStatsSummary, complete: boolean }> = (props) => {
  const { summary } = props;
  const colors = getColorTable(Object.keys(summary.cmdrs));
  const mins30 = 1000 * 60 * 30;

  // map raw data into chart dataand calculate the time span across the data points
  let minTime = Date.now();
  let maxTime = 0;
  const data: IVerticalStackedChartProps[] = summary.stats.map(ss => {
    // add 30 mins so each bar fills the hour rather than straddling it
    const d = new Date(new Date(ss.time).getTime() + mins30);
    if (d.getTime() < minTime) { minTime = d.getTime() }
    if (d.getTime() > maxTime) { maxTime = d.getTime() }
    return {
      xAxisPoint: d,
      chartData: mapDay(ss, colors),
    };
  });

  // add an extra empty data point at the beginning so we see the initial hour
  data.unshift({
    xAxisPoint: new Date(summary.stats[0].time),
    chartData: [],
  });

  // if not complete: add an extra empty entry so the chart extends to the current time
  if (!props.complete) {
    maxTime = Date.now();
    data.push({
      xAxisPoint: new Date(),
      chartData: [],
    });
  }

  // calculate how wide the bars can be to fill on hour's worth of pixels
  const width = 400;
  const timeDiffHours = 2 + ((maxTime - minTime) / 1000 / 60 / 60);
  let widthHour = ((width - 60) / timeDiffHours) - 1;
  // console.log(`timeDiffHours: ${timeDiffHours} /widthHour: ${widthHour}`);
  if (widthHour < 1) widthHour = 1; // with a minimum of 1px

  return <div style={{ width: `${width}px` }}>
    <VerticalStackedBarChart
      chartTitle='Cargo deliveries by Commander over time'
      legendProps={{ allowFocusOnLegends: false }}
      isCalloutForStack
      data={data}
      width={width}
      height={200}
      styles={{ chartWrapper: 'cmdrs-over-time' }}
      barWidth={widthHour}
      maxBarWidth={widthHour}
      enableReflow
    />
  </div>;
};

const mapDay = (ss: SupplyStats, colors: Record<string, string>): IVSChartDataPoint[] => {
  return Object.keys(ss.cmdrs).map(cmdr => ({
    legend: cmdr,
    data: ss.cmdrs[cmdr],
    color: getColorFromToken(colors[cmdr]),
    xAxisCalloutData: new Date(ss.time).toLocaleString(),

  }) as IVSChartDataPoint);
};

