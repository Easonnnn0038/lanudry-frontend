import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

test('switching accounts removes the old session and shared handoff data', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  }
  setActivePinia(createPinia())
  const { useAuthStore } = await import('../src/stores/auth.js')
  const auth = useAuthStore()

  auth.setAuth({ token: 'first-token', role: 'ADMIN', username: 'first', realName: '第一位店员' })
  values.set('laundry_rewash_pending_v1', 'first-customer')
  values.set('laundry_pickup_pending_v1', 'first-customer')
  auth.clearAuth()

  assert.equal(auth.isLoggedIn, false)
  assert.equal(auth.username, '')
  assert.equal(values.has('token'), false)
  assert.equal(values.has('laundry_rewash_pending_v1'), false)
  assert.equal(values.has('laundry_pickup_pending_v1'), false)

  auth.setAuth({ token: 'second-token', role: 'EMPLOYEE', username: 'second' })
  assert.equal(auth.username, 'second')
  assert.equal(auth.role, 'EMPLOYEE')
  assert.equal(values.get('token'), 'second-token')
})
