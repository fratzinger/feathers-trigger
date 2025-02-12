import { expectTypeOf } from "vitest";
import type { Change, ActionOptions } from "../../src";
import { trigger } from "../../src";
import type { HookContext, Service } from "@feathersjs/feathers";

describe("hook - trigger type test", function () {
  type TestType = { hello: "world" };
  type FakeHookContext = HookContext<any, Service<TestType>>;

  describe("single trigger", () => {
    test("trigger should inherit Service Type batchMode=false", () => {
      trigger<FakeHookContext>({
        action: (change, options) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
          expectTypeOf(options).toEqualTypeOf<
            ActionOptions<FakeHookContext, TestType>
          >();
        },
      });
    });

    test("trigger should inherit Service Type batchMode=true", () => {
      trigger<FakeHookContext>({
        batchAction: ([[change]], context) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
          expectTypeOf(context).toEqualTypeOf<FakeHookContext>();
        },
      });
    });

    test("trigger should inherit Service Type batchMode missing", () => {
      trigger<FakeHookContext>({
        action: (change, options) => {
          expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
          expectTypeOf(options).toEqualTypeOf<
            ActionOptions<FakeHookContext, TestType>
          >();
        },
      });
    });
  });

  describe("trigger array", () => {
    test("trigger should inherit Service Type batchMode=false as array", () => {
      trigger<FakeHookContext>([
        {
          action: (change, options) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
            expectTypeOf(options).toEqualTypeOf<
              ActionOptions<FakeHookContext, TestType>
            >();
          },
        },
      ]);
    });

    test("trigger should inherit Service Type batchMode=true as array", () => {
      trigger<FakeHookContext>([
        {
          batchAction: ([[change]], context) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
            expectTypeOf(context).toEqualTypeOf<FakeHookContext>();
          },
        },
      ]);
    });

    test("trigger should inherit Service Type batchMode missing as array", () => {
      trigger<FakeHookContext>([
        {
          action: (change, options) => {
            expectTypeOf(change).toEqualTypeOf<Change<TestType>>();
            expectTypeOf(options).toEqualTypeOf<
              ActionOptions<FakeHookContext, TestType>
            >();
          },
        },
      ]);
    });
  });
});
