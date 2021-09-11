import assert from "assert";
import trigger from "../../lib/hooks/trigger";
import { Service } from "feathers-memory";
import feathers, { HookContext } from "@feathersjs/feathers";
import { MethodName, HookTriggerOptions, Subscription, CallAction } from "../../lib/types";

import { addDays } from "date-fns";

function mock(
  hookNames: MethodName | MethodName[], 
  options: HookTriggerOptions, 
  beforeHook?: (context: HookContext) => Promise<HookContext>, 
  afterHook?: (context: HookContext) => Promise<HookContext>
) {
  hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
  const app = feathers();
  app.use("/tests", new Service({ multi: true }));
  const service = app.service("tests");
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

  service.hooks(hooks);
  
  return { 
    app, 
    service 
  };
}

describe("hook - trigger", function() {
  describe("general", function() {
    it("does not throw for minimal example", function() {
      assert.doesNotThrow(
        //@ts-ignore
        () => mock("create", {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          callAction: () => {}
        }),
        "passes"
      );
    });

    it("throws on find and get", async function() {
      // @ts-expect-error find is not allowed;
      const { service: service1 } = mock("find", {
        method: "create",
        service: "tests",
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        callAction: () => {}
      });

      await assert.rejects(
        service1.find({ query: { } }),
        "find rejects"
      );

      // @ts-expect-error find is not allowed;
      const { service: service2 } = mock("get", {
        method: "create",
        service: "tests",
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        callAction: () => {}
      });

      await assert.rejects(
        service2.get(0),
        "get rejects"
      );
    });
  
    it("triggers with no method", async function() {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });
  
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
  
      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
  
      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "callAction cb was called");
  
      await service.remove(0);
      assert.strictEqual(cbCount, 4, "callAction cb was called");
    });
  
    it("triggers with no service", async function() {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        callAction: () => {
          cbCount++;
        }
      });
  
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
  
      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
  
      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "callAction cb was called");
  
      await service.remove(0);
      assert.strictEqual(cbCount, 4, "callAction cb was called");
    });
  
    it("triggers with no method and no service", async function() {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        callAction: () => {
          cbCount++;
        }
      });
  
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
  
      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
  
      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "callAction cb was called");
  
      await service.remove(0);
      assert.strictEqual(cbCount, 4, "callAction cb was called");
    });
  
    it("triggers with method as array", async function() {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });
  
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
  
      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
  
      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "callAction cb was called");
  
      await service.remove(0);
      assert.strictEqual(cbCount, 4, "callAction cb was called");
    });
  
    it("triggers with service as array", async function() {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        service: ["tests", "tests2", "tests3"],
        callAction: () => {
          cbCount++;
        }
      });
  
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
  
      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
  
      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "callAction cb was called");
  
      await service.remove(0);
      assert.strictEqual(cbCount, 4, "callAction cb was called");
    });
  });

  describe("create", function() {
    it("create: triggers on single create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 0, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("create: triggers on single create with subscriptions function without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", () => ({
        method: "create",
        service: "tests",
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 0, test: true } });
        }
      }));

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("create: triggers on multi create without condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      await service.create([{ id: 0, test: true }, { id: 1, test: true }, { id: 2, test: true }]);
      assert.strictEqual(cbCount, 3, "callAction cb was called three times");
    });

    it("create: does not trigger with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "supertests",
        callAction: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("create: does not trigger with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "update",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("create: triggers on single create with condition", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        conditionsResult: { id: 1 },
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true } });
        }
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("create: triggers on single create with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        conditionsResult: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: undefined, item: { id: 1, test: true, count: 12 } });
        }
      });

      await service.create({ id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.create({ id: 1, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("create: triggers on single create with custom param", async function() {
      let cbCount = 0;
      const callAction: CallAction = (item, sub) => {
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
      };

      const sub1: Subscription = {
        id: 1,
        method: "create",
        service: "tests",
        params: { query: { $select: ["id"] } },
        callAction
      };
      const sub2: Subscription = {
        id: 2,
        method: "create",
        service: "tests",
        params: { query: { $select: ["id", "test"] } },
        callAction
      };
      const sub3: Subscription = {
        id: 3,
        method: "create",
        service: "tests",
        callAction
      };
      const { service } = mock("create", [sub1, sub2, sub3]);

      await service.create({ id: 1, test: true, comment: "yippieh" });
      assert.strictEqual(cbCount, 3);
    });

    it("create: triggers on single create with conditionsData", async function() {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        conditionsData: { test: true },
        callAction: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: false });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });
  });

  describe("update", function() {
    it("update: triggers on single update without condition", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "tests",
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("update: does not trigger with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "supertests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("update: does not trigger with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "patch",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("update: triggers with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "tests",
        conditionsResult: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.update(item.id, { id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "callAction cb was called");

      await service.update(item.id, { id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 1, "callAction cb wasn't called");

      await service.update(item.id, { id: 0, test: true, count: 13 });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
    });
  });

  describe("patch", function() {
    it("patch: triggers on single patch without condition", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: false } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("patch: does not trigger with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "supertests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("patch: does not trigger with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "update",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("patch: does not trigger with empty result", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.patch(null, { test: true }, { query: { test: false } });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("patch: triggers if date is before new date", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        conditionsResult: { date: { $lt: "{{ before.date }}" } },
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, date: new Date() });

      await service.patch(item.id, { date: addDays(new Date(), -2) });
      assert.strictEqual(cbCount, 1, "callAction cb was called");

      await service.patch(item.id, { date: addDays(new Date(), 5) });
      assert.strictEqual(cbCount, 1, "callAction cb wasn't called");

      await service.patch(item.id, { date: addDays(new Date(), -1) });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
    });

    it("patch: multiple triggers on multiple items", async function() {
      const beforeDate = new Date();

      const items = [
        { id: 0, test: true, date: addDays(beforeDate, 0) },
        { id: 1, test: false, date: addDays(beforeDate, 1) },
        { id: 2, test: true, date: addDays(beforeDate, 2) }
      ];

      const calledTrigger1ById = {};
      const calledTrigger2ById = {};

      const { service } = mock("patch", [
        {
          conditionsResult: { date: { $lt: "{{ before.date }}" } },
          callAction: ({ before, item }, sub) => {
            if (item.id === 0) {
              assert.deepStrictEqual(sub.conditionsResult, { date: { $lt: addDays(beforeDate, 0).toISOString() } }, "conditions on id:0");
            } else if (item.id === 1) {
              assert.deepStrictEqual(sub.conditionsResult, { date: { $lt: addDays(beforeDate, 1).toISOString() } }, "conditions on id:1");
            } else if (item.id === 2) {
              assert.deepStrictEqual(sub.conditionsResult, { date: { $lt: addDays(beforeDate, 2).toISOString() } }, "conditions on id:1");
            }
            calledTrigger1ById[item.id] = true;
          }
        },
        {
          conditionsResult: { test: true },
          callAction: ({ before, item }, sub) => {
            assert.deepStrictEqual(sub.conditionsResult, { test: true }, "has conditionsResult");
            calledTrigger2ById[item.id] = true;
          }
        }
      ]);

      await service.create(items);

      await service.patch(null, { date: addDays(new Date(), -2) });
      assert.deepStrictEqual(calledTrigger1ById, { 0: true, 1: true, 2: true }, "called trigger1 for all items");
      assert.deepStrictEqual(calledTrigger2ById, { 0: true, 2: true }, "called trigger2 for two items");
    });

    it("patch: triggers with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        conditionsResult: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.patch(item.id, { count: 12 });
      assert.strictEqual(cbCount, 1, "callAction cb was called");

      await service.patch(item.id, { count: 9 });
      assert.strictEqual(cbCount, 1, "callAction cb wasn't called");

      await service.patch(item.id, { count: 13 });
      assert.strictEqual(cbCount, 2, "callAction cb was called");
    });
  });

  describe("remove", function() {
    it("remove: triggers on single remove without condition", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "tests",
        callAction: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, { before: { id: 0, test: true }, item: { id: 0, test: true } });
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });

    it("remove: does not trigger with service mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "supertests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("remove: does not trigger with method mismatch", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "update",
        service: "tests",
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");
    });

    it("remove: triggers with custom view", async function() {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "tests",
        conditionsResult: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        callAction: () => {
          cbCount++;
        }
      });

      const item = await service.create({ id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 0, "callAction cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "callAction cb was called");
    });
  });
});