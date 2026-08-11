const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getAllocationAmountFromPercent,
  getAllocationPercentOptions,
  getExactAllocationDistribution
} = require('../allocation-utils');

test('converts percentages into pounds for a given balance', () => {
  assert.equal(getAllocationAmountFromPercent(25, 1000), 250);
  assert.equal(getAllocationAmountFromPercent(50, 1000), 500);
  assert.equal(getAllocationAmountFromPercent(0, 1000), 0);
});

test('exposes the allowed percentage options', () => {
  assert.deepEqual(getAllocationPercentOptions(), [0, 25, 50, 75, 100]);
});

test('builds exact integer allocations that always sum to total', () => {
  const result = getExactAllocationDistribution(1001, {
    cash: 25,
    bonds: 25,
    commodities: 25,
    equities: 25
  });
  assert.equal(result.cash + result.bonds + result.commodities + result.equities, 1001);
});

test('respects zero percentages while keeping total exact', () => {
  const result = getExactAllocationDistribution(999, {
    cash: 0,
    bonds: 50,
    commodities: 50,
    equities: 0
  });
  assert.equal(result.cash, 0);
  assert.equal(result.equities, 0);
  assert.equal(result.cash + result.bonds + result.commodities + result.equities, 999);
});
