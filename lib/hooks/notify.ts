import type { HookContext } from "@feathersjs/feathers";
import { ChangesById, HookNotifyOptions } from "../types";
import { checkContext } from "feathers-hooks-common";
import { changesByIdBefore, changesByIdAfter } from "./changesById";
import transformMustache from "../utils/transformMustache";
import sift from "sift";
import _cloneDeep from "lodash/cloneDeep";
import type { SetRequired } from "type-fest";

export default (
  options: SetRequired<HookNotifyOptions<unknown>, "notify" | "subscriptions">
): ((context: HookContext) => Promise<HookContext>) => {
  if (!options.notify) { 
    throw new Error("You should define a notify function");
  }

  if (!options.subscriptions) { 
    throw new Error("You should define subscriptions");
  }

  return async (context: HookContext): Promise<HookContext> => {
    
    checkContext(context, null, ["create", "update", "patch", "remove"]);
    
    if (context.type === "before") {
      return await beforeHook(context, options);
    } else if (context.type === "after") {
      return await afterHook(context, options);
    }
  };
};

const beforeHook = async (
  context: HookContext, 
  options: HookNotifyOptions<unknown>
): Promise<HookContext> => {
  if (
    Array.isArray(options.subscriptions) && 
    options.subscriptions.every(x => x.service !== context.path && x.method !== context.method)
  ) {
    return context;
  }

  changesByIdBefore(context, { params: options.params, skipHooks: true });

  return context;
};

const defaultOptions: HookNotifyOptions<unknown> = {
  items: undefined,
  notify: undefined,
  view: undefined,
  params: undefined,
  subscriptions: undefined,
  refetchItems: () => false,
  isBlocking: false
};

const afterHook = async (
  context: HookContext, 
  _options: HookNotifyOptions<unknown>
): Promise<HookContext> => {
  const options: HookNotifyOptions<unknown> = Object.assign(
    {},
    defaultOptions,
    _options
  );

  const refetchItems = await options.refetchItems(context);

  await changesByIdAfter(
    context, 
    null,
    { 
      params: options.params, 
      skipHooks: true, 
      removeSelect: true,
      refetchItems 
    }
  );

  const changesById: ChangesById<unknown> = context.params?.changesById;

  if (!changesById) { return context; }

  const subscriptions = (typeof options.subscriptions === "function")
    ? await options.subscriptions(context, Object.values(changesById))
    : options.subscriptions;

  if (!subscriptions?.length || subscriptions.every(x => x.service !== context.service && x.method !== context.method)) { return context; }

  const items = (typeof options.items === "function") 
    ? await options.items(Object.values(changesById), subscriptions, context)
    : Object.values(changesById);

  if (!items?.length) { return context; }

  const now = new Date();

  const promises = [];

  for (const item of items) {
    const subsPerItem = [];
    for (let sub of subscriptions) {
      if (sub.service !== context.path || sub.method !== context.method) {
        continue;
      }
      let { conditionsBefore, conditionsAfter } = sub;

      if (conditionsBefore && conditionsAfter) {
        sub = _cloneDeep(sub);
      }
                    
      const { before, after } = item;
      let mustacheView: Record<string, unknown> = {
        before,
        after,
        now,
        service: context.service,
        method: context.method
      };
      if (options.view && typeof options.view === "function") {
        if (typeof options.view === "function") {
          mustacheView = await options.view(mustacheView, { item, items, subscription: sub, subscriptions, context });
        } else {
          mustacheView = Object.assign(mustacheView, options.view);
        }
      }
      
      conditionsBefore = conditionsBefore && transformMustache(conditionsBefore, mustacheView);
      conditionsAfter = conditionsAfter && transformMustache(conditionsAfter, mustacheView);

      const isBeforeFulFilled = !conditionsBefore || [before].filter(sift(conditionsBefore)).length === 1;
      const isAfterFulFilled = !conditionsAfter || [after].filter(sift(conditionsAfter)).length === 1;

      if (!isBeforeFulFilled || !isAfterFulFilled) {
        continue;
      }

      subsPerItem.push(Object.assign({}, sub, { conditionsBefore, conditionsAfter }));
    }

    if (subsPerItem.length) {
      promises.push(options.notify(item, subsPerItem, items, context));
    }
  }

  if (options.isBlocking) {
    await Promise.all(promises);
  }
        
  return context;
};