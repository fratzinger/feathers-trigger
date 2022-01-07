import assert from "assert";
import { trigger } from "../../src/hooks/trigger";
import { Service } from "feathers-memory";
import feathers, { HookContext } from "@feathersjs/feathers";
import { MethodName, HookTriggerOptions, Action } from "../../src/types";
import { makeActionServiceCall } from "../../src/actions/actionServiceCall";

function mock(
  hookNames: MethodName | MethodName[], 
  options: HookTriggerOptions,
  action?: Action,
  beforeHook?: (context: HookContext) => Promise<HookContext>, 
  afterHook?: (context: HookContext) => Promise<HookContext>
) {
  hookNames = (Array.isArray(hookNames)) ? hookNames : [hookNames];
  const app = feathers();
  app.use("/tests", new Service({ multi: true }));
  const service = app.service("tests");
  const hook = trigger(options, action);

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

  app.use("/protocol", new Service({ multi: true }));

  const protocolService = app.service("protocol");
  
  return { 
    app, 
    service,
    protocolService
  };
}

describe("action - serviceCall", function() {
  describe("create", function() {
    it("create: use actionServiceCall with {{ placeholder }}", async function() {
      const { 
        service,
        protocolService
      } = mock("create", {
        method: "create",
        service: "tests",
        action: makeActionServiceCall({
          method: "create",
          service: "protocol",
          data: {
            test: "{{ item.test }}"
          }
        })
      });

      await service.create({ id: 0, test: true });

      const protocols = await protocolService.find({ query: {}, paginate: false });
      assert.deepStrictEqual(protocols, [{ id: 0, test: true }], "replaces {{ item.test }}");
      const hallo = "";
    });

    it("create: use actionServiceCall with {{ user.id }}", async function() {
      const { 
        service,
        protocolService
      } = mock("create", {
        method: "create",
        service: "tests",
        action: makeActionServiceCall({
          method: "create",
          service: "protocol",
          data: {
            service: "{{ path }}",
            method: "{{ method }}",
            itemId: "{{ item.id }}",
            text: "{{ item.text }}",
            userId: "{{ user.id }}"
          }
        })
      });

      await service.create({ id: 0, text: "test" }, { user: { id: 1 } });

      const protocols = await protocolService.find({ query: {}, paginate: false });
      assert.deepStrictEqual(protocols, [{ id: 0, service: "tests", method: "create", text: "test", itemId: 0, userId: 1 }], "replaces all placeholders");
    });
  });

  describe("patch", function() {
    it("create: use actionServiceCall with {{ placeholder }}", async function() {
      const { 
        service,
        protocolService
      } = mock("create", {
        method: "create",
        service: "tests",
        action: makeActionServiceCall({
          method: "patch",
          service: "protocol",
          id: 0,
          data: {
            count: 1
          }
        })
      });

      await protocolService.create({ id: 0, count: 0 });
      await service.create({ id: 0, test: true });

      const protocols = await protocolService.find({ query: {}, paginate: false });
      assert.deepStrictEqual(protocols, [{ id: 0, count: 1 }], "patches item");
    });
  });
});