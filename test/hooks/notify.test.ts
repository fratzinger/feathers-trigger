import assert from "assert";
import notify from "../../lib/hooks/notify";
import { Service } from "feathers-memory";
import feathers, { HookContext } from "@feathersjs/feathers";
import { MethodName, HookNotifyOptions } from "../../lib/types";

import { addDays } from "date-fns";

describe("notify", function() {
  function mock(
    hookNames: MethodName | MethodName[], 
    options?: HookNotifyOptions<unknown>, 
    beforeHook?: (context: HookContext) => Promise<HookContext>, 
    afterHook?: (context: HookContext) => Promise<HookContext>
  ) {
    hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
    const app = feathers();
    app.use("/tests", new Service({ multi: true }));
    const service = app.service("tests");
    const hook = notify(options);

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

    service.hooks(hooks);
    
    return { 
      app, 
      service 
    };
  }

  it("does not throw for minimal example", async function() {
    assert.doesNotThrow(
      //@ts-ignore
      () => mock("create", {
        subscriptions: [],
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        notify: () => {}
      }),
      "passes"
    );
  });

  it("throws if no notify function is defined", async function() {
    assert.throws(
      //@ts-ignore
      () => mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }]
      }),
      "throws without"
    );

    assert.throws(
      () => mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }],
        //@ts-ignore
        notify: {}
      }),
      "throws with object"
    );
  });

  it("throws if no subscriptions are defined", async function() {
    assert.throws(
      //@ts-ignore
      () => mock("create", {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        notify: () => {}
      }),
      "throws"
    );
  });

  it("throws if has no notify function", async function() {
    assert.throws(
      //@ts-ignore
      () => mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }]
      }),
      "throws"
    );
  });

  it("notify with method as array", async function() {
    let cbCount = 0;
    const methods: MethodName[] = ["create", "update", "patch", "remove"];
    const { service } = mock(methods, {
      subscriptions: [{
        method: methods,
        service: "tests"
      }],
      notify: () => {
        cbCount++;
      }
    });

    await service.create({ id: 0, test: true });
    assert.strictEqual(cbCount, 1, "notify cb was called");

    await service.update(0, { id: 0, test: false });
    assert.strictEqual(cbCount, 2, "notify cb was called");

    await service.patch(0, { test: true });
    assert.strictEqual(cbCount, 3, "notify cb was called");

    await service.remove(0);
    assert.strictEqual(cbCount, 4, "notify cb was called");
  });

  it("notify with service as array", async function() {
    let cbCount = 0;
    const methods: MethodName[] = ["create", "update", "patch", "remove"];
    const { service } = mock(methods, {
      subscriptions: [{
        method: methods,
        service: ["tests", "tests2", "tests3"]
      }],
      notify: () => {
        cbCount++;
      }
    });

    await service.create({ id: 0, test: true });
    assert.strictEqual(cbCount, 1, "notify cb was called");

    await service.update(0, { id: 0, test: false });
    assert.strictEqual(cbCount, 2, "notify cb was called");

    await service.patch(0, { test: true });
    assert.strictEqual(cbCount, 3, "notify cb was called");

    await service.remove(0);
    assert.strictEqual(cbCount, 4, "notify cb was called");
  });

  describe("create", function() {
    it("create: notify on single create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 0, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("create: notify on single create with subscriptions function without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: async () => {
          return [{
            method: "create",
            service: "tests"
          }];
        },
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 0, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("create: notify on multi create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      await service.create([{ id: 0, test: true }, { id: 1, test: true }, { id: 2, test: true }]);
      assert.strictEqual(cbCount, 3, "notify cb was called three times");
    });

    it("create: does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "supertests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("create: does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("create: notify on single create with condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests",
          conditions: { id: 1 }
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("create: notify on single create with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests",
          conditions: { count: { $gt: "{{ criticalValue }}" } },
          view: { criticalValue: 10 }
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true, count: 12 } });
        }
      });

      await service.create({ id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.create({ id: 1, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("create: notify on single create with custom param", async function() {
      let cbCount = 0;
      const sub1 = {
        id: 1,
        method: "create",
        service: "tests",
        params: { query: { $select: ["id"] } }
      };
      const sub2 = {
        id: 2,
        method: "create",
        service: "tests",
        params: { query: { $select: ["id", "test"] } }
      };
      const sub3 = {
        id: 3,
        method: "create",
        service: "tests"
      };
      const { service } = mock("create", {
        subscriptions: [sub1, sub2, sub3],
        notify: (item, sub) => {
          cbCount++;
          if (sub.id === 1) {
            assert.deepStrictEqual(item, { before: undefined, item: { id: 1 } }, "correct item for sub1");
          } else if (sub.id === 2) {
            assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true } }, "correct item for sub2");
          } else if (sub.id === 3) {
            assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true, comment: "yippieh" } }, "correct item for sub3");
          } else {
            assert.fail("should not get here");
          }
        }
      });

      await service.create({ id: 1, test: true, comment: "yippieh" });
      assert.strictEqual(cbCount, 3);
    });
  });

  describe("update", function() {
    it("update: notify on single update without condition", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("update: does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "update",
          service: "supertests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("update: does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("update: notify with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "update",
          service: "tests",
          conditions: { count: { $gt: "{{ criticalValue }}" } },
          view: { criticalValue: 10 }
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.update(item.id, { id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "notify cb was called");

      await service.update(item.id, { id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 1, "notify cb wasn't called");

      await service.update(item.id, { id: 0, test: true, count: 13 });
      assert.strictEqual(cbCount, 2, "notify cb was called");
    });
  });

  describe("patch", function() {
    it("patch: notify on single patch without condition", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("patch: does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "supertests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("patch: does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("patch: does not notify with empty result", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(null, { test: true }, { query: { test: false } });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("patch: notify if date is before new date", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests",
          conditions: { date: { $lt: "{{ before.date }}" } }
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, date: new Date() });

      await service.patch(item.id, { date: addDays(new Date(), -2) });
      assert.strictEqual(cbCount, 1, "notify cb was called");

      await service.patch(item.id, { date: addDays(new Date(), 5) });
      assert.strictEqual(cbCount, 1, "notify cb wasn't called");

      await service.patch(item.id, { date: addDays(new Date(), -1) });
      assert.strictEqual(cbCount, 2, "notify cb was called");
    });

    it("patch: notify with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests",
          conditions: { count: { $gt: "{{ criticalValue }}" } },
          view: { criticalValue: 10 }
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.patch(item.id, { count: 12 });
      assert.strictEqual(cbCount, 1, "notify cb was called");

      await service.patch(item.id, { count: 9 });
      assert.strictEqual(cbCount, 1, "notify cb wasn't called");

      await service.patch(item.id, { count: 13 });
      assert.strictEqual(cbCount, 2, "notify cb was called");
    });
  });

  describe("remove", function() {
    it("remove: notify on single remove without condition", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "remove",
          service: "tests"
        }],
        notify: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: true } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("remove: does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "remove",
          service: "supertests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("remove: does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("remove: notify with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "remove",
          service: "tests",
          conditions: { count: { $gt: "{{ criticalValue }}" } },
          view: { criticalValue: 10 }
        }],
        notify: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });
  });
});