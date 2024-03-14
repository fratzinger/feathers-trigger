export type MethodName = "create" | "update" | "patch" | "remove";

export type Promisable<T> = T | PromiseLike<T>;
