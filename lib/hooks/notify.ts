import type { HookContext } from "@feathersjs/feathers";
import { ChangesById, HookNotifyOptions, Subscription } from "../types";
import { checkContext } from "feathers-hooks-common";
import { changesByIdBefore, changesByIdAfter } from "./changesById";
import transformMustache from "../utils/transformMustache";
import sift from "sift";
import _cloneDeep from "lodash/cloneDeep";
import type { SetRequired } from "type-fest";

const defaultOptions: HookNotifyOptions<unknown> = {
  items: undefined,
  notify: undefined,
  view: undefined,
  params: undefined,
  subscriptions: undefined,
  refetchItems: () => false,
  isBlocking: false
};

const notify = (
  options: SetRequired<HookNotifyOptions<unknown>, "notify" | "subscriptions">
): ((context: HookContext) => Promise<HookContext>) => {
  if (!options.notify) { 
    throw new Error("You should define a notify function");
  }

  if (!options.subscriptions) { 
    throw new Error("You should define subscriptions");
  }

  return async (context: HookContext): Promise<HookContext> => {
    checkContext(context, null, ["create", "update", "patch", "remove"], "notify");
    
    if (context.type === "before") {
      return await beforeHook(context, options);
    } else if (context.type === "after") {
      return await afterHook(context, options);
    }
  };
};

export const beforeHook = async (
  context: HookContext, 
  options: HookNotifyOptions<unknown>
): Promise<HookContext> => {
  if (
    Array.isArray(options.subscriptions) && 
    !subscriptionsForMethod(options.subscriptions, context.path, context.method).length
  ) {
    return context;
  }

  await changesByIdBefore(context, { params: options.params, skipHooks: false });

  return context;
};

export const afterHook = async (
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
      skipHooks: false,
      refetchItems 
    }
  );

  const changesById: ChangesById = context.params?.changesById;

  if (!changesById) { return context; }

  const subscriptions = (typeof options.subscriptions === "function")
    ? await options.subscriptions(context, Object.values(changesById))
    : options.subscriptions;

  const subs = subscriptionsForMethod(subscriptions, context.path, context.method);

  if (!subs?.length) { return context; }

  const items = (typeof options.items === "function") 
    ? await options.items(Object.values(changesById), subscriptions, context)
    : Object.values(changesById);

  if (!items?.length) { return context; }

  const now = new Date();

  const promises = [];

  for (const change of items) {
    const { before, item } = change;
    const subsPerItem = [];
    
    for (let sub of subs) {
      let { conditions, conditionsBefore } = sub;

      if (conditions || conditionsBefore) {
        sub = _cloneDeep(sub);
      }

      let mustacheView: Record<string, unknown> = {
        item,
        before,
        data: context.data,
        id: context.id,
        method: context.method,
        now,
        params: context.params,
        path: context.path,
        service: context.service,
        type: context.type,
        user: context.params,
      };
      if (options.view && typeof options.view === "function") {
        if (typeof options.view === "function") {
          mustacheView = await options.view(mustacheView, { item: change, items, subscription: sub, subscriptions, context });
        } else {
          mustacheView = Object.assign(mustacheView, options.view);
        }
      }
      
      conditions = conditions && transformMustache(conditions, mustacheView);
      conditionsBefore = conditionsBefore && transformMustache(conditionsBefore, mustacheView);
      
      const areConditionsFulFilled = !conditions || sift(conditions)(item);
      const areConditionsBeforeFulFilled = !conditionsBefore || sift(conditionsBefore)(before);

      if (!areConditionsFulFilled || !areConditionsBeforeFulFilled) {
        continue;
      }

      subsPerItem.push(Object.assign({}, sub, { conditionsBefore, conditions }));
    }

    if (subsPerItem.length) {
      promises.push(options.notify(change, subsPerItem, items, context));
    }
  }

  if (options.isBlocking) {
    await Promise.all(promises);
  }
        
  return context;
};

const subscriptionsForMethod = (
  subscriptions: Subscription[], 
  servicePath: string, 
  method: string
): Subscription[] => {
  return subscriptions.filter(sub => {
    if (
      (typeof sub.service === "string" && sub.service !== servicePath) || 
      (Array.isArray(sub.service) && !sub.service.includes(servicePath))
    ) { return false; }
    if (
      (typeof sub.method === "string" && sub.method !== method) ||
      (Array.isArray(sub.method) && !sub.method.includes(method))
    ) { return false; }
    return true;
  });
};

export default notify;