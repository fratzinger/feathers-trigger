import type { HookContext, Id, Params } from "@feathersjs/feathers";
import { getItems } from "feathers-hooks-common";

import _cloneDeep from "lodash/cloneDeep";

import { shouldSkip } from "feathers-utils";
import type { Change, HookChangesByIdOptions, ManipulateParams } from "../types";

const defaultOptions: HookChangesByIdOptions = {
  skipHooks: false,
  refetchItems: false,
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

export const changesByIdAfter = async <T>(
  context: HookContext,
  cb?: (changesById: Record<Id, Change<T>>, context: HookContext) => void | Promise<void>,
  options?: HookChangesByIdOptions
): Promise<HookContext> => {
  if (!context.params.changelog?.itemsBefore) { return context; }

  const { itemsBefore } = context.params.changelog;
  
  const items = await resultById(context, options);
  
  if (!items) { return context; }
  const itemsBeforeOrAfter = (context.method === "remove") ? itemsBefore : items;

  const changesById = Object.keys(itemsBeforeOrAfter).reduce(
    (result: Record<Id, Change>, id: string): Record<Id, Change> => {
      if (
        (context.method !== "create" && !itemsBefore[id]) ||
        (context.method !== "remove" && !items[id])
      ) {
        throw new Error("Mismatch!");
        //return result;
      }

      const before = itemsBefore[id];
      const item = items[id];
      
      result[id] = {
        before: before,
        item: item
      };

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

const getIdField = (context: Pick<HookContext, "service">): string => {
  return context.service.options.id;
};

const getOrFindById = async <T>(
  context: HookContext, 
  makeParams?: ManipulateParams,
  _options?: Pick<HookChangesByIdOptions, "skipHooks"> & { byId?: boolean }
): Promise<Record<Id, T> | T[] | undefined> => {
  const options = _options || Object.assign({
    skipHooks: true,
    byId: true
  }, _options);
  
  let itemOrItems;
  const idField = getIdField(context);

  if (context.id == null) {
    const method = (options.skipHooks) ? "_find" : "find";
    if (context.type === "before") {
      let params = _cloneDeep(context.params);

      delete params.query.$select;

      params = Object.assign({ paginate: false }, params);
  
      params = (typeof makeParams === "function") ? await makeParams(params, context) : context.params;
      itemOrItems = await context.service[method](params);
    } else if (context.type === "after") {
      itemOrItems = getItems(context);
      if (!itemOrItems) { return; }
      const fetchedItems = (Array.isArray(itemOrItems)) ? itemOrItems : [itemOrItems];
      
      const ids = fetchedItems.map(x => x && x[idField]);

      let params: Params = (context.id)
        ? {
          query: {
            [idField]: { $in: ids }
          },
          paginate: false
        }
        : {};

      params = (makeParams) ? await makeParams(params, context) : params;
      itemOrItems = await context.service[method](params);
    }

    itemOrItems = itemOrItems && (itemOrItems.data || itemOrItems);
  } else {
    const method = (options.skipHooks) ? "_get" : "get";
    const query = Object.assign({}, context.params.query);

    delete query.$select;

    let params: Params = Object.assign({}, context.params, { query });
      
    params = (typeof makeParams === "function") ? await makeParams(params, context) : params;
    itemOrItems = await context.service[method](context.id, params);
  }
  
  const items = (!itemOrItems)
    ? []
    : (Array.isArray(itemOrItems))
      ? itemOrItems
      : [itemOrItems];

  if (options.byId) {
    return items.reduce((byId, item) => {
      const id = item[idField];
      byId[id] = item;
      return byId;
    }, {});
  } else {
    return items;
  }
};

const resultById = async (
  context: HookContext,
  options?: Pick<HookChangesByIdOptions, "params" | "refetchItems" | "skipHooks">
): Promise<Record<string, unknown>> => {
  if (!context.result) { return {}; }
  
  let items: Record<string, unknown>[];
  if (context.method === "remove" || (!options.refetchItems && !context.params.query?.$select)) {
    let itemOrItems = context.result;
    itemOrItems = (Array.isArray(itemOrItems.data)) ? itemOrItems.data : itemOrItems;
    items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  } else {
    items = await getOrFindById(context, options.params, { skipHooks: options.skipHooks, byId: false }) as Record<string, unknown>[];
  }
  
  const idField = context.service.id;

  return items.reduce((byId: Record<Id, Record<string, unknown>>, item: Record<string, unknown>) => {
    const id = item[idField] as Id;
    byId[id] = item;
    return byId;
  }, {});
};

export default changesById;