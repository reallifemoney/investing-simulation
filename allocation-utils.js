(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.getAllocationPercentOptions = api.getAllocationPercentOptions;
  root.getAllocationAmountFromPercent = api.getAllocationAmountFromPercent;
  root.getExactAllocationDistribution = api.getExactAllocationDistribution;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ASSET_ORDER = ['cash', 'bonds', 'commodities', 'equities'];

  function getAllocationPercentOptions() {
    return [0, 25, 50, 75, 100];
  }

  function getAllocationAmountFromPercent(percent, totalBalance) {
    return Math.round((percent / 100) * totalBalance);
  }

  function getExactAllocationDistribution(totalBalance, percentages) {
    const raw = ASSET_ORDER.map(asset => ((percentages[asset] || 0) / 100) * totalBalance);
    const floored = raw.map(v => Math.floor(v));
    let remaining = totalBalance - floored.reduce((sum, v) => sum + v, 0);

    const ranked = raw
      .map((value, idx) => ({ idx, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder || a.idx - b.idx);

    while (remaining > 0) {
      const pick = ranked[(remaining - 1) % ranked.length];
      floored[pick.idx] += 1;
      remaining -= 1;
    }

    return {
      cash: floored[0],
      bonds: floored[1],
      commodities: floored[2],
      equities: floored[3]
    };
  }

  return {
    getAllocationPercentOptions,
    getAllocationAmountFromPercent,
    getExactAllocationDistribution
  };
});
