import type { Change, HookChangesByIdOptions } from '../../src/index.js'
import { changesById } from '../../src/index.js'
import { MemoryService } from '@feathersjs/memory'
import type { HookContext, Id } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import type { MethodName } from '../../src/types.internal.js'

type Callback = (byId: Record<Id, Change>, context: HookContext) => void

function mock(
  cb: Callback,
  hookName: MethodName,
  options?: Partial<HookChangesByIdOptions>,
) {
  const app = feathers()
  app.use('/test', new MemoryService())
  const service = app.service('test')
  const hook = changesById(cb, options)

  service.hooks({
    around: {
      [hookName]: [hook],
    },
  })

  return {
    app,
    service,
  }
}

describe('hook - changesById', function () {
  describe('general', function () {
    it.skip('can transform params', function () {})
  })

  describe('create', function () {
    it('basic create', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'before is undefined').toBe(undefined)
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
      }

      const { service } = mock(cb, 'create')
      expect(!calledCb, 'not called cb').toBeTruthy()

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(calledCb, 'called cb').toBeTruthy()
      expect(item, 'has right result').toStrictEqual({
        id: 0,
        test: true,
        comment: 'awesome',
      })
    })

    it('basic create with refetch', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'before is undefined').toBe(undefined)
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
      }

      const { service } = mock(cb, 'create')
      expect(!calledCb, 'not called cb').toBeTruthy()

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(calledCb, 'called cb').toBeTruthy()
      expect(item, 'has right result').toStrictEqual({
        id: 0,
        test: true,
        comment: 'awesome',
      })
    })
  })

  describe('update', function () {
    it('basic update', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'has right before').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: false,
        })
      }

      const { service } = mock(cb, 'update', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(!calledCb, 'not called cb').toBeTruthy()

      const result = await service.update(item.id, { test: false })

      expect(calledCb, 'called cb').toBeTruthy()
      expect(result, 'has right result').toStrictEqual({ id: 0, test: false })
    })

    it('basic update with $select', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'has right before').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: false,
        })
      }
      const { service } = mock(cb, 'update', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(!calledCb, 'not called cb').toBeTruthy()

      const result = await service.update(
        item.id,
        { test: false },
        { query: { $select: ['id'] } },
      )

      expect(calledCb, 'called cb').toBeTruthy()
      expect(result, 'has right result').toStrictEqual({ id: 0 })
    })
  })

  describe('patch', function () {
    it('basic patch', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'has right before').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: false,
          comment: 'awesome',
        })
      }
      const { service } = mock(cb, 'patch', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(!calledCb, 'not called cb').toBeTruthy()

      const result = await service.patch(item.id, { test: false })

      expect(calledCb, 'called cb').toBeTruthy()
      expect(result, 'has right result').toStrictEqual({
        id: 0,
        test: false,
        comment: 'awesome',
      })
    })

    it('basic patch with $select', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'has right before').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: false,
          comment: 'awesome',
        })
      }
      const { service } = mock(cb, 'patch', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(!calledCb, 'not called cb').toBeTruthy()

      const result = await service.patch(
        item.id,
        { test: false },
        { query: { $select: ['id'] } },
      )

      expect(calledCb, 'called cb').toBeTruthy()
      expect(result, 'has right result').toStrictEqual({ id: 0 })
    })
  })

  describe('remove', function () {
    it('basic remove', async function () {
      let calledCb = false
      const cb: Callback = (byId, context) => {
        calledCb = true
        expect(context.path, 'cb has context').toBe('test')
        expect(byId['0'].before, 'has right before').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
        expect(byId['0'].item, 'has right item').toStrictEqual({
          id: 0,
          test: true,
          comment: 'awesome',
        })
      }

      const { service } = mock(cb, 'remove', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      expect(!calledCb, 'not called cb').toBeTruthy()

      await service.remove(item.id)

      expect(calledCb, 'called cb').toBeTruthy()
    })
  })
})
