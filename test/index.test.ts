import assert from 'node:assert'
import type { Subscription } from '../src/index.js'
import { trigger, changesById } from '../src/index.js'

describe('index', function () {
  it('exports all members', function () {
    assert.ok(trigger, 'exports trigger hook')
    assert.ok(changesById, 'exports changesById hook')

    const sub: Subscription = {
      method: 'create',
      service: 'tests',
      action: () => {},
    }
    assert.ok(sub, 'exports types')
  })
})
