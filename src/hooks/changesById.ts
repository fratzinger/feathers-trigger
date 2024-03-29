import { getItems } from "feathers-hooks-common";

import copy from "fast-copy";
import _get from "lodash/get.js";
import _set from "lodash/set.js";
import _isEqual from "lodash/isEqual.js";

import { shouldSkip } from "feathers-utils";

import type { HookContext, Id, Params } from "@feathersjs/feathers";
import type { Promisable } from "../types.internal";

export type Change<T = any> = {
  before: T;
  item: T;
};

export type ChangesById<T = any> = {
  [key: string]: Change<T>;
  [key: number]: Change<T>;
};

export type ManipulateParams<H extends HookContext = HookContext> = (
  params: Params,
  context: H,
) => Promisable<Params | null>;

export interface HookChangesByIdOptions<H extends HookContext = HookContext> {
  skipHooks: boolean;
  params?: ManipulateParams<H>;
  deleteParams?: string[];
  name?: string | string[];
  /** @default false */
  fetchBefore?: boolean;
}

const defaultOptions = {
  skipHooks: false,
  params: undefined,
  name: "changesById",
  deleteParams: [],
  fetchBefore: false,
} satisfies Partial<HookChangesByIdOptions>;

export interface ChangesByIdParams extends Params {
  changesById: any;
}

declare module "@feathersjs/feathers" {
  interface Params {
    paginate?: any;
    changesById?: any;
  }
}

export const changesById = <H extends HookContext, T = any>(
  cb: (changesById: Record<Id, Change<T>>, context: H) => void | Promise<void>,
  _options?: Partial<HookChangesByIdOptions<H>>,
) => {
  const options = Object.assign({}, defaultOptions, _options);
  return async (context: H): Promise<H> => {
    if (shouldSkip("checkMulti", context)) {
      return context;
    }

    const pathBefore = getPath(options.name, true);

    if (context.type === "before") {
      const changes = await changesByIdBefore(context, options);
      if (!changes) {
        return context;
      }

      _set(context, pathBefore, changes);
    } else if (context.type === "after") {
      const itemsBefore = _get(context, pathBefore);
      const changes = await changesByIdAfter(context, itemsBefore, cb, options);
      if (!changes) {
        return context;
      }

      _set(context, getPath(options.name, false), changes);
    }

    return context;
  };
};

const updateMethods = ["update", "patch"];

export const changesByIdBefore = async <H extends HookContext>(
  context: H,
  _options: HookChangesByIdOptions<H>,
): Promise<Record<string, unknown> | unknown[]> => {
  const options = Object.assign({}, defaultOptions, _options);
  let byId: Record<string, unknown> | unknown[];

  if (context.method === "create" || !options.fetchBefore) {
    byId = {};
  } else if (
    updateMethods.includes(context.method) ||
    context.method === "remove"
  ) {
    byId =
      (await getOrFindById(context, options.params, {
        skipHooks: options.skipHooks,
      })) ?? {};
  } else {
    return [];
  }

  return byId;
};

export const changesByIdAfter = async <H extends HookContext, T = any>(
  context: H,
  itemsBefore: any,
  cb?:
    | ((changesById: Record<Id, Change<T>>, context: H) => void | Promise<void>)
    | null,
  _options?: HookChangesByIdOptions<H>,
): Promise<Record<Id, Change> | undefined> => {
  if (!itemsBefore) {
    return;
  }

  const options = Object.assign({}, defaultOptions, _options);

  const items = await resultById(context, options);

  if (!items) {
    return;
  }
  const itemsBeforeOrAfter =
    context.method === "remove" && options.fetchBefore ? itemsBefore : items;

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
        item: item,
      };

      return result;
    },
    {},
  );

  if (cb && typeof cb === "function") {
    await cb(changesById as Record<Id, Change<T>>, context);
  }

  return changesById;
};

