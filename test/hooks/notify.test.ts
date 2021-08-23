import assert from "assert";
import notify from "../../lib/hooks/notify";
import { Service } from "feathers-memory";
import feathers, { HookContext } from "@feathersjs/feathers";
import { MethodName, HookNotifyOptions } from "../../lib/types";

import { addDays } from "date-fns";

describe("notify", function() {
  function mock(
    hookName: MethodName, 
    options?: HookNotifyOptions<unknown>, 
    beforeHook?: (context: HookContext) => Promise<HookContext>, 
    afterHook?: (context: HookContext) => Promise<HookContext>
  ) {
    const app = feathers();
    app.use("/tests", new Service({ multi: true }));
    const service = app.service("tests");
    const hook = notify(options);

    const beforeAll = [hook];
    if (beforeHook) { beforeAll.push(beforeHook); }

    const afterAll = [hook];
    if (afterHook) { afterAll.push(afterHook); }

    service.hooks({
      before: {
        [hookName]: beforeAll,
      },
      after: {
        [hookName]: afterAll
      }
    });
    
    return { 
      app, 
      service 
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it.skip("manipulate items", function() {});

  describe("create", function() {
    it("notify on single create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }],
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, after: { id: 0, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("notify on single create with subscriptions function without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: async () => {
          return [{
            method: "create",
            service: "tests"
          }];
        },
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, after: { id: 0, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("notify on multi create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      await service.create([{ id: 0, test: true }, { id: 1, test: true }, { id: 2, test: true }]);
      assert.strictEqual(cbCount, 3, "notify cb was called three times");
    });

    it("does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "supertests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("notify on single create with condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        subscriptions: [{
          method: "create",
          service: "tests",
          conditionsAfter: { id: 1 }
        }],
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, after: { id: 1, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });
  });

  describe("update", function() {
    it("notify on single update without condition", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, after: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "update",
          service: "supertests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });
  });

  describe("patch", function() {
    it("notify on single patch without condition", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, after: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "supertests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("does not notify with empty result", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests"
        }],
        notify: async () => {
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

    it("notify if date is before new date", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        subscriptions: [{
          method: "patch",
          service: "tests",
          conditionsAfter: { date: { $lt: "{{ before.date }}" } }
        }],
        notify: async () => {
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
  });

  describe("remove", function() {
    it("notify on single remove without condition", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "remove",
          service: "tests"
        }],
        notify: async (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, after: undefined });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "notify cb was called");
    });

    it("does not notify with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "remove",
          service: "supertests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });

    it("does not notify with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        subscriptions: [{
          method: "update",
          service: "tests"
        }],
        notify: async () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "notify cb wasn't called");
    });
  });
});