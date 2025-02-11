import assert from "assert";
import type { Subscription, Action } from "../../src";
import type { MethodName } from "../../src/types.internal";
import { mock } from "./base-mock-around";

import { addDays, isBefore } from "date-fns";

describe("hook - trigger", function () {
  describe("general", function () {
    it("throws without options", function () {
      assert.throws(
        //@ts-expect-error should define options
        () => mock("create"),
        "passes",
      );
    });

    it("does not throw for minimal example", function () {
      assert.doesNotThrow(
        //@ts-ignore
        () =>
          mock("create", {
            action: () => {},
          }),
        "passes",
      );
    });

    it("throws on find and get", async function () {
      // @ts-expect-error find is not allowed;
      const { service: service1 } = mock("find", {
        method: "create",
        service: "tests",

        action: () => {},
      });

      await assert.rejects(service1.find({ query: {} }), "find rejects");

      // @ts-expect-error find is not allowed;
      const { service: service2 } = mock("get", {
        method: "create",
        service: "tests",

        action: () => {},
      });

      await assert.rejects(service2.get(0), "get rejects");
    });

    it("triggers with no method", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "action cb was called");

      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "action cb was called");

      await service.remove(0);
      assert.strictEqual(cbCount, 4, "action cb was called");
    });

    it("triggers with no service", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "action cb was called");

      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "action cb was called");

      await service.remove(0);
      assert.strictEqual(cbCount, 4, "action cb was called");
    });

    it("triggers with no method and no service", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "action cb was called");

      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "action cb was called");

      await service.remove(0);
      assert.strictEqual(cbCount, 4, "action cb was called");
    });

    it("triggers with method as array", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "action cb was called");

      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "action cb was called");

      await service.remove(0);
      assert.strictEqual(cbCount, 4, "action cb was called");
    });

    it("triggers with service as array", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        method: methods,
        service: ["tests", "tests2", "tests3"],
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(0, { id: 0, test: false });
      assert.strictEqual(cbCount, 2, "action cb was called");

      await service.patch(0, { test: true });
      assert.strictEqual(cbCount, 3, "action cb was called");

      await service.remove(0);
      assert.strictEqual(cbCount, 4, "action cb was called");
    });

    it("can skip named sub", async function () {
      let cbCount = 0;
      const methods: MethodName[] = ["create", "update", "patch", "remove"];
      const { service } = mock(methods, {
        name: "skipMe",
        method: methods,
        action: () => {
          cbCount++;
        },
      });

      // @ts-expect-error params not typed
      await service.create({ id: 0, test: true }, { skipTrigger: ["skipMe"] });
      assert.strictEqual(cbCount, 0, "action not called");

      // @ts-expect-error params not typed
      await service.update(
        0,
        { id: 0, test: false },
        { skipTrigger: "skipMe" },
      );
      assert.strictEqual(cbCount, 0, "action not called");

      // @ts-expect-error params not typed
      await service.patch(0, { test: true }, { skipTrigger: ["skipMe"] });
      assert.strictEqual(cbCount, 0, "action cb was called");

      // @ts-expect-error params not typed
      await service.remove(0, { skipTrigger: ["skipMe"] });
      assert.strictEqual(cbCount, 0, "action cb was called");
    });
  });

  describe("create", function () {
    it("create: triggers on single create without condition", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        action: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, {
            before: undefined,
            item: { id: 0, test: true },
          });
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("create: triggers on single create with subscriptions function without condition", async function () {
      let cbCount = 0;
      const { service } = mock("create", () => ({
        method: "create",
        service: "tests",
        action: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, {
            before: undefined,
            item: { id: 0, test: true },
          });
        },
      }));

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("create: triggers on multi create without condition", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      await service.create([
        { id: 0, test: true },
        { id: 1, test: true },
        { id: 2, test: true },
      ]);
      assert.strictEqual(cbCount, 3, "action cb was called three times");
    });

    it("create: does not trigger with service mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "supertests",
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("create: does not trigger with method mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "update",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("create: triggers on single create with condition", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        result: { id: 1 },
        action: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, {
            before: undefined,
            item: { id: 1, test: true },
          });
        },
      });

      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("create: triggers on single create with custom view", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        result: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        action: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, {
            before: undefined,
            item: { id: 1, test: true, count: 12 },
          });
        },
      });

      await service.create({ id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.create({ id: 1, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("create: triggers on single create with custom view as function", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        result: { count: { $gt: "{{ criticalValue }}" } },
        view: (view) => {
          view.criticalValue = 10;
          return view;
        },
        action: (item) => {
          cbCount++;
          assert.deepStrictEqual(item, {
            before: undefined,
            item: { id: 1, test: true, count: 12 },
          });
        },
      });

      await service.create({ id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.create({ id: 1, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("create: triggers on single create with custom param", async function () {
      let cbCount = 0;
      const action: Action = (item, { subscription: sub }) => {
        cbCount++;
        if (sub.id === 1) {
          assert.deepStrictEqual(
            item,
            { before: undefined, item: { id: 1 } },
            "correct item for sub1",
          );
        } else if (sub.id === 2) {
          assert.deepStrictEqual(
            item,
            { before: undefined, item: { id: 1, test: true } },
            "correct item for sub2",
          );
        } else if (sub.id === 3) {
          assert.deepStrictEqual(
            item,
            {
              before: undefined,
              item: { id: 1, test: true, comment: "yippieh" },
            },
            "correct item for sub3",
          );
        } else {
          assert.fail("should not get here");
        }
      };

      const sub1: Subscription = {
        id: 1,
        method: "create",
        service: "tests",
        manipulateParams: (params) => {
          params.query ||= {};
          params.query.$select = ["id"];
          return params;
        },
        action,
      };
      const sub2: Subscription = {
        id: 2,
        method: "create",
        service: "tests",
        manipulateParams: (params) => {
          params.query ||= {};
          params.query.$select = ["id", "test"];
          return params;
        },
        action,
      };
      const sub3: Subscription = {
        id: 3,
        method: "create",
        service: "tests",
        action,
      };
      const { service } = mock("create", [sub1, sub2, sub3]);

      const result = await service.create({
        id: 1,
        test: true,
        comment: "yippieh",
      });
      assert.strictEqual(cbCount, 3);
      assert.deepStrictEqual(
        result,
        { id: 1, test: true, comment: "yippieh" },
        "has full object",
      );
    });

    it("create: $select in params has full item in trigger", async function () {
      let cbCount = 0;
      const action: Action = (item, { subscription: sub }) => {
        cbCount++;
        if (sub.id === 1) {
          assert.deepStrictEqual(
            item,
            { before: undefined, item: { id: 1 } },
            "correct item for sub1",
          );
        } else if (sub.id === 2) {
          assert.deepStrictEqual(
            item,
            { before: undefined, item: { id: 1, test: true } },
            "correct item for sub2",
          );
        } else if (sub.id === 3) {
          assert.deepStrictEqual(
            item,
            {
              before: undefined,
              item: { id: 1, test: true, comment: "yippieh" },
            },
            "correct item for sub3",
          );
        } else {
          assert.fail("should not get here");
        }
      };

      const sub1: Subscription = {
        id: 1,
        method: "create",
        service: "tests",
        manipulateParams: (params) => {
          params.query ||= {};
          params.query.$select = ["id"];
          return params;
        },
        action,
      };
      const sub2: Subscription = {
        id: 2,
        method: "create",
        service: "tests",
        manipulateParams: (params) => {
          params.query ||= {};
          params.query.$select = ["id", "test"];
          return params;
        },
        action,
      };
      const sub3: Subscription = {
        id: 3,
        method: "create",
        service: "tests",
        action,
      };
      const { service } = mock("create", [sub1, sub2, sub3]);

      const result = await service.create(
        { id: 1, test: true, comment: "yippieh" },
        { query: { $select: ["id", "comment"] } },
      );
      assert.strictEqual(cbCount, 3);
      assert.deepStrictEqual(
        result,
        { id: 1, comment: "yippieh" },
        "has subset",
      );
    });

    it("create: triggers on single create with data", async function () {
      let cbCount = 0;
      const { service } = mock("create", {
        method: "create",
        service: "tests",
        data: { test: true },
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: false });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.create({ id: 1, test: true });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });
  });

  describe("update", function () {
    it("update: triggers on single update without condition", async function () {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "tests",
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++;
          assert.deepStrictEqual(before, { id: 0, test: true });
          assert.deepStrictEqual(item, { id: 0, test: false });
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("update: does not trigger with service mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "supertests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("update: does not trigger with method mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "patch",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.update(item.id, { ...item, test: false });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("update: triggers with custom view", async function () {
      let cbCount = 0;
      const { service } = mock("update", {
        method: "update",
        service: "tests",
        result: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.update(item.id, { id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(item.id, { id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.update(item.id, { id: 0, test: true, count: 13 });
      assert.strictEqual(cbCount, 2, "action cb was called");
    });

    it("update: calls before with before", async function () {
      let cbCount = 0;
      const { service } = mock("update", {
        before: { count: 2 },
        result: { count: 3 },
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.update(item.id, { id: 0, test: true, count: 3 });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.update(item.id, { id: 0, test: true, count: 9 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.update(item.id, { id: 0, test: true, count: 3 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");
    });
  });

  describe("patch", function () {
    it("patch: triggers on single patch without condition", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++;
          assert.deepStrictEqual(before, { id: 0, test: true });
          assert.deepStrictEqual(item, { id: 0, test: false });
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("patch: does not trigger with service mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "supertests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("patch: does not trigger with method mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "update",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.patch(item.id, { test: false });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("patch: does not trigger with empty result", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.patch(null, { test: true }, { query: { test: false } });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("patch: triggers if date is before new date", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        result: { date: { $lt: "{{ before.date }}" } },
        fetchBefore: true,
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({
        id: 0,
        test: true,
        date: new Date(),
      });

      await service.patch(item.id, { date: addDays(new Date(), -2) });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.patch(item.id, { date: addDays(new Date(), 5) });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.patch(item.id, { date: addDays(new Date(), -1) });
      assert.strictEqual(cbCount, 2, "action cb was called");
    });

    it("patch: triggers if date is before new date as function", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        result: ({ before, item }) => {
          return isBefore(new Date(item.date), new Date(before.date));
        },
        fetchBefore: true,
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({
        id: 0,
        test: true,
        date: new Date(),
      });

      await service.patch(item.id, { date: addDays(new Date(), -2) });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.patch(item.id, { date: addDays(new Date(), 5) });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.patch(item.id, { date: addDays(new Date(), -1) });
      assert.strictEqual(cbCount, 2, "action cb was called");
    });

    it("patch: multiple triggers on multiple items", async function () {
      const beforeDate = new Date();

      const items = [
        { id: 0, test: true, date: addDays(beforeDate, 0) },
        { id: 1, test: false, date: addDays(beforeDate, 1) },
        { id: 2, test: true, date: addDays(beforeDate, 2) },
      ];

      const calledTrigger1ById = {};
      const calledTrigger2ById = {};

      const action = ({ before, item }, { subscription: sub }) => {
        if (sub.id === 1) {
          if (item.id === 0) {
            assert.deepStrictEqual(
              sub.result,
              { date: { $lt: "{{ before.date }}" } },
              "conditions on id:0",
            );
          } else if (item.id === 1) {
            assert.deepStrictEqual(
              sub.result,
              { date: { $lt: "{{ before.date }}" } },
              "conditions on id:0",
            );
          } else if (item.id === 2) {
            assert.deepStrictEqual(
              sub.result,
              { date: { $lt: "{{ before.date }}" } },
              "conditions on id:0",
            );
          }
          calledTrigger1ById[item.id] = true;
        } else if (sub.id === 2) {
          assert.deepStrictEqual(sub.result, { test: true }, "has result");
          calledTrigger2ById[item.id] = true;
        }
      };

      const { service } = mock("patch", [
        {
          id: 1,
          result: { date: { $lt: "{{ before.date }}" } },
          fetchBefore: true,
          action,
        },
        {
          id: 2,
          result: { test: true },
          action,
        },
      ]);

      await service.create(items);

      await service.patch(null, { date: addDays(new Date(), -2) });
      assert.deepStrictEqual(
        calledTrigger1ById,
        { 0: true, 1: true, 2: true },
        "called trigger1 for all items",
      );
      assert.deepStrictEqual(
        calledTrigger2ById,
        { 0: true, 2: true },
        "called trigger2 for two items",
      );
    });

    it("patch: triggers on multi create with all conditions", async function () {
      let cbCount = 0;
      const { service } = mock(["create", "patch"], {
        service: "tests",
        before: {
          test: true,
        },
        data: {
          test: false,
        },
        result: {
          test: false,
        },
        action: (change, option) => {
          cbCount++;
        },
      });

      await service.create([
        { id: 0, test: true },
        { id: 1, test: true },
        { id: 2, test: true },
      ]);
      assert.strictEqual(cbCount, 0, "action cb was not called");

      await service.patch(null, {
        test: false,
      });

      assert.strictEqual(cbCount, 3, "action cb was called three times");

      await service.patch(null, {
        test: false,
      });

      assert.strictEqual(cbCount, 3, "action cb was still called three times");
    });

    it("patch: triggers with custom view", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        method: "patch",
        service: "tests",
        result: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.patch(item.id, { count: 12 });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.patch(item.id, { count: 9 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.patch(item.id, { count: 13 });
      assert.strictEqual(cbCount, 2, "action cb was called");
    });

    it("patch: calls before with before", async function () {
      let cbCount = 0;
      const { service } = mock("patch", {
        before: { count: 2 },
        result: { count: 3 },
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true, count: 2 });

      await service.patch(item.id, { count: 3 });
      assert.strictEqual(cbCount, 1, "action cb was called");

      await service.patch(item.id, { count: 9 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");

      await service.patch(item.id, { count: 3 });
      assert.strictEqual(cbCount, 1, "action cb wasn't called");
    });
  });

  describe("remove", function () {
    it("remove: triggers on single remove without condition", async function () {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "tests",
        fetchBefore: true,
        action: ({ before, item }) => {
          cbCount++;
          assert.deepStrictEqual(before, { id: 0, test: true });
          assert.deepStrictEqual(item, { id: 0, test: true });
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "action cb was called");
    });

    it("remove: does not trigger with service mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "supertests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("remove: does not trigger with method mismatch", async function () {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "update",
        service: "tests",
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 0, "action cb wasn't called");
    });

    it("remove: triggers with custom view", async function () {
      let cbCount = 0;
      const { service } = mock("remove", {
        method: "remove",
        service: "tests",
        result: { count: { $gt: "{{ criticalValue }}" } },
        view: { criticalValue: 10 },
        action: () => {
          cbCount++;
        },
      });

      const item = await service.create({ id: 0, test: true, count: 12 });
      assert.strictEqual(cbCount, 0, "action cb wasn't called");

      await service.remove(item.id);
      assert.strictEqual(cbCount, 1, "action cb was called");
    });
  });
});
