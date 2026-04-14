/**
 * LOGIC LAYER — scenarios.js v1.4
 *
 * Changes vs v1.3:
 *   Remote work filtering switched from ID-based uniform hash to
 *   distance-weighted selection: employees with longer commutes are
 *   prioritised for remote work, reflecting stronger motivation to
 *   avoid long commutes and higher likelihood of accepting remote offers.
 *
 *   Assumption boundary: this is a static model. It does not simulate
 *   long-term behavioural responses (e.g. employees relocating further
 *   away because remote work is available). See context.md §7.
 *
 * scenarioParams shape:
 *   {
 *     remoteWorkPct:  number  (0–80, % of workforce treated as fully remote)
 *     carpoolingPct:  number  (0–50, % of remaining car users carpooling)
 *   }
 *
 * Assumptions:
 *   - Employees are ranked by distance descending; the top remoteWorkPct%
 *     are removed from the active pool (treated as fully remote).
 *   - Distance is used as a proxy for remote work likelihood. In reality,
 *     job role would also matter, but role data is unavailable.
 *   - Carpooling reduces on-road vehicle count but has no direct subsidy impact.
 *   - Average carpooling occupancy: 2 employees per car.
 */

/**
 * Apply distance-weighted remote work filter.
 * Sorts employees by distance descending, removes the top remoteWorkPct%.
 * Result is stable: same slider value always removes the same employees.
 */
function applyRemoteWork(masterData, remoteWorkPct) {
  if (remoteWorkPct <= 0) {
    return { activeData: masterData, removedCount: 0 };
  }

  // Sort by distance descending (furthest first = most likely to go remote)
  const sorted = [...masterData].sort((a, b) => b.distance - a.distance);

  const removeCount = Math.round(masterData.length * remoteWorkPct / 100);
  const removedIds  = new Set(sorted.slice(0, removeCount).map(e => e.id));

  const activeData = masterData.filter(e => !removedIds.has(e.id));

  return { activeData, removedCount: removeCount };
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