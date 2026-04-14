/**
 * RENDER LAYER — budget-chart.js
 *
 * Responsibility: Render the budget breakdown stacked bar chart (Plotly).
 * Shows: remaining parking cost, bike subsidy, PT subsidy.
 * Draws a red threshold line at €100,000.
 *
 * Exports:
 *   renderBudgetChart(result) → void
 */

let budgetChartInit = false;

function renderBudgetChart(result) {
  const { budgetBreakdown: b } = result;

  const parking = Math.round(b.parking);
  const bike    = Math.round(result.bikeCost);
  const pt      = Math.round(result.ptCost);
  const total   = parking + bike + pt;

  const traces = [
    {
      name: 'Parking (retained)',
      x: ['Budget Allocation'],
      y: [parking],
      type: 'bar',
      marker: { color: '#4B5563' },
      hovertemplate: 'Parking: €%{y:,.0f}<extra></extra>',
    },
    {
      name: 'Bike subsidy',
      x: ['Budget Allocation'],
      y: [bike],
      type: 'bar',
      marker: { color: '#1D9E75' },
      hovertemplate: 'Bike: €%{y:,.0f}<extra></extra>',
    },
    {
      name: 'PT subsidy',
      x: ['Budget Allocation'],
      y: [pt],
      type: 'bar',
      marker: { color: '#378ADD' },
      hovertemplate: 'PT: €%{y:,.0f}<extra></extra>',
    },
  ];

  const overBudget = total > 100_000;

  const layout = {
    barmode:    'stack',
    height:     320,
    margin:     { t: 24, r: 24, b: 40, l: 72 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font:       { family: 'DM Sans, sans-serif', size: 12, color: '#6B7280' },
    showlegend: true,
    legend:     { orientation: 'h', y: -0.2, x: 0 },
    yaxis: {
      title: '€ / year',
      range: [0, Math.max(110_000, total * 1.1)],
      tickformat: ',.0f',
      gridcolor: 'rgba(107,114,128,0.15)',
    },
    xaxis: { showticklabels: false },
    shapes: [
      {
        type: 'line',
        x0: -0.5, x1: 0.5,
        y0: 100_000, y1: 100_000,
        line: { color: '#E24B4A', width: 2, dash: 'dot' },
      },
    ],
    annotations: [
      {
        x: 0.5, y: 100_000,
        xref: 'x', yref: 'y',
        text: '€100K limit',
        showarrow: false,
        font: { color: '#E24B4A', size: 11 },
        xanchor: 'left',
        yanchor: 'bottom',
      },
    ],
  };

  if (overBudget) {
    layout.shapes.push({
      type: 'rect',
      x0: -0.5, x1: 0.5,
      y0: 100_000, y1: total,
      fillcolor: 'rgba(226,75,74,0.15)',
      line: { width: 0 },
    });
  }

  const config = { displayModeBar: false, responsive: true };

  if (!budgetChartInit) {
    Plotly.newPlot('chart-budget', traces, layout, config);
    budgetChartInit = true;
  } else {
    Plotly.react('chart-budget', traces, layout, config);
  }
}
