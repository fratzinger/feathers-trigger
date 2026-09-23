import type { Application } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import type { Mock } from 'vitest'
import { MemoryService } from '@feathersjs/memory'
import type { HookTriggerOptions } from '../../src/index.js'
import { trigger } from '../../src/index.js'

declare module '@feathersjs/feathers' {
  interface Params {
    $populateParams?: any
  }
}

describe('trigger-count.test.ts', function () {
  describe('one trigger hook', function () {
    let app: Application
    let service: any
    /** shared by every subscription - counts all action calls */
    let action: Mock
    let find: Mock
    let get: Mock

    function reset() {
      action = vi.fn().mockName('action')
      find = vi.fn().mockName('service.find')
      get = vi.fn().mockName('service.get')
    }

    function mock(options: HookTriggerOptions) {
      app = feathers()
      app.use(
        '/test',
        new MemoryService({
          multi: true,
          id: 'id',
          startId: 1,
        }),
      )
      service = app.service('test')

      const triggerHook = trigger(options)

      service.hooks({
        before: {
          all: [],
          find: [find],
          get: [get],
          create: [triggerHook],
          update: [triggerHook],
          patch: [triggerHook],
          remove: [triggerHook],
        },
        after: {
          all: [],
          find: [],
          get: [],
          create: [triggerHook],
          update: [triggerHook],
          patch: [triggerHook],
          remove: [triggerHook],
        },
      })
    }

    beforeEach(function () {
      reset()
    })

    it("methods without sub.params doesn't use find/get", async function () {
      mock({
        action,
      })
      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(2)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(4)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(5)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(7)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)
    })

    it.skip("methods with unchanged sub.params doesn't use find/get", async function () {
      mock({
        manipulateParams: (params) => params,
        action,
      })
      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(2)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(4)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(5)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(7)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)
    })

    it('methods with sub.params uses find/get', async function () {
      mock({
        manipulateParams: (params) => {
          params.$populateParams = { name: 'all' }
          return params
        },
        action,
      })
      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(2)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(1)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(2)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(4)
      expect(find).toHaveBeenCalledTimes(2)
      expect(get).toHaveBeenCalledTimes(2)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(5)
      expect(find).toHaveBeenCalledTimes(2)
      expect(get).toHaveBeenCalledTimes(2)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(2)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(7)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(2)
    })

    it('methods with fetchBefore:true uses find/get', async function () {
      mock({
        fetchBefore: true,
        action,
      })
      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(2)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(1)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(0)
      expect(get).toHaveBeenCalledTimes(2)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(4)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(2)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(5)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(3)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(3)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(7)
      expect(find).toHaveBeenCalledTimes(2)
      expect(get).toHaveBeenCalledTimes(3)
    })

    it('methods with fetchBefore:true and params uses find/get twice', async function () {
      mock({
        fetchBefore: true,
        manipulateParams: (params) => {
          params.$populateParams = { name: 'all' }
          return params
        },
        action,
      })
      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(1)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(2)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(2)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(4)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(4)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(4)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(5)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(5)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(4)
      expect(get).toHaveBeenCalledTimes(5)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(7)
      expect(find).toHaveBeenCalledTimes(5)
      expect(get).toHaveBeenCalledTimes(5)
    })

    it('subs with same params reuse find/get', async function () {
      mock([
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
      ])

      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(3)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(2)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(9)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(4)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(12)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(4)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(15)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(5)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(18)
      expect(find).toHaveBeenCalledTimes(4)
      expect(get).toHaveBeenCalledTimes(5)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(21)
      expect(find).toHaveBeenCalledTimes(5)
      expect(get).toHaveBeenCalledTimes(5)
    })
  })

  describe('two trigger hooks', function () {
    let app: Application
    let service: any
    /** shared by every subscription - counts all action calls */
    let action: Mock
    let find: Mock
    let get: Mock

    function reset() {
      action = vi.fn().mockName('action')
      find = vi.fn().mockName('service.find')
      get = vi.fn().mockName('service.get')
    }

    function mock(options: HookTriggerOptions) {
      app = feathers()
      app.use(
        '/test',
        new MemoryService({
          multi: true,
          id: 'id',
          startId: 1,
        }),
      )
      service = app.service('test')

      const triggerHook1 = trigger(options)

      const triggerHook2 = trigger(options)

      service.hooks({
        before: {
          all: [],
          find: [find],
          get: [get],
          create: [triggerHook1, triggerHook2],
          update: [triggerHook1, triggerHook2],
          patch: [triggerHook1, triggerHook2],
          remove: [triggerHook1, triggerHook2],
        },
        after: {
          all: [],
          find: [],
          get: [],
          create: [triggerHook1, triggerHook2],
          update: [triggerHook1, triggerHook2],
          patch: [triggerHook1, triggerHook2],
          remove: [triggerHook1, triggerHook2],
        },
      })
    }

    beforeEach(function () {
      reset()
    })

    it('subs with same params reuse find/get', async function () {
      mock([
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
        {
          fetchBefore: true,
          manipulateParams: (params) => {
            params.$populateParams = { name: 'all' }
            return params
          },
          action,
        },
      ])

      const item = await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(6)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(0)

      await service.update(item.id, { id: item.id, test: false })
      expect(action).toHaveBeenCalledTimes(12)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(2)

      await service.patch(item.id, { test: true })
      expect(action).toHaveBeenCalledTimes(18)
      expect(find).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledTimes(4)

      await service.patch(null, { test: true })
      expect(action).toHaveBeenCalledTimes(24)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(4)

      await service.remove(item.id)
      expect(action).toHaveBeenCalledTimes(30)
      expect(find).toHaveBeenCalledTimes(3)
      expect(get).toHaveBeenCalledTimes(5)

      await service.create({ test: true })
      expect(action).toHaveBeenCalledTimes(36)
      expect(find).toHaveBeenCalledTimes(4)
      expect(get).toHaveBeenCalledTimes(5)

      await service.remove(null)
      expect(action).toHaveBeenCalledTimes(42)
      expect(find).toHaveBeenCalledTimes(5)
      expect(get).toHaveBeenCalledTimes(5)
    })
  })
})
