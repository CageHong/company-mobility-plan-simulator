/**
 * RENDER LAYER — modal-chart.js
 *
 * Modal split donut chart showing Car / Bike / PT employee counts.
 * Displays both percentage and absolute headcount on the chart.
 */

let modalChartInit = false;

function renderModalChart(result) {
  const { bikeCount, ptCount, carCount, totalEmployees } = result;

  const trace = {
    type: 'pie', hole: 0.55,
    labels: ['Car', 'Bike', 'Public Transport'],
    values: [carCount, bikeCount, ptCount],
    marker: { colors: ['#4B5563', '#1D9E75', '#378ADD'] },
    textinfo: 'percent+value',
    texttemplate: '%{percent:.0%}<br><span style="font-size:10px">%{value}</span>',
    hovertemplate: '%{label}: %{value} employees (%{percent})<extra></extra>',
    sort: false,
  };

  const layout = {
    height: 300,
    margin: { t: 16, r: 16, b: 16, l: 16 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    showlegend: true,
    legend: { orientation: 'h', y: -0.12, x: 0.5, xanchor: 'center' },
    font: { family: "'Helvetica Neue', Helvetica, Arial, sans-serif", size: 12, color: '#6B7280' },
    annotations: [{
      text: `${totalEmployees}<br><span style="font-size:11px">total</span>`,
      x: 0.5, y: 0.5,
      font: { size: 18, color: '#111827' },
      showarrow: false,
    }],
  };

  const config = { displayModeBar: false, responsive: true };

  if (!modalChartInit) {
    Plotly.newPlot('chart-modal', [trace], layout, config);
    modalChartInit = true;
  } else {
    Plotly.react('chart-modal', [trace], layout, config);
  }
}
