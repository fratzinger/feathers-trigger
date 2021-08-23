import { getItems } from "feathers-hooks-common";

import type { HookContext, Id, Params } from "@feathersjs/feathers";
import type { ManipulateParams } from "../types";

const getIdField = (context: Pick<HookContext, "service">): string => {
  return context.service.options.id;
};

const getOrFindById = async <T>(
  context: HookContext, 
  makeParams?: ManipulateParams,
  _options?: { skipHooks: boolean }
): Promise<Record<Id, T> | undefined> => {
  const options = _options || Object.assign({
    skipHooks: true
  }, _options);
  
  let itemOrItems;
  const idField = getIdField(context);

  if (context.id == null) {
    const method = (options.skipHooks) ? "_find" : "find";
    if (context.type === "before") {
      let params: Params = Object.assign({}, context.params);
      const query = Object.assign({}, params.query);

      delete query.$select;

      params = Object.assign({ paginate: false }, params, { query });
  
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
  
  const result = items.reduce((byId, item) => {
    const id = item[idField];
    byId[id] = item;
    return byId;
  }, {});
    
  return result;
};

export default getOrFindById;