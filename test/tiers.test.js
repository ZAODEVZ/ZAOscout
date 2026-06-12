import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierFor } from '../api/tiers.js';

test('anon by default', () => assert.equal(tierFor({}).name, 'anon'));
test('fc_basic at 50 followers', () => assert.equal(tierFor({ fcFollowers: 50 }).name, 'fc_basic'));
test('fc_pro at 1000 followers', () => assert.equal(tierFor({ fcFollowers: 1000 }).name, 'fc_pro'));
test('fc_pro at high neynar score', () => assert.equal(tierFor({ fcScore: 0.95 }).name, 'fc_pro'));
test('respect outranks followers', () => assert.equal(tierFor({ fcFollowers: 999999, respect: 1 }).name, 'respect'));
test('tiers gate synthesis', () => {
  assert.equal(tierFor({}).synthesis, false);
  assert.equal(tierFor({ respect: 5 }).synthesis, true);
});
