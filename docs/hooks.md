---
sidebarDepth: 2
---

# Hooks

## trigger

| type                        | methods                               | multi | details                                                                                 |
| --------------------------- | ------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `before`, `after`, `around` | `create`, `patch`, `update`, `remove` | yes   | [source](https://github.com/fratzinger/feathers-trigger/tree/main/src/hooks/trigger) |

### Options

The options of the `trigger` hook are of type: `Subcription` or `Subcription[]` or `(context: HookContext) => Promisable<Subscription | Subscription[]>`. But what is a `Subcription`?

A subscription is an object with the following properties:

| Property           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service`          | The service to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                                        |
| `method`           | The method to subscribe to.<br>To be used if you share trigger options between several services/methods.<br><br>**Type:** `string \| string[]`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                                         |
| `data`             | Check the `context.data` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>On multi create, every item of `context.data` is checked on its own, just like on single create: the action only runs for the created items whose data matched. An item is mapped to the result by its id in `context.data`, otherwise by its position in `context.result`.<br>**Type:**<br> `Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                  |
| `result`           | Check the `context.result` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (change: { item: T; before: T \| undefined }, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                             |
| `params`           | Check the `context.params` for something. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                 |
| `fetchBefore`      | The `trigger` hook lets you compare the result against the item before. This is disabled by default for performance reasons. If you use `before`, it will fetch the items in the before hook automatically. If you don't need `before` but your `result` looks something like: <span v-pre>`({ before }) => ({ publishedAt: { $gt: before.publishedAt } })` you need to set `fetchBefore:true` explicitely</span><br><br>As a function, it's called once per service call in the before hook, so `context.result` isn't available yet.<br><br>**Type:** `boolean \| (context: HookContext) => Promisable<boolean>`<br>**optional** - _Default:_ `false` |
| `before`           | Check the `before` object from `trigger` before hook, if available. Uses [sift.js](https://github.com/crcn/sift.js) under the hood.<br>**Type:**<br>`Record<string, any> \| boolean \| (item: T, context: HookContext) => Promisable<boolean \| Record<string, any>>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                       |
| `manipulateParams` | You can extend the `params` for the subscription, e.g. for population.<br>The items after the call are refetched by their id, so `params.query` doesn't have the filters of the call there. Query params your adapter needs to shape the items, like `$eager`, have to be added to `params.query` again. The query of the call is still in `context.params.query`.<br><br>**Type:** `(params: Params, context: HookContext) => (Promisable<Params>)`<br>**optional** - _Default:_ `undefined`                                                                                                                                                                                                                                                                                                               |
| `action`           | The action, that will be run, if all checks pass for the subscription.<br><br>**Type:** `({ before, item }, { context, items, subscription }) => Promisable<any>`<br>**Type (batchMode=true):** `(changes: [change: { before, item }, options: { context, items, subscription }][], context) => Promisable<any>`<br> **optional** - _Default:_ `undefined`                                                                                                                                                      |
| `batchMode`        | Enables batch mode. In batch mode: If multiple items are passed to create, it will only run action once with all items matching the conditions.<br><br> **Type:** `boolean` <br>**optional** - _Default:_ `false`                                                                                                                                                                                                                                                                                               |
| `isBlocking`       | Whether the `trigger` hook should wait for the async `action` before continuing.<br><br>As a function, it's called once per service call in the before hook, so `context.result` isn't available yet.<br><br>**Type:** `boolean \| (context: HookContext) => Promisable<boolean>`<br>**optional** - _Default:_ `true`                                                                                                                                                                                                                                                                                                                                                                  |
| `debug`            | Logs why the subscription runs or gets skipped, prefixed with `[FEATHERS_TRIGGER DEBUG]`. Helpful if an `action` doesn't run as expected.<br><br>As a function, it's called once per service call in the before hook, so `context.result` isn't available yet.<br><br>**Type:** `boolean \| (context: HookContext) => Promisable<boolean>`<br>**optional** - _Default:_ `false` |

### Action

The `action` from `subscription` is the function that runs, after all `conditions` are fulfilled. The function looks like the following:

```js
const action = async ({ before, item }, { context, items, subscription }) => {
  // do your own implementation
};

// In batch mode

const action = async (changes) => {
  for (const [{ before, item }, { context, items, subscription }] of changes) {
    // do your own implementation
  }
};
```

## changesById

| type                        | methods                               | multi | details                                                                                     |
| --------------------------- | ------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `before`, `after`, `around` | `create`, `patch`, `update`, `remove` | yes   | [source](https://github.com/fratzinger/feathers-trigger/tree/main/src/hooks/changes-by-id) |

### Options

| Property    | Description                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `params`    | With the `params` options, you can manipulate params for `changesById` if you need to, e.g. for population.<br>The items after the call are refetched by their id, so `params.query` doesn't have the filters of the call there. Query params your adapter needs to shape the items, like `$eager`, have to be added to `params.query` again. The query of the call is still in `context.params.query`.<br><br>**Type:** `(params: Params, context: HookContext) => (Params \| Promise<Params>)`<br>**optional** - _Default:_ `undefined` |
| `skipHooks` | Use `find` or `_find` for refetching<br><br>**Type:** `boolean`<br>**optional** - _Default:_ `false`                                                                                                                     |
