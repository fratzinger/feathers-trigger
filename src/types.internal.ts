export type MethodName = "create" | "update" | "patch" | "remove";

export type Promisable<T> = T | PromiseLike<T>;

export type MaybeArray<T> = T | T[];