export const getOrFindByIdParams = async <H extends HookContext = HookContext>(
  context: H,
  makeParams?: ManipulateParams<H>,
  options?: Pick<HookChangesByIdOptions<H>, "deleteParams">,
): Promise<Params | undefined> => {
  if (context.id == null) {
    if (context.type === "before") {
      let params = copy(context.params);
      delete params.changesById;

      if (options?.deleteParams) {
        options.deleteParams.forEach((key) => {
          delete params[key];
        });
      }

      if (params.query?.$select) {
        delete params.query.$select;
      }

      params = Object.assign({ paginate: false }, params);

      params =
        typeof makeParams === "function"
          ? await makeParams(params, context)
          : params;
      return params;
    } else {
      if (!makeParams && !context.params.query?.$select) {
        return;
      }

      const itemOrItems = getItems(context);
      const idField = getIdField(context);

      if (!itemOrItems) {
        return;
      }
      const fetchedItems = Array.isArray(itemOrItems)
        ? itemOrItems
        : [itemOrItems];

      const ids = fetchedItems.map((x) => x && x[idField]);

      let params: Params | null = {
        query: {
          [idField]: { $in: ids },
        },
        paginate: false,
      };

      params = makeParams ? await makeParams(params, context) : params;
      return params ?? {};
    }
  } else {
    if (
      context.type === "after" &&
      !makeParams &&
      !context.params.query?.$select
    ) {
      return;
    }

    const query = Object.assign({}, context.params.query);

    delete query.$select;

    let params: Params = Object.assign({}, context.params, { query });
    delete params.changesById;

    if (options?.deleteParams) {
      options.deleteParams.forEach((key) => {
        delete params[key as keyof typeof params];
      });
    }

    params =
      (typeof makeParams === "function"
        ? await makeParams(params, context)
        : params) ?? {};

    return params;
  }
};

const getOrFindById = async <H extends HookContext, T>(
  context: H,
  makeParams?: ManipulateParams<H>,
  _options?: Pick<HookChangesByIdOptions<H>, "skipHooks" | "deleteParams"> & {
    byId?: boolean;
  },
): Promise<Record<Id, T> | T[] | undefined> => {
  const options = Object.assign(
    {
      skipHooks: true,
      byId: true,
    },
    _options,
  );

  let itemOrItems;
  const idField = getIdField(context);

  const params = await getOrFindByIdParams(context, makeParams, options);

  if (context.id == null) {
    const method = options.skipHooks ? "_find" : "find";

    itemOrItems = await context.service[method](params);

    itemOrItems = itemOrItems && (itemOrItems.data || itemOrItems);
  } else {
    const method = options.skipHooks ? "_get" : "get";

    itemOrItems = await context.service[method](context.id, params);
  }

  const items = !itemOrItems
    ? []
    : Array.isArray(itemOrItems)
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

const resultById = async <H extends HookContext>(
  context: H,
  options?: Pick<
    HookChangesByIdOptions<H>,
    "params" | "skipHooks" | "deleteParams"
  >,
): Promise<Record<string, unknown>> => {
  if (!context.result) {
    return {};
  }

  let items: Record<string, unknown>[];
  let params: Params | null | undefined = await getOrFindByIdParams(
    context,
    options?.params,
    options,
  );

  if (params) {
    const contextParams = Object.assign({}, context.params);
    delete contextParams.changesById;
    if (options?.deleteParams) {
      options.deleteParams.forEach((key) => {
        delete contextParams[key];
      });
    }

    if (_isEqual(params, context.params)) {
      params = null;
    }
  }

  if (context.method === "remove" || !params) {
    let itemOrItems = context.result;
    itemOrItems = Array.isArray(itemOrItems.data)
      ? itemOrItems.data
      : itemOrItems;
    items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  } else {
    items = (await getOrFindById(context, () => params, {
      skipHooks: options?.skipHooks ?? false,
      byId: false,
    })) as Record<string, unknown>[];
  }

  const idField = context.service.id;

  return items.reduce(
    (
      byId: Record<Id, Record<string, unknown>>,
      item: Record<string, unknown>,
    ) => {
      const id = item[idField] as Id;
      byId[id] = item;
      return byId;
    },
    {},
  );
};

const getIdField = (context: Pick<HookContext, "service">): string => {
  return context.service.options.id;
};

const getPath = (
  path: string | string[],
  isBefore: boolean,
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
