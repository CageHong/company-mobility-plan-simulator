/**
 * LOGIC LAYER — scenarios.js v1.5
 *
 * Changes vs v1.4:
 *   Remote workers are no longer removed from the active pool.
 *   Instead they are passed to engine.js with remoteDaysPerWeek=5,
 *   so shouldReclaimParking() correctly frees their parking spots.
 *   Previously, filtering them out meant their PP=1 spots were never
 *   reclaimed, understating the parking savings from remote work.
 *
 * scenarioParams shape:
 *   {
 *     remoteWorkPct:  number  (0–80, % of workforce treated as fully remote)
 *     carpoolingPct:  number  (0–50, % of remaining car users carpooling)
 *   }
 *
 * Assumptions:
 *   - Employees are ranked by distance descending; the top remoteWorkPct%
 *     are marked as fully remote (remoteDaysPerWeek=5).
 *   - Distance is used as a proxy for remote work likelihood. In reality,
 *     job role would also matter, but role data is unavailable.
 *   - Fully remote employees cannot receive bike/PT subsidies (they don't commute),
 *     but their parking spots are reclaimed (no on-site presence needed).
 *   - Carpooling reduces on-road vehicle count but has no direct subsidy impact.
 *   - Average carpooling occupancy: 2 employees per car.
 */

/**
 * Apply distance-weighted remote work filter.
 * Sorts employees by distance descending; marks the top remoteWorkPct%
 * as fully remote by setting remoteDaysPerWeek=5 on their record.
 * They stay in activeData so engine.js can reclaim their parking spots.
 */
function applyRemoteWork(masterData, remoteWorkPct) {
  if (remoteWorkPct <= 0) {
    return { activeData: masterData, removedCount: 0 };
  }

  // Sort by distance descending (furthest first = most likely to go remote)
  const sorted = [...masterData].sort((a, b) => b.distance - a.distance);

  const removeCount = Math.round(masterData.length * remoteWorkPct / 100);
  const remoteIds   = new Set(sorted.slice(0, removeCount).map(e => e.id));

  // Mark remote employees instead of removing them
  const activeData = masterData.map(e =>
    remoteIds.has(e.id) ? { ...e, remoteDaysPerWeek: 5 } : e
  );

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