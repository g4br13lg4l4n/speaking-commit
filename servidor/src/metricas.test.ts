import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularMetricas } from './metricas.ts';

test('cuenta palabras sin muletillas y calcula por minuto', () => {
  const m = calcularMetricas("Um, I have been working, uh, with Angular. I've been working a lot.", 30, 2);
  assert.equal(m.muletillas, 2);
  assert.equal(m.palabras, 11);
  assert.equal(m.palabrasUnicas, 9);
  assert.equal(m.ppm, 22);
  assert.equal(m.erroresMin, 4);
});

test('una grabación vacía no divide entre cero', () => {
  const m = calcularMetricas('', 0, 0);
  assert.deepEqual(m, { palabras: 0, palabrasUnicas: 0, ppm: 0, erroresMin: 0, muletillas: 0 });
});
