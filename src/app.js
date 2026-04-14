/**
 * ORCHESTRATOR — app.js v1.3
 *
 * Changes vs v1.2:
 *   - Passes ptSubsidyPct through to engine
 *   - Listens for controls:optimize event → runs optimizer → animates sliders
 *   - What-if summary shows employee self-pay and PT subsidy rate
 */

(async function main() {
  let masterData;
  try {
    masterData = await loadData();
  } catch (err) {
    document.getElementById('loading-overlay').innerHTML =
      `<p class="error">Failed to load data: ${err.message}</p>`;
    return;
  }

  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  initControls();
  runPipeline(getParams());

  // Normal re-render on any control change
  document.addEventListener('controls:change', e => runPipeline(e.detail));

  // Optimizer: runs search, animates sliders, then re-renders
  document.addEventListener('controls:optimize', e => {
    const fixedParams = {
      remoteDaysPerWeek: e.detail.remoteDaysPerWeek,
      ptSubsidyPct:      e.detail.ptSubsidyPct,
      conflictRule:      e.detail.conflictRule,
    };

    const best = optimize(masterData, fixedParams);
    animateToOptimal(best);

    // Re-render with optimal params after animation settles
    setTimeout(() => runPipeline(getParams()), 700);
  });

  // ── Pipeline ────────────────────────────────────────────────────────────
  function runPipeline(params) {
    const { remoteWorkPct, carpoolingPct, ...engineParams } = params;

    const { activeData, scenarioSummary } = applyScenarios(masterData, {
      remoteWorkPct, carpoolingPct,
    });

    const result = compute(activeData, engineParams);

    const carpoolingInfo = estimateCarpooling(result.carCount, carpoolingPct);
    result.scenarioSummary = { ...scenarioSummary, ...carpoolingInfo };
    result.totalEmployees  = activeData.length;

    renderKPIs(result);
    renderBudgetChart(result);
    renderModalChart(result);
    renderZoneChart(result);
    renderWhatIfSummary(result);
  }

  // ── What-if summary ──────────────────────────────────────────────────────
  function renderWhatIfSummary(result) {
    const el = document.getElementById('whatif-summary');
    if (!el) return;

    const s    = result.scenarioSummary;
    const fmt  = n => n.toLocaleString();
    const fmtE = n => '€' + Math.round(n).toLocaleString();

    const switchRow = result.ticketSwitchCount > 0
      ? `<div class="whatif-row">
           <span>Switched to daily ticket (hybrid saving)</span>
           <strong style="color:var(--c-emerald)">${fmtE(result.ticketSwitchSaving)}</strong>
         </div>`
      : '';

    const selfPayRow = result.ptCount > 0 && result.ptSubsidyPct < 100
      ? `<div class="whatif-row">
           <span>Employee avg. self-pay (PT)</span>
           <strong>${fmtE(result.avgEmployeeSelfPay)} / year</strong>
         </div>
         <div class="whatif-row">
           <span>Total employee self-pay pool</span>
           <strong>${fmtE(result.ptEmployeeTotal)}</strong>
         </div>`
      : '';

    el.innerHTML = `
      <div class="whatif-row">
        <span>Fully remote workers excluded</span>
        <strong>${fmt(s.remoteWorkers)}</strong>
      </div>
      <div class="whatif-row">
        <span>Commuting days / year</span>
        <strong>${fmt(result.commutingDays)}</strong>
      </div>
      <div class="whatif-row">
        <span>PT subsidy rate</span>
        <strong>${result.ptSubsidyPct}%</strong>
      </div>
      ${selfPayRow}
      ${switchRow}
      <div class="whatif-row">
        <span>Carpoolers (estimated)</span>
        <strong>${fmt(s.carpoolers)}</strong>
      </div>
      <div class="whatif-row">
        <span>Cars removed by carpooling</span>
        <strong>${fmt(s.carsEliminated)}</strong>
      </div>
    `;
  }

})();
