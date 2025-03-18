import { FunctionComponent } from "react";
import { SupplyStats, SupplyStatsSummary } from "./types";
import { getColorFromToken, IChartDataPoint, ILegend, IVerticalStackedChartProps, IVSChartDataPoint, Legends, StackedBarChart, VerticalStackedBarChart } from "@fluentui/react-charting";

export const getColorTable = (tokens: string[]): Record<string, string> => {
  const colors: Record<string, string> = {};
  tokens.forEach((k, n) => colors[k] = `qualitative.${n + 1}`);
  return colors;
};

export const ChartByCmdrs: FunctionComponent<{ summary: SupplyStatsSummary, cmdrColors: Record<string, string> }> = (props) => {
  const { summary, cmdrColors } = props;
  const points: IChartDataPoint[] = Object.keys(summary.cmdrs)
    .map(cmdr => ({
      legend: cmdr,
      data: summary.cmdrs[cmdr],
      color: getColorFromToken(cmdrColors[cmdr]),
    }));

  const legends: ILegend[] = Object.keys(summary.cmdrs)
    .map(cmdr => ({
      title: cmdr,
      color: getColorFromToken(cmdrColors[cmdr]),
    }));

  return <div className="chart" >
    <StackedBarChart
      data={{
        chartTitle: 'Cargo delivered by Commander:',
        chartData: points,
      }}
    />
    {legends.length <= 2 && <Legends legends={legends} />}
  </div>;
};

export const ChartByCmdrsOverTime: FunctionComponent<{ summary: SupplyStatsSummary, complete: boolean }> = (props) => {
  const { summary } = props;
  const colors = getColorTable(Object.keys(summary.cmdrs));

  const data: IVerticalStackedChartProps[] = summary.stats.map(ss => ({
    xAxisPoint: new Date(ss.time),
    chartData: mapDay(ss, colors),
  }));

  // and add an extra entry, so the chart extends to the current time (if not complete)
  if (!props.complete) {
    data.push({
      xAxisPoint: new Date(),
      chartData: [],
    });
  }

  return <div>
    <VerticalStackedBarChart
      className="chart"
      chartTitle='Deliveries by Commander over time'
      yAxisTitle="Cargo"
      xAxisTitle="Time"
      legendProps={{ allowFocusOnLegends: false }}
      data={data}
      width={400}
      height={200}
      styles={{ chartWrapper: 'cmdrs-over-time' }}
      barWidth={4}
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

