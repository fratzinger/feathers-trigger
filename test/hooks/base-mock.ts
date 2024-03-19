import type { HookTriggerOptions } from "../../src";
import { trigger } from "../../src";
import { MemoryService } from "@feathersjs/memory";
import type { HookContext } from "@feathersjs/feathers";
import { feathers } from "@feathersjs/feathers";
import type { MethodName } from "../../src/types.internal";

export function mock(
  hookNames: MethodName | MethodName[],
  options: HookTriggerOptions,
  beforeHook?: (context: HookContext) => Promise<HookContext>,
  afterHook?: (context: HookContext) => Promise<HookContext>,
) {
  hookNames = Array.isArray(hookNames) ? hookNames : [hookNames];
  const app = feathers();
  app.use("/tests", new MemoryService({ multi: true }));
  const service = app.service("tests");
  const hook = trigger(options);

  const beforeAll = [hook];
  if (beforeHook) {
    beforeAll.push(beforeHook);
  }

  const afterAll = [hook];
  if (afterHook) {
    afterAll.push(afterHook);
  }

  const hooks = {
    before: {},
    after: {},
  };

  hookNames.forEach((hookName) => {
    hooks.before[hookName] = beforeAll;
    hooks.after[hookName] = afterAll;
  });

  service.hooks(hooks);

  return {
    app,
    service,
  };
}
