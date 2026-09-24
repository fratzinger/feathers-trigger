import { expectTypeOf } from 'vitest'
import type { Change } from '../changes-by-id/index.js'
import type { ActionOptions } from './types.js'
import { trigger } from './trigger.js'
import type { HookContext, Service } from '@feathersjs/feathers'

describe('hook - trigger type test', function () {
  type TestType = { hello: 'world' }
  type FakeHookContext = HookContext<any, Service<TestType>>

  describe('single trigger', () => {
    test('trigger should inherit Service Type batchMode=false', () => {
      trigger<FakeHookContext>({
        action: (change, options) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
          expectTypeOf(options).toEqualTypeOf<
            ActionOptions<FakeHookContext, TestType>
          >()
        },
      })
    })

    test('trigger should inherit Service Type batchMode=true', () => {
      trigger<FakeHookContext>({
        batchAction: ([[change]], context) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
          expectTypeOf(context).toEqualTypeOf<FakeHookContext>()
        },
      })
    })

    test('trigger should inherit Service Type batchMode missing', () => {
      trigger<FakeHookContext>({
        action: (change, options) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
          expectTypeOf(options).toEqualTypeOf<
            ActionOptions<FakeHookContext, TestType>
          >()
        },
      })
    })
  })

  describe('trigger array', () => {
    test('trigger should inherit Service Type batchMode=false as array', () => {
      trigger<FakeHookContext>([
        {
          action: (change, options) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
            expectTypeOf(options).toEqualTypeOf<
              ActionOptions<FakeHookContext, TestType>
            >()
          },
        },
      ])
    })

    test('trigger should inherit Service Type batchMode=true as array', () => {
      trigger<FakeHookContext>([
        {
          batchAction: ([[change]], context) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
            expectTypeOf(context).toEqualTypeOf<FakeHookContext>()
          },
        },
      ])
    })

    test('trigger should inherit Service Type batchMode missing as array', () => {
      trigger<FakeHookContext>([
        {
          action: (change, options) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>()
            expectTypeOf(options).toEqualTypeOf<
              ActionOptions<FakeHookContext, TestType>
            >()
          },
        },
      ])
    })
  })

  describe('conditions', () => {
    test('conditions can be a boolean', () => {
      trigger<FakeHookContext>({
        data: true,
        params: false,
        before: true,
        result: false,
        action: () => {},
      })
    })
  })

  describe('options resolved from the context', () => {
    test('isBlocking, fetchBefore and debug can be functions of the context', () => {
      trigger<FakeHookContext>({
        isBlocking: (context) => {
          expectTypeOf(context).toEqualTypeOf<FakeHookContext>()
          return true
        },
        fetchBefore: async () => false,
        debug: true,
        action: (change, { subscription }) => {
          expectTypeOf(subscription.isBlocking).toEqualTypeOf<boolean>()
          expectTypeOf(subscription.fetchBefore).toEqualTypeOf<boolean>()
          expectTypeOf(subscription.debug).toEqualTypeOf<boolean>()
        },
      })
    })
  })
})
