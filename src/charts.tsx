import { FunctionComponent } from "react";
import { SupplyStats, SupplyStatsSummary } from "./types";
import { getColorFromToken, IChartDataPoint, IVerticalStackedChartProps, IVSChartDataPoint, StackedBarChart, VerticalStackedBarChart } from "@fluentui/react-charting";

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
      color: getColorFromToken(cmdrColors[cmdr]),
      data: summary.cmdrs[cmdr],
    }));

  return <div className="chart" >
    <StackedBarChart
      data={{
        chartTitle: 'Cargo delivered by Commander:',
        chartData: points,
      }}
    />
  </div>;
};

export const ChartByCmdrsOverTime: FunctionComponent<{ summary: SupplyStatsSummary }> = (props) => {
  const { summary } = props;
  const colors = getColorTable(Object.keys(summary.cmdrs));
  console.warn(colors);

  const data: IVerticalStackedChartProps[] = summary.stats.map(ss => ({
    xAxisPoint: new Date(ss.time),
    chartData: mapDay(ss, colors),
  }
  ));

  return <div style={{ height: 300 }}>
    <VerticalStackedBarChart
      className="chart"
      chartTitle='Deliveries by Commander over time'
      yAxisTitle="Cargo"
      xAxisTitle="Time"
      legendProps={{ allowFocusOnLegends: false }}
      data={data}
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

