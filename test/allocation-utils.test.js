const test = require('node:test');
const assert = require('node:assert/strict');
const { getAllocationAmountFromPercent, getAllocationPercentOptions } = require('../allocation-utils');

test('converts percentages into pounds for a given balance', () => {
  assert.equal(getAllocationAmountFromPercent(25, 1000), 250);
  assert.equal(getAllocationAmountFromPercent(50, 1000), 500);
  assert.equal(getAllocationAmountFromPercent(0, 1000), 0);
});

test('exposes the allowed percentage options', () => {
  assert.deepEqual(getAllocationPercentOptions(), [0, 25, 50, 75, 100]);
});
