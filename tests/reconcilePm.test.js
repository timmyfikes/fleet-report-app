import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePm } from '../src/fleetReport/reconcilePm.js';

const base = () => ({
  pumpUnits: ['P1', 'P2'], tractors: ['RT-13'],
  dayTrucks: ['C-416'], nightTrucks: ['C-464'], commandCenters: [{ unit: 'CT-007' }],
  pm: {
    pumps: [{ pump: 'P1', hours: '111' }, { pump: 'P2', hours: '222' }],
    tractors: [{ tractor: 'RT-13', hours: '333' }],
    trucks: [{ truck: 'C-416', miles: '100' }, { truck: 'C-464', miles: '200' }],
    generators: [{ unit: 'RT-13', hours: '400' }, { unit: 'CT-007', hours: '500' }],
  },
});

test('removing the first pump keeps the second pump readings', () => {
  const result = reconcilePm({ ...base(), pumpUnits: ['P2'] });
  assert.equal(result.pm.pumps[0].pump, 'P2');
  assert.equal(result.pm.pumps[0].hours, '222');
});
test('replacement equipment does not inherit readings', () => {
  const result = reconcilePm({ ...base(), pumpUnits: ['NEW'], tractors: ['RT-05'], dayTrucks: ['C-999'] });
  assert.equal(result.pm.pumps[0].hours, '');
  assert.equal(result.pm.tractors[0].hours, '');
  assert.equal(result.pm.trucks[0].miles, '');
});
test('extra trucks have independent PM rows without changing primary trucks', () => {
  const result = reconcilePm({ ...base(), dayTrucks: ['C-416', 'C-496'], nightTrucks: ['C-464', 'C-706'] });
  assert.deepEqual(result.pm.trucks.map(x => x.truck), ['C-416', 'C-464', 'C-496', 'C-706']);
  assert.equal(result.pm.trucks[0].miles, '100');
  assert.equal(result.pm.trucks[1].miles, '200');
  const removed = reconcilePm({ ...result, dayTrucks: ['C-496'] });
  assert.equal(removed.pm.trucks[0].truck, 'C-496');
  assert.equal(removed.pm.trucks[0].miles, '');
});
test('generator readings follow unit when another generator is removed', () => {
  const result = reconcilePm({ ...base(), tractors: [] });
  assert.deepEqual(result.pm.generators.map(x => [x.unit, x.hours]), [['CT-007', '500']]);
});
test('legacy missing PM rows are initialized and mismatched labels reconciled', () => {
  const form = base();
  form.pm.pumps.reverse();
  assert.equal(reconcilePm(form).pm.pumps[0].hours, '111');
  const result = reconcilePm({ ...form, pm: {} });
  assert.equal(result.pm.pumps[0].pump, 'P1');
  assert.equal(result.pm.trucks[0].truck, 'C-416');
  assert.equal(result.pm.tractors[0].hoursDueAt, '');
});
test('normalization is stable and does not mutate source readings', () => {
  const form = base();
  const before = structuredClone(form);
  const result = reconcilePm(form);
  assert.deepEqual(form, before);
  assert.deepEqual(reconcilePm(result), result);
});
