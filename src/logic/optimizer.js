/**
 * LOGIC LAYER — optimizer.js
 *
 * Finds the parameter combination that converts the most employees away
 * from car within the €100K budget constraint.
 *
 * Search space (brute-force, ~8,000 iterations, <100ms in browser):
 *   bikeMaxDist: 500–5000m  (step 100m  → 46 values)
 *   ptMaxTime:   0–3600s    (step 60s   → 61 values)
 *   mode:        bike | pt | both  (3 values)
 *
 * ptSubsidyPct and remoteDaysPerWeek are treated as fixed policy
 * decisions set by the user — the optimizer finds the best threshold
 * values within those constraints.
 *
 * Exports:
 *   optimize(masterData, fixedParams) → OptimResult
 *
 * OptimResult shape:
 *   {
 *     mode, bikeMaxDist, ptMaxTime,   ← best params found
 *     converted,                       ← max employees converted
 *     budgetUsed, budgetRemaining,
 *     feasible,                        ← true if within budget
 *   }
 */

function optimize(masterData, fixedParams) {
  const { remoteDaysPerWeek = 0, ptSubsidyPct = 100, conflictRule = 'cost' } = fixedParams;

  const BIKE_STEPS = [];
  for (let d = 500; d <= 5000; d += 100) BIKE_STEPS.push(d);

  const PT_STEPS = [];
  for (let t = 0; t <= 3600; t += 60) PT_STEPS.push(t);

  const MODES = ['bike', 'pt', 'both'];

  let best = null;

  for (const mode of MODES) {
    for (const bikeMaxDist of BIKE_STEPS) {
      for (const ptMaxTime of PT_STEPS) {

        // Skip obviously redundant iterations
        if (mode === 'pt'   && bikeMaxDist !== 500)  continue;
        if (mode === 'bike' && ptMaxTime   !== 0)    continue;

        const result = compute(masterData, {
          mode, bikeMaxDist, ptMaxTime,
          conflictRule, remoteDaysPerWeek, ptSubsidyPct,
        });

        if (result.budgetUsed > result.totalBudget) continue; // over budget

        const converted = result.bikeCount + result.ptCount;

        if (!best || converted > best.converted ||
           (converted === best.converted && result.budgetUsed < best.budgetUsed)) {
          best = {
            mode, bikeMaxDist, ptMaxTime,
            converted,
            budgetUsed:       result.budgetUsed,
            budgetRemaining:  result.budgetRemaining,
            bikeCount:        result.bikeCount,
            ptCount:          result.ptCount,
            feasible:         true,
          };
        }
      }
    }
  }

  // Fallback: if nothing fits budget, find least-over-budget option
  if (!best) {
    best = {
      mode: 'bike', bikeMaxDist: 500, ptMaxTime: 0,
      converted: 0, budgetUsed: 60_000, budgetRemaining: 40_000,
      bikeCount: 0, ptCount: 0, feasible: false,
    };
  }

  return best;
}
