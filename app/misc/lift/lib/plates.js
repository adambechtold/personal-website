// Barbell plate math for the weight editor's plate calculator.
// Given a total barbell weight, work out which plates to load on each side.

/**
 * Default bar weight and available plate sizes per unit. These match a
 * standard commercial gym: a 45 lb / 20 kg Olympic bar and the usual plate
 * ladder. Sizes are listed largest-first so the greedy loader consumes them
 * in order.
 */
export const PLATE_PRESETS = {
  lb: { barWeight: 45, plateSizes: [45, 35, 25, 10, 5, 2.5] },
  kg: { barWeight: 20, plateSizes: [25, 20, 15, 10, 5, 2.5, 1.25] },
};

/**
 * Resolves the plate preset for a weight unit, falling back to pounds for any
 * unrecognized unit.
 * @param {string} unit - The weight unit label ("lb" or "kg").
 * @return {{barWeight: number, plateSizes: number[]}} The preset to use.
 */
export function platePresetForUnit(unit) {
  return PLATE_PRESETS[unit] || PLATE_PRESETS.lb;
}

/**
 * Works out the plates to hang on each side of the bar for a target total
 * weight. Uses a greedy largest-first fill, computing in hundredths so decimal
 * plates (2.5, 1.25) don't accumulate floating-point error.
 * @param {string|number} totalWeight - The target barbell weight, including
 *   the bar.
 * @param {{barWeight: number, plateSizes: number[]}} config - Bar weight and
 *   the plate sizes available (one of each size assumed available in pairs).
 * @return {{
 *   empty: boolean,
 *   belowBar: boolean,
 *   barWeight: number,
 *   perSide: Array<{plateSize: number, count: number}>,
 *   remainderPerSide: number,
 *   isExact: boolean
 * }} A breakdown of the load. `empty` means no usable number was given;
 *   `belowBar` means the target is under the bar's own weight; `perSide` lists
 *   the plates for one side; `remainderPerSide` is any weight that couldn't be
 *   matched with the available plates; `isExact` is true when the plates hit
 *   the target exactly.
 */
export function computePlates(totalWeight, { barWeight, plateSizes }) {
  const total = parseFloat(totalWeight);
  if (!Number.isFinite(total)) {
    return {
      empty: true,
      belowBar: false,
      barWeight,
      perSide: [],
      remainderPerSide: 0,
      isExact: false,
    };
  }
  if (total < barWeight) {
    return {
      empty: false,
      belowBar: true,
      barWeight,
      perSide: [],
      remainderPerSide: 0,
      isExact: false,
    };
  }

  let remainingHundredths = Math.round(((total - barWeight) / 2) * 100);
  const perSide = [];
  const sortedSizes = [...plateSizes].sort((first, second) => second - first);
  for (const plateSize of sortedSizes) {
    const plateHundredths = Math.round(plateSize * 100);
    if (plateHundredths <= 0) continue;
    let count = 0;
    while (remainingHundredths >= plateHundredths) {
      remainingHundredths -= plateHundredths;
      count += 1;
    }
    if (count > 0) perSide.push({ plateSize, count });
  }

  return {
    empty: false,
    belowBar: false,
    barWeight,
    perSide,
    remainderPerSide: remainingHundredths / 100,
    isExact: remainingHundredths === 0,
  };
}
