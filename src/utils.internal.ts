/**
 * Minimal replacements for `lodash/set` and `lodash/get`.
 *
 * Every path used in this package consists of plain string keys, so there is
 * no need for lodash's bracket notation or its array-index handling.
 */

type Path = string | string[]

const toKeys = (path: Path): string[] =>
  Array.isArray(path) ? path : path.split('.')

export const set = (obj: any, path: Path, value: unknown): void => {
  const keys = toKeys(path)
  const lastKey = keys.at(-1)

  if (lastKey === undefined) {
    return
  }

  let current = obj
  for (const key of keys.slice(0, -1)) {
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key]
  }

  current[lastKey] = value
}

export const get = (obj: any, path: Path): any => {
  let current = obj
  for (const key of toKeys(path)) {
    if (current == null) {
      return undefined
    }
    current = current[key]
  }
  return current
}
