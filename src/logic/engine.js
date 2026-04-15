/**
 * LOGIC LAYER — engine.js v1.4
 *
 * Changes vs v1.2:
 *   - Added ptSubsidyPct (0–100): company pays this % of each employee's
 *     optimal PT cost. Employee self-pays the remainder.
 *   - Result now includes ptEmployeeCost (total employee self-pay) and
 *     avgEmployeeSelfPay for display in What-if summary.
 *
 * Params shape:
 *   {
 *     mode:              'bike' | 'pt' | 'both',
 *     bikeMaxDist:       number   (metres,  500–5000),
 *     ptMaxTime:         number   (seconds, 0–3600),
 *     conflictRule:      'cost' | 'bike' | 'pt',
 *     remoteDaysPerWeek: number   (0–5),
 *     ptSubsidyPct:      number   (0–100, % company covers)
 *   }
 */

const WEEKS_PER_YEAR   = 46;
const PARKING_COST_PP  = 100;
const BIKE_COST_PPY    = 150;
const TOTAL_BUDGET     = 100_000;
const BASE_PARKING     = 60_000;
const EXTRA_POOL       = 40_000;

function commutingDays(remoteDaysPerWeek) {
  return Math.round((5 - remoteDaysPerWeek) * WEEKS_PER_YEAR);
}

function tippingPoint(emp) {
  return emp.costYearly / emp.costDaily;
}

function bestPtOption(emp, days) {
  const options = [
    { cost: emp.costDaily   * days, ticket: 'daily'   },
    { cost: emp.costMonthly * 12,   ticket: 'monthly'  },
    { cost: emp.costYearly,         ticket: 'yearly'   },
  ];
  return options.reduce((best, o) => o.cost < best.cost ? o : best);
}

function shouldReclaimParking(emp, assignment, remoteDaysPerWeek) {
  if (!emp.pp) return false;
  if (remoteDaysPerWeek === 5) return true;       // 完全遠距 → 一律回收
  if (assignment === 'bike' || assignment === 'pt') return true;  // 換模式 → 回收
  return false;                                   // 繼續開車的混合辦公者 → 保留
}

function compute(masterData, params) {
  const {
    mode,
    bikeMaxDist,
    ptMaxTime,
    conflictRule      = 'cost',
    remoteDaysPerWeek = 0,
    ptSubsidyPct      = 100,   // default: company covers 100%
  } = params;

  const subsidyRate   = ptSubsidyPct / 100;

  const enriched = masterData.map(emp => {
    // Per-employee remote days: scenarios.js may stamp remoteDaysPerWeek=5
    // on individual records; fall back to the global param for everyone else.
    const empRemoteDays = emp.remoteDaysPerWeek !== undefined
      ? emp.remoteDaysPerWeek
      : remoteDaysPerWeek;
    const days = commutingDays(empRemoteDays);

    const bikeEligible = emp.distance >= 500 && emp.distance <= bikeMaxDist;
    const ptEligible   = emp.tPT <= ptMaxTime;
    const ptOption     = bestPtOption(emp, days);

    // Company pays subsidyRate of PT cost; employee pays the rest
    const ptCompanyCost  = ptOption.cost * subsidyRate;
    const ptEmployeeCost = ptOption.cost * (1 - subsidyRate);

    // For conflict resolution, compare company cost only
    let assignment = empRemoteDays === 5 ? 'remote' : 'car';

    if (empRemoteDays < 5) {
      if (mode === 'bike') {
        if (bikeEligible) assignment = 'bike';
      } else if (mode === 'pt') {
        if (ptEligible) assignment = 'pt';
      } else if (mode === 'both') {
        if (bikeEligible && ptEligible) {
          if      (conflictRule === 'bike') assignment = 'bike';
          else if (conflictRule === 'pt')   assignment = 'pt';
          else assignment = ptCompanyCost < BIKE_COST_PPY ? 'pt' : 'bike';
        } else if (bikeEligible) {
          assignment = 'bike';
        } else if (ptEligible) {
          assignment = 'pt';
        }
      }
    }

    return {
      ...emp,
      commutingDays:    days,
      bikeEligible,
      ptEligible,
      ptCost:           ptOption.cost,        // full ticket cost
      ptCompanyCost,                           // company's share
      ptEmployeeCost,                          // employee's self-pay
      ptTicket:         ptOption.ticket,
      tippingPoint:     tippingPoint(emp),
      assignment,
      parkingReclaimed: shouldReclaimParking(emp, assignment, empRemoteDays),
    };
  });

  let bikeCost = 0, ptSubsidyCost = 0, ptEmployeeTotal = 0;
  let parkingSaved = 0;
  let bikeCount = 0, ptCount = 0, carCount = 0, remoteCount = 0;
  let ticketSwitchCount = 0, ticketSwitchSaving = 0;

  for (const emp of enriched) {
    if (emp.assignment === 'bike') {
      bikeCost += BIKE_COST_PPY; bikeCount++;
    } else if (emp.assignment === 'pt') {
      ptSubsidyCost  += emp.ptCompanyCost;
      ptEmployeeTotal += emp.ptEmployeeCost;
      ptCount++;
      if (emp.ptTicket === 'daily') {
        const saving = emp.costYearly - emp.ptCost;
        if (saving > 0) { ticketSwitchCount++; ticketSwitchSaving += saving; }
      }
    } else if (emp.assignment === 'remote') {
      remoteCount++;
    } else {
      carCount++;
    }
    if (emp.parkingReclaimed) parkingSaved++;
  }

  const parkingReclaim  = parkingSaved * PARKING_COST_PP;
  const retainedParking = BASE_PARKING - parkingReclaim;
  const subsidyCost     = bikeCost + ptSubsidyCost;
  const budgetUsed      = retainedParking + subsidyCost;

  const byZone = {};
  for (const emp of enriched) {
    if (!byZone[emp.zone]) byZone[emp.zone] = { car:0, bike:0, pt:0, remote:0, total:0 };
    byZone[emp.zone][emp.assignment]++;
    byZone[emp.zone].total++;
  }

  return {
    totalBudget: TOTAL_BUDGET, baseParking: BASE_PARKING, extraPool: EXTRA_POOL,
    parkingReclaim, retainedParking,
    bikeCost, ptCost: ptSubsidyCost, subsidyCost,
    budgetUsed, budgetRemaining: TOTAL_BUDGET - budgetUsed,
    budgetBreakdown: {
      parking: retainedParking, bike: bikeCost, pt: ptSubsidyCost,
      total: budgetUsed, limit: TOTAL_BUDGET, overBudget: budgetUsed > TOTAL_BUDGET,
    },
    bikeCount, ptCount, carCount, remoteCount,
    totalEmployees: masterData.length,
    parkingSaved,
    totalParkingSpots: masterData.filter(e => e.pp).length,
    ticketSwitchCount,
    ticketSwitchSaving:   Math.round(ticketSwitchSaving),
    ptEmployeeTotal:      Math.round(ptEmployeeTotal),
    avgEmployeeSelfPay:   ptCount > 0 ? Math.round(ptEmployeeTotal / ptCount) : 0,
    ptSubsidyPct,
    commutingDays:        commutingDays(remoteDaysPerWeek),
    remoteDaysPerWeek,
    byZone,
    employees: enriched,
  };
}