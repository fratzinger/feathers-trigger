import { expectTypeOf } from "vitest";
import { trigger, Change, ActionOptions } from "../../src";
import { HookContext, Service } from "@feathersjs/feathers";

describe("hook - trigger type test", function () {
  type TestType = { hello: "world" };
  type FakeHookContext = HookContext<any, Service<TestType>>;

  test("trigger should inherit Service Type batchMode=false", () => {
    trigger<FakeHookContext>({
      batchMode: false,
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
      batchMode: true,
      action: ([[change]], context) => {
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
