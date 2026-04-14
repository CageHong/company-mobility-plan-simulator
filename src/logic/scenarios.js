/**
 * LOGIC LAYER — scenarios.js
 *
 * Responsibility: What-if scenario modifiers.
 * Applies before engine.js — adjusts the active employee pool.
 *
 * Key fix vs v1.0:
 *   Old: used array index for remote work filtering → unstable across re-renders.
 *   New: uses employee ID (odd/even + modulo) as a stable, deterministic seed.
 *        Same slider value always produces the same subset of employees.
 *
 * scenarioParams shape:
 *   {
 *     remoteWorkPct:   number  (0–80, % of workforce excluded as fully remote)
 *     carpoolingPct:   number  (0–50, % of remaining car users carpooling)
 *   }
 *
 * Assumptions:
 *   - Remote work % is treated as a company-wide policy applied uniformly.
 *     In reality, distribution would vary by role — but role data is unavailable.
 *   - The remoteDaysPerWeek param in engine.js handles *hybrid* workers.
 *     This remoteWorkPct handles *fully remote* workers removed from the pool.
 *   - Carpooling reduces on-road vehicle count but has no direct subsidy impact.
 *   - Average carpooling occupancy: 2 employees per car.
 */

/**
 * Deterministic hash based on employee ID.
 * Maps any integer ID to a float in [0, 1) — stable across re-renders.
 *
 * Uses a simple linear congruential approach sufficient for UI stability.
 * This is NOT cryptographic — it's just for consistent visual behaviour.
 */
function stableRandom(id) {
  const x = Math.sin(id * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function applyRemoteWork(masterData, remoteWorkPct) {
  if (remoteWorkPct <= 0) {
    return { activeData: masterData, removedCount: 0 };
  }
  const threshold  = remoteWorkPct / 100;
  const activeData = masterData.filter(emp => stableRandom(emp.id) >= threshold);
  return { activeData, removedCount: masterData.length - activeData.length };
}

function estimateCarpooling(carCount, carpoolingPct) {
  if (carpoolingPct <= 0) return { carpoolers: 0, carsEliminated: 0 };
  const carpoolers     = Math.round(carCount * carpoolingPct / 100);
  const carsEliminated = Math.round(carpoolers / 2);
  return { carpoolers, carsEliminated };
}

function applyScenarios(masterData, scenarioParams) {
  const { remoteWorkPct = 0, carpoolingPct = 0 } = scenarioParams;
  const { activeData, removedCount } = applyRemoteWork(masterData, remoteWorkPct);
  return {
    activeData,
    scenarioSummary: { remoteWorkers: removedCount, carpoolingPct },
  };
}
