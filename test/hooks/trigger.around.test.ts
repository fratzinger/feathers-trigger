import type { Subscription, Action } from '../../src/index.js'
import type { MethodName } from '../../src/types.internal.js'
import { mock } from './base-mock-around.js'

import { addDays } from './utils.js'

describe('hook - trigger', function () {
  describe('general', function () {
    it('throws without options', function () {
      expect(
        //@ts-expect-error should define options
        () => mock('create'),
        'passes',
      ).toThrow()
    })

    it('does not throw for minimal example', function () {
      expect(
        () =>
          mock('create', {
            action: () => {},
          }),
        'passes',
      ).not.toThrow()
    })

    it('throws on find and get', async function () {
      // @ts-expect-error find is not allowed;
      const { service: service1 } = mock('find', {
        method: 'create',
        service: 'tests',

        action: () => {},
      })

      await expect(
        service1.find({ query: {} }),
        'find rejects',
      ).rejects.toThrow()

      // @ts-expect-error find is not allowed;
      const { service: service2 } = mock('get', {
        method: 'create',
        service: 'tests',

        action: () => {},
      })

      await expect(service2.get(0), 'get rejects').rejects.toThrow()
    })

    it('triggers with no method', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(0, { id: 0, test: false })
      expect(cbCount, 'action cb was called').toBe(2)

      await service.patch(0, { test: true })
      expect(cbCount, 'action cb was called').toBe(3)

      await service.remove(0)
      expect(cbCount, 'action cb was called').toBe(4)
    })

    it('triggers with no service', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        method: methods,
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(0, { id: 0, test: false })
      expect(cbCount, 'action cb was called').toBe(2)

      await service.patch(0, { test: true })
      expect(cbCount, 'action cb was called').toBe(3)

      await service.remove(0)
      expect(cbCount, 'action cb was called').toBe(4)
    })

    it('triggers with no method and no service', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(0, { id: 0, test: false })
      expect(cbCount, 'action cb was called').toBe(2)

      await service.patch(0, { test: true })
      expect(cbCount, 'action cb was called').toBe(3)

      await service.remove(0)
      expect(cbCount, 'action cb was called').toBe(4)
    })

    it('triggers with method as array', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        method: methods,
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(0, { id: 0, test: false })
      expect(cbCount, 'action cb was called').toBe(2)

      await service.patch(0, { test: true })
      expect(cbCount, 'action cb was called').toBe(3)

      await service.remove(0)
      expect(cbCount, 'action cb was called').toBe(4)
    })

    it('triggers with service as array', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        method: methods,
        service: ['tests', 'tests2', 'tests3'],
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(0, { id: 0, test: false })
      expect(cbCount, 'action cb was called').toBe(2)

      await service.patch(0, { test: true })
      expect(cbCount, 'action cb was called').toBe(3)

      await service.remove(0)
      expect(cbCount, 'action cb was called').toBe(4)
    })

    it('can skip named sub', async function () {
      let cbCount = 0
      const methods: MethodName[] = ['create', 'update', 'patch', 'remove']
      const { service } = mock(methods, {
        name: 'skipMe',
        method: methods,
        action: () => {
          cbCount++
        },
      })

      // @ts-expect-error params not typed
      await service.create({ id: 0, test: true }, { skipTrigger: ['skipMe'] })
      expect(cbCount, 'action not called').toBe(0)

      // @ts-expect-error params not typed
      await service.update(0, { id: 0, test: false }, { skipTrigger: 'skipMe' })
      expect(cbCount, 'action not called').toBe(0)

      // @ts-expect-error params not typed
      await service.patch(0, { test: true }, { skipTrigger: ['skipMe'] })
      expect(cbCount, 'action cb was called').toBe(0)

      // @ts-expect-error params not typed
      await service.remove(0, { skipTrigger: ['skipMe'] })
      expect(cbCount, 'action cb was called').toBe(0)
    })

    it('can skip named sub on multi create without skipping the others', async function () {
      let skippedCount = 0
      let otherCount = 0
      const { service } = mock('create', [
        {
          name: 'skipMe',
          action: () => {
            skippedCount++
          },
        },
        {
          name: 'other',
          action: () => {
            otherCount++
          },
        },
      ])

      await service.create(
        [
          { id: 0, test: true },
          { id: 1, test: true },
        ],
        // @ts-expect-error params not typed
        { skipTrigger: 'skipMe' },
      )
      expect(skippedCount, 'skipped action not called').toBe(0)
      expect(otherCount, 'other action called for every item').toBe(2)
    })
  })

  describe('create', function () {
    it('create: triggers on single create without condition', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'tests',
        action: (item) => {
          cbCount++
          expect(item).toStrictEqual({
            before: undefined,
            item: { id: 0, test: true },
          })
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('create: triggers on single create with subscriptions function without condition', async function () {
      let cbCount = 0
      const { service } = mock('create', () => ({
        method: 'create',
        service: 'tests',
        action: (item) => {
          cbCount++
          expect(item).toStrictEqual({
            before: undefined,
            item: { id: 0, test: true },
          })
        },
      }))

      await service.create({ id: 0, test: true })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('create: triggers on multi create without condition', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      await service.create([
        { id: 0, test: true },
        { id: 1, test: true },
        { id: 2, test: true },
      ])
      expect(cbCount, 'action cb was called three times').toBe(3)
    })

    it('create: tests params on multi create', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        params: { foo: true },
        action: () => {
          cbCount++
        },
      })

      await service.create([
        { id: 0, test: true },
        { id: 1, test: true },
      ])
      expect(cbCount, 'action not called').toBe(0)

      await service.create(
        [
          { id: 2, test: true },
          { id: 3, test: true },
        ],
        // @ts-expect-error params not typed
        { foo: true },
      )
      expect(cbCount, 'action called for every item').toBe(2)
    })

    it('create: tests data', async function () {
      const created: unknown[] = []
      const { service } = mock('create', {
        data: { test: true },
        action: ({ item }) => {
          created.push(item)
        },
      })

      await service.create({ id: 0, test: false })
      expect(created, 'action not called').toStrictEqual([])

      await service.create({ id: 1, test: true })
      expect(created, 'action called for matching item').toStrictEqual([
        { id: 1, test: true },
      ])
    })

    it('create: tests data per item on multi create', async function () {
      const created: unknown[] = []
      const { service } = mock('create', {
        data: { test: true },
        action: ({ item }) => {
          created.push(item)
        },
      })

      await service.create([
        { id: 0, test: false },
        { id: 1, test: false },
      ])
      expect(created, 'action not called').toStrictEqual([])

      await service.create([
        { id: 2, test: false },
        { id: 3, test: true },
        { id: 4, test: false },
      ])
      expect(created, 'action only called for matching item').toStrictEqual([
        { id: 3, test: true },
      ])
    })

    it('create: tests data per item on multi create without ids in data', async function () {
      const created: unknown[] = []
      const { service } = mock('create', {
        data: (item) => item.test === true,
        action: ({ item }) => {
          created.push(item)
        },
      })

      await service.create([{ test: false }, { test: true }, { test: false }])
      expect(created, 'action only called for matching item').toStrictEqual([
        { id: 1, test: true },
      ])
    })

    it('create: maps data per item by id on multi create, regardless of the order', async function () {
      const created: unknown[] = []
      const { service } = mock('create', {
        data: { test: true },
        action: ({ item }) => {
          created.push(item)
        },
      })

      // runs after the trigger checked `data`, so the result has a different
      // order than `data` had while checking
      service.hooks({
        before: {
          create: [
            (context) => {
              context.data = (context.data as any[]).toReversed()
            },
          ],
        },
      })

      await service.create([
        { id: 0, test: true },
        { id: 1, test: false },
      ])
      expect(created, 'action only called for matching item').toStrictEqual([
        { id: 0, test: true },
      ])
    })

    it('create: logs the id of an item skipped because of data on multi create', async function () {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      try {
        const { service } = mock('create', {
          debug: true,
          data: { test: true },
          action: () => {},
        })

        await service.create([
          { id: 0, test: false },
          { id: 1, test: true },
        ])

        expect(log).toHaveBeenCalledWith(
          '[FEATHERS_TRIGGER DEBUG]',
          expect.any(String),
          "service('tests').create()",
          'skipping because of data mismatch',
          0,
        )
      } finally {
        log.mockRestore()
      }
    })

    it('create: does not trigger with service mismatch', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'supertests',
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('create: does not trigger with method mismatch', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'update',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('create: triggers on single create with condition', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'tests',
        result: { id: 1 },
        action: (item) => {
          cbCount++
          expect(item).toStrictEqual({
            before: undefined,
            item: { id: 1, test: true },
          })
        },
      })

      await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.create({ id: 1, test: true })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('create: triggers on single create with custom view', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'tests',
        result: ({ item }) => {
          return item.count > 10
        },
        action: (item) => {
          cbCount++
          expect(item).toStrictEqual({
            before: undefined,
            item: { id: 1, test: true, count: 12 },
          })
        },
      })

      await service.create({ id: 0, test: true, count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.create({ id: 1, test: true, count: 12 })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('create: triggers on single create with custom view as condition', async function () {
      let cbCount = 0
      const { service } = mock('create', {
        method: 'create',
        service: 'tests',
        result: ({ item }) => ({
          count: { $gt: 10 },
        }),
        action: (item) => {
          cbCount++
          expect(item).toStrictEqual({
            before: undefined,
            item: { id: 1, test: true, count: 12 },
          })
        },
      })

      await service.create({ id: 0, test: true, count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.create({ id: 1, test: true, count: 12 })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('create: triggers on single create with custom param', async function () {
      let cbCount = 0
      const action: Action = (item, { subscription: sub }) => {
        cbCount++
        if (sub.name === 'sub1') {
          expect(item, 'correct item for sub1').toStrictEqual({
            before: undefined,
            item: { id: 1 },
          })
        } else if (sub.name === 'sub2') {
          expect(item, 'correct item for sub2').toStrictEqual({
            before: undefined,
            item: { id: 1, test: true },
          })
        } else if (sub.name === 'sub3') {
          expect(item, 'correct item for sub3').toStrictEqual({
            before: undefined,
            item: { id: 1, test: true, comment: 'yippieh' },
          })
        } else {
          expect.fail('should not get here')
        }
      }

      const sub1: Subscription = {
        name: 'sub1',
        method: 'create',
        service: 'tests',
        manipulateParams: (params) => {
          params.query ||= {}
          params.query.$select = ['id']
          return params
        },
        action,
      }
      const sub2: Subscription = {
        name: 'sub2',
        method: 'create',
        service: 'tests',
        manipulateParams: (params) => {
          params.query ||= {}
          params.query.$select = ['id', 'test']
          return params
        },
        action,
      }
      const sub3: Subscription = {
        name: 'sub3',
        method: 'create',
        service: 'tests',
        action,
      }
      const { service } = mock('create', [sub1, sub2, sub3])

      const result = await service.create({
        id: 1,
        test: true,
        comment: 'yippieh',
      })
      expect(cbCount).toBe(3)
      expect(result, 'has full object').toStrictEqual({
        id: 1,
        test: true,
        comment: 'yippieh',
      })
    })

    it('create: $select in params has full item in trigger', async function () {
      let cbCount = 0
      const action: Action = (item, { subscription: sub }) => {
        cbCount++
        if (sub.name === 'sub1') {
          expect(item, 'correct item for sub1').toStrictEqual({
            before: undefined,
            item: { id: 1 },
          })
        } else if (sub.name === 'sub2') {
          expect(item, 'correct item for sub2').toStrictEqual({
            before: undefined,
            item: { id: 1, test: true },
          })
        } else if (sub.name === 'sub3') {
          expect(item, 'correct item for sub3').toStrictEqual({
            before: undefined,
            item: { id: 1, test: true, comment: 'yippieh' },
          })
        } else {
          expect.fail('should not get here')
        }
      }

      const sub1: Subscription = {
        name: 'sub1',
        method: 'create',
        service: 'tests',
        manipulateParams: (params) => {
          params.query ||= {}
          params.query.$select = ['id']
          return params
        },
        action,
      }
      const sub2: Subscription = {
        name: 'sub2',
        method: 'create',
        service: 'tests',
        manipulateParams: (params) => {
          params.query ||= {}
          params.query.$select = ['id', 'test']
          return params
        },
        action,
      }
      const sub3: Subscription = {
        name: 'sub3',
        method: 'create',
        service: 'tests',
        action,
      }
      const { service } = mock('create', [sub1, sub2, sub3])

      const result = await service.create(
        { id: 1, test: true, comment: 'yippieh' },
        { query: { $select: ['id', 'comment'] } },
      )
      expect(cbCount).toBe(3)
      expect(result, 'has subset').toStrictEqual({ id: 1, comment: 'yippieh' })
    })
  })

  describe('update', function () {
    it('update: triggers on single update without condition', async function () {
      let cbCount = 0
      const { service } = mock('update', {
        method: 'update',
        service: 'tests',
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++
          expect(before).toStrictEqual({ id: 0, test: true })
          expect(item).toStrictEqual({ id: 0, test: false })
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.update(item.id, { ...item, test: false })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('update: does not trigger with service mismatch', async function () {
      let cbCount = 0
      const { service } = mock('update', {
        method: 'update',
        service: 'supertests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.update(item.id, { ...item, test: false })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('update: does not trigger with method mismatch', async function () {
      let cbCount = 0
      const { service } = mock('update', {
        method: 'patch',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.update(item.id, { ...item, test: false })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('update: triggers with custom view', async function () {
      let cbCount = 0
      const { service } = mock('update', {
        method: 'update',
        service: 'tests',
        result: ({ item }) => item.count > 10,
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true, count: 2 })

      await service.update(item.id, { id: 0, test: true, count: 12 })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(item.id, { id: 0, test: true, count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.update(item.id, { id: 0, test: true, count: 13 })
      expect(cbCount, 'action cb was called').toBe(2)
    })

    it('update: calls before with before', async function () {
      let cbCount = 0
      const { service } = mock('update', {
        before: { count: 2 },
        result: { count: 3 },
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true, count: 2 })

      await service.update(item.id, { id: 0, test: true, count: 3 })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.update(item.id, { id: 0, test: true, count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.update(item.id, { id: 0, test: true, count: 3 })
      expect(cbCount, "action cb wasn't called").toBe(1)
    })
  })

  describe('patch', function () {
    it('patch: triggers on single patch without condition', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'tests',
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++
          expect(before).toStrictEqual({ id: 0, test: true })
          expect(item).toStrictEqual({ id: 0, test: false })
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.patch(item.id, { test: false })
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('patch: does not trigger with service mismatch', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'supertests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.patch(item.id, { test: false })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('patch: does not trigger with method mismatch', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'update',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.patch(item.id, { test: false })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('patch: does not trigger with empty result', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      await service.create({ id: 0, test: true })
      await service.create({ id: 0, test: true })
      await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.patch(null, { test: true }, { query: { test: false } })
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('patch: triggers if date is before new date', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'tests',
        result: ({ before }) => ({
          date: { $lt: before.date },
        }),
        fetchBefore: true,
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({
        id: 0,
        test: true,
        date: new Date(),
      })

      await service.patch(item.id, { date: addDays(new Date(), -2) })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.patch(item.id, { date: addDays(new Date(), 5) })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.patch(item.id, { date: addDays(new Date(), -1) })
      expect(cbCount, 'action cb was called').toBe(2)
    })

    it('patch: triggers if date is before new date as function', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'tests',
        result: ({ before, item }) => {
          return new Date(item.date) < new Date(before.date)
        },
        fetchBefore: true,
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({
        id: 0,
        test: true,
        date: new Date(),
      })

      await service.patch(item.id, { date: addDays(new Date(), -2) })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.patch(item.id, { date: addDays(new Date(), 5) })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.patch(item.id, { date: addDays(new Date(), -1) })
      expect(cbCount, 'action cb was called').toBe(2)
    })

    it('patch: multiple triggers on multiple items', async function () {
      const beforeDate = new Date()

      const items = [
        { id: 0, test: true, date: addDays(beforeDate, 0) },
        { id: 1, test: false, date: addDays(beforeDate, 1) },
        { id: 2, test: true, date: addDays(beforeDate, 2) },
      ]

      const calledTrigger1ById: Record<string, boolean> = {}
      const calledTrigger2ById: Record<string, boolean> = {}

      const action: Action = ({ before, item }, { subscription: sub }) => {
        if (sub.name === 'sub1') {
          calledTrigger1ById[item.id] = true
        } else if (sub.name === 'sub2') {
          calledTrigger2ById[item.id] = true
        }
      }

      const { service } = mock('patch', [
        {
          name: 'sub1',
          result: ({ before }) => ({ date: { $lt: before.date } }),
          fetchBefore: true,
          action,
        },
        {
          name: 'sub2',
          result: { test: true },
          action,
        },
      ])

      await service.create(items)

      await service.patch(null, { date: addDays(new Date(), -2) })
      expect(calledTrigger1ById, 'called trigger1 for all items').toStrictEqual(
        { 0: true, 1: true, 2: true },
      )
      expect(calledTrigger2ById, 'called trigger2 for two items').toStrictEqual(
        { 0: true, 2: true },
      )
    })

    it('patch: triggers on multi create with all conditions', async function () {
      let cbCount = 0
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
        action: (change, option) => {
          cbCount++
        },
      })

      await service.create([
        { id: 0, test: true },
        { id: 1, test: true },
        { id: 2, test: true },
      ])
      expect(cbCount, 'action cb was not called').toBe(0)

      await service.patch(null, {
        test: false,
      })

      expect(cbCount, 'action cb was called three times').toBe(3)

      await service.patch(null, {
        test: false,
      })

      expect(cbCount, 'action cb was still called three times').toBe(3)
    })

    it('patch: triggers with custom view', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        method: 'patch',
        service: 'tests',
        result: ({ item }) => item.count > 10,
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true, count: 2 })

      await service.patch(item.id, { count: 12 })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.patch(item.id, { count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.patch(item.id, { count: 13 })
      expect(cbCount, 'action cb was called').toBe(2)
    })

    it('patch: calls before with before', async function () {
      let cbCount = 0
      const { service } = mock('patch', {
        before: { count: 2 },
        result: { count: 3 },
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true, count: 2 })

      await service.patch(item.id, { count: 3 })
      expect(cbCount, 'action cb was called').toBe(1)

      await service.patch(item.id, { count: 9 })
      expect(cbCount, "action cb wasn't called").toBe(1)

      await service.patch(item.id, { count: 3 })
      expect(cbCount, "action cb wasn't called").toBe(1)
    })

    it("patch: treats a 'before' condition like fetchBefore", async function () {
      // the same subscription, once with `fetchBefore` and once with a
      // `before` condition, which needs the items before as well
      for (const sub of [{ fetchBefore: true }, { before: { test: true } }]) {
        const { service } = mock('patch', { ...sub, action: () => {} })

        // runs after the trigger fetched the items before, so the patch
        // hits an item that is missing in 'before'
        service.hooks({
          before: {
            patch: [
              async (context) => {
                await context.service.create({ id: 99, test: true })
              },
            ],
          },
        })

        await service.create({ id: 0, test: true })

        await expect(
          service.patch(null, { test: false }),
          JSON.stringify(sub),
        ).rejects.toThrow('Mismatch!')
      }
    })

    it('patch: passes before to sub with fetchBefore next to sub without', async function () {
      const befores: Record<string, unknown> = {}
      const { service } = mock('patch', [
        {
          name: 'withoutFetchBefore',
          action: ({ before }) => {
            befores.withoutFetchBefore = before
          },
        },
        {
          name: 'withFetchBefore',
          fetchBefore: true,
          action: ({ before }) => {
            befores.withFetchBefore = before
          },
        },
      ])

      const item = await service.create({ id: 0, test: true })
      await service.patch(item.id, { test: false })

      expect(befores).toStrictEqual({
        withoutFetchBefore: undefined,
        withFetchBefore: { id: 0, test: true },
      })
    })
  })

  describe('remove', function () {
    it('remove: triggers on single remove without condition', async function () {
      let cbCount = 0
      const { service } = mock('remove', {
        method: 'remove',
        service: 'tests',
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++
          expect(before).toStrictEqual({ id: 0, test: true })
          expect(item).toStrictEqual({ id: 0, test: true })
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.remove(item.id)
      expect(cbCount, 'action cb was called').toBe(1)
    })

    it('remove: does not trigger with service mismatch', async function () {
      let cbCount = 0
      const { service } = mock('remove', {
        method: 'remove',
        service: 'supertests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.remove(item.id)
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('remove: does not trigger with method mismatch', async function () {
      let cbCount = 0
      const { service } = mock('remove', {
        method: 'update',
        service: 'tests',
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.remove(item.id)
      expect(cbCount, "action cb wasn't called").toBe(0)
    })

    it('remove: triggers with custom view', async function () {
      let cbCount = 0
      const { service } = mock('remove', {
        method: 'remove',
        service: 'tests',
        result: () => ({ count: { $gt: 10 } }),
        action: () => {
          cbCount++
        },
      })

      const item = await service.create({ id: 0, test: true, count: 12 })
      expect(cbCount, "action cb wasn't called").toBe(0)

      await service.remove(item.id)
      expect(cbCount, 'action cb was called').toBe(1)
    })
  })
})
