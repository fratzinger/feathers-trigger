import _get from "lodash/get";
import _has from "lodash/has";
import _set from "lodash/set";
import _isPlainObject from "lodash/isPlainObject";

const transformMustache = <T>(
  root: T, 
  view: Record<string, unknown>, 
  item?: T, 
  path?: string[]
): T => {
  if (!item) { item = root; }
  if (!path) { path = []; }
  if (typeof item === "string") {
    if (!item.startsWith("{{") || !item.endsWith("}}")) {
      return item;
    }

    if ((item.match(/{{/g) || []).length === 1 &&
        (item.match(/}}/g) || []).length === 1) {
      const keys = item.match(/{{\s*[\w.]+\s*}}/g)
        .map(x => x.match(/[\w.]+/)[0]);
      if (keys.length === 1 && _has(view, keys[0])) {
        const val = _get(view, keys[0]);
        //@ts-expect-error typing of root
        _set(root, path, val);
      }
    }
    return item;
  } else if (_isPlainObject(item)) {
    for (const key in item) {
      //@ts-expect-error typing of item
      transformMustache(root, view, item[key], [...path, key]);
    }
    return item;
  } else if (Array.isArray(item)) {
    item.forEach((subItem, i) => transformMustache(root, view, subItem, [...path, `${i}`]));
    return item;
  }

  return item;
};

export default transformMustache;