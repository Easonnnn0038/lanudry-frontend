import test from 'node:test'
import assert from 'node:assert/strict'
import { compareVersions } from '../src/utils/version.mjs'

test('compares desktop versions numerically', () => {
  assert.equal(compareVersions('1.0.10', '1.0.2'), 1)
  assert.equal(compareVersions('1.0.2', '1.0.2'), 0)
  assert.equal(compareVersions('1.0', '1.0.1'), -1)
})
