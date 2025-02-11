import { checkContext } from "feathers-hooks-common";
import type { ManipulateParams, Change } from "./changesById";
import {
  changesByIdBefore,
  changesByIdAfter,
  getOrFindByIdParams,
} from "./changesById";
import { replace as transformMustache } from "object-replace-mustache";
import sift from "sift";
import copy from "fast-copy";
import _set from "lodash/set.js";

import type {
  HookContext,
  Id,
  NextFunction,
  Paginated,
  Params,
  ServiceInterface,
} from "@feathersjs/feathers";
import type { Promisable } from "../types.internal";

interface ViewContext<H extends HookContext = HookContext, T = any> {
  item: Change<T>;
  subscription: Subscription<H, T>;
  subscriptions: Subscription<H, T>[];
  items: Change<T>[];
  context: HookContext;
}

export type ActionOptions<H extends HookContext = HookContext, T = any> = {
  subscription: SubscriptionResolved<H, T>;
  items: Change<T>[];
  context: H;
  view: Record<string, any>;
};

export type Action<H extends HookContext = HookContext, T = any> = (
  change: Change<T>,
  options: ActionOptions<H, T>,
) => Promisable<void>;

export type BatchAction<H extends HookContext = HookContext, T = any> = (
  changes: [change: Change<T>, options: ActionOptions<H, T>][],
  context: H,
) => Promisable<void>;

export type HookTriggerOptions<H extends HookContext = HookContext, T = any> =
  | Subscription<H, T>
  | (Subscription<H, T>[] & { batchMode?: never })
  | (((context: H) => Promisable<Subscription<H, T> | Subscription<H, T>[]>) & {
      batchMode?: never;
    });

export type TransformView<H extends HookContext = HookContext, T = any> =
  | undefined
  | ((
      view: Record<string, any>,
      viewContext: ViewContext<H, T>,
    ) => Promisable<Record<string, any>>)
  | Record<string, any>;

export type Condition<H extends HookContext, T = Record<string, any>> =
  | true
  | Record<string, any>
  | ((item: T, context: H) => Promisable<boolean>);

export interface SubscriptionBase<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> {
  /**
   * The name of the subscription
   *
   * Can be used to filter subscriptions
   */
  name?: string;
  service?: string | string[];
  method?: string | string[];
  conditionsData?: Condition<H, T>;
  conditionsResult?: Condition<H, T>;
  conditionsBefore?: Condition<H, T>;
  conditionsParams?: Condition<H, T>;
  view?: TransformView<H, T>;
  params?: ManipulateParams;
  /** @default true */
  isBlocking?: boolean;
  /** @default false */
  fetchBefore?: boolean;

  /** @default false */
  debug?: boolean;

  [key: string]: any;

  [key: number]: any;
}

export type SubscriptionStandardMode<H extends HookContext, T> = {
  batchMode?: false;
  action: Action<H, T>;
} & SubscriptionBase<H, T>;

export type SubscriptionBatchMode<H extends HookContext, T> = {
  batchMode: true;
  action: BatchAction<H, T>;
} & SubscriptionBase<H, T>;

export type Subscription<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = SubscriptionStandardMode<H, T> | SubscriptionBatchMode<H, T>;

export type SubscriptionResolvedBase = {
  dataResolved: boolean | Record<string, any>;
  resultResolved: boolean | Record<string, any>;
  beforeResolved: boolean | Record<string, any>;
  paramsResolved: Params;
  identifier: string;
};

export type SubscriptionResolvedStandardMode<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = SubscriptionResolvedBase & SubscriptionStandardMode<H, T>;

export type SubscriptionResolvedBatchMode<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = SubscriptionResolvedBase & SubscriptionBatchMode<H, T>;

export type SubscriptionResolved<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> =
  | SubscriptionResolvedStandardMode<H, T>
  | SubscriptionResolvedBatchMode<H, T>;

export const trigger = <
  H extends HookContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T = H extends HookContext<infer App, infer S>
    ? S extends ServiceInterface<infer TT>
      ? TT extends Paginated<infer TTT>
        ? TTT
        : TT extends Array<infer TTT>
          ? TTT
          : TT
      : any
    : any,
  Options extends HookTriggerOptions<H, T> = HookTriggerOptions<H, T>,
>(
  options: Options,
) => {
  if (!options) {
    throw new Error("You should define subscriptions");
  }

  return async (context: H, next?: NextFunction): Promise<H> => {
    checkContext(
      context,
      null,
      ["create", "update", "patch", "remove"],
      "trigger",
    );

    if (context.type === "before") {
      return await triggerBefore(context, options);
    } else if (context.type === "after") {
      return await triggerAfter(context);
    } else if (context.type === "around" && next) {
      context = await triggerBefore(context, options);
      await next();
      context = await triggerAfter(context);
      return context;
    } else {
      return context;
    }
  };
};

