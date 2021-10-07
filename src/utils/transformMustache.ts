import _get from "lodash/get";
import _has from "lodash/has";
import _set from "lodash/set";
import _isPlainObject from "lodash/isPlainObject";

const transformMustache = <T>(
  item: T, 
  view: Record<string, unknown>, 
  root?: unknown,
  path?: string[]
): T => {
  if (!root) { root = item; }
  if (!path) { path = []; }
  if (typeof item === "string") {
    const key = getMustacheKey(item);

    if (key && _has(view, key)) {
      const val = _get(view, key);
      //@ts-expect-error typing of root
      _set(root, path, val);
    }

    return item;
  } else if (_isPlainObject(item)) {
    for (const key in item) {
      transformMustache(item[key], view, root, [...path, key]);
    }
    return item;
  } else if (Array.isArray(item)) {
    item.forEach((subItem, i) => transformMustache(subItem, view, root, [...path, `${i}`]));
    return item;
  }

  return item;
};

const getMustacheKey = (
  item: string
): string | undefined => {
  if (!item.startsWith("{{") || !item.endsWith("}}")) {
    return;
  }

  if (
    (item.match(/{{/g) || []).length > 1 ||
    (item.match(/}}/g) || []).length > 1
  ) {
    return;
  }

  const keys = item.match(/{{\s*[\w.]+\s*}}/g).map(x => x.match(/[\w.]+/)[0]);

  return keys[0];
};

/*export const hasMustacheKey = <T>(
  item: T, 
  testKey: string, 
  root?: unknown,
  path?: string[]
): boolean => {
  if (!root) { root = item; }
  if (!path) { path = []; }
  if (typeof item === "string") {
    if (!item.startsWith("{{") || !item.endsWith("}}")) {
      return false;
    }

    const key = getMustacheKey(item);

    if (key && (key === testKey || key.startsWith(`${testKey}.`))) {
      return true;
    } else {
      return false;
    }
  } else if (_isPlainObject(item)) {
    for (const key in item) {
      const hasKey = hasMustacheKey(item[key], testKey, root, [...path, key]);
      if (hasKey) { return true; }
    }
    return false;
  } else if (Array.isArray(item)) {
    item.forEach((subItem, i) => {
      const hasKey = hasMustacheKey(subItem, testKey, root, [...path, `${i}`]);
      if (hasKey) { return true; }
    });

    return false;
  }

  return false;
};*/

export default transformMustache;

