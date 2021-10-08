import feathers, { Application, HookContext } from "@feathersjs/feathers";
import assert from "assert";
import { Service } from "feathers-memory";
import { HookTriggerOptions, trigger } from "../../src";

describe("trigger-count.test.ts", function() {
  let app: Application;
  let service: Service;
  let findCounterByParams: Record<string, number>;
  let getCounterByParams: Record<string, number>;
  let triggerCounter: number;
  
  function findCount() {
    let result = 0;
    Object.values(findCounterByParams).map(x => result += x);
    return result;
  }

  function getCount() {
    let result = 0;
    Object.values(getCounterByParams).map(x => result += x);
    return result;
  }

  function reset() {
    triggerCounter = 0;
    findCounterByParams = {};
    getCounterByParams = {};
  }

  function mock(options?: HookTriggerOptions) {
    options = options || {};
    reset();
      
    app = feathers();
    app.use("/test", new Service({ 
      multi: true,
      id: "id",
      startId: 1
    }));
    service = app.service("test");
    
    const triggerHook = trigger(options, () => {
      triggerCounter++;
    });
    
    //@ts-expect-error hooks function not on service
    service.hooks({
      before: {
        all: [],
        find: [
          (context: HookContext) => {
            const stringified = JSON.stringify(context.params);

            if (!findCounterByParams[stringified]) {
              findCounterByParams[stringified] = 0;
            }
            
            findCounterByParams[stringified]++;
          }
        ],
        get: [
          (context: HookContext) => {
            const stringified = JSON.stringify(context.params);
    
            if (!getCounterByParams[stringified]) {
              getCounterByParams[stringified] = 0;
            }
                
            getCounterByParams[stringified]++;
          }
        ],
        create: [triggerHook],
        update: [triggerHook],
        patch: [triggerHook],
        remove: [triggerHook]
      },
      after: {
        all: [],
        find: [],
        get: [],
        create: [triggerHook],
        update: [triggerHook],
        patch: [triggerHook],
        remove: [triggerHook]
      }
    });
  }

  beforeEach(function() {
    reset();
  });

  it("methods without sub.params doesn't use find/get", async function() {
    mock();
    const item = await service.create({ test: true });
    assert.strictEqual(triggerCounter, 1);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.update(item.id, { id: item.id, test: false });
    assert.strictEqual(triggerCounter, 2);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.patch(item.id, { test: true });
    assert.strictEqual(triggerCounter, 3);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.patch(null, { test: true });
    assert.strictEqual(triggerCounter, 4);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.remove(item.id);
    assert.strictEqual(triggerCounter, 5);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.create({ test: true });
    assert.strictEqual(triggerCounter, 6);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.remove(null);
    assert.strictEqual(triggerCounter, 7);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);
  });

  it.skip("methods with unchanged sub.params doesn't use find/get", async function() {
    mock({ params: (params) => params });
    const item = await service.create({ test: true });
    assert.strictEqual(triggerCounter, 1);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.update(item.id, { id: item.id, test: false });
    assert.strictEqual(triggerCounter, 2);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.patch(item.id, { test: true });
    assert.strictEqual(triggerCounter, 3);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.patch(null, { test: true });
    assert.strictEqual(triggerCounter, 4);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.remove(item.id);
    assert.strictEqual(triggerCounter, 5);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.create({ test: true });
    assert.strictEqual(triggerCounter, 6);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.remove(null);
    assert.strictEqual(triggerCounter, 7);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);
  });

  it("methods with sub.params uses find/get", async function() {
    mock({ params: (params) => {
      params.$populateParams = { name: "all" };
      return params;
    } });
    const item = await service.create({ test: true });
    assert.strictEqual(triggerCounter, 1);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 0);

    await service.update(item.id, { id: item.id, test: false });
    assert.strictEqual(triggerCounter, 2);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 1);

    await service.patch(item.id, { test: true });
    assert.strictEqual(triggerCounter, 3);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 2);

    await service.patch(null, { test: true });
    assert.strictEqual(triggerCounter, 4);
    assert.strictEqual(findCount(), 2);
    assert.strictEqual(getCount(), 2);

    await service.remove(item.id);
    assert.strictEqual(triggerCounter, 5);
    assert.strictEqual(findCount(), 2);
    assert.strictEqual(getCount(), 2);

    await service.create({ test: true });
    assert.strictEqual(triggerCounter, 6);
    assert.strictEqual(findCount(), 3);
    assert.strictEqual(getCount(), 2);

    await service.remove(null);
    assert.strictEqual(triggerCounter, 7);
    assert.strictEqual(findCount(), 3);
    assert.strictEqual(getCount(), 2);
  });

  it("methods with fetchBefore:true uses find/get", async function() {
    mock({ fetchBefore: true });
    const item = await service.create({ test: true });
    assert.strictEqual(triggerCounter, 1);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 0);

    await service.update(item.id, { id: item.id, test: false });
    assert.strictEqual(triggerCounter, 2);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 1);

    await service.patch(item.id, { test: true });
    assert.strictEqual(triggerCounter, 3);
    assert.strictEqual(findCount(), 0);
    assert.strictEqual(getCount(), 2);

    await service.patch(null, { test: true });
    assert.strictEqual(triggerCounter, 4);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 2);

    await service.remove(item.id);
    assert.strictEqual(triggerCounter, 5);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 3);

    await service.create({ test: true });
    assert.strictEqual(triggerCounter, 6);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 3);

    await service.remove(null);
    assert.strictEqual(triggerCounter, 7);
    assert.strictEqual(findCount(), 2);
    assert.strictEqual(getCount(), 3);
  });

  it("methods with fetchBefore:true and params uses find/get twice", async function() {
    mock({ fetchBefore: true, params: (params) => {
      params.$populateParams = { name: "all" };
      return params;
    } });
    const item = await service.create({ test: true });
    assert.strictEqual(triggerCounter, 1);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 0);

    await service.update(item.id, { id: item.id, test: false });
    assert.strictEqual(triggerCounter, 2);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 2);

    await service.patch(item.id, { test: true });
    assert.strictEqual(triggerCounter, 3);
    assert.strictEqual(findCount(), 1);
    assert.strictEqual(getCount(), 4);

    await service.patch(null, { test: true });
    assert.strictEqual(triggerCounter, 4);
    assert.strictEqual(findCount(), 3);
    assert.strictEqual(getCount(), 4);

    await service.remove(item.id);
    assert.strictEqual(triggerCounter, 5);
    assert.strictEqual(findCount(), 3);
    assert.strictEqual(getCount(), 5);

    await service.create({ test: true });
    assert.strictEqual(triggerCounter, 6);
    assert.strictEqual(findCount(), 4);
    assert.strictEqual(getCount(), 5);

    await service.remove(null);
    assert.strictEqual(triggerCounter, 7);
    assert.strictEqual(findCount(), 5);
    assert.strictEqual(getCount(), 5);
  });
});