const makeDebug = (sub: SubscriptionBase, context: HookContext) => {
  if (!sub.debug) {
    return () => {};
  }

  const prepend = [
    "[FEATHERS_TRIGGER DEBUG]",
    ...(sub.name ? [sub.name] : []),
    context.path,
    context.type,
    context.method,
  ];

  return console.log.bind(console, ...prepend);
};

const triggerBefore = async <H extends HookContext, T = Record<string, any>>(
  context: H,
  options: HookTriggerOptions<H, T>,
): Promise<H> => {
  let subs = await getSubscriptions(context, options);

  if (!subs?.length) {
    return context;
  }

  let debug = false;

  if (!Array.isArray(context.data)) {
    const result: SubscriptionResolved<H, T>[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        if (sub.debug) {
          debug = true;
        }
        const log = makeDebug(sub, context);
        if (!sub.action) {
          log("skipping because no action provided");
          return;
        }

        if (
          sub.name &&
          context.params.skipTrigger &&
          (context.params.skipTrigger === sub.name ||
            (Array.isArray(context.params.skipTrigger) &&
              context.params.skipTrigger.includes(sub.name)))
        ) {
          log("skipping because of context.params.skipTrigger");
          return;
        }

        sub.dataResolved =
          typeof sub.conditionsData === "function"
            ? await sub.conditionsData(context.data, context)
            : testCondition(context, context.data, sub.conditionsData ?? {});
        if (sub.dataResolved === false) {
          log(
            "skipping because of conditionsData mismatch",
            sub.conditionsData,
          );
          return;
        }

        sub.conditionsParamsResolved =
          typeof sub.conditionsParams === "function"
            ? await sub.conditionsParams(context.data, context)
            : testCondition(
                context,
                context.params,
                sub.conditionsParams ?? {},
              );
        if (sub.conditionsParamsResolved === false) {
          log(
            "skipping because of conditionsParams mismatch",
            sub.conditionsParams,
          );
          return;
        }

        result.push(sub);
      }),
    );
    subs = result;
  }

  if (!subs?.length) {
    if (debug) {
      console.log(
        "[FEATHERS_TRIGGER DEBUG]",
        context.path,
        context.method,
        "skipping because no subscriptions left",
      );
    }
    return context;
  }

  for (const sub of subs) {
    const log = makeDebug(sub, context);

    if (checkConditions(sub)) {
      log("skipping 'changesByIdBefore' because of 'checkConditions'");
      continue;
    }

    sub.paramsResolved =
      (await getOrFindByIdParams(context, {
        params: sub.params,
        deleteParams: ["trigger"],
        type: "before",
        skipHooks: false,
      })) ?? {};

    sub.identifier = JSON.stringify(sub.paramsResolved.query || {});
    if (context.params.changesById?.[sub.identifier]?.itemsBefore) {
      continue;
    }

    log("fetching before with 'changesByIdBefore'");

    const before = await changesByIdBefore(context, {
      skipHooks: false,
      params: () => (sub.paramsResolved ? sub.paramsResolved : null),
      deleteParams: ["trigger"],
      fetchBefore: sub.fetchBefore || sub.conditionsBefore !== true,
    });

    _set(
      context,
      ["params", "changesById", sub.identifier, "itemsBefore"],
      before,
    );
  }

  setConfig(context, "subscriptions", subs);

  return context;
};

