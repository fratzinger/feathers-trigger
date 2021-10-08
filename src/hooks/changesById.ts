
import { getItems } from "feathers-hooks-common";

import _cloneDeep from "lodash/cloneDeep";
import _get from "lodash/get";
import _set from "lodash/set";
import _isEqual from "lodash/isEqual";

import { shouldSkip } from "feathers-utils";

import type { HookContext, Id, Params } from "@feathersjs/feathers";
import type { Change, HookChangesByIdOptions, ManipulateParams } from "../types";

const defaultOptions: Required<HookChangesByIdOptions> = {
  skipHooks: false,
  params: undefined,
  name: "changesById",
  deleteParams: [],
  fetchBefore: false
};

const changesById = <T>(
  cb: (changesById: Record<Id, Change<T>>, context: HookContext) => void | Promise<void>,
  _options?: Partial<HookChangesByIdOptions>
): ((context: HookContext) => Promise<HookContext>) => {
  const options: HookChangesByIdOptions = Object.assign({}, defaultOptions, _options);
  return async (context: HookContext): Promise<HookContext> => {
    if (shouldSkip("checkMulti", context)) { return context; }

    const pathBefore = getPath(options.name, true);

    if (context.type === "before") {
      const changes = await changesByIdBefore(context, options);
      if (!changes) { return context; }

      _set(context, pathBefore, changes);
    } else if (context.type === "after") {
      const itemsBefore = _get(context, pathBefore);
      const changes = await changesByIdAfter(context, itemsBefore, cb, options);
      if (!changes) { return context; }

      _set(context, getPath(options.name, false), changes);
    }
  
    return context;
  };
};

const updateMethods = ["update", "patch"];

export const changesByIdBefore = async (
  context: HookContext, 
  _options: HookChangesByIdOptions
): Promise<Record<string, unknown> | unknown[]> => {
  const options: Required<HookChangesByIdOptions> = Object.assign({}, defaultOptions, _options);
  let byId: Record<string, unknown> | unknown[];

  if (
    context.method === "create" ||
    !options.fetchBefore
  ) {
    byId = {};
  } else if (
    updateMethods.includes(context.method) ||
    context.method === "remove"
  ) {
    byId = await getOrFindById(context, options.params, { skipHooks: options.skipHooks });
  } else { 
    return; 
  }

  return byId;
};

export const changesByIdAfter = async <T>(
  context: HookContext,
  itemsBefore: any,
  cb?: (changesById: Record<Id, Change<T>>, context: HookContext) => void | Promise<void>,
  _options?: HookChangesByIdOptions
): Promise<Record<Id, Change>> => {
  if (!itemsBefore) { return; }

  const options: Required<HookChangesByIdOptions> = Object.assign({}, defaultOptions, _options);

  const items = await resultById(context, options);
  
  if (!items) { return; }
  const itemsBeforeOrAfter = (context.method === "remove" && options.fetchBefore) ? itemsBefore : items;

  const changesById = Object.keys(itemsBeforeOrAfter).reduce(
    (result: Record<Id, Change>, id: string): Record<Id, Change> => {
      if (
        options.fetchBefore &&
        ((context.method !== "create" && !itemsBefore[id]) ||
        (context.method !== "remove" && !items[id]))
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
  
  if (cb && typeof cb === "function") {
    await cb(changesById as Record<Id, Change<T>>, context);
  }

  return changesById;
};

export const getOrFindByIdParams = async (
  context: HookContext,
  makeParams: ManipulateParams,
  options?: Pick<HookChangesByIdOptions, "deleteParams">
): Promise<Params> => {
  if (context.id == null) {
    if (context.type === "before") {
      let params = _cloneDeep(context.params);
      delete params.changesById;

      if (options?.deleteParams) {
        options.deleteParams.forEach(key => {
          delete params[key];
        });
      }

      if (params.query?.$select) {
        delete params.query.$select;
      }

      params = Object.assign({ paginate: false }, params);
  
      params = (typeof makeParams === "function") 
        ? await makeParams(params, context) 
        : params;
      return params;
    } else {
      if (!makeParams && !context.params.query?.$select) { return; }

      const itemOrItems = getItems(context);
      const idField = getIdField(context);

      if (!itemOrItems) { return; }
      const fetchedItems = (Array.isArray(itemOrItems)) ? itemOrItems : [itemOrItems];
      
      const ids = fetchedItems.map(x => x && x[idField]);

      let params: Params = {
        query: {
          [idField]: { $in: ids }
        },
        paginate: false
      };

      params = (makeParams) ? await makeParams(params, context) : params;
      return params;
    }
  } else {
    if (
      context.type === "after" && 
      !makeParams &&
      !context.params.query?.$select) {
      return;
    }

    const query = Object.assign({}, context.params.query);

    delete query.$select;

    let params: Params = Object.assign({}, context.params, { query });
    delete params.changesById;

    if (options?.deleteParams) {
      options.deleteParams.forEach(key => {
        delete params[key];
      });
    }
      
    params = (typeof makeParams === "function") 
      ? await makeParams(params, context) 
      : params;

    return params;
  }
};

const getOrFindById = async <T>(
  context: HookContext, 
  makeParams?: ManipulateParams,
  _options?: Pick<HookChangesByIdOptions, "skipHooks" | "deleteParams"> & { byId?: boolean }
): Promise<Record<Id, T> | T[] | undefined> => {
  const options = Object.assign({
    skipHooks: true,
    byId: true
  }, _options);
  
  let itemOrItems;
  const idField = getIdField(context);

  const params = await getOrFindByIdParams(context, makeParams, options);

  if (context.id == null) {
    const method = (options.skipHooks) ? "_find" : "find";

    itemOrItems = await context.service[method](params);

    itemOrItems = itemOrItems && (itemOrItems.data || itemOrItems);
  } else {
    const method = (options.skipHooks) ? "_get" : "get";

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
  options?: Pick<HookChangesByIdOptions, "params" | "skipHooks" | "deleteParams">
): Promise<Record<string, unknown>> => {
  if (!context.result) { return {}; }
  
  let items: Record<string, unknown>[];
  let params = await getOrFindByIdParams(context, options.params, options);

  if (params) {
    const contextParams = Object.assign({}, context.params);
    delete contextParams.changesById;
    if (options?.deleteParams) {
      options.deleteParams.forEach(key => {
        delete contextParams[key];
      });
    }
  
    if (_isEqual(params, context.params)) {
      params = null;
    }
  }

  if (context.method === "remove" || !params) {
    let itemOrItems = context.result;
    itemOrItems = (Array.isArray(itemOrItems.data)) ? itemOrItems.data : itemOrItems;
    items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  } else {
    items = await getOrFindById(
      context, 
      () => params,
      { 
        skipHooks: options.skipHooks, 
        byId: false 
      }
    ) as Record<string, unknown>[];
  }
  
  const idField = context.service.id;

  return items.reduce((byId: Record<Id, Record<string, unknown>>, item: Record<string, unknown>) => {
    const id = item[idField] as Id;
    byId[id] = item;
    return byId;
  }, {});
};

const getIdField = (context: Pick<HookContext, "service">): string => {
  return context.service.options.id;
};

const getPath = (
  path: string | string[],
  isBefore: boolean
): string | string[] => {
  if (isBefore) {
    if (typeof path === "string") {
      return `params.${path}.itemsBefore`;
    } else {
      return ["params", ...path, "itemsBefore"];
    }
  } else {
    if (typeof path === "string") {
      return `params.${path}`;
    } else {
      return ["params", ...path];
    }
  }
};

export default changesById;