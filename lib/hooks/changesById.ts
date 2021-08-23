import _isEqual from "lodash/isEqual";
import type { HookContext, Id } from "@feathersjs/feathers";
import { getItems } from "feathers-hooks-common";

import { shouldSkip } from "feathers-utils";
import type { Change, HookChangesByIdOptions } from "../types";
import getOrFindById from "../utils/getOrFindById";
import resultById from "../utils/resultById";

const defaultOptions: HookChangesByIdOptions = {
  removeSelect: true,
  skipHooks: false,
  refetchItems: true,
  params: undefined
};

const changesById = <T>(
  cb: (changesById: Record<Id, Change<T>>, context: HookContext) => void | Promise<void>,
  providedOptions?: Partial<HookChangesByIdOptions>
): ((context: HookContext) => Promise<HookContext>) => {
  const options: HookChangesByIdOptions = Object.assign({}, defaultOptions, providedOptions);
  return async (context: HookContext): Promise<HookContext> => {
    if (shouldSkip("checkMulti", context)) { return context; }

    if (context.type === "before") {
      await changesByIdBefore(context, options);
    } else if (context.type === "after") {
      await changesByIdAfter(context, cb, options);
    }
  
    return context;
  };
};

const updateMethods = ["update", "patch"];

export const changesByIdBefore = async (
  context: HookContext, 
  options: Pick<HookChangesByIdOptions, "params" | "skipHooks">
): Promise<HookContext> => {
  let byId;

  if (context.method === "create") {
    byId = {};
  } else if (
    updateMethods.includes(context.method) ||
    context.method === "remove"
  ) {
    byId = await getOrFindById(context, options.params, { skipHooks: options.skipHooks });
  } else { 
    return context; 
  }

  context.params.changelog = context.params.changelog || {};
  context.params.changelog.itemsBefore = byId;
  return context;
};

const getDiffedKeys = (
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  blacklist: string[] = []
): string[] => {
  const keysDiff = [];
  for (const key in obj1) {
    if (
      !blacklist.includes(key) &&
          (!before[key] || !_isEqual(after[key], before[key]))
    ) {
      keysDiff.push(key);
    }
  }
  for (const key in obj2) {
    if (
      !blacklist.includes(key) &&
        (!after[key] || !_isEqual(after[key], before[key])) &&
        !keysDiff.includes(key)
    ) {
      keysDiff.push(key);
    }
  }
  return keysDiff;
};

export const changesByIdAfter = async <T>(
  context: HookContext,
  cb?: (changesById: Record<Id, Change<T>>, context: HookContext) => void | Promise<void>,
  options?: HookChangesByIdOptions
): Promise<HookContext> => {
  if (!context.params.changelog?.itemsBefore) { return context; }

  const { itemsBefore } = context.params.changelog;
  
  let itemsAfter;
  if (context.method === "remove") {
    itemsAfter = {};
  } else {
    if (options.refetchItems) {
      itemsAfter = await refetchItems(context, options);
    } else {
      itemsAfter = resultById(context);
    }
  }
  
  if (!itemsAfter) { return context; }
  const items = (context.method === "remove") ? itemsBefore : itemsAfter;

  const changesById = Object.keys(items).reduce(
    (result: Record<Id, unknown>, id: string): Record<Id, unknown> => {
      if (
        (context.method !== "create" && !itemsBefore[id]) ||
        (context.method !== "remove" && !itemsAfter[id])
      ) {
        throw new Error("Mismatch!");
        //return result;
      }

      const before = itemsBefore[id];
      const after = itemsAfter[id];
      
      result[id] = {
        before: before,
        after: after
      };

      /*if (before && after) {
        const changedKeys = getDiffedKeys(before, after as Record<string, unknown>);
        
        result[id].keys = changedKeys;
      }*/

      return result;
    }, 
    {}
  );
  context.params.changesById = changesById;
  if (cb && typeof cb === "function") {
    await cb(changesById as Record<Id, Change<T>>, context);
  }
  return context;
};

const refetchItemsOptionsDefault: Pick<HookChangesByIdOptions, "params" | "refetchItems" | "skipHooks"> = {
  refetchItems: true,
  params: null,
  skipHooks: true
};

const refetchItems = async (
  context: HookContext,
  _options?: Pick<HookChangesByIdOptions, "params" | "refetchItems" | "skipHooks">
) => {
  const options: Pick<HookChangesByIdOptions, "params" | "refetchItems" | "skipHooks"> = Object.assign(
    {}, 
    refetchItemsOptionsDefault, 
    _options
  );
  const itemOrItems = getItems(context);
  if (!itemOrItems) { return undefined; }

  if (!options.refetchItems) {
    return resultById(context);
  } else {
    return await getOrFindById(context, options.params, { skipHooks: options.skipHooks });
  }
};

export default changesById;