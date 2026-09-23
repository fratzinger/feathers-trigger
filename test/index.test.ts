import type { Subscription } from '../src/index.js'
import { trigger, changesById } from '../src/index.js'

describe('index', function () {
  it('exports all members', function () {
    expect(trigger, 'exports trigger hook').toBeTruthy()
    expect(changesById, 'exports changesById hook').toBeTruthy()

    const sub: Subscription = {
      method: 'create',
      service: 'tests',
      action: () => {},
    }
    expect(sub, 'exports types').toBeTruthy()
  })
})
