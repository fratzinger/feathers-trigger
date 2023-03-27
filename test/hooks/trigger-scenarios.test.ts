import assert from "assert";
import { trigger, HookTriggerOptions, Action } from "../../src";
import { MemoryService } from "@feathersjs/memory";
import { populate } from "feathers-graph-populate";
import { feathers, HookContext, Id } from "@feathersjs/feathers";
import { withResult } from "feathers-fletching";

import { addDays } from "date-fns";

import type { MethodName } from "../../src/types.internal";

declare module "@feathersjs/feathers" {
  interface Params {
    user?: any
  }
}

describe("trigger scenarios", function() {
  describe("notify on comments for published articles", function() {
    const mock = (
      hookNames: MethodName | MethodName[], 
      options: HookTriggerOptions,
      beforeHook?: (context: HookContext) => Promise<HookContext>, 
      afterHook?: (context: HookContext) => Promise<HookContext>
    ) => {
      hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
      const app = feathers();

      app.use("/comments", new MemoryService({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceComments = app.service("comments");
      app.use("/articles", new MemoryService({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceArticles = app.service("articles");

      const hook = trigger(options);
    
      const beforeAll = [hook];
      if (beforeHook) { beforeAll.push(beforeHook); }
    
      const afterAll = [hook];
      if (afterHook) { afterAll.push(afterHook); }
    
      const hooks = {
        before: {},
        after: {}
      };
    
      hookNames.forEach(hookName => {
        hooks.before[hookName] = beforeAll;
        hooks.after[hookName] = afterAll;
      });

      serviceComments.hooks({
        after: {
          all: [
            populate({
              populates: {
                article: {
                  nameAs: "article",
                  service: "articles",
                  asArray: false,
                  keyHere: "articleId",
                  keyThere: "id"
                }
              },
              namedQueries: {
                "withArticle": {
                  article: {}
                }
              }
            })
          ]
        }
      });
    
      app.hooks(hooks);
      
      return { 
        app, 
        serviceArticles,
        serviceComments 
      };
    };

    it("notify on comments for published articles", async function() {
      let callCounter = 0;
      const { 
        serviceArticles, 
        serviceComments 
      } = mock(["create", "patch", "remove", "update"], {
        conditionsResult: { "article.publishedAt": { $ne: null } },
        params: (params, context) => {
          params.$populateParams = { name: "withArticle" };
          return params;
        },
        service: "comments",
        method: ["create", "patch"],
        fetchBefore: true,
        action: ({ before, item }, { context }) => {
          if (callCounter === 0) {
            assert.deepStrictEqual(item, {
              id: 2,
              body: "hi2",
              articleId: 1,
              article: {
                id: 1,
                title: "supersecret",
                publishedAt: "2021"
              }
            });
          } else if (callCounter === 1) {
            assert.deepStrictEqual(before, {
              id: 1,
              body: "hi11",
              articleId: 1,
              article: {
                id: 1,
                title: "supersecret",
                publishedAt: "2021"
              }
            });
            assert.deepStrictEqual(item, {
              id: 1,
              body: "hi12",
              articleId: 1,
              article: {
                id: 1,
                title: "supersecret",
                publishedAt: "2021"
              }
            });
          }
          callCounter++;
        }
      });

      const article1 = await serviceArticles.create({ title: "supersecret", publishedAt: null });
      const comment1 = await serviceComments.create({ body: "hi", articleId: article1.id });
      assert.strictEqual(callCounter, 0, "not called cb");

      const comment11 = await serviceComments.patch(comment1.id as Id, { body: "hi11" });
      assert.strictEqual(callCounter, 0, "not called cb");
      assert.deepStrictEqual(comment11, { id: comment11.id, body: "hi11", articleId: article1.id });

      const article11 = await serviceArticles.patch(article1.id, { publishedAt: "2021" });

      const comment2 = await serviceComments.create({ body: "hi2", articleId: article1.id });
      assert.strictEqual(callCounter, 1, "called cb");
      assert.deepStrictEqual(comment2, { id: comment2.id, body: "hi2", articleId: article1.id });

      const comment12 = await serviceComments.patch(comment1.id, { body: "hi12" });
      assert.strictEqual(callCounter, 2, "called cb");
      assert.deepStrictEqual(comment12, { id: comment1.id, body: "hi12", articleId: article1.id });

      const article12 = await serviceArticles.patch(article1.id, { publishedAt: null });
      const comment21 = await serviceComments.patch(comment2.id, { body: "hi21" });
      assert.strictEqual(callCounter, 2, "not called cb");
      assert.deepStrictEqual(comment21, { id: comment2.id, body: "hi21", articleId: article1.id });
    });
  });

  describe("notify on projects assigned to user that get delayed", function() {
    const mock = (
      hookNames: MethodName | MethodName[], 
      options: HookTriggerOptions,
      beforeHook?: (context: HookContext) => Promise<HookContext>, 
      afterHook?: (context: HookContext) => Promise<HookContext>
    ) => {
      hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
      const app = feathers();

      app.use("/projects", new MemoryService({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceProjects = app.service("projects");

      serviceProjects.hooks({
        after: {
          all: [
            withResult({
              startsAt: (result) => {
                return result.startsAt && new Date(result.startsAt);
              }
            }),
            populate({
              populates: {
                user: {
                  nameAs: "user",
                  service: "users",
                  asArray: false,
                  keyHere: "userId",
                  keyThere: "id"
                }
              },
              namedQueries: {
                "withUser": {
                  user: {}
                }
              }
            })
          ]
        }
      });

      app.use("/users", new MemoryService({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceUsers = app.service("users");

      serviceUsers.hooks({
        after: {
          all: [
            populate({
              populates: {
                projects: {
                  nameAs: "projects",
                  service: "projects",
                  asArray: true,
                  keyHere: "id",
                  keyThere: "userId"
                }
              },
              namedQueries: {
                "withProjects": {
                  projects: {}
                }
              }
            })
          ]
        }
      });

      const hook = trigger(options);
    
      const beforeAll = [hook];
      if (beforeHook) { beforeAll.push(beforeHook); }
    
      const afterAll = [hook];
      if (afterHook) { afterAll.push(afterHook); }
    
      const hooks = {
        before: {},
        after: {}
      };
    
      hookNames.forEach(hookName => {
        hooks.before[hookName] = beforeAll;
        hooks.after[hookName] = afterAll;
      });
    
      app.hooks(hooks);
      
      return { 
        app, 
        serviceProjects,
        serviceUsers 
      };
    };

    it("notify on projects assigned to user that get delayed", async function() {
      let callCounter = 0;
      const { 
        serviceProjects, 
        serviceUsers 
      } = mock(["create", "patch", "update", "remove"], {
        service: "projects",
        method: ["patch", "update"],
        fetchBefore: true,
        conditionsResult: { startsAt: { $gt: "{{ before.startsAt }}" }, userId: { $ne: "{{ user.id }}" } },
        action: ({ before, item }, { context }) => {
          if (callCounter === 0) {
            assert.strictEqual(item.userId, user1.id, "user is user1 on first call");
          }
          callCounter++;
        }
      });

      const user1 = await serviceUsers.create({ id: 1, name: "user 1" });
      const user2 = await serviceUsers.create({ id: 2, name: "user 2" });
      const user3 = await serviceUsers.create({ id: 3, name: "user 3" });

      const [project1, project2] = await serviceProjects.create([
        {
          startsAt: new Date(),
          userId: user1.id
        }, {
          startsAt: addDays(new Date(), -10),
          userId: user2.id
        }
      ]);

      assert.strictEqual(callCounter, 0);

      await serviceProjects.patch(project1.id, { startsAt: addDays(new Date(), 2) }, { user: user1 });

      assert.strictEqual(callCounter, 0);

      await serviceProjects.patch(project1.id, { startsAt: addDays(new Date(), -10) }, { user: user2 });

      assert.strictEqual(callCounter, 0);

      await serviceProjects.patch(project1.id, { startsAt: addDays(new Date(), 2) }, { user: user2 });

      assert.strictEqual(callCounter, 1);
    });
  });
});