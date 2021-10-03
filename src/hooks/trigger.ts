import type { HookContext } from "@feathersjs/feathers";
import { 
  ChangesById,
  HookTriggerOptions,
  Subscription,
  CallAction
} from "../types";
import { checkContext } from "feathers-hooks-common";
import { changesByIdBefore, changesByIdAfter } from "./changesById";
import transformMustache from "../utils/transformMustache";
import sift from "sift";
import _cloneDeep from "lodash/cloneDeep";

const trigger = (
  options: HookTriggerOptions,
  callAction: CallAction
): ((context: HookContext) => Promise<HookContext>) => {
  if (!options) { 
    throw new Error("You should define subscriptions");
  }

  return async (context: HookContext): Promise<HookContext> => {
    checkContext(context, null, ["create", "update", "patch", "remove"], "trigger");
    
    if (context.type === "before") {
      return await beforeHook(context, options);
    } else if (context.type === "after") {
      return await afterHook(context, callAction);
    }
  };
};

export const beforeHook = async (
  context: HookContext, 
  options: HookTriggerOptions
): Promise<HookContext> => {
  let subs = await getSubscriptions(context, options);

  if (!subs?.length) { return context; }

  if (!Array.isArray(context.data)) {
    subs = subs.reduce((result: Subscription[], sub) => {
      //@ts-expect-error context is not Record<string, unknown>
      const conditionsData = testCondition(context, context.data, sub.conditionsData);
      if (conditionsData === false) { return result; }

      sub = (conditionsData)
        ? Object.assign({}, sub, { conditionsData })
        : sub;

      result.push(sub);
      return result;
    }, []);
  }

  if (!subs?.length) { return context; }

  await changesByIdBefore(context, { skipHooks: false });

  setConfig(context, "subscriptions", subs);

  return context;
};

export const afterHook = async (
  context: HookContext,
  callAction: CallAction
): Promise<HookContext> => {  
  const subs = getConfig(context, "subscriptions");
  if (!subs?.length) { return context;}

  await changesByIdAfter(
    context, 
    null,
    {
      skipHooks: false,
      refetchItems: false
    }
  );

  const now = new Date();

  const promises = [];

  const changesById: ChangesById = context.params?.changesById?.default;
  if (!changesById) { return context; }
  const changes = Object.values(changesById);

  for (const change of changes) {
    const { 
      before
    } = change;
    
    for (let sub of subs) {
      let { item } = change;

      let changeForSub = change;

      if (sub.conditionsResult || sub.conditionsBefore || sub.params || sub.view) {
        sub = _cloneDeep(sub);
      }

      const { 
        conditionsResult, 
        conditionsBefore
      } = sub;

      if (sub.params) {
        const params = (typeof sub.params === "function")
          ? sub.params(change, sub, changes, subs)
          : sub.params;

        if (params) {
          const idField = getIdField(context);
          item = await context.service.get(item[idField], params);
          if (item) {
            changeForSub = Object.assign({}, change, { item });
          }
        }
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

      if (sub.view) {
        if (typeof sub.view === "function") {
          mustacheView = await sub.view(mustacheView, { item: changeForSub, items: changes, subscription: sub, subscriptions: subs, context });
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

      const promise = callAction(changeForSub, { subscription: sub, items: changes, context });

      if (sub.isBlocking) {
        promises.push(promise);
      }
    }
  }

  await Promise.all(promises);
        
  return context;
};

function setConfig (context: HookContext, key: "subscriptions", val: Subscription[]): void
function setConfig (context: HookContext, key: string, val: unknown) {
  context.params.trigger = context.params.trigger || {};
  context.params.trigger[key] = val;
}

function getConfig (context: HookContext, key: "subscriptions"): undefined | Subscription[] 
function getConfig (context: HookContext, key: string) {
  return context.params.trigger?.[key];
}

const defaultSubscription: Subscription = {
  callAction: undefined,
  conditionsBefore: undefined,
  conditionsData: undefined,
  conditionsResult: undefined,
  isBlocking: true,
  method: undefined,
  params: undefined,
  service: undefined,
  view: undefined
};

const getSubscriptions = async (
  context: HookContext,
  options: HookTriggerOptions
): Promise<undefined | Subscription[]> => {
  const _subscriptions = (typeof options === "function")
    ? await options(context)
    : options;

  if (!_subscriptions) { return; }

  let subscriptions = (Array.isArray(_subscriptions)) ? _subscriptions : [_subscriptions];

  subscriptions = subscriptions.map(x => Object.assign({}, defaultSubscription, x));

  const { path, method } = context;

  return subscriptions.filter(sub => {
    if (
      (typeof sub.service === "string" && sub.service !== path) || 
      (Array.isArray(sub.service) && !sub.service.includes(path))
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

export default trigger;