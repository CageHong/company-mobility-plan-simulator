/**
 * DATA LAYER — loader.js
 *
 * Responsibility: Load the three CSV files, parse them, join on ID,
 * and expose a single masterData[] array to the rest of the app.
 * Nothing outside this file should ever touch raw CSV data.
 *
 * Exports:
 *   loadData() → Promise<MasterRecord[]>
 *
 * MasterRecord shape:
 *   { id, zone, pp, tCar, tPT, tBike, distance,
 *     costDaily, costMonthly, costYearly }
 */

const DATA_PATHS = {
  employees: './data/employees.csv',
  ttimes:    './data/ttimes.csv',
  ptcosts:   './data/ptcosts.csv',
};

/**
 * Parse a single CSV file via PapaParse.
 * Returns a promise resolving to an array of row objects.
 */
function parseCsv(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download:        true,
      header:          true,
      skipEmptyLines:  true,
      dynamicTyping:   true,
      complete: results => resolve(results.data),
      error:    err    => reject(new Error(`Failed to load ${path}: ${err.message}`)),
    });
  });
}

/**
 * Load all three CSVs in parallel, join on ID, return masterData[].
 */
async function loadData() {
  const [employees, ttimes, ptcosts] = await Promise.all([
    parseCsv(DATA_PATHS.employees),
    parseCsv(DATA_PATHS.ttimes),
    parseCsv(DATA_PATHS.ptcosts),
  ]);

  // Build lookup maps keyed by ID for O(1) join
  const ttMap  = new Map(ttimes.map(r  => [r.ID, r]));
  const ptMap  = new Map(ptcosts.map(r => [r.ID, r]));

  const masterData = [];

  for (const emp of employees) {
    const tt = ttMap.get(emp.ID);
    const pt = ptMap.get(emp.ID);

    if (!tt || !pt) continue; // skip orphan rows (data integrity guard)

    masterData.push({
      id:           emp.ID,
      zone:         emp.zone,
      pp:           emp.PP === 1,                  // boolean

      tCar:         tt['Ttime_Car (s)'],
      tPT:          tt['Ttime_PT (s)'],
      tBike:        tt['Ttime_bike (s)'],
      distance:     tt['Distance (m)'],

      costDaily:    pt['Daily ticket Full Price'],
      costMonthly:  pt['Month pass_Cost'],
      costYearly:   pt['Year pass_Price'],
    });
  }

  return masterData;
}
