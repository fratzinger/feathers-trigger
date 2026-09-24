export type MethodName = 'create' | 'update' | 'patch' | 'remove'

export type Promisable<T> = T | PromiseLike<T>

export type MaybeArray<T> = T | T[]

/**
 * `Omit` for every member of a union, instead of only their common keys
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends any
  ? Omit<T, K>
  : never
