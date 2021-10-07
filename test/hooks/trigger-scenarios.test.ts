import assert from "assert";
import trigger from "../../src/hooks/trigger";
import { Service } from "feathers-memory";
import { populate } from "feathers-graph-populate";
import feathers, { HookContext } from "@feathersjs/feathers";
import { MethodName, HookTriggerOptions, CallAction } from "../../src/types";

describe("trigger scenarios", function() {
  describe("notify on comments for published articles", function() {
    const mock = (
      hookNames: MethodName | MethodName[], 
      options: HookTriggerOptions,
      callAction: CallAction,
      beforeHook?: (context: HookContext) => Promise<HookContext>, 
      afterHook?: (context: HookContext) => Promise<HookContext>
    ) => {
      hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
      const app = feathers();

      app.use("/comments", new Service({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceComments = app.service("comments");
      app.use("/articles", new Service({ 
        multi: true,
        id: "id",
        startId: 1
      }));
      const serviceArticles = app.service("articles");

      const hook = trigger(options, callAction);
    
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
        method: ["create", "patch"]
      }, ({ before, item }, { context }) => {
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
      });

      const article1 = await serviceArticles.create({ title: "supersecret", publishedAt: null });
      const comment1 = await serviceComments.create({ body: "hi", articleId: article1.id });
      assert.strictEqual(callCounter, 0, "not called cb");

      const comment11 = await serviceComments.patch(comment1.id, { body: "hi11" });
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
});