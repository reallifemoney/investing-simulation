(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.getAllocationPercentOptions = api.getAllocationPercentOptions;
  root.getAllocationAmountFromPercent = api.getAllocationAmountFromPercent;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getAllocationPercentOptions() {
    return [0, 25, 50, 75, 100];
  }

  function getAllocationAmountFromPercent(percent, totalBalance) {
    return Math.round((percent / 100) * totalBalance);
  }

  return {
    getAllocationPercentOptions,
    getAllocationAmountFromPercent
  };
});
