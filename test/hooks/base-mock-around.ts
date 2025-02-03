import type { HookTriggerOptions } from "../../src";
import { trigger } from "../../src";
import { MemoryService } from "@feathersjs/memory";
import type { HookContext } from "@feathersjs/feathers";
import { feathers } from "@feathersjs/feathers";
import type { MethodName } from "../../src/types.internal";

export type MockOptions = {
  before?: (context: HookContext) => Promise<HookContext>;
  after?: (context: HookContext) => Promise<HookContext>;
};

export function mock(
  hookNames: MethodName | MethodName[],
  options: HookTriggerOptions,
  mockOptions?: MockOptions,
) {
  hookNames = Array.isArray(hookNames) ? hookNames : [hookNames];
  const app = feathers();
  app.use("/tests", new MemoryService({ multi: true }));
  const service = app.service("tests");
  const hook = trigger(options);

  const hooks = {
    around: {},
  };

  hookNames.forEach((hookName) => {
    hooks.around[hookName] = [hook];
  });

  service.hooks(hooks);

  return {
    app,
    service,
  };
}
