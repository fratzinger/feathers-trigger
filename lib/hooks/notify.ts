import type { HookContext } from "@feathersjs/feathers";
import { ChangesById, HookNotifyOptions, Subscription } from "../types";
import { checkContext } from "feathers-hooks-common";
import { changesByIdBefore, changesByIdAfter } from "./changesById";
import transformMustache from "../utils/transformMustache";
import sift from "sift";
import _cloneDeep from "lodash/cloneDeep";
import type { SetRequired } from "type-fest";

const defaultOptions: HookNotifyOptions<unknown> = {
  notify: undefined,
  subscriptions: undefined,
  isBlocking: false
};

const notify = (
  options: SetRequired<HookNotifyOptions<unknown>, "notify" | "subscriptions">
): ((context: HookContext) => Promise<HookContext>) => {
  if (!options.notify || typeof options.notify !== "function") { 
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
    !getSubsForMethod(options.subscriptions, context.path, context.method).length
  ) {
    return context;
  }

  await changesByIdBefore(context, { skipHooks: false });

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

  await changesByIdAfter(
    context, 
    null,
    {
      skipHooks: false,
      refetchItems: false
    }
  );

  const changesById: ChangesById = context.params?.changesById;

  if (!changesById) { return context; }

  const _subscriptions = (typeof options.subscriptions === "function")
    ? await options.subscriptions(context, Object.values(changesById))
    : options.subscriptions;

  const subscriptions = (Array.isArray(_subscriptions)) ? _subscriptions : [_subscriptions];

  const subs = getSubsForMethod(subscriptions, context.path, context.method);

  if (!subs?.length) { return context; }

  const changes = Object.values(changesById);

  if (!changes?.length) { return context; }

  const now = new Date();

  const promises = [];

  for (const change of changes) {
    const { before } = change;
    
    for (let sub of subs) {
      const { 
        conditionsResult, 
        conditionsBefore
      } = sub;

      let { item } = change;

      let changeForSub = change;

      if (conditionsResult || conditionsBefore || sub.params || sub.view) {
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

      if (sub.params) {
        const params = (typeof sub.params === "function")
          ? sub.params(change, sub, changes, subscriptions)
          : sub.params;

        if (params) {
          const idField = getIdField(context);
          item = await context.service.get(item[idField], params);
          if (item) {
            mustacheView.item = item;
            changeForSub = Object.assign({}, change, { item });
          }
        }
      }

      if (sub.view) {
        if (typeof sub.view === "function") {
          mustacheView = await sub.view(mustacheView, { item: changeForSub, items: changes, subscription: sub, subscriptions, context });
        } else {
          mustacheView = Object.assign(mustacheView, sub.view);
        }
      }

      const conditionsResultNew = testCondition(mustacheView, item, conditionsResult);
      if (conditionsResultNew === false) { continue; }

      const conditionsBeforeNew = testCondition(mustacheView, before, conditionsBefore);
      if (conditionsBeforeNew === false) { continue; }

      sub = Object.assign({}, sub, { 
        conditionsBefore: conditionsBeforeNew,
        conditionsResult: conditionsResultNew
      });

      const notify = sub.notify || options.notify;

      promises.push(notify(changeForSub, sub, changes, context));
    }
  }

  if (options.isBlocking) {
    await Promise.all(promises);
  }
        
  return context;
};

const getSubsForMethod = (
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

const testCondition = (
  mustacheView: Record<string, unknown>,
  item: unknown,
  conditions?: true | Record<string, unknown>,
): undefined | boolean | Record<string, unknown> => {
  if (conditions !== undefined && conditions !== true) {
    conditions = transformMustache(conditions, mustacheView);
  }
  
  const areConditionsFulFilled = conditions === undefined || conditions === true || sift(conditions)(item);

  if (!areConditionsFulFilled) {
    return false;
  }
  
  return conditions;
};

const getIdField = (context: Pick<HookContext, "service">): string => {
  return context.service.options.id;
};

export default notify;