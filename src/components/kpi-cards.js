/**
 * RENDER LAYER — kpi-cards.js
 *
 * Renders 5 KPI metric cards:
 *   1. Total Expenditure (parking retained + all subsidies)
 *   2. Remaining Budget
 *   3. Parking Spots Freed
 *   4. Employees Converted
 *   5. Subsidy Cost / Year (pure subsidy only, excl. parking)
 */

function renderKPIs(result) {
  const fmtE = n => '€' + Math.round(n).toLocaleString();
  const fmt  = n => Math.round(n).toLocaleString();

  const cards = {
    'kpi-total': {
      value:  fmtE(result.budgetUsed),
      status: result.budgetBreakdown.overBudget ? 'danger'
            : result.budgetUsed > 90_000         ? 'warn'
            : 'ok',
    },
    'kpi-budget': {
      value:  fmtE(result.budgetRemaining),
      status: result.budgetBreakdown.overBudget  ? 'danger'
            : result.budgetRemaining < 5_000      ? 'warn'
            : 'ok',
    },
    'kpi-saved': {
      value:  fmt(result.parkingSaved),
      status: 'neutral',
    },
    'kpi-converted': {
      value:  fmt(result.bikeCount + result.ptCount),
      status: 'neutral',
    },
    'kpi-subsidy': {
      value:  fmtE(result.subsidyCost),
      status: result.subsidyCost > result.extraPool ? 'warn' : 'ok',
    },
  };

  for (const [id, data] of Object.entries(cards)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.querySelector('.kpi-value').textContent = data.value;
    el.dataset.status = data.status;
  }
}
