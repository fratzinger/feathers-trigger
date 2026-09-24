/**
 * Every path used in this package consists of plain string keys, so there is
 * no need for lodash's bracket notation or its array-index handling.
 */
export type Path = string | string[]

export const toKeys = (path: Path): string[] =>
  Array.isArray(path) ? path : path.split('.')
