import type { Change, HookChangesByIdOptions } from './types.js'
import { changesById } from './changes-by-id.js'
import { MemoryService } from '@feathersjs/memory'
import type { HookContext, Id } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import { populate } from 'feathers-graph-populate'
import type { MethodName } from '../../types.internal.js'

type Callback = (byId: Record<Id, Change>, context: HookContext) => void

function mock(
  cb: Callback,
  hookName: MethodName,
  options?: Partial<HookChangesByIdOptions>,
  beforeHook?: (context: HookContext) => Promise<HookContext>,
  afterHook?: (context: HookContext) => Promise<HookContext>,
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

    it("patch with params: doesn't refetch, if the params to refetch are the params of the call", async function () {
      let changes: Record<Id, Change> | undefined
      const cb: Callback = (byId) => {
        changes = byId
      }
      const { service } = mock(cb, 'patch', { params: (params) => params })

      const item = await service.create({ test: true, comment: 'awesome' })
      const get = vi.spyOn(service, 'get')

      await service.patch(
        item.id,
        { comment: 'yippieh' },
        { query: { test: true } },
      )

      expect(get, "doesn't refetch").not.toHaveBeenCalled()
      expect(changes?.['0'].item, 'has right item').toStrictEqual({
        id: 0,
        test: true,
        comment: 'yippieh',
      })
    })

    it('patch with $select: refetches the item, even if the patch changes a field of the query', async function () {
      let changes: Record<Id, Change> | undefined
      const cb: Callback = (byId) => {
        changes = byId
      }
      const { service } = mock(cb, 'patch')

      const item = await service.create({ test: true, comment: 'awesome' })

      const result = await service.patch(
        item.id,
        { test: false },
        { query: { test: true, $select: ['id'] } },
      )

      expect(result, 'has right result').toStrictEqual({ id: 0 })
      expect(changes?.['0'].item, 'has full item').toStrictEqual({
        id: 0,
        test: false,
        comment: 'awesome',
      })
    })

    it('patch with params: populates before and item with $populateParams', async function () {
      const app = feathers()
      app.use('/articles', new MemoryService())
      app.use('/comments', new MemoryService())
      const articles = app.service('articles')
      const comments = app.service('comments')

      let changes: Record<Id, Change> | undefined
      const hook = changesById(
        (byId) => {
          changes = byId
        },
        {
          fetchBefore: true,
          params: (params) => ({
            ...params,
            $populateParams: { name: 'withArticle' },
          }),
        },
      )

      comments.hooks({
        before: {
          patch: [hook],
        },
        after: {
          all: [
            populate({
              populates: {
                article: {
                  nameAs: 'article',
                  service: 'articles',
                  asArray: false,
                  keyHere: 'articleId',
                  keyThere: 'id',
                },
              },
              namedQueries: {
                withArticle: {
                  article: {},
                },
              },
            }),
          ],
          patch: [hook],
        },
      })

      const article = await articles.create({ title: 'supersecret' })
      const comment = await comments.create({
        body: 'hi',
        articleId: article.id,
      })

      const result = await comments.patch(comment.id, { body: 'hi2' })

      expect(result, "doesn't populate the result").toStrictEqual({
        id: 0,
        body: 'hi2',
        articleId: 0,
      })
      expect(changes?.['0'], 'populates before and item').toStrictEqual({
        before: {
          id: 0,
          body: 'hi',
          articleId: 0,
          article: { id: 0, title: 'supersecret' },
        },
        item: {
          id: 0,
          body: 'hi2',
          articleId: 0,
          article: { id: 0, title: 'supersecret' },
        },
      })
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
