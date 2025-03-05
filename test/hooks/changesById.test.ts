import assert from 'node:assert'
import type { HookChangesByIdOptions } from '../../src/index.js'
import { changesById } from '../../src/index.js'
import { MemoryService } from '@feathersjs/memory'
import { feathers } from '@feathersjs/feathers'

function mock(
  cb,
  hookName,
  options?: Partial<HookChangesByIdOptions>,
  beforeHook?,
  afterHook?,
) {
  const app = feathers()
  app.use('/test', new MemoryService())
  const service = app.service('test')
  const hook = changesById(cb, options)

  const beforeAll = [hook]
  if (beforeHook) {
    beforeAll.push(beforeHook)
  }

  const afterAll = [hook]
  if (afterHook) {
    afterAll.push(afterHook)
  }

  service.hooks({
    before: {
      [hookName]: beforeAll,
    },
    after: {
      [hookName]: afterAll,
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
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.strictEqual(byId['0'].before, undefined, 'before is undefined')
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: true, comment: 'awesome' },
          'has right item',
        )
      }

      const { service } = mock(cb, 'create')
      assert.ok(!calledCb, 'not called cb')

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(
        item,
        { id: 0, test: true, comment: 'awesome' },
        'has right result',
      )
    })

    it('basic create with refetch', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.strictEqual(byId['0'].before, undefined, 'before is undefined')
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: true, comment: 'awesome' },
          'has right item',
        )
      }

      const { service } = mock(cb, 'create')
      assert.ok(!calledCb, 'not called cb')

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(
        item,
        { id: 0, test: true, comment: 'awesome' },
        'has right result',
      )
    })
  })

  describe('update', function () {
    it('basic update', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.deepStrictEqual(
          byId['0'].before,
          { id: 0, test: true, comment: 'awesome' },
          'has right before',
        )
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: false },
          'has right item',
        )
      }

      const { service } = mock(cb, 'update', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(!calledCb, 'not called cb')

      const result = await service.update(item.id, { test: false })

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(result, { id: 0, test: false }, 'has right result')
    })

    it('basic update with $select', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.deepStrictEqual(
          byId['0'].before,
          { id: 0, test: true, comment: 'awesome' },
          'has right before',
        )
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: false },
          'has right item',
        )
      }
      const { service } = mock(cb, 'update', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(!calledCb, 'not called cb')

      const result = await service.update(
        item.id,
        { test: false },
        { query: { $select: ['id'] } },
      )

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(result, { id: 0 }, 'has right result')
    })
  })

  describe('patch', function () {
    it('basic patch', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.deepStrictEqual(
          byId['0'].before,
          { id: 0, test: true, comment: 'awesome' },
          'has right before',
        )
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: false, comment: 'awesome' },
          'has right item',
        )
      }
      const { service } = mock(cb, 'patch', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(!calledCb, 'not called cb')

      const result = await service.patch(item.id, { test: false })

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(
        result,
        { id: 0, test: false, comment: 'awesome' },
        'has right result',
      )
    })

    it('basic patch with $select', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.deepStrictEqual(
          byId['0'].before,
          { id: 0, test: true, comment: 'awesome' },
          'has right before',
        )
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: false, comment: 'awesome' },
          'has right item',
        )
      }
      const { service } = mock(cb, 'patch', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(!calledCb, 'not called cb')

      const result = await service.patch(
        item.id,
        { test: false },
        { query: { $select: ['id'] } },
      )

      assert.ok(calledCb, 'called cb')
      assert.deepStrictEqual(result, { id: 0 }, 'has right result')
    })
  })

  describe('remove', function () {
    it('basic remove', async function () {
      let calledCb = false
      const cb = (byId, context) => {
        calledCb = true
        assert.strictEqual(context.path, 'test', 'cb has context')
        assert.deepStrictEqual(
          byId['0'].before,
          { id: 0, test: true, comment: 'awesome' },
          'has right before',
        )
        assert.deepStrictEqual(
          byId['0'].item,
          { id: 0, test: true, comment: 'awesome' },
          'has right item',
        )
      }

      const { service } = mock(cb, 'remove', { fetchBefore: true })

      const item = await service.create({ test: true, comment: 'awesome' })

      assert.ok(!calledCb, 'not called cb')

      await service.remove(item.id)

      assert.ok(calledCb, 'called cb')
    })
  })
})