const triggerAfter = async <H extends HookContext>(context: H): Promise<H> => {
  const subs = getConfig(context, "subscriptions");
  if (!subs?.length) {
    return context;
  }

  const now = new Date();

  const promises: Promisable<any>[] = [];

  for (const sub of subs) {
    const log = makeDebug(sub, context);

    if (
      sub.name &&
      context.params.skipTrigger &&
      (context.params.skipTrigger === sub.name ||
        (Array.isArray(context.params.skipTrigger) &&
          context.params.skipTrigger.includes(sub.name)))
    ) {
      log("skipping because of context.params.skipTrigger");
      return context;
    }

    if (checkConditions(sub)) {
      log("skipping 'changesByIdAfter' because of 'checkConditions'");
      continue;
    }
    const itemsBefore =
      context.params.changesById?.[sub.identifier]?.itemsBefore;
    let changesById: Record<Id, Change> | undefined;
    if (itemsBefore) {
      log("fetching after with 'changesByIdAfter'");

      changesById = await changesByIdAfter(context, itemsBefore, null, {
        name: ["changesById", sub.identifier],
        params: sub.params,
        skipHooks: false,
        deleteParams: ["trigger"],
        fetchBefore: sub.fetchBefore,
      });

      _set(context, ["params", "changesById", sub.identifier], changesById);
    }

    changesById = context.params.changesById?.[sub.identifier];

    if (!changesById) {
      log("no changesById");
      continue;
    }

    const changes = Object.values(changesById);

    const batchActionArguments: [change: Change, options: ActionOptions][] = [];

    for (const change of changes) {
      const { before } = change;
      const { item } = change;

      const changeForSub = change;

      const { conditionsResult, conditionsBefore } = sub;

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
        user: context.params?.user,
      };

      if (sub.view) {
        if (typeof sub.view === "function") {
          mustacheView = await sub.view(mustacheView, {
            item: changeForSub,
            items: changes,
            subscription: sub,
            subscriptions: subs,
            context,
          });
        } else {
          mustacheView = Object.assign(mustacheView, sub.view);
        }
      }

      sub.resultResolved =
        typeof conditionsResult === "function"
          ? await conditionsResult({ item, before }, context)
          : testCondition(mustacheView, item, conditionsResult ?? {});
      if (!sub.resultResolved) {
        log("skipping because of conditionsResult mismatch", conditionsResult);
        continue;
      }

      sub.beforeResolved =
        typeof conditionsBefore === "function"
          ? await conditionsBefore({ item, before }, context)
          : testCondition(mustacheView, before, conditionsBefore ?? {});
      if (!sub.beforeResolved) {
        log("skipping because of conditionsBefore mismatch", conditionsBefore);
        continue;
      }

      if (isSubscriptionInBatchMode(sub)) {
        log("adding to batchActionArguments");
        batchActionArguments.push([
          changeForSub,
          {
            subscription: sub,
            items: changes,
            context,
            view: mustacheView,
          },
        ]);
      } else if (isSubscriptionNormalMode(sub)) {
        const _action = sub.action;

        log("running action");

        const promise = _action(changeForSub, {
          subscription: sub,
          items: changes,
          context,
          view: mustacheView,
        });

        if (sub.isBlocking) {
          promises.push(promise);
        }
      }
    }

    if (isSubscriptionInBatchMode(sub) && batchActionArguments.length) {
      log("running batch action");
      const promise = sub.action(batchActionArguments, context);

      if (sub.isBlocking) {
        promises.push(promise);
      }
    }
  }

  await Promise.all(promises);

  return context;
};

function setConfig(
  context: HookContext,
  key: "subscriptions",
  val: SubscriptionResolved<any, any>[],
): void;
function setConfig(context: HookContext, key: string, val: unknown): void {
  context.params.trigger = context.params.trigger || {};
  context.params.trigger[key] = val;
}

function getConfig(
  context: HookContext,
  key: "subscriptions",
): undefined | SubscriptionResolved[];
function getConfig(
  context: HookContext,
  key: string,
): undefined | SubscriptionResolved[] {
  return context.params.trigger?.[key];
}

function checkConditions(
  sub: SubscriptionResolved<any, any> | Subscription<any, any>,
): boolean {
  return !sub.conditionsBefore && !sub.conditionsData && !sub.conditionsResult;
}

const defaultSubscription: Partial<SubscriptionResolved> = {
  name: undefined,
  action: undefined,
  conditionsBefore: true,
  conditionsData: true,
  conditionsParams: true,
  conditionsResult: true,
  dataResolved: undefined,
  beforeResolved: undefined,
  resultResolved: undefined,
  isBlocking: true,
  batchMode: false,
  method: undefined,
  params: undefined,
  service: undefined,
  view: undefined,
  paramsResolved: undefined,
  identifier: "default",
  fetchBefore: false,
};

const getSubscriptions = async <H extends HookContext, T = any>(
  context: H,
  options: HookTriggerOptions<H, T>,
): Promise<undefined | SubscriptionResolved<H, T>[]> => {
  const _subscriptions =
    typeof options === "function" ? await options(context) : options;

  if (!_subscriptions) {
    return;
  }

  const subscriptions = Array.isArray(_subscriptions)
    ? _subscriptions
    : [_subscriptions];

  const subscriptionsResolved = subscriptions.map(
    (x) =>
      Object.assign({}, defaultSubscription, x) as SubscriptionResolved<H, T>,
  );

  const { path, method } = context;

  return subscriptionsResolved.filter((sub) => {
    if (
      (typeof sub.service === "string" && sub.service !== path) ||
      (Array.isArray(sub.service) && !sub.service.includes(path))
    ) {
      return false;
    }
    if (
      (typeof sub.method === "string" && sub.method !== method) ||
      (Array.isArray(sub.method) && !sub.method.includes(method))
    ) {
      return false;
    }
    return true;
  });
};

const isSubscriptionInBatchMode = (
  sub: SubscriptionResolved,
): sub is SubscriptionResolvedBatchMode => !!sub.batchMode;

const isSubscriptionNormalMode = (
  sub: SubscriptionResolved,
): sub is SubscriptionResolvedStandardMode => !sub.batchMode;

const testCondition = (
  mustacheView: Record<any, any>,
  item: unknown,
  conditions: true | Record<string, any>,
): boolean | Record<string, unknown> => {
  if (conditions === true) {
    return true;
  }

  conditions = copy(conditions);
  const transformedConditions = transformMustache(conditions, mustacheView);
  return sift(transformedConditions)(item) ? transformedConditions : false;
};
