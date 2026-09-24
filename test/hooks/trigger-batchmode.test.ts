import type { Change } from '../../src/index.js'
import { mock } from './base-mock.js'

describe('trigger batch mode', () => {
  it('create: triggers on multi create without condition in batch mode', async function () {
    const batchAction = vi.fn().mockName('batchAction')
    const { service } = mock('create', {
      method: 'create',
      service: 'tests',
      batchAction,
    })

    await service.create([
      { id: 0, test: true },
      { id: 1, test: true },
      { id: 2, test: true },
    ])
    expect(batchAction).toHaveBeenCalledTimes(1)
    // the batchAction gets all three changes in one call
    expect(batchAction.mock.lastCall?.[0]).toHaveLength(3)
  })

  it('create: passes only items with matching data on multi create in batch mode', async function () {
    const batchAction = vi.fn().mockName('batchAction')
    const { service } = mock('create', {
      data: { test: true },
      batchAction,
    })

    await service.create([
      { id: 0, test: false },
      { id: 1, test: true },
      { id: 2, test: true },
    ])
    expect(batchAction).toHaveBeenCalledTimes(1)
    expect(
      batchAction.mock.lastCall?.[0].map(
        ([change]: [Change]) => change.item.id,
      ),
    ).toStrictEqual([1, 2])
  })

  it('patch: triggers on multi create with conditions in batch mode', async function () {
    const batchAction = vi.fn().mockName('batchAction')
    const { service } = mock(['create', 'patch'], {
      service: 'tests',
      before: {
        test: true,
      },
      data: {
        test: false,
      },
      result: {
        test: false,
      },
      batchAction,
    })

    await service.create([
      { id: 0, test: true },
      { id: 1, test: true },
      { id: 2, test: true },
    ])
    expect(batchAction).not.toHaveBeenCalled()

    await service.patch(null, {
      test: false,
    })

    expect(batchAction).toHaveBeenCalledTimes(1)
    // the batchAction gets all three changes in one call
    expect(batchAction.mock.lastCall?.[0]).toHaveLength(3)

    await service.patch(null, {
      test: false,
    })

    // nothing changed anymore - still only the single call from above
    expect(batchAction).toHaveBeenCalledTimes(1)
    expect(batchAction.mock.lastCall?.[0]).toHaveLength(3)
  })

  it('patch: triggers on multi create with complex conditions in batch mode', async function () {
    const batchAction = vi.fn().mockName('batchAction')
    const { service } = mock(['create', 'patch'], {
      service: 'tests',
      before: {
        submittedAt: {
          $ne: null,
        },
        approvedAt: null,
      },
      data: {
        approvedAt: {
          $ne: null,
        },
      },
      result: {
        approvedAt: {
          $ne: null,
        },
        declinedAt: null,
      },
      batchAction,
    })

    await service.create([
      { id: 0, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 1, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 2, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 12, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 13, submittedAt: null, approvedAt: null, declinedAt: null },
      { id: 14, submittedAt: null, approvedAt: null, declinedAt: null },
    ])

    await service.patch(
      null,
      {
        submittedAt: new Date(),
      },
      {
        query: {
          id: {
            $in: [12, 13, 14],
          },
        },
      },
    )

    expect(batchAction).not.toHaveBeenCalled()

    await service.patch(
      null,
      {
        approvedAt: new Date(),
      },
      {
        query: {
          id: {
            $in: [12, 13, 14],
          },
        },
      },
    )

    expect(batchAction).toHaveBeenCalledTimes(1)
    // the batchAction gets all three changes in one call
    expect(batchAction.mock.lastCall?.[0]).toHaveLength(3)
  })
})
