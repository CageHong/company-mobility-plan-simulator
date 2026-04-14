/**
 * RENDER LAYER — zone-chart.js
 *
 * Responsibility: Render the zone breakdown grouped bar chart (Plotly).
 * X-axis = zones, grouped bars = Car / Bike / PT per zone.
 * Sorted by total employees descending.
 *
 * Exports:
 *   renderZoneChart(result) → void
 */

let zoneChartInit = false;

function renderZoneChart(result) {
  const { byZone } = result;

  // Sort zones by total headcount descending
  const zones = Object.entries(byZone)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([zone]) => zone);

  const carData  = zones.map(z => byZone[z].car  || 0);
  const bikeData = zones.map(z => byZone[z].bike || 0);
  const ptData   = zones.map(z => byZone[z].pt   || 0);

  const traces = [
    {
      name: 'Car',
      x: zones, y: carData,
      type: 'bar',
      marker: { color: '#4B5563' },
      hovertemplate: '%{x} — Car: %{y}<extra></extra>',
    },
    {
      name: 'Bike',
      x: zones, y: bikeData,
      type: 'bar',
      marker: { color: '#1D9E75' },
      hovertemplate: '%{x} — Bike: %{y}<extra></extra>',
    },
    {
      name: 'PT',
      x: zones, y: ptData,
      type: 'bar',
      marker: { color: '#378ADD' },
      hovertemplate: '%{x} — PT: %{y}<extra></extra>',
    },
  ];

  const layout = {
    barmode:    'group',
    height:     320,
    margin:     { t: 24, r: 24, b: 48, l: 48 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font:       { family: 'DM Sans, sans-serif', size: 12, color: '#6B7280' },
    showlegend: true,
    legend:     { orientation: 'h', y: -0.25, x: 0 },
    xaxis: {
      title: 'Zone',
      tickangle: -30,
      gridcolor: 'rgba(0,0,0,0)',
    },
    yaxis: {
      title: 'Employees',
      gridcolor: 'rgba(107,114,128,0.15)',
    },
  };

  const config = { displayModeBar: false, responsive: true };

  if (!zoneChartInit) {
    Plotly.newPlot('chart-zone', traces, layout, config);
    zoneChartInit = true;
  } else {
    Plotly.react('chart-zone', traces, layout, config);
  }
}
