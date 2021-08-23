import type { HookContext, Id } from "@feathersjs/feathers";

export default (
  context: HookContext
): void | Record<string, unknown> => {
  if (!context.result) return; 
  let itemOrItems = context.result;
  itemOrItems = (Array.isArray(itemOrItems.data)) ? itemOrItems.data : itemOrItems;
  const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  
  const idField = context.service.id;

  return items.reduce((byId: Record<Id, Record<string, unknown>>, item: Record<string, unknown>) => {
    const id = item[idField] as Id;
    byId[id] = item;
    return byId;
  }, {});
};